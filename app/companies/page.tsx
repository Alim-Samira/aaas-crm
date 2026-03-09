// app/campaigns/page.tsx  
// Features: éditeur riche · aperçu glassmorphism · templates par défaut
//           onglet Brouillons / Envoyées · fix destinataires contacts
'use client';

import { useEffect, useState } from 'react';
import {
  Plus, Mail, Send, Eye, Trash2, Pencil, X, Check,
  Users, Loader2, RefreshCw, Clock, CheckCircle,
  FileText, Sparkles, BarChart2,
} from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────
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

// ─── Templates par défaut ─────────────────────────────────────────
const TEMPLATES: Array<Omit<Campaign, 'id' | 'recipients' | 'sent_at' | 'created_at'>> = [
  {
    name: '🎉 Newsletter mensuelle',
    subject: 'Les actualités AAAS — ce mois-ci',
    body: `Bonjour {{first_name}},

Voici les dernières actualités de notre équipe.

🚀 Nouveautés
• Nouvelles fonctionnalités disponibles dans votre CRM
• Optimisation des performances

📊 Chiffres du mois
• Leads traités : +15%
• Taux de conversion : 23%

Merci pour votre confiance,
L'équipe AAAS`,
    status: 'draft', target_role: 'all',
  },
  {
    name: '💰 Offre promotionnelle',
    subject: 'Offre exclusive — jusqu\'à -30% sur nos services',
    body: `Bonjour {{first_name}},

Nous avons une offre exceptionnelle pour vous.

🔥 PROMOTION LIMITÉE
Bénéficiez de -30% sur l'ensemble de nos prestations.

   Ce qui est inclus :
• Audit complet de votre stratégie digitale
• Configuration CRM personnalisée
• Formation de votre équipe (2 jours)

Pour profiter de cette offre, répondez à cet email.

Cordialement,
L'équipe AAAS`,
    status: 'draft', target_role: 'all',
  },
  {
    name: '👋 Email de bienvenue',
    subject: 'Bienvenue chez AAAS, {{first_name}} !',
    body: `Bonjour {{first_name}},

Bienvenue dans notre espace CRM ! Nous sommes ravis de vous compter parmi nous.

🎯 Pour commencer :
1. Complétez votre profil
2. Explorez le tableau de bord
3. Créez votre premier lead dans le pipeline

Notre équipe est à votre disposition pour vous accompagner.

À très bientôt,
L'équipe AAAS`,
    status: 'draft', target_role: 'commercial',
  },
  {
    name: '📋 Rapport de performance',
    subject: 'Votre rapport mensuel AAAS',
    body: `Bonjour {{first_name}},

Voici votre rapport de performance du mois.

📈 Performance globale
• Nouveaux leads : consultez votre pipeline
• Deals conclus : tableau de bord → analytics
• Objectif mensuel : en bonne voie

💡 Conseil du mois
Pensez à relancer les leads "en cours" depuis plus de 15 jours pour booster votre taux de conversion.

Bonne continuation,
L'équipe AAAS`,
    status: 'draft', target_role: 'commercial',
  },
];

