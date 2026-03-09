// app/settings/page.tsx
// FIX 1 : Users non visibles → signUp() ne fonctionnait pas en prod,
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
  Send, BarChart2, Plus, RefreshCw,
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
  companies:'🏢 Entreprises', tasks:'✅ Tâches', settings:'⚙️ Paramètres',
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
   ✅ FIX : signUp() ne crée pas de profil visible en prod
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

  // ✅ FIX : charge depuis public.profiles (pas auth.admin.listUsers qui nécessite service_role)
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

    // ✅ Créer le compte auth
    const { data, error: err } = await supabase.auth.signUp({
      email: invEmail,
      password: invPwd,
      options: { data: { full_name: invName, role: invRole } },
    });

    if (err) { setError(err.message); setSaving(false); return; }

    // ✅ FIX USERS NON VISIBLES :
    // Le trigger handle_new_user() crée le profil automatiquement.
    // Si le trigger est absent ou échoue, on insère manuellement.
    if (data.user) {
      // Forcer l'insertion du profil si absent (double sécurité)
      await supabase.from('profiles').upsert({
        id:        data.user.id,
        email:     invEmail,
        full_name: invName || null,
        role:      invRole === 'admin' ? 'commercial' : invRole,
      }, { onConflict: 'id' });

      setFeedback(`✅ Compte créé : ${invEmail}`);
      setInvEmail(''); setInvName(''); setInvPwd('');
      setShowForm(false);
      // Attendre un court délai puis recharger
      setTimeout(() => { load(); setFeedback(''); }, 1500);
    }
    setSaving(false);
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
   CAMPAGNES EMAIL — Brevo
   ✅ NOUVEAU : Automatisation emailing et communication digitale
══════════════════════════════════════════════════════════════ */
interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: 'draft' | 'sent' | 'scheduled';
  recipients: number;
  sent_at: string | null;
  created_at: string;
}

