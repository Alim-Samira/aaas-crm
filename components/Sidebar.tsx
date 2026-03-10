'use client';
// components/Sidebar.tsx — UPDATED with 🔔 Notification Bell
// Realtime + polling every 30s + task status update from drawer

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import {
  LayoutDashboard, GitMerge, Users, Building2,
  CheckSquare, Settings, LogOut, ChevronRight,
  Bell, X, Clock, CheckCircle2, Loader2, Target,
} from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';

const ALL_NAV = [
  { href: '/dashboard',  label: 'Dashboard',   icon: LayoutDashboard, module: 'dashboard'  },
  { href: '/pipeline',   label: 'Pipeline',    icon: GitMerge,        module: 'pipeline'   },
  { href: '/contacts',   label: 'Contacts',    icon: Users,           module: 'contacts'   },
  { href: '/companies',  label: 'Entreprises', icon: Building2,       module: 'companies'  },
  { href: '/tasks',      label: 'Tâches',      icon: CheckSquare,     module: 'tasks'      },
  { href: '/settings',   label: 'Paramètres',  icon: Settings,        module: 'settings'   },
] as const;

interface Notification {
  id: string; type: string; title: string; body: string | null;
  entity_id: string | null; entity_type: string | null;
  read: boolean; created_at: string;
}
interface TaskDetails {
  id: string; title: string; description: string | null;
  status: 'pending'|'in_progress'|'done'|'overdue';
  priority: 'low'|'medium'|'high'; due_date: string | null;
}

const STATUS_CFG = {
  pending:     { label:'À faire',   color:'#60a5fa', bg:'rgba(96,165,250,0.1)',  border:'rgba(96,165,250,0.25)'  },
  in_progress: { label:'En cours',  color:'#fbbf24', bg:'rgba(251,191,36,0.1)',  border:'rgba(251,191,36,0.25)'  },
  done:        { label:'Terminée',  color:'#34d399', bg:'rgba(52,211,153,0.1)',  border:'rgba(52,211,153,0.25)'  },
  overdue:     { label:'En retard', color:'#f87171', bg:'rgba(248,113,113,0.1)', border:'rgba(248,113,113,0.25)' },
};
const PRIORITY_CFG = {
  low:    { label:'Basse',   color:'rgba(255,255,255,0.3)' },
  medium: { label:'Moyenne', color:'#fbbf24'               },
  high:   { label:'Haute',   color:'#f87171'               },
};

