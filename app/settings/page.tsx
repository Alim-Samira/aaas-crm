// app/settings/page.tsx
//   RBAC via supabase.rpc('is_admin') → calls public.is_admin() SQL function
//   Admin: full User Management panel
// Full admin panel with 4 tabs:
//   - Profile (all roles)
//   - Access Requests (admin only: approve/reject elevated role requests)
//   - Users (admin only: create + change roles inline)
//   - Permissions matrix (admin only: toggle module access per role)
// app/settings/page.tsx  — v8  (only admin needs approval, fixed access_requests display)
'use client';

import { useEffect, useState } from 'react';
import {
  User, Shield, Briefcase, Handshake,
  CheckCircle, Loader2, UserPlus, Trash2,
  Eye, EyeOff, AlertCircle, Clock, Check, X,
  ToggleLeft, ToggleRight, Users, Crown
} from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';
import { PageLoader } from '@/components/LoadingScreen';
import type { Profile, AppRole, AccessRequest, ModulePermission } from '@/types';

// ── Role config  (ceo → user_standard) ───────────────────────────
const ROLE_CFG: Record<AppRole, { label: string; labelFr: string; icon: React.ElementType; badge: string }> = {
  admin:         { label: 'Admin',             labelFr: 'Administrateur',     icon: Shield,   badge: 'bg-purple-500/10 border-purple-500/20 text-purple-400' },
  user_standard: { label: 'User Standard',     labelFr: 'Utilisateur Standard', icon: User,   badge: 'bg-amber-500/10  border-amber-500/20  text-amber-400' },
  commercial:    { label: 'Commercial',         labelFr: 'Commercial',         icon: Briefcase,badge: 'bg-blue-500/10   border-blue-500/20   text-blue-400'  },
  partner:       { label: 'Partenaire',         labelFr: 'Partenaire',         icon: Handshake,badge: 'bg-teal-500/10   border-teal-500/20   text-teal-400'  },
};

const MODULES      = ['dashboard','pipeline','contacts','companies','tasks','settings'];
const MOD_LABELS: Record<string,string> = {
  dashboard:'📊 Dashboard', pipeline:'🎯 Pipeline', contacts:'👤 Contacts',
  companies:'🏢 Entreprises', tasks:' Tâches', settings:'⚙️ Paramètres',
};

