// app/settings/page.tsx
//  FIX 1 : Users non visibles → signUp() ne fonctionnait pas en prod,
//            remplacé par createUser via API route /api/admin/create-user
//            + fallback : chargement des users via service_role côté serveur
// FIX 2 : Nouvel onglet "Campagnes Email" (Brevo) pour admin
// FIX 3 : isAdmin lu depuis p.role directement (pas rpc qui peut échouer)
'use client';

import { useEffect, useState } from 'react';
import {
  User, Shield, Briefcase, Handshake,
  CheckCircle, Loader2, UserPlus, Trash2,
  Eye, EyeOff, AlertCircle, Clock, Check, X,
  ToggleLeft, ToggleRight, Users, Mail,
  Send, BarChart2, Plus, RefreshCw, Pencil,
} from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';
import { PageLoader } from '@/components/LoadingScreen';
import type { Profile, AppRole, AccessRequest, ModulePermission } from '@/types';

const ROLE_CFG: Record<AppRole, { label: string; labelFr: string; icon: React.ElementType; badge: string }> = {
  admin:         { label: 'Admin',           labelFr: 'Administrateur',      icon: Shield,    badge: 'bg-purple-500/10 border-purple-500/20 text-purple-400' },
  user_standard: { label: 'User Standard',   labelFr: 'Utilisateur Standard',icon: User,      badge: 'bg-amber-500/10  border-amber-500/20  text-amber-400'  },
  commercial:    { label: 'Commercial',      labelFr: 'Commercial',          icon: Briefcase, badge: 'bg-blue-500/10   border-blue-500/20   text-blue-400'   },
  partner:       { label: 'Partenaire',      labelFr: 'Partenaire',          icon: Handshake, badge: 'bg-teal-500/10   border-teal-500/20   text-teal-400'   },
};

const MODULES     = ['dashboard','pipeline','contacts','companies','tasks','settings'];
const MOD_LABELS: Record<string,string> = {
  dashboard:'📊 Dashboard', pipeline:'🎯 Pipeline', contacts:'👤 Contacts',
  companies:'🏢 Entreprises', tasks:' Tâches', settings:'⚙️ Paramètres',
};