function NotificationDrawer({ open, onClose, notifications, setNotifications, loading }:{
  open:boolean; onClose:()=>void; notifications:Notification[];
  setNotifications:React.Dispatch<React.SetStateAction<Notification[]>>; loading:boolean;
}) {
  const supabase = getSupabaseClient();
  const [tasks,       setTasks]        = useState<Record<string,TaskDetails>>({});
  const [taskLoading, setTaskLoading]  = useState<Record<string,boolean>>({});
  const [expanded,    setExpanded]     = useState<string|null>(null);
  const [statusSaving,setStatusSaving] = useState<string|null>(null);
  const [search,      setSearch]       = useState('');

  async function loadTask(id:string){
    if(tasks[id]) return;
    setTaskLoading(p=>({...p,[id]:true}));
    const {data} = await supabase.from('tasks').select('*').eq('id',id).maybeSingle();
    if(data) setTasks(p=>({...p,[id]:data as TaskDetails}));
    setTaskLoading(p=>({...p,[id]:false}));
  }
  function toggleExpand(n:Notification){
    const nid = expanded===n.id ? null : n.id;
    setExpanded(nid);
    if(nid && n.entity_id && n.entity_type==='task') loadTask(n.entity_id);
    if(!n.read) markRead(n.id);
  }
  async function markRead(id:string){
    await supabase.from('notifications').update({read:true}).eq('id',id);
    setNotifications(p=>p.map(n=>n.id===id?{...n,read:true}:n));
  }
  async function markAllRead(){
    const ids = notifications.filter(n=>!n.read).map(n=>n.id);
    if(!ids.length) return;
    await supabase.from('notifications').update({read:true}).in('id',ids);
    setNotifications(p=>p.map(n=>({...n,read:true})));
  }
  async function del(id:string){
    await supabase.from('notifications').delete().eq('id',id);
    setNotifications(p=>p.filter(n=>n.id!==id));
  }
  async function updateStatus(taskId:string, status:TaskDetails['status']){
    setStatusSaving(taskId);
    await supabase.from('tasks').update({status}).eq('id',taskId);
    setTasks(p=>({...p,[taskId]:{...p[taskId],status}}));
    setStatusSaving(null);
  }

  const filtered = notifications.filter(n=>!search||n.title.toLowerCase().includes(search.toLowerCase())||n.body?.toLowerCase().includes(search.toLowerCase()));
  const unread   = notifications.filter(n=>!n.read).length;
  if(!open) return null;

  return (
    <>
      <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:90,background:'rgba(0,0,0,0.4)',backdropFilter:'blur(4px)'}}/>
      <div style={{position:'fixed',left:256,top:0,height:'100%',width:380,zIndex:95,display:'flex',flexDirection:'column',background:'rgba(8,13,26,0.98)',borderRight:'1px solid rgba(255,255,255,0.08)',backdropFilter:'blur(24px)',animation:'slideIn 0.2s ease'}}>
        <style>{`@keyframes slideIn{from{opacity:0;transform:translateX(-16px)}to{opacity:1;transform:none}} @keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse2{0%,100%{opacity:1}50%{opacity:0.6}}`}</style>
        {/* Header */}
        <div style={{padding:'20px 16px 14px',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <Bell style={{width:16,height:16,color:'#818cf8'}}/>
              <span style={{color:'white',fontWeight:800,fontSize:15}}>Notifications</span>
              {unread>0 && <span style={{background:'#6366f1',color:'white',fontSize:10,fontWeight:900,padding:'2px 7px',borderRadius:10}}>{unread}</span>}
            </div>
            <div style={{display:'flex',gap:6}}>
              {unread>0&&<button onClick={markAllRead} style={{fontSize:11,color:'#818cf8',background:'rgba(99,102,241,0.1)',border:'1px solid rgba(99,102,241,0.2)',borderRadius:8,padding:'4px 10px',cursor:'pointer'}}>Tout lire</button>}
              <button onClick={onClose} style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,width:28,height:28,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'rgba(255,255,255,0.4)'}}>
                <X style={{width:13,height:13}}/>
              </button>
            </div>
          </div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher…"
            style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,padding:'7px 12px',color:'white',fontSize:12,outline:'none',boxSizing:'border-box'}}/>
        </div>
        {/* List */}
        <div style={{flex:1,overflowY:'auto',padding:'10px 10px'}}>
          {loading ? (
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:40,gap:10,color:'rgba(99,102,241,0.6)'}}>
              <Loader2 style={{width:18,height:18,animation:'spin 0.6s linear infinite'}}/><span style={{fontSize:13}}>Chargement…</span>
            </div>
          ) : filtered.length===0 ? (
            <div style={{textAlign:'center',padding:40,color:'rgba(255,255,255,0.2)'}}>
              <Bell style={{width:28,height:28,margin:'0 auto 10px',opacity:0.25}}/><p style={{fontSize:12,margin:0}}>{search?'Aucun résultat':'Aucune notification'}</p>
            </div>
          ) : filtered.map(n=>{
            const isTask = n.entity_type==='task';
            const isExp  = expanded===n.id;
            const td     = n.entity_id?tasks[n.entity_id]:null;
            const tl     = n.entity_id?taskLoading[n.entity_id]:false;
            return (
              <div key={n.id} style={{marginBottom:8}}>
                <div onClick={()=>toggleExpand(n)} style={{background:n.read?'rgba(255,255,255,0.02)':'rgba(99,102,241,0.07)',border:`1px solid ${n.read?'rgba(255,255,255,0.06)':'rgba(99,102,241,0.2)'}`,borderRadius:12,padding:'11px 12px',cursor:'pointer',transition:'all 0.15s'}}>
                  <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
                    <div style={{width:30,height:30,borderRadius:9,flexShrink:0,background:isTask?'rgba(99,102,241,0.15)':'rgba(52,211,153,0.15)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                      {isTask?<CheckSquare style={{width:13,height:13,color:'#818cf8'}}/>:<Target style={{width:13,height:13,color:'#34d399'}}/>}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',alignItems:'center',gap:5}}>
                        {!n.read&&<span style={{width:5,height:5,borderRadius:3,background:'#6366f1',flexShrink:0}}/>}
                        <p style={{color:'white',fontWeight:n.read?500:700,fontSize:12,margin:0,lineHeight:1.3}}>{n.title}</p>
                      </div>
                      {n.body&&<p style={{color:'rgba(255,255,255,0.4)',fontSize:11,margin:'2px 0 0',lineHeight:1.4,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{n.body}</p>}
                      <p style={{color:'rgba(255,255,255,0.2)',fontSize:10,margin:'3px 0 0'}}>{new Date(n.created_at).toLocaleDateString('fr-FR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</p>
                    </div>
                    <button onClick={e=>{e.stopPropagation();del(n.id);}} style={{background:'none',border:'none',color:'rgba(255,255,255,0.15)',cursor:'pointer',padding:2,flexShrink:0}}><X style={{width:11,height:11}}/></button>
                  </div>
                </div>
                {isExp&&isTask&&n.entity_id&&(
                  <div style={{background:'rgba(99,102,241,0.04)',border:'1px solid rgba(99,102,241,0.12)',borderTop:'none',borderRadius:'0 0 12px 12px',padding:14}}>
                    {tl ? (
                      <div style={{display:'flex',alignItems:'center',gap:8,color:'rgba(99,102,241,0.5)'}}><Loader2 style={{width:12,height:12,animation:'spin 0.6s linear infinite'}}/><span style={{fontSize:11}}>Chargement…</span></div>
                    ) : td ? (
                      <div style={{display:'flex',flexDirection:'column',gap:10}}>
                        <div>
                          <p style={{color:'white',fontWeight:700,fontSize:13,margin:'0 0 3px'}}>{td.title}</p>
                          {td.description&&<p style={{color:'rgba(255,255,255,0.35)',fontSize:11,margin:0,lineHeight:1.5}}>{td.description}</p>}
                        </div>
                        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                          {td.due_date&&<span style={{display:'flex',alignItems:'center',gap:4,fontSize:10,color:'rgba(255,255,255,0.3)'}}><Clock style={{width:9,height:9}}/>{new Date(td.due_date).toLocaleDateString('fr-FR')}</span>}
                          <span style={{fontSize:10,color:PRIORITY_CFG[td.priority]?.color??'rgba(255,255,255,0.3)',fontWeight:700,textTransform:'uppercase',letterSpacing:1}}>{PRIORITY_CFG[td.priority]?.label}</span>
                        </div>
                        <div>
                          <p style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:1.5,color:'rgba(255,255,255,0.25)',margin:'0 0 6px'}}>Modifier le statut</p>
                          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                            {(Object.entries(STATUS_CFG) as [TaskDetails['status'],any][]).map(([sk,sc])=>{
                              const cur = td.status===sk;
                              return <button key={sk} onClick={()=>!cur&&updateStatus(td.id,sk)} disabled={cur||statusSaving===td.id}
                                style={{background:cur?sc.bg:'rgba(255,255,255,0.03)',border:`1px solid ${cur?sc.border:'rgba(255,255,255,0.08)'}`,borderRadius:8,padding:'4px 10px',color:cur?sc.color:'rgba(255,255,255,0.35)',fontSize:10,fontWeight:700,cursor:cur?'default':'pointer',transition:'all 0.15s'}}>
                                {sc.label}
                              </button>;
                            })}
                          </div>
                        </div>
                        <div style={{display:'flex',alignItems:'center',gap:6}}>
                          <CheckCircle2 style={{width:12,height:12,color:STATUS_CFG[td.status]?.color}}/>
                          <span style={{fontSize:11,color:STATUS_CFG[td.status]?.color,fontWeight:700}}>Statut : {STATUS_CFG[td.status]?.label}</span>
                        </div>
                      </div>
                    ) : <p style={{color:'rgba(255,255,255,0.2)',fontSize:11,margin:0}}>Tâche introuvable.</p>}
                  </div>
                )}
                {isExp&&n.entity_type==='lead'&&(
                  <div style={{background:'rgba(52,211,153,0.04)',border:'1px solid rgba(52,211,153,0.12)',borderTop:'none',borderRadius:'0 0 12px 12px',padding:14}}>
                    <p style={{color:'rgba(255,255,255,0.4)',fontSize:11,margin:0}}>Lead assigné. Consultez le <Link href="/pipeline" style={{color:'#34d399'}}>Pipeline</Link> pour le traiter.</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const supabase = getSupabaseClient();
  const [role,          setRole]          = useState<string|null>(null);
  const [userId,        setUserId]        = useState('');
  const [allowed,       setAllowed]       = useState<Set<string>>(new Set());
  const [userEmail,     setUserEmail]     = useState('');
  const [ready,         setReady]         = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifLoading,  setNotifLoading]  = useState(false);
  const [drawerOpen,    setDrawerOpen]    = useState(false);
  const unread = notifications.filter(n=>!n.read).length;

  useEffect(()=>{
    async function init(){
      const {data:{user}} = await supabase.auth.getUser();
      if(!user){setReady(true);return;}
      setUserEmail(user.email??''); setUserId(user.id);
      const {data:profile} = await supabase.from('profiles').select('role').eq('id',user.id).maybeSingle();
      const r = profile?.role??'commercial'; setRole(r);
      if(r==='admin'){
        setAllowed(new Set(ALL_NAV.map(n=>n.module)));
      } else {
        const {data:perms} = await supabase.from('module_permissions').select('module,can_access').eq('role',r);
        if(perms&&perms.length>0) setAllowed(new Set<string>(perms.filter(p=>p.can_access).map(p=>p.module as string)));
        else setAllowed(new Set(['dashboard','pipeline','contacts','companies','tasks']));
      }
      await loadNotifs(user.id); setReady(true);
    }
    init();
    const {data:{subscription}} = supabase.auth.onAuthStateChange(()=>init());
    return ()=>subscription.unsubscribe();
  },[]);

  useEffect(()=>{
    if(!userId) return;
    const iv = setInterval(()=>loadNotifs(userId), 30000);
    return ()=>clearInterval(iv);
  },[userId]);

  useEffect(()=>{
    if(!userId) return;
    const ch = supabase.channel(`notifs-${userId}`)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:`user_id=eq.${userId}`},
        p=>setNotifications(prev=>[p.new as Notification,...prev]))
      .subscribe();
    return ()=>{supabase.removeChannel(ch);};
  },[userId]);

  async function loadNotifs(uid:string){
    setNotifLoading(true);
    const {data} = await supabase.from('notifications').select('*').eq('user_id',uid).order('created_at',{ascending:false}).limit(50);
    if(data) setNotifications(data as Notification[]);
    setNotifLoading(false);
  }

  async function handleSignOut(){await supabase.auth.signOut();window.location.href='/auth/login';}

  if(pathname?.startsWith('/auth')) return null;
  const visibleNav = ALL_NAV.filter(i=>allowed.has(i.module));

  return (
    <>
      <aside className="fixed left-0 top-0 h-full w-64 flex flex-col z-40" style={{background:'rgba(8,13,26,0.95)',borderRight:'1px solid rgba(255,255,255,0.06)',backdropFilter:'blur(20px)'}}>
        {/* Logo */}
        <div className="px-6 py-7 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-black italic text-lg leading-none">A</span>
          </div>
          <div>
            <p className="text-white font-black italic tracking-tight text-lg leading-none">AAAS</p>
            <p className="text-white/30 text-xs mt-0.5">CRM SaaS</p>
          </div>
        </div>
        {/* Nav */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {!ready ? Array.from({length:5}).map((_,i)=><div key={i} className="h-10 rounded-2xl bg-white/5 animate-pulse mx-1"/>)
            : visibleNav.map(({href,label,icon:Icon})=>{
                const active = pathname===href||pathname?.startsWith(href+'/');
                return <Link key={href} href={href} className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all duration-200 group select-none ${active?'bg-indigo-600/20 text-indigo-400':'text-white/40 hover:text-white/80 hover:bg-white/5'}`}>
                  <Icon className={`w-4 h-4 flex-shrink-0 transition-colors ${active?'text-indigo-400':'text-white/30 group-hover:text-white/60'}`}/>
                  <span className="text-sm font-medium flex-1">{label}</span>
                  {active&&<ChevronRight className="w-3 h-3 text-indigo-400/60 flex-shrink-0"/>}
                </Link>;
              })}
        </nav>
        {/* Footer */}
        <div className="px-4 py-5 border-t border-white/5 space-y-2">
          {role&&(
            <div className="px-3 py-2 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-white/30 truncate">{userEmail}</p>
                <p className="text-xs font-bold uppercase tracking-widest text-indigo-400/70 mt-0.5">
                  {role==='admin'?'Administrateur':role==='commercial'?'Commercial':role==='user_standard'?'Utilisateur Standard':role==='partner'?'Partenaire':role}
                </p>
              </div>
              {/* 🔔 Bell */}
              <button onClick={()=>setDrawerOpen(true)} title={`${unread} notification${unread!==1?'s':''}`}
                style={{position:'relative',width:36,height:36,borderRadius:10,background:unread>0?'rgba(99,102,241,0.15)':'rgba(255,255,255,0.04)',border:`1px solid ${unread>0?'rgba(99,102,241,0.3)':'rgba(255,255,255,0.08)'}`,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0,transition:'all 0.2s'}}>
                <Bell style={{width:15,height:15,color:unread>0?'#818cf8':'rgba(255,255,255,0.3)'}}/>
                {unread>0&&<span style={{position:'absolute',top:-4,right:-4,minWidth:16,height:16,borderRadius:8,background:'#6366f1',color:'white',fontSize:9,fontWeight:900,display:'flex',alignItems:'center',justifyContent:'center',padding:'0 3px',boxShadow:'0 0 8px rgba(99,102,241,0.5)'}}>{unread>99?'99+':unread}</span>}
              </button>
            </div>
          )}
          <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-white/30 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-200 text-sm font-medium">
            <LogOut className="w-4 h-4 flex-shrink-0"/>Se déconnecter
          </button>
        </div>
      </aside>
      <NotificationDrawer open={drawerOpen} onClose={()=>setDrawerOpen(false)} notifications={notifications} setNotifications={setNotifications} loading={notifLoading}/>
    </>
  );
}