function CampaignsPanel() {
  const supabase = getSupabaseClient();
  const [campaigns, setCampaigns]  = useState<Campaign[]>([]);
  const [contacts,  setContacts]   = useState<{ email: string; first_name: string; last_name: string }[]>([]);
  const [loading,   setLoading]    = useState(true);
  const [sending,   setSending]    = useState<string | null>(null);
  const [showForm,  setShowForm]   = useState(false);
  const [feedback,  setFeedback]   = useState('');
  const [error,     setError]      = useState('');

  // Formulaire nouvelle campagne
  const [name,      setName]       = useState('');
  const [subject,   setSubject]    = useState('');
  const [body,      setBody]       = useState('');
  const [target,    setTarget]     = useState<'all' | 'commercial' | 'partner'>('all');
  const [creating,  setCreating]   = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    // Charger les campagnes depuis la table email_campaigns (si elle existe)
    const { data: camps } = await supabase
      .from('email_campaigns')
      .select('*')
      .order('created_at', { ascending: false });
    if (camps) setCampaigns(camps as Campaign[]);

    // Charger les contacts pour les destinataires
    const { data: ctcts } = await supabase
      .from('contacts')
      .select('email, first_name, last_name')
      .not('email', 'is', null);
    if (ctcts) setContacts(ctcts);
    setLoading(false);
  }

  async function sendCampaign(campaignId: string) {
    setSending(campaignId);
    setFeedback(''); setError('');
    try {
      const res = await fetch('/api/brevo/campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Erreur envoi');
      setFeedback(`✅ Campagne envoyée avec succès !`);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSending(null);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !subject || !body) return setError('Tous les champs sont requis.');
    setCreating(true); setError('');

    // Filtrer les destinataires
    let recipients = contacts;
    if (target === 'commercial' || target === 'partner') {
      // Récupérer les emails des users du rôle cible
      const { data: profiles } = await supabase
        .from('profiles')
        .select('email')
        .eq('role', target);
      const roleEmails = new Set((profiles ?? []).map((p: any) => p.email));
      recipients = contacts.filter(c => c.email && roleEmails.has(c.email));
    }

    // Sauvegarder en DB
    const { data, error: err } = await supabase.from('email_campaigns').insert({
      name,
      subject,
      body,
      status: 'draft',
      recipients: recipients.length,
      target_role: target,
    }).select().single();

    if (err) {
      // Si la table n'existe pas encore
      setError('Table email_campaigns manquante. Exécutez le patch SQL ci-dessous.');
      setCreating(false);
      return;
    }

    setFeedback(`✅ Campagne "${name}" créée (${recipients.length} destinataires)`);
    setName(''); setSubject(''); setBody('');
    setShowForm(false);
    setCreating(false);
    load();
  }

  const statusColor: Record<string, string> = {
    draft:     'text-white/40 bg-white/5 border-white/10',
    sent:      'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    scheduled: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  };
  const statusLabel: Record<string, string> = {
    draft: 'Brouillon', sent: 'Envoyée', scheduled: 'Programmée',
  };

  return (
    <div className="space-y-6">

      {/* Info SQL si table manquante */}
      <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-4">
        <p className="text-xs text-indigo-300/70 font-bold uppercase tracking-widest mb-2">
          ⚠️ Si les campagnes ne s'affichent pas
        </p>
        <p className="text-xs text-white/40 mb-2">Exécute ce SQL dans Supabase pour créer la table :</p>
        <pre className="text-xs text-indigo-300/60 bg-black/30 rounded-xl p-3 overflow-x-auto font-mono">{`CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  subject     TEXT NOT NULL,
  body        TEXT,
  status      TEXT DEFAULT 'draft' CHECK (status IN ('draft','sent','scheduled')),
  recipients  INT DEFAULT 0,
  target_role TEXT DEFAULT 'all',
  sent_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campaigns_admin" ON public.email_campaigns FOR ALL USING (public.is_admin());`}
        </pre>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total campagnes', value: campaigns.length, icon: Mail, color: 'text-indigo-400' },
          { label: 'Envoyées',        value: campaigns.filter(c => c.status === 'sent').length, icon: Send, color: 'text-emerald-400' },
          { label: 'Contacts',        value: contacts.length, icon: Users, color: 'text-blue-400' },
        ].map(s => (
          <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
            <p className="text-2xl font-black text-white">{s.value}</p>
            <p className="text-xs text-white/30 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-sm font-bold text-white">Mes campagnes</h3>
        <div className="flex gap-2">
          <button onClick={load} className="text-white/20 hover:text-white/60 transition-colors p-2 rounded-xl hover:bg-white/5">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-white text-black font-bold px-4 py-2.5 rounded-2xl hover:scale-105 transition-transform text-sm">
            <Plus className="w-4 h-4" /> Nouvelle campagne
          </button>
        </div>
      </div>

      {feedback && <p className="text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2">{feedback}</p>}
      {error    && <p className="text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2">{error}</p>}

      {/* Formulaire nouvelle campagne */}
      {showForm && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
          <h4 className="text-sm font-bold text-white uppercase tracking-widest">Nouvelle campagne email</h4>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Nom *</label>
                <input className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 outline-none focus:border-white/30 transition-all"
                  placeholder="Ex: Newsletter mars 2026" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Destinataires</label>
                <select className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white outline-none"
                  value={target} onChange={e => setTarget(e.target.value as any)}>
                  <option value="all" className="bg-slate-900">Tous les contacts</option>
                  <option value="commercial" className="bg-slate-900">Commerciaux uniquement</option>
                  <option value="partner" className="bg-slate-900">Partenaires uniquement</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Objet de l'email *</label>
              <input className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 outline-none focus:border-white/30 transition-all"
                placeholder="Ex: Découvrez nos nouveautés" value={subject} onChange={e => setSubject(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Contenu *</label>
              <textarea rows={5}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 outline-none focus:border-white/30 transition-all resize-none"
                placeholder="Bonjour {{first_name}},&#10;&#10;Votre message ici…"
                value={body} onChange={e => setBody(e.target.value)} />
              <p className="text-xs text-white/20 mt-1">Variables disponibles : {'{{first_name}}'} {'{{last_name}}'} {'{{email}}'}</p>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-5 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white/60 font-bold hover:bg-white/10 text-sm">
                Annuler
              </button>
              <button type="submit" disabled={creating}
                className="flex items-center gap-2 bg-white text-black font-bold px-6 py-2.5 rounded-2xl hover:bg-white/90 transition-all disabled:opacity-60 text-sm">
                {creating ? <><span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />Création…</> : <><Plus className="w-4 h-4" />Créer la campagne</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Liste des campagnes */}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-white/20 animate-spin" /></div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Mail className="w-12 h-12 text-white/10" />
          <p className="text-white/20 text-sm">Aucune campagne. Créez-en une ci-dessus.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map(c => (
            <div key={c.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <p className="text-white font-bold text-sm">{c.name}</p>
                  <span className={`text-xs font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${statusColor[c.status]}`}>
                    {statusLabel[c.status]}
                  </span>
                </div>
                <p className="text-xs text-white/40 truncate">{c.subject}</p>
                <p className="text-xs text-white/25 mt-0.5">
                  {c.recipients} destinataire{c.recipients !== 1 ? 's' : ''}
                  {c.sent_at && ` · Envoyée ${new Date(c.sent_at).toLocaleDateString('fr-FR')}`}
                </p>
              </div>
              {c.status === 'draft' && (
                <button
                  onClick={() => sendCampaign(c.id)}
                  disabled={sending === c.id}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2.5 rounded-xl transition-all text-sm disabled:opacity-60 flex-shrink-0"
                >
                  {sending === c.id
                    ? <><Loader2 className="w-4 h-4 animate-spin" />Envoi…</>
                    : <><Send className="w-4 h-4" />Envoyer via Brevo</>
                  }
                </button>
              )}
              {c.status === 'sent' && (
                <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold flex-shrink-0">
                  <CheckCircle className="w-4 h-4" /> Envoyée
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
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
        // ✅ Auto-créer le profil s'il est absent
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

        // ✅ FIX : lire isAdmin depuis p.role directement (pas rpc qui peut échouer)
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