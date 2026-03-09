// app/contacts/page.tsx
// Bouton Modifier + Supprimer sur chaque contact
'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, X, Pencil, Trash2, Check, AlertCircle, User2, Mail, Phone, Building2, Loader2 } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';
import { PageLoader } from '@/components/LoadingScreen';
import type { Contact, Company } from '@/types';

// ── Modal Créer / Modifier contact ───────────────────────────────
function ContactModal({
  mode, contact, companies,
  onClose, onSaved,
}: {
  mode: 'create' | 'edit';
  contact?: Contact;
  companies: Company[];
  onClose:  () => void;
  onSaved:  (c: Contact) => void;
}) {
  const supabase   = getSupabaseClient();
  const [firstName,  setFirstName]  = useState(contact?.first_name ?? '');
  const [lastName,   setLastName]   = useState(contact?.last_name ?? '');
  const [email,      setEmail]      = useState(contact?.email ?? '');
  const [phone,      setPhone]      = useState(contact?.phone ?? '');
  const [companyId,  setCompanyId]  = useState(contact?.company_id ?? '');
  const [notes,      setNotes]      = useState(contact?.notes ?? '');
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return setError('Prénom et nom requis.');
    setSaving(true); setError('');

    const payload = {
      first_name: firstName.trim(),
      last_name:  lastName.trim(),
      email:      email.trim() || null,
      phone:      phone.trim() || null,
      company_id: companyId || null,
      notes:      notes.trim() || null,
    };

    try {
      let data: Contact | null = null;
      if (mode === 'create') {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: d, error: err } = await supabase
          .from('contacts')
          .insert({ ...payload, created_by: user?.id })
          .select('*, company:companies(name)')
          .single();
        if (err) throw new Error(err.message);
        data = d as Contact;
      } else {
        const { data: d, error: err } = await supabase
          .from('contacts')
          .update(payload)
          .eq('id', contact!.id)
          .select('*, company:companies(name)')
          .single();
        if (err) throw new Error(err.message);
        data = d as Contact;
      }
      if (data) { onSaved(data); onClose(); }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-3xl shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">
            {mode === 'create' ? 'Nouveau contact' : 'Modifier le contact'}
          </h3>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Prénom *</label>
              <input className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 outline-none focus:border-white/30 transition-all"
                placeholder="Jean" value={firstName} onChange={e => setFirstName(e.target.value)} autoFocus />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Nom *</label>
              <input className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 outline-none focus:border-white/30 transition-all"
                placeholder="Dupont" value={lastName} onChange={e => setLastName(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Email</label>
            <input type="email" className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 outline-none focus:border-white/30 transition-all"
              placeholder="jean@exemple.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Téléphone</label>
            <input className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 outline-none focus:border-white/30 transition-all"
              placeholder="+33 6 00 00 00 00" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Entreprise</label>
            <select className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white outline-none"
              value={companyId} onChange={e => setCompanyId(e.target.value)}>
              <option value="" className="bg-slate-900">— Aucune —</option>
              {companies.map(c => <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Notes</label>
            <textarea rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 outline-none focus:border-white/30 transition-all resize-none"
              placeholder="Notes…" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          {error && (
            <div className="flex items-start gap-2 text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>{error}</span>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/60 font-bold hover:bg-white/10 transition-all">
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-white text-black font-bold py-3 rounded-2xl hover:bg-white/90 flex items-center justify-center gap-2 transition-all disabled:opacity-60">
              {saving
                ? <><span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />{mode === 'create' ? 'Création…' : 'Sauvegarde…'}</>
                : mode === 'create'
                  ? <><Plus className="w-4 h-4" />Créer</>
                  : <><Check className="w-4 h-4" />Enregistrer</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page principale ──────────────────────────────────────────────
export default function ContactsPage() {
  const supabase = getSupabaseClient();
  const [contacts,   setContacts]   = useState<Contact[]>([]);
  const [companies,  setCompanies]  = useState<Company[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [modalMode,  setModalMode]  = useState<'create' | 'edit' | null>(null);
  const [editing,    setEditing]    = useState<Contact | undefined>();

  useEffect(() => {
    async function load() {
      const [{ data: ctcts }, { data: comps }] = await Promise.all([
        supabase.from('contacts').select('*, company:companies(name)').order('first_name'),
        supabase.from('companies').select('id, name').order('name'),
      ]);
      if (ctcts)  setContacts(ctcts as Contact[]);
      if (comps) setCompanies(comps as Company[]);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = contacts.filter(c =>
    `${c.first_name} ${c.last_name} ${c.email ?? ''} ${c.phone ?? ''}`
      .toLowerCase().includes(search.toLowerCase())
  );

  function handleSaved(c: Contact) {
    setContacts(prev => {
      const idx = prev.findIndex(p => p.id === c.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = c; return next; }
      return [c, ...prev];
    });
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce contact ?')) return;
    await supabase.from('contacts').delete().eq('id', id);
    setContacts(prev => prev.filter(c => c.id !== id));
  }

  if (loading) return <PageLoader label="Chargement des contacts…" />;

  return (
    <div className="p-4 lg:p-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight">Contacts</h1>
          <p className="text-white/40 mt-1">{contacts.length} contact{contacts.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => { setEditing(undefined); setModalMode('create'); }}
          className="bg-white text-black px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:scale-105 transition-transform">
          <Plus className="w-5 h-5" /> Nouveau contact
        </button>
      </div>

      {/* Recherche */}
      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input
          className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-white placeholder-white/20 outline-none focus:border-white/30 transition-all"
          placeholder="Rechercher…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <User2 className="w-12 h-12 text-white/10" />
          <p className="text-white/20">{search ? 'Aucun résultat' : 'Aucun contact — créez-en un !'}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full">
            <thead className="border-b border-white/10 bg-white/[0.03]">
              <tr>
                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-widest text-white/30">Nom</th>
                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-widest text-white/30 hidden md:table-cell">Email</th>
                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-widest text-white/30 hidden lg:table-cell">Téléphone</th>
                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-widest text-white/30 hidden lg:table-cell">Entreprise</th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                        {c.first_name[0]}{c.last_name[0]}
                      </div>
                      <span className="text-sm font-semibold text-white">{c.first_name} {c.last_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    {c.email
                      ? <a href={`mailto:${c.email}`} className="text-sm text-white/50 hover:text-indigo-400 flex items-center gap-1.5 transition-colors">
                          <Mail className="w-3 h-3" />{c.email}
                        </a>
                      : <span className="text-white/20 text-sm">—</span>}
                  </td>
                  <td className="px-6 py-4 hidden lg:table-cell">
                    {c.phone
                      ? <span className="text-sm text-white/50 flex items-center gap-1.5"><Phone className="w-3 h-3" />{c.phone}</span>
                      : <span className="text-white/20 text-sm">—</span>}
                  </td>
                  <td className="px-6 py-4 hidden lg:table-cell">
                    {(c as any).company?.name
                      ? <span className="text-sm text-white/50 flex items-center gap-1.5"><Building2 className="w-3 h-3" />{(c as any).company.name}</span>
                      : <span className="text-white/20 text-sm">—</span>}
                  </td>
                  <td className="px-6 py-4">
                    {/* ✅ Boutons Modifier + Supprimer */}
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditing(c); setModalMode('edit'); }}
                        className="w-8 h-8 rounded-xl bg-white/5 hover:bg-indigo-500/20 flex items-center justify-center text-white/30 hover:text-indigo-400 transition-all"
                        title="Modifier"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="w-8 h-8 rounded-xl bg-white/5 hover:bg-rose-500/20 flex items-center justify-center text-white/30 hover:text-rose-400 transition-all"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalMode && (
        <ContactModal
          mode={modalMode}
          contact={editing}
          companies={companies}
          onClose={() => { setModalMode(null); setEditing(undefined); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}