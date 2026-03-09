// app/companies/page.tsx
// Bouton Modifier + Supprimer sur chaque entreprise
'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { Plus, Search, X, Pencil, Trash2, Check, AlertCircle, Building2, Globe, Phone, MapPin, Loader2 } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';
import { PageLoader } from '@/components/LoadingScreen';
import type { Company } from '@/types';

// ── Modal Créer / Modifier entreprise ───────────────────────────
function CompanyModal({
  mode, company,
  onClose, onSaved,
}: {
  mode: 'create' | 'edit';
  company?: Company;
  onClose: () => void;
  onSaved: (c: Company) => void;
}) {
  const supabase   = getSupabaseClient();
  const [name,     setName]     = useState(company?.name ?? '');
  const [industry, setIndustry] = useState(company?.industry ?? '');
  const [website,  setWebsite]  = useState(company?.website ?? '');
  const [phone,    setPhone]    = useState(company?.phone ?? '');
  const [address,  setAddress]  = useState(company?.address ?? '');
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError('Le nom est requis.');
    setSaving(true); setError('');

    const payload = {
      name:     name.trim(),
      industry: industry.trim() || null,
      website:  website.trim() || null,
      phone:    phone.trim() || null,
      address:  address.trim() || null,
    };

    try {
      let data: Company | null = null;
      if (mode === 'create') {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: d, error: err } = await supabase
          .from('companies')
          .insert({ ...payload, created_by: user?.id })
          .select()
          .single();
        if (err) throw new Error(err.message);
        data = d as Company;
      } else {
        const { data: d, error: err } = await supabase
          .from('companies')
          .update(payload)
          .eq('id', company!.id)
          .select()
          .single();
        if (err) throw new Error(err.message);
        data = d as Company;
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
            {mode === 'create' ? 'Nouvelle entreprise' : 'Modifier l\'entreprise'}
          </h3>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Nom *</label>
            <input className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 outline-none focus:border-white/30 transition-all"
              placeholder="ACME Corp" value={name} onChange={e => setName(e.target.value)} autoFocus />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Secteur</label>
            <input className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 outline-none focus:border-white/30 transition-all"
              placeholder="Technologie, Finance…" value={industry} onChange={e => setIndustry(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Site web</label>
              <input className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 outline-none focus:border-white/30 transition-all"
                placeholder="https://…" value={website} onChange={e => setWebsite(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Téléphone</label>
              <input className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 outline-none focus:border-white/30 transition-all"
                placeholder="+33 1 00 00 00 00" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Adresse</label>
            <input className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 outline-none focus:border-white/30 transition-all"
              placeholder="123 rue de la Paix, Paris" value={address} onChange={e => setAddress(e.target.value)} />
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
export default function CompaniesPage() {
  const supabase  = getSupabaseClient();
  const [companies,  setCompanies]  = useState<Company[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [modalMode,  setModalMode]  = useState<'create' | 'edit' | null>(null);
  const [editing,    setEditing]    = useState<Company | undefined>();

  useEffect(() => {
    supabase.from('companies').select('*').order('name')
      .then(({ data }) => { if (data) setCompanies(data as Company[]); setLoading(false); });
  }, []);

  const filtered = companies.filter(c =>
    `${c.name} ${c.industry ?? ''} ${c.website ?? ''}`.toLowerCase().includes(search.toLowerCase())
  );

  function handleSaved(c: Company) {
    setCompanies(prev => {
      const idx = prev.findIndex(p => p.id === c.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = c; return next; }
      return [c, ...prev];
    });
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette entreprise ?')) return;
    await supabase.from('companies').delete().eq('id', id);
    setCompanies(prev => prev.filter(c => c.id !== id));
  }

  if (loading) return <PageLoader label="Chargement des entreprises…" />;

  return (
    <div className="p-4 lg:p-8 animate-fade-in">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight">Entreprises</h1>
          <p className="text-white/40 mt-1">{companies.length} entreprise{companies.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => { setEditing(undefined); setModalMode('create'); }}
          className="bg-white text-black px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:scale-105 transition-transform">
          <Plus className="w-5 h-5" /> Nouvelle entreprise
        </button>
      </div>

      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input
          className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-white placeholder-white/20 outline-none focus:border-white/30 transition-all"
          placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} />
        {search && <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"><X className="w-4 h-4" /></button>}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Building2 className="w-12 h-12 text-white/10" />
          <p className="text-white/20">{search ? 'Aucun résultat' : 'Aucune entreprise — créez-en une !'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(c => (
            <div key={c.id}
              className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/8 hover:border-white/20 transition-all group">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                    {c.name[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-bold text-sm truncate">{c.name}</p>
                    {c.industry && <p className="text-white/40 text-xs truncate">{c.industry}</p>}
                  </div>
                </div>
                {/* ✅ Boutons Modifier + Supprimer */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button
                    onClick={() => { setEditing(c); setModalMode('edit'); }}
                    className="w-7 h-7 rounded-lg bg-white/5 hover:bg-indigo-500/20 flex items-center justify-center text-white/30 hover:text-indigo-400 transition-all"
                    title="Modifier"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="w-7 h-7 rounded-lg bg-white/5 hover:bg-rose-500/20 flex items-center justify-center text-white/30 hover:text-rose-400 transition-all"
                    title="Supprimer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-1.5">
                {c.website && (
                  <a href={c.website} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-white/40 hover:text-indigo-400 transition-colors truncate">
                    <Globe className="w-3 h-3 flex-shrink-0" />{c.website}
                  </a>
                )}
                {c.phone && (
                  <p className="flex items-center gap-2 text-xs text-white/40">
                    <Phone className="w-3 h-3 flex-shrink-0" />{c.phone}
                  </p>
                )}
                {c.address && (
                  <p className="flex items-center gap-2 text-xs text-white/40 truncate">
                    <MapPin className="w-3 h-3 flex-shrink-0" />{c.address}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalMode && (
        <CompanyModal
          mode={modalMode}
          company={editing}
          onClose={() => { setModalMode(null); setEditing(undefined); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}