// ─── Aperçu email ─────────────────────────────────────────────────
function PreviewModal({ c, onClose }: { c: Campaign; onClose: () => void }) {
  const bodyHtml = (c.body ?? '').replace(/\n/g, '<br/>');
  const dateStr  = c.sent_at
    ? new Date(c.sent_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/85 backdrop-blur-2xl" onClick={onClose} />
      <div className="relative w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden rounded-3xl"
        style={{ boxShadow: '0 0 80px rgba(99,102,241,0.3), 0 0 160px rgba(99,102,241,0.1)' }}>

        {/* Barre de fenêtre glassmorphism */}
        <div style={{
          background: 'rgba(255,255,255,0.07)',
          backdropFilter: 'blur(40px)',
          borderBottom: '1px solid rgba(255,255,255,0.12)',
          padding: '14px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'rgba(239,68,68,0.6)' }} />
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'rgba(245,158,11,0.6)' }} />
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'rgba(16,185,129,0.6)' }} />
            </div>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontFamily: 'monospace' }}>
              Aperçu · {c.name}
            </span>
          </div>
          <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.25)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X className="w-4 h-4" style={{ display: 'block' }} />
          </button>
        </div>

        {/* Méta email */}
        <div style={{
          background: 'rgba(15,19,40,0.95)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          padding: '14px 24px',
        }}>
          {[
            { l: 'De :', v: 'AAAS CRM <noreply@aaas-crm.fr>' },
            { l: 'Objet :', v: c.subject, bold: true },
            { l: 'Date :', v: dateStr },
          ].map(r => (
            <div key={r.l} style={{ display: 'flex', gap: 12, marginBottom: 4 }}>
              <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, width: 52, flexShrink: 0 }}>{r.l}</span>
              <span style={{ color: r.bold ? 'white' : 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: r.bold ? 700 : 400 }}>{r.v}</span>
            </div>
          ))}
        </div>

        {/* Corps de l'email rendu */}
        <div style={{ flex: 1, overflowY: 'auto', background: 'rgba(10,14,30,0.98)', padding: 24 }}>
          <div style={{
            borderRadius: 20,
            overflow: 'hidden',
            border: '1px solid rgba(99,102,241,0.2)',
            boxShadow: '0 8px 40px rgba(99,102,241,0.15)',
          }}>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #1e1b4b 0%, #2e1065 50%, #1e1b4b 100%)',
              padding: '28px 32px',
              borderBottom: '1px solid rgba(99,102,241,0.25)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 44, height: 44,
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  borderRadius: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 8px 24px rgba(99,102,241,0.5)',
                  fontSize: 20, color: 'white', fontWeight: 900, fontStyle: 'italic',
                }}>A</div>
                <div>
                  <div style={{ color: 'white', fontWeight: 900, fontSize: 18, letterSpacing: -0.5 }}>AAAS CRM</div>
                  <div style={{ color: 'rgba(199,210,254,0.5)', fontSize: 10, letterSpacing: '2px', textTransform: 'uppercase' }}>
                    Communication Digitale
                  </div>
                </div>
              </div>
            </div>

            {/* Corps */}
            <div style={{ padding: '32px', background: 'rgba(15,23,42,0.96)' }}>
              <h2 style={{
                margin: '0 0 20px',
                fontSize: 22, fontWeight: 800, lineHeight: 1.3,
                background: 'linear-gradient(90deg, #e0e7ff, #a5b4fc)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>{c.subject}</h2>
              <div
                style={{ color: '#94a3b8', lineHeight: 1.85, fontSize: 14 }}
                dangerouslySetInnerHTML={{ __html: bodyHtml }}
              />
            </div>

            {/* Footer */}
            <div style={{
              padding: '16px 32px',
              background: 'rgba(8,12,25,0.98)',
              borderTop: '1px solid rgba(99,102,241,0.1)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ color: '#334155', fontSize: 11 }}>AAAS CRM · Automatisation digitale</span>
              <span style={{
                color: 'rgba(99,102,241,0.45)', fontSize: 10,
                padding: '3px 10px',
                border: '1px solid rgba(99,102,241,0.2)', borderRadius: 20,
              }}>Brevo</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Éditeur modal ────────────────────────────────────────────────
function Editor({
  mode, camp, contactCount, onClose, onSaved,
}: {
  mode: 'create' | 'edit';
  camp?: Campaign;
  contactCount: number;
  onClose: () => void;
  onSaved: (c: Campaign) => void;
}) {
  const supabase  = getSupabaseClient();
  const [name,    setName]    = useState(camp?.name    ?? '');
  const [subject, setSubject] = useState(camp?.subject ?? '');
  const [body,    setBody]    = useState(camp?.body    ?? '');
  const [target,  setTarget]  = useState(camp?.target_role ?? 'all');
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState('');
  const [showPre, setShowPre] = useState(false);

  const previewCamp: Campaign = {
    id: camp?.id ?? 'preview', name, subject, body, status: 'draft',
    recipients: 0, target_role: target, sent_at: null, created_at: new Date().toISOString(),
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !subject.trim() || !body.trim()) return setErr('Tous les champs sont requis.');
    setSaving(true); setErr('');
    const payload = { name: name.trim(), subject: subject.trim(), body: body.trim(), target_role: target, status: 'draft' as const };
    try {
      let saved: Campaign;
      if (mode === 'create') {
        const { data, error } = await supabase.from('email_campaigns').insert({ ...payload, recipients: 0 }).select().single();
        if (error) throw new Error(error.message);
        saved = data as Campaign;
      } else {
        const { data, error } = await supabase.from('email_campaigns').update(payload).eq('id', camp!.id).select().single();
        if (error) throw new Error(error.message);
        saved = data as Campaign;
      }
      onSaved(saved); onClose();
    } catch (e: any) { setErr(e.message); }
    finally { setSaving(false); }
  }

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/75 backdrop-blur-xl" onClick={onClose} />
        <div className="relative w-full max-w-2xl bg-[rgba(15,23,42,0.9)] backdrop-blur-2xl border border-white/12 rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden"
          style={{ boxShadow: '0 0 60px rgba(99,102,241,0.15)' }}>

          <div className="flex items-center justify-between px-8 py-5 border-b border-white/8">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center">
                <Mail className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-white font-black text-base leading-none">
                  {mode === 'create' ? 'Nouvelle campagne' : 'Modifier'}
                </h3>
                <p className="text-white/25 text-xs mt-0.5">{contactCount} contacts disponibles</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/25 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/8">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={save} className="flex-1 overflow-y-auto">
            <div className="p-8 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.15em] text-white/30 mb-2">Nom *</label>
                  <input
                    className="w-full bg-white/5 border border-white/8 rounded-2xl px-4 py-3 text-sm text-white placeholder-white/15 outline-none focus:border-indigo-500/40 focus:bg-white/8 transition-all"
                    placeholder="Ex: Newsletter mars 2026"
                    value={name} onChange={e => setName(e.target.value)} autoFocus
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.15em] text-white/30 mb-2">Destinataires</label>
                  <select
                    className="w-full bg-white/5 border border-white/8 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500/40 transition-all"
                    value={target} onChange={e => setTarget(e.target.value)}
                    style={{ colorScheme: 'dark' }}
                  >
                    <option value="all">🌍 Tous les contacts ({contactCount})</option>
                    <option value="commercial">💼 Commerciaux</option>
                    <option value="partner">🤝 Partenaires</option>
                    <option value="user_standard">👤 Standard</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.15em] text-white/30 mb-2">Objet de l'email *</label>
                <input
                  className="w-full bg-white/5 border border-white/8 rounded-2xl px-4 py-3 text-sm text-white placeholder-white/15 outline-none focus:border-indigo-500/40 focus:bg-white/8 transition-all"
                  placeholder="Ex: Découvrez nos nouveautés"
                  value={subject} onChange={e => setSubject(e.target.value)}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.15em] text-white/30">Contenu *</label>
                  <span className="text-[10px] text-white/15 font-mono">
                    {'{{first_name}}'} {'{{last_name}}'} {'{{email}}'}
                  </span>
                </div>
                <textarea
                  rows={11}
                  className="w-full bg-white/5 border border-white/8 rounded-2xl px-4 py-3 text-sm text-white placeholder-white/15 outline-none focus:border-indigo-500/40 focus:bg-white/8 transition-all resize-none font-mono leading-relaxed"
                  placeholder={'Bonjour {{first_name}},\n\nVotre message...\n\nCordialement,\nL\'équipe AAAS'}
                  value={body} onChange={e => setBody(e.target.value)}
                />
              </div>

              {err && (
                <div className="text-rose-400 text-xs bg-rose-500/8 border border-rose-500/15 rounded-xl px-4 py-3">{err}</div>
              )}
            </div>

            <div className="px-8 py-5 border-t border-white/8 flex items-center justify-between">
              <button type="button" onClick={() => setShowPre(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/8 text-white/50 hover:text-white hover:bg-white/10 font-bold text-xs transition-all">
                <Eye className="w-3.5 h-3.5" /> Aperçu
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/8 text-white/40 font-bold hover:bg-white/10 transition-all text-xs">
                  Annuler
                </button>
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 bg-white text-black font-black px-6 py-2.5 rounded-xl hover:bg-white/90 transition-all disabled:opacity-50 text-xs">
                  {saving
                    ? <><span className="w-3.5 h-3.5 border-2 border-black/20 border-t-black rounded-full animate-spin" />Sauvegarde…</>
                    : <><Check className="w-3.5 h-3.5" />{mode === 'create' ? 'Créer' : 'Enregistrer'}</>
                  }
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
      {showPre && <PreviewModal c={previewCamp} onClose={() => setShowPre(false)} />}
    </>
  );
}

// ─── Carte campagne ───────────────────────────────────────────────
function Card({ c, onEdit, onDelete, onSend, onPreview, sending }: {
  c: Campaign;
  onEdit: () => void; onDelete: () => void;
  onSend: () => void; onPreview: () => void;
  sending: boolean;
}) {
  const isSent = c.status === 'sent';
  return (
    <div className={`rounded-2xl border p-5 transition-all group
      ${isSent ? 'bg-emerald-500/4 border-emerald-500/12 hover:border-emerald-500/25' : 'bg-white/4 border-white/8 hover:bg-white/6 hover:border-white/15'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-white font-bold text-sm">{c.name}</span>
            <span className={`text-[9px] font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded-full border
              ${isSent ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-white/30 bg-white/4 border-white/8'}`}>
              {isSent ? '✓ Envoyée' : 'Brouillon'}
            </span>
          </div>
          <p className="text-xs text-white/35 truncate mb-2">{c.subject}</p>
          <div className="flex items-center gap-3 text-[11px] text-white/20 flex-wrap">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {isSent ? `${c.recipients} envoyés` : `Cible : ${c.target_role === 'all' ? 'tous contacts' : c.target_role}`}
            </span>
            {c.sent_at && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(c.sent_at).toLocaleDateString('fr-FR')}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={onPreview} title="Aperçu"
            className="w-8 h-8 rounded-xl bg-white/4 hover:bg-indigo-500/15 flex items-center justify-center text-white/25 hover:text-indigo-400 transition-all">
            <Eye className="w-3.5 h-3.5" />
          </button>
          {!isSent && (
            <>
              <button onClick={onEdit} title="Modifier"
                className="w-8 h-8 rounded-xl bg-white/4 hover:bg-indigo-500/15 flex items-center justify-center text-white/25 hover:text-indigo-400 transition-all">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={onSend} disabled={sending} title="Envoyer via Brevo"
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/40 text-white font-black px-3 py-1.5 rounded-xl text-[11px] transition-all">
                {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                {sending ? 'Envoi…' : 'Envoyer'}
              </button>
            </>
          )}
          <button onClick={onDelete} title="Supprimer"
            className="w-8 h-8 rounded-xl bg-white/4 hover:bg-rose-500/15 flex items-center justify-center text-white/25 hover:text-rose-400 transition-all">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────
export default function CampaignsPage() {
  const supabase  = getSupabaseClient();
  const [camps,   setCamps]   = useState<Campaign[]>([]);
  const [contacts,setContacts]= useState<{ email: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [feedback,setFeedback]= useState('');
  const [errMsg,  setErrMsg]  = useState('');
  const [editor,  setEditor]  = useState<{ mode: 'create' | 'edit'; camp?: Campaign } | null>(null);
  const [preview, setPreview] = useState<Campaign | null>(null);
  const [tab,     setTab]     = useState<'drafts' | 'sent'>('drafts');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [{ data: cs }, { data: co }] = await Promise.all([
      supabase.from('email_campaigns').select('*').order('created_at', { ascending: false }),
      supabase.from('contacts').select('email').not('email', 'is', null),
    ]);

    const campaigns = (cs ?? []) as Campaign[];

    // Init templates si table vide
    if (campaigns.length === 0) {
      for (const tpl of TEMPLATES) {
        await supabase.from('email_campaigns').insert({ ...tpl, recipients: 0 });
      }
      const { data: fresh } = await supabase.from('email_campaigns').select('*').order('created_at', { ascending: false });
      setCamps((fresh ?? []) as Campaign[]);
    } else {
      setCamps(campaigns);
    }

    setContacts((co ?? []) as { email: string }[]);
    setLoading(false);
  }

  async function handleSend(c: Campaign) {
    setSending(c.id); setFeedback(''); setErrMsg('');
    try {
      const r = await fetch('/api/brevo/campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: c.id }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? 'Erreur envoi');
      setFeedback(`   "${c.name}" envoyée à ${j.sent} destinataire${j.sent !== 1 ? 's' : ''} !`);
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

  function handleSaved(c: Campaign) {
    setCamps(prev => {
      const i = prev.findIndex(p => p.id === c.id);
      if (i >= 0) { const n = [...prev]; n[i] = c; return n; }
      return [c, ...prev];
    });
  }

  const drafts = camps.filter(c => c.status !== 'sent');
  const sent   = camps.filter(c => c.status === 'sent');

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="flex items-center gap-3 text-white/40">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Chargement des campagnes…</span>
      </div>
    </div>
  );

  return (
    <div className="p-6 lg:p-10">

      {/* En-tête */}
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center flex-shrink-0">
              <Mail className="w-5 h-5 text-indigo-400" />
            </span>
            Campagnes Email
          </h1>
          <p className="text-white/30 mt-1 text-sm ml-13">
            Emailing automatisé via Brevo · {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="w-10 h-10 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center text-white/25 hover:text-white hover:bg-white/10 transition-all">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setEditor({ mode: 'create' })}
            className="flex items-center gap-2 bg-white text-black font-black px-5 py-2.5 rounded-2xl hover:scale-105 active:scale-95 transition-transform text-sm"
          >
            <Plus className="w-4 h-4" /> Nouvelle campagne
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Total',      value: camps.length,    icon: FileText,    color: 'indigo' },
          { label: 'Brouillons', value: drafts.length,   icon: Pencil,      color: 'amber'  },
          { label: 'Envoyées',   value: sent.length,     icon: CheckCircle, color: 'emerald'},
          { label: 'Contacts',   value: contacts.length, icon: Users,       color: 'violet' },
        ].map(s => {
          const Icon = s.icon;
          const col: Record<string, string> = {
            indigo:  'bg-indigo-500/8 border-indigo-500/15 text-indigo-400',
            amber:   'bg-amber-500/8  border-amber-500/15  text-amber-400',
            emerald: 'bg-emerald-500/8 border-emerald-500/15 text-emerald-400',
            violet:  'bg-violet-500/8 border-violet-500/15 text-violet-400',
          };
          return (
            <div key={s.label} className={`${col[s.color]} border rounded-2xl p-4 flex items-center gap-3`}>
              <Icon className="w-5 h-5 flex-shrink-0" />
              <div>
                <p className="text-2xl font-black text-white leading-none">{s.value}</p>
                <p className="text-[10px] text-white/30 mt-0.5 uppercase tracking-widest">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Feedbacks */}
      {feedback && (
        <div className="mb-4 flex items-center gap-2 text-emerald-400 text-sm bg-emerald-500/8 border border-emerald-500/15 rounded-2xl px-5 py-3">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />{feedback}
        </div>
      )}
      {errMsg && (
        <div className="mb-4 text-rose-400 text-sm bg-rose-500/8 border border-rose-500/15 rounded-2xl px-5 py-3">
          ❌ {errMsg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-white/4 border border-white/8 rounded-2xl p-1 mb-5 w-fit">
        {[
          { key: 'drafts', label: 'Brouillons', icon: Pencil,      count: drafts.length },
          { key: 'sent',   label: 'Envoyées',   icon: CheckCircle, count: sent.length   },
        ].map(t => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key as any)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all
                ${active ? 'bg-white text-black' : 'text-white/35 hover:text-white'}`}>
              <Icon className="w-3.5 h-3.5" />
              {t.label}
              {t.count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${active ? 'bg-black/10 text-black' : 'bg-white/8 text-white/30'}`}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Liste */}
      <div className="space-y-2.5">
        {(tab === 'drafts' ? drafts : sent).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-14 h-14 rounded-3xl bg-white/4 border border-white/8 flex items-center justify-center">
              {tab === 'drafts' ? <Pencil className="w-6 h-6 text-white/15" /> : <CheckCircle className="w-6 h-6 text-white/15" />}
            </div>
            <p className="text-white/25 text-sm">
              {tab === 'drafts' ? 'Aucun brouillon — créez votre première campagne' : 'Aucune campagne envoyée'}
            </p>
            {tab === 'drafts' && (
              <button onClick={() => setEditor({ mode: 'create' })}
                className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 text-sm font-bold transition-colors">
                <Plus className="w-4 h-4" /> Créer une campagne
              </button>
            )}
          </div>
        ) : (tab === 'drafts' ? drafts : sent).map(c => (
          <Card key={c.id} c={c}
            onEdit={() => setEditor({ mode: 'edit', camp: c })}
            onDelete={() => handleDelete(c.id)}
            onSend={() => handleSend(c)}
            onPreview={() => setPreview(c)}
            sending={sending === c.id}
          />
        ))}
      </div>

      {/* Note SQL si table absente */}
      <details className="mt-8 group">
        <summary className="cursor-pointer text-xs text-white/15 hover:text-white/30 transition-colors font-bold">
          ⚙️ Afficher le SQL si la table email_campaigns n'existe pas
        </summary>
        <pre className="mt-3 text-[11px] text-indigo-300/40 bg-black/30 rounded-2xl p-4 overflow-x-auto font-mono whitespace-pre-wrap border border-indigo-500/10">{`CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','sent','scheduled')),
  recipients INT DEFAULT 0,
  target_role TEXT DEFAULT 'all',
  sent_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campaigns_all" ON public.email_campaigns FOR ALL USING (true);
GRANT ALL ON public.email_campaigns TO authenticated;`}
        </pre>
      </details>

      {/* Modals */}
      {editor && (
        <Editor
          mode={editor.mode}
          camp={editor.camp}
          contactCount={contacts.length}
          onClose={() => setEditor(null)}
          onSaved={handleSaved}
        />
      )}
      {preview && <PreviewModal c={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}