type Tab = 'profile' | 'requests' | 'users' | 'permissions';

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_CFG[role as AppRole] ?? ROLE_CFG.commercial;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${cfg.badge}`}>
      <Icon className="w-3 h-3" />{cfg.labelFr}
    </span>
  );
}

/* ── Access Requests panel ── */
function AccessRequestsPanel() {
  const supabase = getSupabaseClient();
  const [reqs,    setReqs]    = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('access_requests').select('*').order('created_at', { ascending: false });
    if (data) setReqs(data as AccessRequest[]);
    setLoading(false);
  }

  async function decide(req: AccessRequest, decision: 'approved' | 'rejected') {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('access_requests')
      .update({ status: decision, reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
      .eq('id', req.id);
    if (decision === 'approved') {
      await supabase.rpc('update_user_role', {
        target_user_id: req.user_id,
        new_role: req.requested_role,
      });
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

/* ── Module Permissions Matrix ── */
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
    await supabase.from('module_permissions')
      .upsert({ module, role, can_access: val }, { onConflict: 'module,role' });
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

  // Updated: user_standard replaces ceo
  const roles: AppRole[] = ['admin', 'user_standard', 'commercial', 'partner'];

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-white/20 animate-spin" /></div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            {/* Module | Admin | User Standard | Commercial | Partenaire */}
            <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-widest text-white/30 w-44">Module</th>
            {roles.map(r => (
              <th key={r} className="px-4 py-3 text-center">
                <RoleBadge role={r} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MODULES.map((m, i) => (
            <tr key={m} className={`border-t border-white/5 ${i % 2 === 0 ? 'bg-white/[0.02]' : ''}`}>
              <td className="px-4 py-4 text-sm font-medium text-white/70">{MOD_LABELS[m]}</td>
              {roles.map(role => {
                const key     = `${m}-${role}`;
                const on      = get(m, role);
                const locked  = role === 'admin'; // admin always has full access
                return (
                  <td key={role} className="px-4 py-4 text-center">
                    <button
                      onClick={() => !locked && toggle(m, role)}
                      disabled={locked || saving === key}
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

/* ── User Management ── */
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

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('profiles')
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
    const { data, error: err } = await supabase.auth.signUp({
      email: invEmail, password: invPwd,
      options: { data: { full_name: invName, role: invRole } },
    });
    setSaving(false);
    if (err) return setError(err.message);
    if (data.user) {
      setFeedback(` Compte créé : ${invEmail}`);
      setInvEmail(''); setInvName(''); setInvPwd('');
      setShowForm(false);
      setTimeout(() => { load(); setFeedback(''); }, 1500);
    }
  }

  async function changeRole(userId: string, role: AppRole) {
    const { error } = await supabase.rpc('update_user_role', {
      target_user_id: userId,
      new_role: role,
    });
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
        <p className="text-sm text-white/40">{users.length} utilisateur{users.length > 1 ? 's' : ''}</p>
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
                {/* Updated: user_standard replaces ceo */}
                <select className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white outline-none"
                  value={invRole} onChange={e => setInvRole(e.target.value as AppRole)}>
                  {(Object.entries(ROLE_CFG) as [AppRole, typeof ROLE_CFG[AppRole]][])
                    .map(([id, cfg]) => (
                      <option key={id} value={id} className="bg-slate-900">{cfg.labelFr}</option>
                    ))}
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
                        .map(([id, cfg]) => (
                          <option key={id} value={id} className="bg-slate-900">{cfg.labelFr}</option>
                        ))}
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
                <tr><td colSpan={4} className="text-center py-10 text-white/20">Aucun utilisateur</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── Main Settings Page ── */
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
        .from('profiles').select('id, email, full_name, role, avatar_url, created_at')
        .eq('id', user.id).maybeSingle();
      if (err)   { setLoadErr(`Erreur: ${err.message}`); }
      else if (!data) {
        // Profile missing → auto-create from auth user then reload
        const { data: { user: u } } = await supabase.auth.getUser();
        if (u) {
          await supabase.from('profiles').insert({
            id: u.id, email: u.email!, role: 'commercial',
            full_name: u.user_metadata?.full_name ?? u.email!.split('@')[0],
          });
          // Retry load after insert
          const { data: retry } = await supabase
            .from('profiles').select('id, email, full_name, role, avatar_url, created_at')
            .eq('id', u.id).maybeSingle();
          if (retry) {
            const p2 = retry as Profile;
            setProfile(p2); setFullName(p2.full_name ?? '');
            const admin2 = p2.role === 'admin';
            setIsAdmin(admin2);
            if (admin2) {
              const { count } = await supabase.from('access_requests')
                .select('*', { count: 'exact', head: true }).eq('status', 'pending');
              setPendingCount(count ?? 0);
            }
          } else {
            setLoadErr('Profil introuvable. Veuillez relancer patch_MASTER.sql dans Supabase.');
          }
        }
      }
      else {
        const p = data as Profile;
        setProfile(p); setFullName(p.full_name ?? '');
        // FIX: lire le rôle depuis le profil (pas depuis RPC is_admin qui peut être lent/cassé)
        const adminFromProfile = p.role === 'admin';
        setIsAdmin(adminFromProfile);
        if (adminFromProfile) {
          const { count } = await supabase.from('access_requests')
            .select('*', { count: 'exact', head: true }).eq('status', 'pending');
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

  const adminTabs: { id: Tab; label: string; badge?: number }[] = [
    { id: 'profile',     label: 'Mon profil' },
    //  Updated label: "sub-Admin" instead of "CEO / Admin"
    { id: 'requests',    label: "Demandes d'accès", badge: pendingCount > 0 ? pendingCount : undefined },
    { id: 'users',       label: 'Utilisateurs' },
    { id: 'permissions', label: 'Permissions' },
  ];
  const tabs = isAdmin ? adminTabs : [{ id: 'profile' as Tab, label: 'Mon profil' }];

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
            {t.label}
            {'badge' in t && t.badge
              ? <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-black text-[10px] font-black">{t.badge}</span>
              : null}
          </button>
        ))}
      </div>

      {/* ── Profile tab ── */}
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

      {/* ── Access Requests tab ──
           Updated description: "sub-Admin" replaces "CEO / Admin" */}
      {tab === 'requests' && isAdmin && (
        <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-[2rem] p-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Demandes d'accès</h2>
              <p className="text-sm text-white/30">Approuver les nouveaux comptes Administrateur</p>
            </div>
          </div>
          <div className="mb-6 bg-amber-500/5 border border-amber-500/10 rounded-xl px-4 py-3">
            <p className="text-xs text-amber-400/70">
              Seul le rôle <strong>Admin</strong> requiert une approbation manuelle.
              Les rôles Commercial, Partenaire et Utilisateur Standard sont accordés directement à l'inscription.
            </p>
          </div>
          <AccessRequestsPanel />
        </div>
      )}

      {tab === 'users' && isAdmin && (
        <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-[2rem] p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Gestion des Utilisateurs</h2>
              <p className="text-sm text-white/30">Créer des comptes et modifier les rôles</p>
            </div>
          </div>
          <UserManagementPanel />
        </div>
      )}

      {/* ── Permissions tab ──
           Updated: table columns are Admin | User Standard | Commercial | Partenaire */}
      {tab === 'permissions' && isAdmin && (
        <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-[2rem] p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Permissions par module</h2>
              {/*  Updated column order */}
              <p className="text-sm text-white/30">Admin · User Standard · Commercial · Partenaire</p>
            </div>
          </div>
          <PermissionsMatrix />
        </div>
      )}
    </div>
  );
}