type Tab = 'profile' | 'requests' | 'users' | 'permissions' | 'campaigns';

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_CFG[role as AppRole] ?? ROLE_CFG.commercial;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${cfg.badge}`}>
      <Icon className="w-3 h-3" />{cfg.labelFr}
    </span>
  );
}

/* ══════════════════════════════════════════════════════════════
   ACCESS REQUESTS
══════════════════════════════════════════════════════════════ */
function AccessRequestsPanel() {
  const supabase = getSupabaseClient();
  const [reqs, setReqs]     = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('access_requests').select('*').order('created_at', { ascending: false });
    if (data) setReqs(data as AccessRequest[]);
    setLoading(false);
  }

  async function decide(req: AccessRequest, decision: 'approved' | 'rejected') {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('access_requests')
      .update({ status: decision, reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
      .eq('id', req.id);
    if (decision === 'approved') {
      await supabase.rpc('update_user_role', { target_user_id: req.user_id, new_role: req.requested_role });
    }
    setReqs(prev => prev.map(r => r.id === req.id ? { ...r, status: decision } : r));
  }

  const pending  = reqs.filter(r => r.status === 'pending');
  const reviewed = reqs.filter(r => r.status !== 'pending');

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-white/20 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      {pending.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <CheckCircle className="w-10 h-10 text-emerald-500/30" />
          <p className="text-white/20 text-sm">Aucune demande en attente</p>
        </div>
      ) : pending.map(req => (
        <div key={req.id} className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                {req.full_name?.[0] ?? req.email[0].toUpperCase()}
              </div>
              <div>
                <p className="text-white font-bold">{req.full_name ?? '—'}</p>
                <p className="text-xs text-white/40">{req.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full font-bold uppercase tracking-widest flex items-center gap-1">
                <Clock className="w-3 h-3" /> En attente
              </span>
              <RoleBadge role={req.requested_role} />
            </div>
          </div>
          {req.justification && (
            <div className="mt-4 bg-white/5 rounded-xl p-3">
              <p className="text-xs text-white/40 uppercase tracking-widest font-bold mb-1">Justification</p>
              <p className="text-sm text-white/70">{req.justification}</p>
            </div>
          )}
          <div className="flex gap-3 mt-4">
            <button onClick={() => decide(req, 'approved')}
              className="flex items-center gap-2 bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-emerald-400 transition-all text-sm">
              <Check className="w-4 h-4" /> Approuver
            </button>
            <button onClick={() => decide(req, 'rejected')}
              className="flex items-center gap-2 bg-white/10 text-white/60 hover:text-white hover:bg-white/20 font-bold px-5 py-2.5 rounded-xl transition-all text-sm">
              <X className="w-4 h-4" /> Refuser
            </button>
          </div>
        </div>
      ))}
      {reviewed.length > 0 && (
        <details>
          <summary className="cursor-pointer text-xs text-white/30 font-bold uppercase tracking-widest hover:text-white/60 transition-colors mt-2">
            {reviewed.length} traitée{reviewed.length > 1 ? 's' : ''}
          </summary>
          <div className="mt-3 space-y-2">
            {reviewed.map(req => (
              <div key={req.id} className={`flex items-center justify-between p-4 rounded-xl border ${req.status === 'approved' ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${req.status === 'approved' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                  <span className="text-sm text-white/70">{req.full_name ?? req.email}</span>
                  <RoleBadge role={req.requested_role} />
                </div>
                <span className={`text-xs font-bold uppercase tracking-widest ${req.status === 'approved' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {req.status === 'approved' ? 'Approuvé' : 'Refusé'}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   PERMISSIONS MATRIX
══════════════════════════════════════════════════════════════ */
function PermissionsMatrix() {
  const supabase = getSupabaseClient();
  const [perms,   setPerms]   = useState<ModulePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState<string | null>(null);

  useEffect(() => {
    supabase.from('module_permissions').select('*')
      .then(({ data }) => { if (data) setPerms(data as ModulePermission[]); setLoading(false); });
  }, []);

  async function toggle(module: string, role: AppRole) {
    const key = `${module}-${role}`;
    setSaving(key);
    const cur = perms.find(p => p.module === module && p.role === role);
    const val = cur ? !cur.can_access : true;
    await supabase.from('module_permissions').upsert({ module, role, can_access: val }, { onConflict: 'module,role' });
    setPerms(prev => {
      if (prev.find(p => p.module === module && p.role === role))
        return prev.map(p => p.module === module && p.role === role ? { ...p, can_access: val } : p);
      return [...prev, { id: key, module, role, can_access: val }];
    });
    setSaving(null);
  }

  function get(module: string, role: AppRole) {
    return perms.find(p => p.module === module && p.role === role)?.can_access ?? false;
  }

  const roles: AppRole[] = ['admin', 'user_standard', 'commercial', 'partner'];
  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-white/20 animate-spin" /></div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-widest text-white/30 w-44">Module</th>
            {roles.map(r => <th key={r} className="px-4 py-3 text-center"><RoleBadge role={r} /></th>)}
          </tr>
        </thead>
        <tbody>
          {MODULES.map((m, i) => (
            <tr key={m} className={`border-t border-white/5 ${i % 2 === 0 ? 'bg-white/[0.02]' : ''}`}>
              <td className="px-4 py-4 text-sm font-medium text-white/70">{MOD_LABELS[m]}</td>
              {roles.map(role => {
                const key    = `${m}-${role}`;
                const on     = get(m, role);
                const locked = role === 'admin';
                return (
                  <td key={role} className="px-4 py-4 text-center">
                    <button onClick={() => !locked && toggle(m, role)} disabled={locked || saving === key}
                      className={`transition-all duration-200 ${locked ? 'cursor-not-allowed opacity-40' : 'hover:scale-110 cursor-pointer'}`}>
                      {saving === key
                        ? <Loader2 className="w-5 h-5 text-white/30 animate-spin mx-auto" />
                        : on
                          ? <ToggleRight className="w-8 h-8 text-emerald-400 mx-auto" />
                          : <ToggleLeft  className="w-8 h-8 text-white/20 mx-auto" />}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-white/20 mt-4 px-4">* L'admin a toujours accès à tous les modules.</p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   USER MANAGEMENT
    FIX : signUp() ne crée pas de profil visible en prod
   → on crée via la table profiles directement après signup
   → on recharge depuis profiles (pas depuis auth.users)
══════════════════════════════════════════════════════════════ */
function UserManagementPanel() {
  const supabase = getSupabaseClient();
  const [users,    setUsers]    = useState<Profile[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [invEmail, setInvEmail] = useState('');
  const [invName,  setInvName]  = useState('');
  const [invRole,  setInvRole]  = useState<AppRole>('commercial');
  const [invPwd,   setInvPwd]   = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error,    setError]    = useState('');

  useEffect(() => { load(); }, []);

  //  FIX : charge depuis public.profiles (pas auth.admin.listUsers qui nécessite service_role)
  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, avatar_url, created_at')
      .order('created_at', { ascending: false });
    if (data) setUsers(data as Profile[]);
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!invEmail || !invPwd) return setError('Email et mot de passe requis.');
    if (invPwd.length < 6)    return setError('Minimum 6 caractères.');
    setSaving(true); setError(''); setFeedback('');

    try {
      //  FIX USERS NON VISIBLES :
      // On passe par l'API route /api/admin/create-user qui utilise
      // le service_role pour créer l'utilisateur ET le profil immédiatement.
      // signUp() côté client ne fonctionnait pas en prod (confirmation email requise).
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email:     invEmail,
          password:  invPwd,
          full_name: invName || null,
          role:      invRole,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? 'Erreur création utilisateur');
        setSaving(false);
        return;
      }

      setFeedback(` Compte créé : ${invEmail}`);
      setInvEmail(''); setInvName(''); setInvPwd('');
      setShowForm(false);
      // Recharger immédiatement (le profil est déjà en base)
      await load();
      setTimeout(() => setFeedback(''), 3000);
    } catch (err: any) {
      setError(err.message ?? 'Erreur réseau');
    } finally {
      setSaving(false);
    }
  }

  async function changeRole(userId: string, role: AppRole) {
    const { error } = await supabase.rpc('update_user_role', { target_user_id: userId, new_role: role });
    if (!error) setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
  }

  async function del(userId: string) {
    if (!confirm('Supprimer cet utilisateur ?')) return;
    await supabase.from('profiles').delete().eq('id', userId);
    setUsers(prev => prev.filter(u => u.id !== userId));
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <p className="text-sm text-white/40">{users.length} utilisateur{users.length > 1 ? 's' : ''}</p>
          <button onClick={load} className="text-white/20 hover:text-white/60 transition-colors" title="Actualiser">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-white text-black font-bold px-5 py-2.5 rounded-2xl hover:scale-105 transition-transform text-sm">
          <UserPlus className="w-4 h-4" />{showForm ? 'Annuler' : 'Créer un utilisateur'}
        </button>
      </div>

      {feedback && <p className="text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2">{feedback}</p>}

      {showForm && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Nouveau compte</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Nom</label>
                <input className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 outline-none focus:border-white/30 transition-all"
                  placeholder="Jean Dupont" value={invName} onChange={e => setInvName(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Email *</label>
                <input type="email" className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 outline-none focus:border-white/30 transition-all"
                  placeholder="jean@exemple.com" value={invEmail} onChange={e => setInvEmail(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Rôle</label>
                <select className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white outline-none"
                  value={invRole} onChange={e => setInvRole(e.target.value as AppRole)}>
                  {(Object.entries(ROLE_CFG) as [AppRole, typeof ROLE_CFG[AppRole]][])
                    .map(([id, cfg]) => <option key={id} value={id} className="bg-slate-900">{cfg.labelFr}</option>)}
                </select>
              </div>
              <div className="relative">
                <label className="block text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Mot de passe *</label>
                <input type={showPwd ? 'text' : 'password'}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 pr-12 text-white placeholder-white/20 outline-none focus:border-white/30 transition-all"
                  placeholder="Min. 6" value={invPwd} onChange={e => setInvPwd(e.target.value)} />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-4 bottom-3 text-white/30 hover:text-white transition-colors">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {error && (
              <div className="flex items-center gap-2 text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2">
                <AlertCircle className="w-4 h-4" />{error}
              </div>
            )}
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 bg-white text-black font-bold px-6 py-3 rounded-2xl hover:bg-white/90 transition-all disabled:opacity-60">
              {saving ? <><span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />Création…</> : <><UserPlus className="w-4 h-4" />Créer</>}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 text-white/20 animate-spin" /></div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full">
            <thead className="border-b border-white/10">
              <tr>
                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-widest text-white/30">Utilisateur</th>
                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-widest text-white/30 hidden md:table-cell">Email</th>
                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-widest text-white/30">Rôle</th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                        {u.full_name?.[0] ?? u.email[0].toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-white">{u.full_name ?? '—'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-white/50 hidden md:table-cell">{u.email}</td>
                  <td className="px-6 py-4">
                    <select
                      className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold text-white outline-none cursor-pointer"
                      value={u.role}
                      onChange={e => changeRole(u.id, e.target.value as AppRole)}>
                      {(Object.entries(ROLE_CFG) as [AppRole, typeof ROLE_CFG[AppRole]][])
                        .map(([id, cfg]) => <option key={id} value={id} className="bg-slate-900">{cfg.labelFr}</option>)}
                    </select>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => del(u.id)} className="text-white/20 hover:text-rose-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={4} className="text-center py-10 text-white/20 text-sm">
                  Aucun utilisateur trouvé. Cliquez sur "Actualiser" ↑
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   CAMPAGNES EMAIL — PREMIUM GLASSMORPHISM
   aperçu haute qualité · éditeur riche · brouillons/envoyées
══════════════════════════════════════════════════════════════ */

interface Campaign {
  id: string;
  name: string;
  subject: string;
  body: string | null;
  status: 'draft' | 'sent' | 'scheduled';
  recipients: number;
  target_role: string;
  sent_at: string | null;
  created_at: string;
}

// ─── Email Preview Modal ─────────────────────────────────────
function PreviewModal({ c, onClose }: { c: Campaign; onClose: () => void }) {
  const dateStr = c.sent_at
    ? new Date(c.sent_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  const previewBody = (c.body ?? '')
    .replace(/\{\{first_name\}\}/g, 'Samira')
    .replace(/\{\{last_name\}\}/g, 'Alim')
    .replace(/\{\{email\}\}/g, 'samira@exemple.fr');

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }} onClick={onClose}>
      <div style={{
        width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto',
        background: '#080d1a', borderRadius: 24,
        border: '1px solid rgba(99,102,241,0.2)',
        boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
      }} onClick={e => e.stopPropagation()}>

        {/* Modal header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Eye style={{ width: 14, height: 14, color: '#818cf8' }} />
            </div>
            <div>
              <p style={{ color: 'white', fontSize: 13, fontWeight: 800, margin: 0 }}>Aperçu email</p>
              <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, margin: 0 }}>Rendu simulé · Données fictives</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}>
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>

        {/* Email render */}
        <div style={{ padding: '24px' }}>
          <div style={{ background: '#0a0f1e', borderRadius: 20, border: '1px solid rgba(99,102,241,0.12)', overflow: 'hidden' }}>

            {/* Email header */}
            <div style={{ background: 'linear-gradient(135deg,#1e1b4b 0%,#2e1065 50%,#1e1b4b 100%)', padding: '24px 28px', borderBottom: '1px solid rgba(99,102,241,0.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 12, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 900, color: 'white', fontStyle: 'italic' }}>A</div>
                <div>
                  <p style={{ color: 'white', fontWeight: 900, fontSize: 15, margin: 0 }}>AAAS CRM</p>
                  <p style={{ color: 'rgba(199,210,254,0.45)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', margin: 0 }}>Communication Digitale</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
                {[
                  { l: 'De', v: 'AAAS CRM' },
                  { l: 'À', v: 'Samira Alim' },
                  { l: 'Date', v: dateStr },
                ].map(m => (
                  <div key={m.l} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '4px 10px', fontSize: 10 }}>
                    <span style={{ color: 'rgba(255,255,255,0.3)' }}>{m.l} : </span>
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>{m.v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Subject */}
            <div style={{ padding: '18px 28px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, margin: '0 0 4px' }}>Objet</p>
              <p style={{ color: 'white', fontSize: 16, fontWeight: 800, margin: '0 0 18px' }}>{c.subject}</p>
            </div>

            {/* Body */}
            <div style={{ padding: '20px 28px 24px' }}>
              <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.85, whiteSpace: 'pre-wrap' as const }}>{previewBody}</div>
            </div>

            {/* Footer */}
            <div style={{ padding: '14px 28px', background: 'rgba(8,12,25,0.8)', borderTop: '1px solid rgba(99,102,241,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#334155', fontSize: 10 }}>AAAS CRM · Automatisation digitale</span>
              <span style={{ color: 'rgba(99,102,241,0.45)', fontSize: 9, padding: '2px 8px', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 20 }}>Brevo</span>
            </div>
          </div>
        </div>

        <div style={{ padding: '0 24px 24px', display: 'flex', justifyContent: 'center' }}>
          <button onClick={onClose} style={{ padding: '10px 28px', borderRadius: 14, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            Fermer l'aperçu
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Editor Modal ─────────────────────────────────────────────
function EditorModal({
  mode, camp, contacts, onClose, onSaved,
}: {
  mode: 'create' | 'edit';
  camp?: Campaign;
  contacts: { email: string; first_name: string; last_name: string }[];
  onClose: () => void;
  onSaved: (c: Campaign) => void;
}) {
  const supabase = getSupabaseClient();
  const [name,    setName]    = useState(camp?.name    ?? '');
  const [subject, setSubject] = useState(camp?.subject ?? '');
  const [body,    setBody]    = useState(camp?.body    ?? '');
  const [target,  setTarget]  = useState<string>(camp?.target_role ?? 'all');
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState('');
  const [showPre, setShowPre] = useState(false);

  const previewCamp: Campaign = {
    id: camp?.id ?? 'preview', name, subject, body, status: 'draft',
    recipients: 0, target_role: target, sent_at: null, created_at: new Date().toISOString(),
  };

  async function handleSave() {
    if (!name.trim() || !subject.trim() || !body.trim()) { setErr('Tous les champs sont requis.'); return; }
    setSaving(true); setErr('');
    let recipCount = contacts.length;
    if (target !== 'all') {
      const { data: pr } = await supabase.from('profiles').select('email').eq('role', target).not('email', 'is', null);
      const s = new Set((pr ?? []).map((p: any) => p.email?.toLowerCase()));
      recipCount = contacts.filter(c => c.email && s.has(c.email.toLowerCase())).length || contacts.length;
    }

    if (mode === 'create') {
      const { data, error } = await supabase.from('email_campaigns').insert({ name, subject, body, status: 'draft', recipients: recipCount, target_role: target }).select().single();
      if (error) { setErr('Table email_campaigns manquante — exécutez le SQL dans Supabase.'); setSaving(false); return; }
      onSaved(data as Campaign);
    } else if (camp) {
      const { data, error } = await supabase.from('email_campaigns').update({ name, subject, body, target_role: target, recipients: recipCount }).eq('id', camp.id).select().single();
      if (error) { setErr(error.message); setSaving(false); return; }
      onSaved(data as Campaign);
    }
    setSaving(false);
  }

  const TEMPLATES = [
    { name: '🎉 Newsletter', subject: 'Actualités AAAS — ce mois-ci', body: 'Bonjour {{first_name}},\n\nVoici les dernières actualités.\n\n🚀 Nouveautés\n• Nouvelles fonctionnalités CRM\n• Optimisation pipeline\n\nCordialement,\nL\'équipe AAAS' },
    { name: '💰 Promo -30%', subject: "Offre exclusive jusqu'à -30%", body: 'Bonjour {{first_name}},\n\nNous avons une offre exceptionnelle pour vous.\n\n🔥 -30% sur nos prestations\n• Audit stratégie digitale\n• Configuration CRM\n• Formation équipe\n\nRépondez à cet email pour en profiter.\n\nCordialement,\nL\'équipe AAAS' },
    { name: '👋 Bienvenue', subject: 'Bienvenue chez AAAS, {{first_name}} !', body: 'Bonjour {{first_name}},\n\nBienvenue dans notre CRM !\n\n🎯 Pour commencer :\n1. Complétez votre profil\n2. Explorez le dashboard\n3. Créez votre premier lead\n\nNotre équipe est à votre disposition.\n\nCordialement,\nL\'équipe AAAS' },
  ];

  return (
    <>
      {showPre && <PreviewModal c={previewCamp} onClose={() => setShowPre(false)} />}
      <div style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={onClose}>
        <div style={{ width: '100%', maxWidth: 680, maxHeight: '92vh', overflowY: 'auto', background: '#0d1117', borderRadius: 24, border: '1px solid rgba(99,102,241,0.2)', boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }} onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 11, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {mode === 'create' ? <Plus style={{ width: 15, height: 15, color: '#818cf8' }} /> : <Pencil style={{ width: 14, height: 14, color: '#818cf8' }} />}
              </div>
              <div>
                <p style={{ color: 'white', fontSize: 14, fontWeight: 800, margin: 0 }}>{mode === 'create' ? 'Nouvelle campagne' : 'Modifier la campagne'}</p>
                <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, margin: 0 }}>Variables : {'{{first_name}}'} {'{{last_name}}'} {'{{email}}'}</p>
              </div>
            </div>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}>
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>

          <div style={{ padding: 24, display: 'flex', flexDirection: 'column' as const, gap: 18 }}>
            {/* Templates */}
            {mode === 'create' && (
              <div>
                <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>Partir d'un template</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                  {TEMPLATES.map(t => (
                    <button key={t.name} onClick={() => { setName(t.name); setSubject(t.subject); setBody(t.body); }}
                      style={{ padding: '6px 14px', borderRadius: 10, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)', color: 'rgba(199,210,254,0.7)', fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}>
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Name + Target row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.25)', marginBottom: 8 }}>Nom *</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Newsletter mars 2026"
                  style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '11px 16px', color: 'white', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.25)', marginBottom: 8 }}>Destinataires</label>
                <select value={target} onChange={e => setTarget(e.target.value)}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '11px 16px', color: 'white', fontSize: 13, outline: 'none', cursor: 'pointer' }}>
                  <option value="all" style={{ background: '#0d1117' }}>Tous les contacts</option>
                  <option value="commercial" style={{ background: '#0d1117' }}>Commerciaux uniquement</option>
                  <option value="partner" style={{ background: '#0d1117' }}>Partenaires uniquement</option>
                  <option value="admin" style={{ background: '#0d1117' }}>Admins uniquement</option>
                </select>
              </div>
            </div>

            {/* Subject */}
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.25)', marginBottom: 8 }}>Objet de l'email *</label>
              <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Ex: Découvrez nos nouveautés"
                style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '11px 16px', color: 'white', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }} />
            </div>

            {/* Body */}
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.25)', marginBottom: 8 }}>Contenu *</label>
              <textarea rows={8} value={body} onChange={e => setBody(e.target.value)} placeholder={'Bonjour {{first_name}},\n\nVotre message ici…'}
                style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '11px 16px', color: 'white', fontSize: 13, outline: 'none', resize: 'none' as const, fontFamily: 'inherit', lineHeight: 1.7, boxSizing: 'border-box' as const }} />
            </div>

            {err && <p style={{ color: '#f87171', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '10px 14px', fontSize: 12, margin: 0 }}>{err}</p>}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center' }}>
              <button onClick={() => setShowPre(true)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 13, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)', color: '#818cf8', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                <Eye style={{ width: 13, height: 13 }} /> Aperçu
              </button>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 13, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Annuler</button>
                <button onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 22px', borderRadius: 13, background: 'white', border: 'none', color: 'black', fontSize: 12, fontWeight: 800, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                  {saving ? <><Loader2 style={{ width: 13, height: 13, animation: 'spin 0.6s linear infinite' }} /> Sauvegarde…</> : <><Check style={{ width: 13, height: 13 }} /> {mode === 'create' ? 'Créer' : 'Enregistrer'}</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Campaign Card ────────────────────────────────────────────
function CampaignCard({ c, onEdit, onDelete, onSend, onPreview, sending }: {
  c: Campaign; onEdit: () => void; onDelete: () => void;
  onSend: () => void; onPreview: () => void; sending: boolean;
}) {
  const isSent = c.status === 'sent';
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${isSent ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 18, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' as const, transition: 'transform 0.15s' }}>
      <div style={{ width: 40, height: 40, borderRadius: 13, background: isSent ? 'rgba(52,211,153,0.08)' : 'rgba(99,102,241,0.08)', border: `1px solid ${isSent ? 'rgba(52,211,153,0.15)' : 'rgba(99,102,241,0.15)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {isSent ? <CheckCircle style={{ width: 17, height: 17, color: '#34d399' }} /> : <Mail style={{ width: 17, height: 17, color: '#818cf8' }} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3, flexWrap: 'wrap' as const }}>
          <p style={{ color: 'white', fontWeight: 800, fontSize: 14, margin: 0 }}>{c.name}</p>
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, padding: '2px 10px', borderRadius: 20, border: '1px solid', ...(isSent ? { color: '#34d399', background: 'rgba(52,211,153,0.08)', borderColor: 'rgba(52,211,153,0.2)' } : { color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }) }}>
            {isSent ? 'ENVOYÉE' : 'BROUILLON'}
          </span>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{c.subject}</p>
        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, margin: '3px 0 0' }}>
          {c.recipients} destinataire{c.recipients !== 1 ? 's' : ''}
          {c.sent_at && ` · Envoyée ${new Date(c.sent_at).toLocaleDateString('fr-FR')}`}
        </p>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
        <button onClick={onPreview} title="Aperçu" style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#818cf8' }}>
          <Eye style={{ width: 14, height: 14 }} />
        </button>
        {!isSent && (
          <>
            <button onClick={onEdit} title="Modifier" style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}>
              <Pencil style={{ width: 13, height: 13 }} />
            </button>
            <button onClick={onDelete} title="Supprimer" style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(239,68,68,0.5)' }}>
              <Trash2 style={{ width: 13, height: 13 }} />
            </button>
            <button onClick={onSend} disabled={sending} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0 16px', height: 34, borderRadius: 10, background: sending ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.9)', border: 'none', color: 'white', fontSize: 12, fontWeight: 800, cursor: sending ? 'not-allowed' : 'pointer', transition: 'all 0.15s' }}>
              {sending ? <><Loader2 style={{ width: 13, height: 13, animation: 'spin 0.6s linear infinite' }} /> Envoi…</> : <><Send style={{ width: 13, height: 13 }} /> Envoyer via Brevo</>}
            </button>
          </>
        )}
        {isSent && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#34d399', fontSize: 12, fontWeight: 700 }}>
            <CheckCircle style={{ width: 14, height: 14 }} /> Envoyée
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main CampaignsPanel ──────────────────────────────────────
function CampaignsPanel() {
  const supabase = getSupabaseClient();
  const [camps,    setCamps]    = useState<Campaign[]>([]);
  const [contacts, setContacts] = useState<{ email: string; first_name: string; last_name: string }[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [sending,  setSending]  = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [errMsg,   setErrMsg]   = useState('');
  const [editor,   setEditor]   = useState<{ mode: 'create' | 'edit'; camp?: Campaign } | null>(null);
  const [preview,  setPreview]  = useState<Campaign | null>(null);
  const [tab,      setTab]      = useState<'drafts' | 'sent'>('drafts');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data: c } = await supabase.from('email_campaigns').select('*').order('created_at', { ascending: false });
    if (c) setCamps(c as Campaign[]);
    const { data: ct } = await supabase.from('contacts').select('email, first_name, last_name').not('email', 'is', null);
    if (ct) setContacts(ct);
    setLoading(false);
  }

  async function handleSend(c: Campaign) {
    setSending(c.id); setFeedback(''); setErrMsg('');
    try {
      const res = await fetch('/api/brevo/campaign', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campaignId: c.id }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? 'Erreur envoi');
      setFeedback(`✅ "${c.name}" envoyée à ${j.sent} destinataire${j.sent !== 1 ? 's' : ''} !`);
      setTab('sent');
      load();
    } catch (e: any) { setErrMsg(e.message); }
    finally { setSending(null); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette campagne ?')) return;
    await supabase.from('email_campaigns').delete().eq('id', id);
    setCamps(prev => prev.filter(c => c.id !== id));
  }

  function upsertCamp(c: Campaign) {
    setEditor(null);
    setCamps(prev => {
      const i = prev.findIndex(p => p.id === c.id);
      if (i >= 0) { const n = [...prev]; n[i] = c; return n; }
      return [c, ...prev];
    });
  }

  const drafts = camps.filter(c => c.status !== 'sent');
  const sent   = camps.filter(c => c.status === 'sent');

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(99,102,241,0.6)' }}>
        <Loader2 style={{ width: 18, height: 18, animation: 'spin 0.6s linear infinite' }} />
        <span style={{ fontSize: 13 }}>Chargement…</span>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeInUp { from { opacity:0;transform:translateY(8px); } to { opacity:1;transform:none; } }
        .camp-panel { animation: fadeInUp 0.3s ease; }
      `}</style>

      {editor && (
        <EditorModal mode={editor.mode} camp={editor.camp} contacts={contacts} onClose={() => setEditor(null)} onSaved={upsertCamp} />
      )}
      {preview && <PreviewModal c={preview} onClose={() => setPreview(null)} />}

      <div className="camp-panel" style={{ display: 'flex', flexDirection: 'column' as const, gap: 20 }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
          {[
            { label: 'Total',       value: camps.length,   icon: Mail,        c: '#818cf8', bg: 'rgba(99,102,241,0.08)',  b: 'rgba(99,102,241,0.15)'  },
            { label: 'Brouillons',  value: drafts.length,  icon: Pencil,      c: '#fbbf24', bg: 'rgba(245,158,11,0.08)',  b: 'rgba(245,158,11,0.15)'  },
            { label: 'Envoyées',    value: sent.length,    icon: CheckCircle, c: '#34d399', bg: 'rgba(16,185,129,0.08)',  b: 'rgba(16,185,129,0.15)'  },
          ].map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.b}`, borderRadius: 16, padding: '14px 16px' }}>
                <Icon style={{ width: 16, height: 16, color: s.c, marginBottom: 8 }} />
                <p style={{ fontSize: 24, fontWeight: 900, color: 'white', margin: '0 0 2px' }}>{s.value}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: 0 }}>{s.label}</p>
              </div>
            );
          })}
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: 12 }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 4 }}>
            {([
              { key: 'drafts', label: 'Brouillons', count: drafts.length },
              { key: 'sent',   label: 'Envoyées',   count: sent.length   },
            ] as const).map(t => {
              const active = tab === t.key;
              return (
                <button key={t.key} onClick={() => setTab(t.key)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 10, border: 'none', background: active ? 'white' : 'transparent', color: active ? 'black' : 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: 800, cursor: 'pointer', transition: 'all 0.15s' }}>
                  {t.label}
                  {t.count > 0 && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 20, background: active ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)', color: active ? 'black' : 'rgba(255,255,255,0.3)' }}>{t.count}</span>}
                </button>
              );
            })}
          </div>
          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={load} title="Actualiser" style={{ width: 36, height: 36, borderRadius: 11, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.25)', cursor: 'pointer' }}>
              <RefreshCw style={{ width: 14, height: 14 }} />
            </button>
            <button onClick={() => setEditor({ mode: 'create' })} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'white', border: 'none', borderRadius: 12, padding: '0 18px', height: 36, color: 'black', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
              <Plus style={{ width: 14, height: 14 }} /> Nouvelle campagne
            </button>
          </div>
        </div>

        {feedback && <p style={{ color: '#34d399', background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)', borderRadius: 12, padding: '10px 14px', fontSize: 12, margin: 0 }}>{feedback}</p>}
        {errMsg   && <p style={{ color: '#f87171', background: 'rgba(239,68,68,0.06)',  border: '1px solid rgba(239,68,68,0.15)',  borderRadius: 12, padding: '10px 14px', fontSize: 12, margin: 0 }}>❌ {errMsg}</p>}

        {/* Campaign list */}
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
          {(tab === 'drafts' ? drafts : sent).length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', padding: '48px 0', gap: 14 }}>
              <div style={{ width: 52, height: 52, borderRadius: 18, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {tab === 'drafts' ? <Pencil style={{ width: 20, height: 20, color: 'rgba(255,255,255,0.1)' }} /> : <CheckCircle style={{ width: 20, height: 20, color: 'rgba(255,255,255,0.1)' }} />}
              </div>
              <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13, margin: 0 }}>
                {tab === 'drafts' ? 'Aucun brouillon — créez votre première campagne' : 'Aucune campagne envoyée'}
              </p>
              {tab === 'drafts' && (
                <button onClick={() => setEditor({ mode: 'create' })} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#818cf8', background: 'none', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  <Plus style={{ width: 14, height: 14 }} /> Créer une campagne
                </button>
              )}
            </div>
          ) : (tab === 'drafts' ? drafts : sent).map(c => (
            <CampaignCard key={c.id} c={c}
              onEdit={() => setEditor({ mode: 'edit', camp: c })}
              onDelete={() => handleDelete(c.id)}
              onSend={() => handleSend(c)}
              onPreview={() => setPreview(c)}
              sending={sending === c.id}
            />
          ))}
        </div>

        {/* SQL hint */}
        <details style={{ marginTop: 8 }}>
          <summary style={{ fontSize: 11, color: 'rgba(99,102,241,0.5)', cursor: 'pointer', userSelect: 'none' as const }}>⚠️ Si les campagnes ne s'affichent pas — SQL requis</summary>
          <pre style={{ marginTop: 10, fontSize: 10, color: 'rgba(99,102,241,0.55)', background: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: '12px 16px', overflowX: 'auto' as const }}>{`CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL, subject TEXT NOT NULL, body TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','sent','scheduled')),
  recipients INT DEFAULT 0, target_role TEXT DEFAULT 'all',
  sent_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campaigns_admin" ON public.email_campaigns FOR ALL USING (public.is_admin());`}</pre>
        </details>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   PAGE PRINCIPALE SETTINGS
══════════════════════════════════════════════════════════════ */
export default function SettingsPage() {
  const supabase = getSupabaseClient();
  const [profile,      setProfile]      = useState<Profile | null>(null);
  const [isAdmin,      setIsAdmin]      = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [fullName,     setFullName]     = useState('');
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [loadErr,      setLoadErr]      = useState('');
  const [tab,          setTab]          = useState<Tab>('profile');
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data, error: err } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, avatar_url, created_at')
        .eq('id', user.id)
        .maybeSingle();

      if (err) {
        setLoadErr(`Erreur: ${err.message}`);
      } else if (!data) {
        //  Auto-créer le profil s'il est absent
        const { data: created } = await supabase.from('profiles').upsert({
          id: user.id, email: user.email!, full_name: null, role: 'commercial',
        }, { onConflict: 'id' }).select().maybeSingle();
        if (created) {
          setProfile(created as Profile);
          setFullName((created as Profile).full_name ?? '');
          setIsAdmin(false);
        } else {
          setLoadErr('Profil introuvable. Reconnectez-vous.');
        }
      } else {
        const p = data as Profile;
        setProfile(p);
        setFullName(p.full_name ?? '');

        //  FIX : lire isAdmin depuis p.role directement (pas rpc qui peut échouer)
        const admin = p.role === 'admin';
        setIsAdmin(admin);

        if (admin) {
          const { count } = await supabase
            .from('access_requests')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');
          setPendingCount(count ?? 0);
        }
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    await supabase.from('profiles').update({ full_name: fullName }).eq('id', profile.id);
    setProfile({ ...profile, full_name: fullName });
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500);
  }

  if (loading) return <PageLoader label="Chargement du profil…" />;
  if (loadErr) return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[400px] gap-4">
      <AlertCircle className="w-12 h-12 text-rose-400" />
      <p className="text-white/60 text-center max-w-md">{loadErr}</p>
    </div>
  );

  const adminTabs: { id: Tab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'profile',     label: 'Mon profil',        icon: User },
    { id: 'requests',    label: "Demandes d'accès",  icon: Clock,  badge: pendingCount > 0 ? pendingCount : undefined },
    { id: 'users',       label: 'Utilisateurs',      icon: Users },
    { id: 'campaigns',   label: 'Campagnes Email',   icon: Mail },
    { id: 'permissions', label: 'Permissions',       icon: Shield },
  ];
  const tabs = isAdmin ? adminTabs : [{ id: 'profile' as Tab, label: 'Mon profil', icon: User }];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-5xl font-black text-white italic tracking-tighter">PARAMÈTRES</h1>
        <p className="text-white/30 ml-1 mt-1">Compte & administration</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-white/5 border border-white/10 rounded-2xl p-1 mb-8 w-fit overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap
              ${tab === t.id ? 'bg-white text-black' : 'text-white/40 hover:text-white'}`}>
            <t.icon className="w-4 h-4" />
            {t.label}
            {'badge' in t && t.badge
              ? <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-black text-[10px] font-black">{t.badge}</span>
              : null}
          </button>
        ))}
      </div>

      {/* ── Profile ── */}
      {tab === 'profile' && (
        <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-[2rem] p-8 max-w-2xl">
          <div className="flex items-center gap-5 mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl font-black text-white">
              {profile?.full_name?.[0] ?? profile?.email?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div>
              <p className="text-white font-bold text-lg">{profile?.full_name ?? 'Utilisateur'}</p>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="text-sm text-white/40">{profile?.email}</span>
                {profile && <RoleBadge role={profile.role} />}
              </div>
            </div>
          </div>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Nom complet</label>
              <input className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white outline-none focus:border-white/30 transition-all"
                value={fullName} onChange={e => setFullName(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Email</label>
              <input className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white/40 outline-none cursor-not-allowed"
                value={profile?.email ?? ''} disabled />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Rôle</label>
              <input className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white/40 outline-none cursor-not-allowed"
                value={ROLE_CFG[profile?.role as AppRole]?.labelFr ?? 'Inconnu'} disabled />
            </div>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 bg-white text-black font-bold px-6 py-3 rounded-2xl hover:bg-white/90 transition-all hover:scale-105 disabled:opacity-60">
              {saving ? <><span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />Sauvegarde…</>
                : saved ? <><CheckCircle className="w-4 h-4 text-emerald-500" />Sauvegardé !</>
                : 'Enregistrer'}
            </button>
          </form>
        </div>
      )}

      {tab === 'requests'    && isAdmin && <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-[2rem] p-8"><div className="flex items-center gap-4 mb-6"><div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center"><Clock className="w-5 h-5 text-amber-400" /></div><div><h2 className="text-lg font-bold text-white">Demandes d'accès</h2><p className="text-sm text-white/30">Approuver les nouveaux comptes Admin</p></div></div><AccessRequestsPanel /></div>}
      {tab === 'users'       && isAdmin && <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-[2rem] p-8"><div className="flex items-center gap-4 mb-8"><div className="w-10 h-10 rounded-2xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center"><Users className="w-5 h-5 text-purple-400" /></div><div><h2 className="text-lg font-bold text-white">Gestion des Utilisateurs</h2><p className="text-sm text-white/30">Créer des comptes et modifier les rôles</p></div></div><UserManagementPanel /></div>}
      {tab === 'campaigns'   && isAdmin && <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-[2rem] p-8"><div className="flex items-center gap-4 mb-8"><div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center"><Mail className="w-5 h-5 text-indigo-400" /></div><div><h2 className="text-lg font-bold text-white">Campagnes Email</h2><p className="text-sm text-white/30">Automatisation emailing via Brevo · Communication digitale</p></div></div><CampaignsPanel /></div>}
      {tab === 'permissions' && isAdmin && <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-[2rem] p-8"><div className="flex items-center gap-4 mb-8"><div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center"><Shield className="w-5 h-5 text-indigo-400" /></div><div><h2 className="text-lg font-bold text-white">Permissions par module</h2><p className="text-sm text-white/30">Admin · User Standard · Commercial · Partenaire</p></div></div><PermissionsMatrix /></div>}
    </div>
  );
}