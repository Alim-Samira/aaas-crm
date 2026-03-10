// app/pipeline/page.tsx
//     FIX multi-click: disabled + loading state sur login
//     NOUVEAU: bouton Modifier sur chaque lead (crayon)
//     FIX commercial: assigned_to = user.id à la création
'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { Plus, GripVertical, DollarSign, X, AlertCircle, User, Pencil, Trash2, Check, UserPlus } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { PageLoader } from '@/components/LoadingScreen';
import type { Lead, LeadStatus, Contact } from '@/types';

interface UserProfile {
  id: string; full_name: string | null; email: string; role: string;
}

const COLUMNS: { id: LeadStatus; label: string; accent: string; dot: string }[] = [
  { id: 'new',         label: 'Nouveaux',  accent: 'border-t-cyan-500/70',    dot: 'bg-cyan-400'    },
  { id: 'in_progress', label: 'En cours',  accent: 'border-t-amber-500/70',   dot: 'bg-amber-400'   },
  { id: 'converted',   label: 'Convertis', accent: 'border-t-emerald-500/70', dot: 'bg-emerald-400' },
  { id: 'lost',        label: 'Perdus',    accent: 'border-t-rose-500/70',    dot: 'bg-rose-400'    },
];

// ── LeadCard avec bouton Modifier ────────────────────────────────
function LeadCard({ lead, index, onEdit, onDelete }: {
  lead: Lead; index: number;
  onEdit:   (l: Lead) => void;
  onDelete: (id: string) => void;
}) {
  const contact   = lead.contact as any;
  const hasContact = contact?.first_name;
  const initials   = hasContact
    ? `${contact.first_name[0]}${contact.last_name[0]}`.toUpperCase()
    : lead.title[0].toUpperCase();

  return (
    <Draggable draggableId={lead.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`rounded-2xl p-4 mb-3 cursor-grab select-none border transition-all duration-150 backdrop-blur-md group
            ${snapshot.isDragging
              ? 'shadow-2xl bg-white/20 scale-105 border-white/30 cursor-grabbing rotate-1 z-50'
              : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'}`}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-white leading-snug line-clamp-2 flex-1">
              {lead.title}
            </p>
            <div className="flex items-center gap-1 flex-shrink-0">
              {/*     Bouton Modifier */}
              <button
                onClick={e => { e.stopPropagation(); onEdit(lead); }}
                className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg bg-white/10 hover:bg-indigo-500/30
                  flex items-center justify-center text-white/40 hover:text-indigo-400
                  transition-all duration-150"
                title="Modifier"
              >
                <Pencil className="w-3 h-3" />
              </button>
              {/*     Bouton Supprimer */}
              <button
                onClick={e => { e.stopPropagation(); onDelete(lead.id); }}
                className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg bg-white/10 hover:bg-rose-500/30
                  flex items-center justify-center text-white/40 hover:text-rose-400
                  transition-all duration-150"
                title="Supprimer"
              >
                <Trash2 className="w-3 h-3" />
              </button>
              <div {...provided.dragHandleProps}
                className="text-white/20 hover:text-white/60 transition-colors mt-0.5">
                <GripVertical className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600
              flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
              {initials}
            </div>
            <span className="text-xs text-white/50 truncate">
              {hasContact
                ? `${contact.first_name} ${contact.last_name}`
                : <span className="italic text-white/25">Sans contact</span>}
            </span>
          </div>

          {lead.value > 0 && (
            <div className="flex items-center gap-1.5 mt-3 text-xs font-bold text-emerald-400">
              <DollarSign className="w-3.5 h-3.5" />{formatCurrency(lead.value)}
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}

// ── Modal Créer / Modifier lead ──────────────────────────────────
function LeadModal({
  mode, lead, defaultStatus, contacts, currentUserId, users, isAdmin,
  onClose, onSaved,
}: {
  mode: 'create' | 'edit';
  lead?: Lead;
  defaultStatus: LeadStatus;
  contacts: Contact[];
  currentUserId: string;
  users: UserProfile[];
  isAdmin: boolean;
  onClose: () => void;
  onSaved: (l: Lead) => void;
}) {
  const supabase  = getSupabaseClient();
  const [title,     setTitle]     = useState(lead?.title ?? '');
  const [value,     setValue]     = useState(String(lead?.value ?? ''));
  const [status,    setStatus]    = useState<LeadStatus>(lead?.status ?? defaultStatus);
  const [contactId, setContactId] = useState(lead?.contact_id ?? '');
  const [notes,     setNotes]     = useState(lead?.notes ?? '');
  const [assignedTo, setAssignedTo] = useState<string>(lead?.assigned_to ?? currentUserId);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return setError('Le titre est requis.');
    setSaving(true); setError('');
    try {
      const payload = {
        title:      title.trim(),
        value:      parseFloat(value) || 0,
        status,
        contact_id: contactId || null,
        notes:      notes || null,
        assigned_to: assignedTo || currentUserId,
      };

      let data: Lead | null = null;

      if (mode === 'create') {
        const { data: d, error: err } = await supabase
          .from('leads')
          .insert({ ...payload, assigned_to: currentUserId })
          .select('*, contact:contacts(first_name, last_name, email)')
          .single();
        if (err) throw new Error(err.message);
        data = d as Lead;
      } else {
        const { data: d, error: err } = await supabase
          .from('leads')
          .update(payload)
          .eq('id', lead!.id)
          .select('*, contact:contacts(first_name, last_name, email)')
          .single();
        if (err) throw new Error(err.message);
        data = d as Lead;
      }

      if (data) { onSaved(data); onClose(); }
    } catch (err: any) {
      setError(err.message ?? 'Erreur inconnue');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-3xl shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">
            {mode === 'create' ? 'Nouveau lead' : 'Modifier le lead'}
          </h3>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Titre *</label>
            <input
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 outline-none focus:border-white/30 transition-all"
              placeholder="Ex: Refonte site Acme"
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Valeur (€)</label>
            <input
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 outline-none focus:border-white/30 transition-all"
              type="number" min="0" step="100" placeholder="0"
              value={value}
              onChange={e => setValue(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Statut</label>
            <select
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white outline-none"
              value={status}
              onChange={e => setStatus(e.target.value as LeadStatus)}
            >
              {COLUMNS.map(c => <option key={c.id} value={c.id} className="bg-slate-900">{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Contact lié</label>
            <select
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white outline-none"
              value={contactId}
              onChange={e => setContactId(e.target.value)}
            >
              <option value="" className="bg-slate-900">— Sans contact —</option>
              {contacts.map(c => (
                <option key={c.id} value={c.id} className="bg-slate-900">
                  {c.first_name} {c.last_name}{c.email ? ` (${c.email})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-white/30 mb-2">
              <UserPlus className="w-3 h-3 inline mr-1"/>Assigner à
            </label>
            <select className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white outline-none"
              value={assignedTo} onChange={e=>setAssignedTo(e.target.value)}>
              {users.map(u=>(
                <option key={u.id} value={u.id} className="bg-slate-900">
                  {u.full_name||u.email}{u.id===currentUserId?' (moi)':''} — {u.role==='admin'?'Admin':u.role==='commercial'?'Commercial':u.role==='partner'?'Partenaire':'Standard'}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Notes</label>
            <textarea rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 outline-none focus:border-white/30 transition-all resize-none"
              placeholder="Notes internes…" value={notes} onChange={e=>setNotes(e.target.value)}/>
          </div>
          {error && (
            <div className="flex items-start gap-2 text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>{error}</span>
            </div>
          )}
          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/60 font-bold hover:bg-white/10 transition-all">
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-white text-black font-bold py-3 rounded-2xl hover:bg-white/90 flex items-center justify-center gap-2 transition-all disabled:opacity-60">
              {saving
                ? <><span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />{mode === 'create' ? 'Création…' : 'Sauvegarde…'}</>
                : mode === 'create'
                  ? <><Plus className="w-5 h-5" />Créer</>
                  : <><Check className="w-4 h-4" />Enregistrer</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page principale ──────────────────────────────────────────────
export default function PipelinePage() {
  const supabase = getSupabaseClient();
  const router   = useRouter();

  const [columns,       setColumns]       = useState<Record<LeadStatus, Lead[]>>({ new: [], in_progress: [], converted: [], lost: [] });
  const [contacts,      setContacts]      = useState<Contact[]>([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [users,         setUsers]         = useState<UserProfile[]>([]);
  const [isAdmin,       setIsAdmin]       = useState(false);
  const [loading,       setLoading]       = useState(true);
  const [modalMode,     setModalMode]     = useState<'create' | 'edit' | null>(null);
  const [editingLead,   setEditingLead]   = useState<Lead | undefined>(undefined);
  const [addForStatus,  setAddForStatus]  = useState<LeadStatus>('new');

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      const { data: leads } = await supabase
        .from('leads')
        .select('*, contact:contacts(first_name, last_name, email)')
        .order('created_at', { ascending: false });

      if (leads) {
        const cols: Record<LeadStatus, Lead[]> = { new: [], in_progress: [], converted: [], lost: [] };
        (leads as Lead[]).forEach(l => { if (cols[l.status]) cols[l.status].push(l); });
        setColumns(cols);
      }

      const { data: ctcts } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, email')
        .order('first_name');
      if (ctcts) setContacts(ctcts as Contact[]);

      // Load users for assignment
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
      const admin = profile?.role === 'admin'; setIsAdmin(admin);
      if (admin) {
        const { data: us } = await supabase.from('profiles').select('id,full_name,email,role').order('full_name',{ascending:true});
        setUsers((us??[]) as UserProfile[]);
      } else {
        const { data: me } = await supabase.from('profiles').select('id,full_name,email,role').eq('id',user.id).maybeSingle();
        if (me) setUsers([me as UserProfile]);
      }

      setLoading(false);
    }
    init();
  }, []);

  const onDragEnd = useCallback(async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const srcStatus  = source.droppableId as LeadStatus;
    const destStatus = destination.droppableId as LeadStatus;

    setColumns(prev => {
      const next     = { ...prev };
      const srcList  = [...prev[srcStatus]];
      const destList = srcStatus === destStatus ? srcList : [...prev[destStatus]];
      const [moved]  = srcList.splice(source.index, 1);
      destList.splice(destination.index, 0, { ...moved, status: destStatus });
      next[srcStatus] = srcList;
      if (srcStatus !== destStatus) next[destStatus] = destList;
      return next;
    });
    await supabase.from('leads').update({ status: destStatus }).eq('id', draggableId);
    router.refresh();
  }, [supabase, router]);

  function openCreate(status: LeadStatus) {
    setEditingLead(undefined);
    setAddForStatus(status);
    setModalMode('create');
  }

  function openEdit(lead: Lead) {
    setEditingLead(lead);
    setModalMode('edit');
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce lead ?')) return;
    await supabase.from('leads').delete().eq('id', id);
    setColumns(prev => {
      const next = { ...prev };
      for (const k of Object.keys(next) as LeadStatus[]) {
        next[k] = next[k].filter(l => l.id !== id);
      }
      return next;
    });
  }

  function handleSaved(lead: Lead) {
    setColumns(prev => {
      const next = { ...prev };
      // Retirer l'ancien si édition
      for (const k of Object.keys(next) as LeadStatus[]) {
        next[k] = next[k].filter(l => l.id !== lead.id);
      }
      // Ajouter dans la bonne colonne
      next[lead.status] = [lead, ...next[lead.status]];
      return next;
    });
  }

  if (loading) return <PageLoader label="Chargement du pipeline…" />;

  const totalLeads = Object.values(columns).flat().length;
  const totalValue = Object.values(columns).flat().reduce((s, l) => s + (l.value ?? 0), 0);

  return (
    <div className="p-4 lg:p-8 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight">Pipeline</h1>
          <p className="text-white/40 mt-1">
            {totalLeads} lead{totalLeads !== 1 ? 's' : ''} · <span className="text-emerald-400 font-semibold">{formatCurrency(totalValue)}</span> en jeu
          </p>
        </div>
        <button
          className="bg-white text-black px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:scale-105 transition-transform"
          onClick={() => openCreate('new')}
        >
          <Plus className="w-5 h-5" /> Nouveau
        </button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {COLUMNS.map(col => {
            const leads    = columns[col.id];
            const colValue = leads.reduce((s, l) => s + (l.value ?? 0), 0);
            return (
              <div key={col.id}
                className={`bg-white/5 backdrop-blur-md rounded-3xl border-t-4 ${col.accent} border-x border-b border-white/10 flex flex-col min-h-[580px]`}>
                <div className="p-5 border-b border-white/5">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                      <span className="font-bold text-white uppercase tracking-wider text-sm">{col.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-white/25 font-black text-sm">{leads.length}</span>
                      <button onClick={() => openCreate(col.id)}
                        className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/15 flex items-center justify-center text-white/30 hover:text-white transition-all">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {colValue > 0 && <p className="text-xs text-emerald-400 font-semibold pl-5">{formatCurrency(colValue)}</p>}
                </div>
                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div ref={provided.innerRef} {...provided.droppableProps}
                      className={`flex-1 p-3 overflow-y-auto rounded-b-3xl transition-colors ${snapshot.isDraggingOver ? 'bg-white/5' : ''}`}>
                      {leads.map((lead, i) => (
                        <LeadCard
                          key={lead.id}
                          lead={lead}
                          index={i}
                          onEdit={openEdit}
                          onDelete={handleDelete}
                        />
                      ))}
                      {provided.placeholder}
                      {leads.length === 0 && !snapshot.isDraggingOver && (
                        <div className="flex items-center justify-center h-24">
                          <p className="text-xs text-white/15">Glisser ici</p>
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* Modal créer / modifier */}
      {modalMode && (
        <LeadModal
          mode={modalMode}
          lead={editingLead}
          defaultStatus={addForStatus}
          contacts={contacts}
          currentUserId={currentUserId}
          users={users}
          isAdmin={isAdmin}
          onClose={() => { setModalMode(null); setEditingLead(undefined); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}