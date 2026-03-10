// app/tasks/page.tsx
//     Assign tasks to any user (admin sees all, others see only assigned to them)
// ssignee avatar shown on task card
//     Notification triggered via DB trigger on assignment
'use client';

import { useEffect, useState } from 'react';
import {
  Plus, X, Pencil, Trash2, Check, AlertCircle,
  Clock, CheckSquare, AlertTriangle, Loader2, Calendar, UserPlus,
} from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';
import { PageLoader } from '@/components/LoadingScreen';

type TaskStatus = 'pending' | 'in_progress' | 'done' | 'overdue';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  assigned_to: string | null;
  assigned_to_profile?: { full_name: string | null; email: string } | null;
  lead_id: string | null;
  created_at: string;
}

interface UserProfile {
  id: string; full_name: string | null; email: string; role: string;
}

const COLUMNS: { id: TaskStatus; label: string; icon: React.ElementType; color: string; bg: string }[] = [
  { id: 'pending',     label: 'À faire',   icon: Clock,         color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20'      },
  { id: 'in_progress', label: 'En cours',  icon: Loader2,       color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20'    },
  { id: 'done',        label: 'Terminées', icon: CheckSquare,   color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20'},
  { id: 'overdue',     label: 'En retard', icon: AlertTriangle, color: 'text-rose-400',    bg: 'bg-rose-500/10 border-rose-500/20'      },
];

const PRIORITY_CFG = {
  low:    { label: 'Basse',   badge: 'bg-white/5 text-white/30 border-white/10' },
  medium: { label: 'Moyenne', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  high:   { label: 'Haute',   badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
};

function TaskModal({ mode, task, users, currentUserId, onClose, onSaved }: {
  mode: 'create' | 'edit'; task?: Task;
  users: UserProfile[]; currentUserId: string;
  onClose: () => void; onSaved: (t: Task) => void;
}) {
  const supabase     = getSupabaseClient();
  const [title,      setTitle]      = useState(task?.title ?? '');
  const [desc,       setDesc]       = useState(task?.description ?? '');
  const [status,     setStatus]     = useState<TaskStatus>(task?.status ?? 'pending');
  const [priority,   setPriority]   = useState<Task['priority']>(task?.priority ?? 'medium');
  const [dueDate,    setDueDate]    = useState(task?.due_date ? task.due_date.substring(0, 10) : '');
  const [assignedTo, setAssignedTo] = useState<string>(task?.assigned_to ?? currentUserId);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');

  const inputCls = "w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 outline-none focus:border-white/30 transition-all";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return setError('Le titre est requis.');
    setSaving(true); setError('');
    const payload = { title: title.trim(), description: desc.trim()||null, status, priority, due_date: dueDate||null, assigned_to: assignedTo||currentUserId };
    try {
      const query = mode === 'create'
        ? supabase.from('tasks').insert({ ...payload, created_by: currentUserId }).select('*, assigned_to_profile:profiles!tasks_assigned_to_fkey(full_name,email)').single()
        : supabase.from('tasks').update(payload).eq('id', task!.id).select('*, assigned_to_profile:profiles!tasks_assigned_to_fkey(full_name,email)').single();
      const { data, error: err } = await query;
      if (err) throw new Error(err.message);
      if (data) { onSaved(data as Task); onClose(); }
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose}/>
      <div className="relative w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">{mode==='create'?'Nouvelle tâche':'Modifier la tâche'}</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X className="w-5 h-5"/></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Titre *</label>
            <input className={inputCls} placeholder="Ex: Appeler le client Dupont" value={title} onChange={e=>setTitle(e.target.value)} autoFocus/>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Description</label>
            <textarea rows={3} className={`${inputCls} resize-none`} placeholder="Détails…" value={desc} onChange={e=>setDesc(e.target.value)}/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Statut</label>
              <select className={inputCls} value={status} onChange={e=>setStatus(e.target.value as TaskStatus)}>
                {COLUMNS.map(c=><option key={c.id} value={c.id} className="bg-slate-900">{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Priorité</label>
              <select className={inputCls} value={priority} onChange={e=>setPriority(e.target.value as Task['priority'])}>
                <option value="low" className="bg-slate-900">Basse</option>
                <option value="medium" className="bg-slate-900">Moyenne</option>
                <option value="high" className="bg-slate-900">Haute</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Échéance</label>
            <input type="date" className={inputCls} value={dueDate} onChange={e=>setDueDate(e.target.value)}/>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-white/30 mb-2">
              <UserPlus className="w-3 h-3 inline mr-1"/>Assigner à
            </label>
            <select className={inputCls} value={assignedTo} onChange={e=>setAssignedTo(e.target.value)}>
              {users.map(u=>(
                <option key={u.id} value={u.id} className="bg-slate-900">
                  {u.full_name||u.email}{u.id===currentUserId?' (moi)':''} — {u.role==='admin'?'Admin':u.role==='commercial'?'Commercial':u.role==='partner'?'Partenaire':'Standard'}
                </option>
              ))}
            </select>
          </div>
          {error&&<div className="flex items-start gap-2 text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3"><AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5"/><span>{error}</span></div>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/60 font-bold hover:bg-white/10 transition-all">Annuler</button>
            <button type="submit" disabled={saving} className="flex-1 bg-white text-black font-bold py-3 rounded-2xl hover:bg-white/90 flex items-center justify-center gap-2 transition-all disabled:opacity-60">
              {saving?<><span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"/>{mode==='create'?'Création…':'Sauvegarde…'}</>
                :mode==='create'?<><Plus className="w-4 h-4"/>Créer & Assigner</>:<><Check className="w-4 h-4"/>Enregistrer</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TaskCard({ task, onEdit, onDelete, onDragStart }: {
  task: Task; onEdit:(t:Task)=>void; onDelete:(id:string)=>void; onDragStart:(id:string)=>void;
}) {
  const pCfg      = PRIORITY_CFG[task.priority]??PRIORITY_CFG.medium;
  const isOverdue = task.due_date&&new Date(task.due_date)<new Date()&&task.status!=='done';
  const assignee  = task.assigned_to_profile;
  const initials  = assignee?.full_name
    ? assignee.full_name.split(' ').map((w:string)=>w[0]).join('').toUpperCase().slice(0,2)
    : assignee?.email?.[0]?.toUpperCase()??'?';
  return (
    <div draggable onDragStart={()=>onDragStart(task.id)}
      className="bg-white/5 border border-white/10 rounded-2xl p-4 cursor-grab active:cursor-grabbing hover:bg-white/8 hover:border-white/20 transition-all group mb-3 select-none">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-white leading-snug flex-1 line-clamp-2">{task.title}</p>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={e=>{e.stopPropagation();onEdit(task);}} className="w-6 h-6 rounded-lg bg-white/10 hover:bg-indigo-500/30 flex items-center justify-center text-white/40 hover:text-indigo-400 transition-all" title="Modifier"><Pencil className="w-3 h-3"/></button>
          <button onClick={e=>{e.stopPropagation();onDelete(task.id);}} className="w-6 h-6 rounded-lg bg-white/10 hover:bg-rose-500/30 flex items-center justify-center text-white/40 hover:text-rose-400 transition-all" title="Supprimer"><Trash2 className="w-3 h-3"/></button>
        </div>
      </div>
      {task.description&&<p className="text-xs text-white/30 mt-2 line-clamp-2">{task.description}</p>}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${pCfg.badge}`}>{pCfg.label}</span>
        {task.due_date&&<span className={`text-[10px] flex items-center gap-1 font-semibold ${isOverdue?'text-rose-400':'text-white/30'}`}><Calendar className="w-3 h-3"/>{new Date(task.due_date).toLocaleDateString('fr-FR')}</span>}
        {assignee&&(
          <div className="ml-auto flex items-center gap-1.5" title={`Assigné à ${assignee.full_name||assignee.email}`}>
            <div className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-[9px] font-bold text-indigo-400">{initials}</div>
            <span className="text-[9px] text-white/25 max-w-[60px] truncate">{assignee.full_name||assignee.email}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TasksPage() {
  const supabase          = getSupabaseClient();
  const [tasks,           setTasks]           = useState<Task[]>([]);
  const [users,           setUsers]           = useState<UserProfile[]>([]);
  const [currentUserId,   setCurrentUserId]   = useState('');
  const [isAdmin,         setIsAdmin]         = useState(false);
  const [loading,         setLoading]         = useState(true);
  const [modalMode,       setModalMode]       = useState<'create'|'edit'|null>(null);
  const [editing,         setEditing]         = useState<Task|undefined>();
  const [dragId,          setDragId]          = useState<string|null>(null);
  const [dragOver,        setDragOver]        = useState<TaskStatus|null>(null);

  useEffect(()=>{
    async function init(){
      const {data:{user}} = await supabase.auth.getUser();
      if(!user){setLoading(false);return;}
      setCurrentUserId(user.id);
      const {data:profile} = await supabase.from('profiles').select('role').eq('id',user.id).maybeSingle();
      const admin = profile?.role==='admin'; setIsAdmin(admin);

      // Tasks query
      const q = supabase.from('tasks').select('*, assigned_to_profile:profiles!tasks_assigned_to_fkey(full_name,email)').order('created_at',{ascending:false});
      const {data:td} = admin ? await q : await q.eq('assigned_to',user.id);
      if(td) setTasks(td as Task[]);

      // Users for assignment
      if(admin){
        const {data:us} = await supabase.from('profiles').select('id,full_name,email,role').order('full_name',{ascending:true});
        setUsers((us??[]) as UserProfile[]);
      } else {
        const {data:me} = await supabase.from('profiles').select('id,full_name,email,role').eq('id',user.id).maybeSingle();
        if(me) setUsers([me as UserProfile]);
      }
      setLoading(false);
    }
    init();
  },[]);

  function handleSaved(t:Task){
    setTasks(prev=>{const idx=prev.findIndex(p=>p.id===t.id);if(idx>=0){const n=[...prev];n[idx]=t;return n;}return[t,...prev];});
  }
  async function handleDelete(id:string){
    if(!confirm('Supprimer cette tâche ?')) return;
    await supabase.from('tasks').delete().eq('id',id);
    setTasks(prev=>prev.filter(t=>t.id!==id));
  }
  async function handleDrop(e:React.DragEvent,ns:TaskStatus){
    e.preventDefault();setDragOver(null);
    if(!dragId) return;
    setTasks(prev=>prev.map(t=>t.id===dragId?{...t,status:ns}:t));
    await supabase.from('tasks').update({status:ns}).eq('id',dragId);
    setDragId(null);
  }

  if(loading) return <PageLoader label="Chargement des tâches…"/>;
  const total=tasks.length, done=tasks.filter(t=>t.status==='done').length, urgent=tasks.filter(t=>t.priority==='high'&&t.status!=='done').length;

  return (
    <div className="p-4 lg:p-8 animate-fade-in">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight">Tâches</h1>
          <p className="text-white/40 mt-1">
            {done}/{total} terminées{urgent>0&&<span className="text-rose-400 ml-2">· {urgent} urgente{urgent>1?'s':''}</span>}
            {isAdmin&&<span className="text-white/20 ml-2">· Vue globale admin</span>}
          </p>
        </div>
        <button onClick={()=>{setEditing(undefined);setModalMode('create');}} className="bg-white text-black px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:scale-105 transition-transform">
          <Plus className="w-5 h-5"/> Nouvelle tâche
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {COLUMNS.map(col=>{
          const colTasks=tasks.filter(t=>t.status===col.id), isOver=dragOver===col.id, Icon=col.icon;
          return (
            <div key={col.id} onDragOver={e=>{e.preventDefault();setDragOver(col.id);}} onDragLeave={()=>setDragOver(null)} onDrop={e=>handleDrop(e,col.id)}
              className={`rounded-2xl border p-4 min-h-[400px] transition-all ${col.bg} ${isOver?'scale-[1.01] border-opacity-60':''}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${col.color}`}/><span className={`text-xs font-black uppercase tracking-widest ${col.color}`}>{col.label}</span>
                  <span className="text-xs text-white/25 font-bold">({colTasks.length})</span>
                </div>
                <button onClick={()=>{setEditing(undefined);setModalMode('create');}} className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/15 flex items-center justify-center text-white/30 hover:text-white transition-all"><Plus className="w-3.5 h-3.5"/></button>
              </div>
              <div>
                {colTasks.length===0?<p className={`text-center py-8 text-xs font-bold uppercase tracking-widest ${isOver?col.color:'text-white/10'}`}>{isOver?'Déposer ici':'Aucune tâche'}</p>
                  :colTasks.map(t=><TaskCard key={t.id} task={t} onEdit={t=>{setEditing(t);setModalMode('edit');}} onDelete={handleDelete} onDragStart={setDragId}/>)}
              </div>
            </div>
          );
        })}
      </div>
      {modalMode&&<TaskModal mode={modalMode} task={editing} users={users} currentUserId={currentUserId} onClose={()=>{setModalMode(null);setEditing(undefined);}} onSaved={handleSaved}/>}
    </div>
  );
}