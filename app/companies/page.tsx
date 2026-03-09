// app/companies/page.tsx
// FIX: companies_created_by_fkey — now correctly passes user.id as created_by
// Logo: Google favicon API with letter-avatar fallback (no external dependency)
'use client';

import { useEffect, useState } from 'react';
import { Building2, Plus, Globe, Phone, MapPin, Briefcase, X, Loader2, Trash2, ExternalLink, AlertCircle } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';
import { PageLoader } from '@/components/LoadingScreen';
import type { Company } from '@/types';

// ── Company avatar: Google favicon → letter-avatar fallback ──
function CompanyAvatar({ name, website }: { name: string; website: string | null }) {
  const [failed, setFailed] = useState(false);

  const letter   = name.trim()[0]?.toUpperCase() ?? '?';
  const colors   = ['from-blue-500 to-indigo-600','from-purple-500 to-pink-600','from-emerald-500 to-teal-600','from-amber-500 to-orange-600','from-rose-500 to-red-600','from-cyan-500 to-sky-600'];
  const gradient = colors[name.charCodeAt(0) % colors.length];

  const domain = website?.replace(/^https?:\/\//, '').replace(/\/.*$/, '') ?? '';
  const faviconSrc = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : null;

  if (!faviconSrc || failed) {
    return (
      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-2xl font-black text-white select-none flex-shrink-0`}>
        {letter}
      </div>
    );
  }
  return (
    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center flex-shrink-0">
      <img src={faviconSrc} alt={name} className="w-10 h-10 object-contain" onError={() => setFailed(true)} />
    </div>
  );
}

// ── Add Company Modal ──────────────────────────────────────
function AddCompanyModal({ onClose, onCreated }: { onClose: () => void; onCreated: (c: Company) => void }) {
  const supabase = getSupabaseClient();
  const [name,     setName]     = useState('');
  const [industry, setIndustry] = useState('');
  const [website,  setWebsite]  = useState('');
  const [phone,    setPhone]    = useState('');
  const [address,  setAddress]  = useState('');
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  const INDUSTRIES = ['Tech','Retail','Finance','Santé','Industrie','Éducation','Immobilier','Marketing','Transport','Autre'];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError('Le nom est requis.');
    setSaving(true); setError('');
    try {
      // ── Get authenticated user ───────────────────────────────
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) throw new Error('Session expirée. Reconnectez-vous.');

      // ── INSERT company — created_by = auth.uid() ─────────────
      const { data, error: err } = await supabase
        .from('companies')
        .insert({
          name:       name.trim(),
          industry:   industry || null,
          website:    website.trim() || null,
          phone:      phone.trim()   || null,
          address:    address.trim() || null,
          created_by: user.id,   // ← FK to profiles(id) — guaranteed by patch v1.2
        })
        .select('*')
        .single();

      if (err) throw new Error(err.message);
      if (data) { onCreated(data as Company); onClose(); }
    } catch (err: any) {
      setError(err.message ?? 'Erreur inconnue');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-3xl shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Nouvelle entreprise</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Nom *</label>
            <input className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 outline-none focus:border-white/30 transition-all"
              placeholder="Ex: Acme Corp" value={name} onChange={e => setName(e.target.value)} autoFocus />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Secteur</label>
            <select className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white outline-none focus:border-white/30"
              value={industry} onChange={e => setIndustry(e.target.value)}>
              <option value="" className="bg-slate-900">— Choisir —</option>
              {INDUSTRIES.map(i => <option key={i} value={i} className="bg-slate-900">{i}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Site web</label>
              <input className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 outline-none focus:border-white/30 transition-all"
                placeholder="exemple.com" value={website} onChange={e => setWebsite(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Téléphone</label>
              <input className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 outline-none focus:border-white/30 transition-all"
                placeholder="+33 1 23 45 67 89" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Adresse</label>
            <input className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 outline-none focus:border-white/30 transition-all"
              placeholder="10 rue de la Paix, 75001 Paris" value={address} onChange={e => setAddress(e.target.value)} />
          </div>
          {error && (
            <div className="flex items-start gap-2 text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>{error}</span>
            </div>
          )}
          <button type="submit" disabled={saving}
            className="w-full bg-white text-black font-bold py-3 rounded-2xl hover:bg-white/90 flex items-center justify-center gap-2 transition-all disabled:opacity-60">
            {saving
              ? <><span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />Enregistrement…</>
              : <><Plus className="w-4 h-4" />Ajouter l'entreprise</>}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────
export default function CompaniesPage() {
  const supabase = getSupabaseClient();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search,    setSearch]    = useState('');

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('companies').select('*').order('created_at', { ascending: false });
      if (data) setCompanies(data as Company[]);
      setLoading(false);
    }
    load();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette entreprise ?')) return;
    await supabase.from('companies').delete().eq('id', id);
    setCompanies(prev => prev.filter(c => c.id !== id));
  }

  const filtered = companies.filter(c => `${c.name} ${c.industry ?? ''}`.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <PageLoader label="Chargement des entreprises…" />;

  return (
    <div className="p-8 animate-fade-in">
      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className="text-5xl font-black text-white italic tracking-tighter">ENTREPRISES</h1>
          <p className="text-white/30 ml-1 mt-1">{companies.length} partenaire{companies.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="bg-white text-black px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:scale-105 transition-transform">
          <Plus className="w-5 h-5" /> Ajouter
        </button>
      </div>

      <div className="relative mb-8">
        <input className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white placeholder-white/20 outline-none focus:border-white/30 transition-all"
          placeholder="Rechercher une entreprise…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Building2 className="w-16 h-16 text-white/10" />
          <p className="text-white/20 text-lg font-medium">{search ? 'Aucun résultat' : 'Aucune entreprise enregistrée'}</p>
          {!search && (
            <button onClick={() => setShowModal(true)}
              className="mt-2 bg-white/10 hover:bg-white/20 text-white font-bold px-6 py-3 rounded-2xl transition-all">
              + Ajouter la première
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map(company => (
            <div key={company.id}
              className="group bg-white/5 border border-white/10 backdrop-blur-xl rounded-[2rem] hover:bg-white/10 hover:border-white/20 transition-all duration-200 p-6">
              <div className="flex items-center gap-4 mb-6">
                <CompanyAvatar name={company.name} website={company.website} />
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold text-white truncate">{company.name}</h3>
                  {company.industry && (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-bold uppercase tracking-widest mt-1">
                      <Briefcase className="w-3 h-3" />{company.industry}
                    </span>
                  )}
                </div>
                <button onClick={() => handleDelete(company.id)}
                  className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-rose-400 transition-all flex-shrink-0 self-start">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3 pt-4 border-t border-white/5">
                {company.website ? (
                  <a href={`https://${company.website.replace(/^https?:\/\//, '')}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 text-white/50 text-sm hover:text-white/80 transition-colors group/link">
                    <Globe className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{company.website}</span>
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                  </a>
                ) : (
                  <div className="flex items-center gap-3 text-white/20 text-sm">
                    <Globe className="w-4 h-4" /><span className="italic">Site non renseigné</span>
                  </div>
                )}
                {company.phone ? (
                  <div className="flex items-center gap-3 text-white/50 text-sm">
                    <Phone className="w-4 h-4 flex-shrink-0" /><span>{company.phone}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 text-white/20 text-sm">
                    <Phone className="w-4 h-4" /><span className="italic">Téléphone non renseigné</span>
                  </div>
                )}
                {company.address && (
                  <div className="flex items-start gap-3 text-white/50 text-sm">
                    <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" /><span className="line-clamp-2">{company.address}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && <AddCompanyModal onClose={() => setShowModal(false)} onCreated={c => setCompanies([c, ...companies])} />}
    </div>
  );
}
