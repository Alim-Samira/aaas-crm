// app/campaigns/page.tsx
// ✅ PREMIUM GLASSMORPHISM — aperçu haute qualité · éditeur riche · brouillons/envoyées
'use client';

import { useEffect, useState } from 'react';
import {
  Plus, Mail, Send, Eye, Trash2, Pencil, X, Check,
  Users, Loader2, RefreshCw, Clock, CheckCircle,
  FileText, Sparkles, BarChart2, Zap,
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

// ─── Templates ───────────────────────────────────────────────────
const TEMPLATES: Array<Omit<Campaign, 'id' | 'recipients' | 'sent_at' | 'created_at'>> = [
  {
    name: '🎉 Newsletter mensuelle',
    subject: 'Les actualités AAAS — ce mois-ci',
    body: `Bonjour {{first_name}},

Voici les dernières actualités de notre équipe.

🚀 Nouveautés
• Nouvelles fonctionnalités disponibles dans votre CRM
• Optimisation des performances du pipeline

📊 Chiffres du mois
• Leads traités : +15%
• Taux de conversion : 23%

Merci pour votre confiance,
L'équipe AAAS`,
    status: 'draft', target_role: 'all',
  },
  {
    name: '💰 Offre promotionnelle',
    subject: "Offre exclusive — jusqu'à -30% sur nos services",
    body: `Bonjour {{first_name}},

Nous avons une offre exceptionnelle pour vous.

🔥 PROMOTION LIMITÉE
Bénéficiez de -30% sur l'ensemble de nos prestations.

✅ Ce qui est inclus :
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
Pensez à relancer les leads en attente depuis plus de 15 jours.

Bonne continuation,
L'équipe AAAS`,
    status: 'draft', target_role: 'commercial',
  },
];

// ─── HTML email haute qualité ─────────────────────────────────────
function buildEmailHtml(subject: string, body: string, recipientFirstName = '{{first_name}}') {
  const personalizedBody = body
    .replace(/\{\{first_name\}\}/g, recipientFirstName)
    .replace(/\n/g, '<br/>');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#080d1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:24px 16px;">

  <!-- HEADER -->
  <div style="
    background:linear-gradient(135deg,#1a1040 0%,#2d1b69 40%,#1a1040 100%);
    border-radius:24px 24px 0 0;
    padding:32px 36px 28px;
    border:1px solid rgba(139,92,246,0.3);
    border-bottom:none;
    position:relative;
    overflow:hidden;
  ">
    <div style="position:absolute;top:-40px;right:-40px;width:160px;height:160px;background:radial-gradient(circle,rgba(139,92,246,0.3) 0%,transparent 70%);pointer-events:none;"></div>
    <div style="position:absolute;bottom:-20px;left:20px;width:100px;height:100px;background:radial-gradient(circle,rgba(99,102,241,0.2) 0%,transparent 70%);pointer-events:none;"></div>
    <div style="display:flex;align-items:center;gap:14px;position:relative;">
      <div style="
        width:48px;height:48px;
        background:linear-gradient(135deg,#6366f1,#8b5cf6,#a78bfa);
        border-radius:16px;
        display:flex;align-items:center;justify-content:center;
        font-size:22px;color:white;font-weight:900;font-style:italic;
        box-shadow:0 8px 32px rgba(99,102,241,0.6),0 0 0 1px rgba(255,255,255,0.1);
        flex-shrink:0;
      ">A</div>
      <div>
        <div style="color:white;font-weight:900;font-size:20px;letter-spacing:-0.8px;line-height:1.1;">AAAS CRM</div>
        <div style="color:rgba(196,181,253,0.6);font-size:10px;letter-spacing:3px;text-transform:uppercase;margin-top:2px;">Automation · Intelligence · Growth</div>
      </div>
    </div>
  </div>

  <!-- DIVIDER GLOW -->
  <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(139,92,246,0.8),rgba(99,102,241,0.8),transparent);"></div>

  <!-- BODY -->
  <div style="
    background:linear-gradient(180deg,rgba(15,10,35,0.97) 0%,rgba(10,15,35,0.99) 100%);
    padding:36px 36px 32px;
    border-left:1px solid rgba(99,102,241,0.15);
    border-right:1px solid rgba(99,102,241,0.15);
  ">
    <h2 style="
      margin:0 0 24px;
      font-size:24px;font-weight:800;line-height:1.25;
      background:linear-gradient(135deg,#e0e7ff 0%,#a5b4fc 50%,#c4b5fd 100%);
      -webkit-background-clip:text;-webkit-text-fill-color:transparent;
      background-clip:text;
    ">${subject}</h2>

    <div style="
      color:#94a3b8;
      line-height:1.9;
      font-size:15px;
      white-space:pre-line;
    ">${personalizedBody}</div>

    <!-- CTA Button -->
    <div style="margin-top:32px;text-align:center;">
      <a href="#" style="
        display:inline-block;
        background:linear-gradient(135deg,#6366f1,#8b5cf6);
        color:white;font-weight:700;font-size:14px;
        padding:14px 32px;border-radius:14px;
        text-decoration:none;
        box-shadow:0 8px 24px rgba(99,102,241,0.4);
        letter-spacing:0.3px;
      ">Accéder à votre espace →</a>
    </div>
  </div>

  <!-- FOOTER -->
  <div style="
    background:rgba(5,8,20,0.98);
    padding:20px 36px;
    border-radius:0 0 24px 24px;
    border:1px solid rgba(99,102,241,0.1);
    border-top:1px solid rgba(99,102,241,0.08);
  ">
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
      <span style="color:#334155;font-size:11px;">© 2026 AAAS CRM · Tous droits réservés</span>
      <span style="
        color:rgba(99,102,241,0.5);font-size:10px;
        padding:3px 12px;
        border:1px solid rgba(99,102,241,0.2);
        border-radius:20px;
        background:rgba(99,102,241,0.05);
      ">Envoyé via Brevo</span>
    </div>
    <p style="color:#1e293b;font-size:10px;margin:8px 0 0;line-height:1.5;">
      Vous recevez cet email car vous êtes en relation avec AAAS CRM.<br/>
      Pour vous désabonner, répondez à cet email avec "STOP".
    </p>
  </div>

</div>
</body>
</html>`;
}

// ─── Modal Aperçu Premium ─────────────────────────────────────────
function PreviewModal({ c, onClose }: { c: Campaign; onClose: () => void }) {
  const dateStr = c.sent_at
    ? new Date(c.sent_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const emailHtml = buildEmailHtml(c.subject, c.body ?? '', 'Prénom');

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ perspective: '1200px' }}
    >
      {/* Backdrop avec effet radial */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.08) 0%, rgba(0,0,0,0.92) 70%)',
          backdropFilter: 'blur(24px)',
        }}
        onClick={onClose}
      />

      {/* Halo derrière la fenêtre */}
      <div
        className="absolute"
        style={{
          width: 700, height: 700,
          background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
          transform: 'translateZ(-100px)',
          pointerEvents: 'none',
        }}
      />

      <div
        className="relative w-full max-w-[640px] flex flex-col"
        style={{
          maxHeight: '90vh',
          boxShadow: '0 0 0 1px rgba(139,92,246,0.25), 0 32px 80px rgba(0,0,0,0.8), 0 0 80px rgba(99,102,241,0.2)',
          borderRadius: 24,
          overflow: 'hidden',
        }}
      >
        {/* Barre fenêtre glassmorphism */}
        <div style={{
          background: 'rgba(20,14,50,0.85)',
          backdropFilter: 'blur(40px)',
          borderBottom: '1px solid rgba(139,92,246,0.2)',
          padding: '12px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Traffic lights */}
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={onClose} style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444', border: 'none', cursor: 'pointer', opacity: 0.8 }} />
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#f59e0b', opacity: 0.6 }} />
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#10b981', opacity: 0.6 }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 14, height: 14,
                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                borderRadius: 4,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 8, color: 'white', fontWeight: 900, fontStyle: 'italic',
              }}>A</div>
              <span style={{ color: 'rgba(196,181,253,0.5)', fontSize: 11, fontFamily: 'monospace' }}>
                Aperçu · {c.name}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '4px 8px', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 11 }}
          >
            ✕ Fermer
          </button>
        </div>

        {/* En-tête méta email */}
        <div style={{
          background: 'rgba(10,7,28,0.92)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(99,102,241,0.1)',
          padding: '12px 20px',
          flexShrink: 0,
        }}>
          {[
            { label: 'De :', value: 'AAAS CRM <noreply@aaas-crm.fr>' },
            { label: 'Objet :', value: c.subject, bold: true },
            { label: 'Date :', value: dateStr },
            { label: 'Cible :', value: c.target_role === 'all' ? 'Tous les contacts' : c.target_role },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 4 }}>
              <span style={{ color: 'rgba(139,92,246,0.5)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', width: 48, flexShrink: 0, marginTop: 1 }}>
                {row.label}
              </span>
              <span style={{ color: row.bold ? 'white' : 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: row.bold ? 700 : 400, flex: 1 }}>
                {row.value}
              </span>
            </div>
          ))}
        </div>

        {/* Rendu de l'email dans iframe-like container */}
        <div style={{
          flex: 1, overflowY: 'auto',
          background: 'rgba(5,3,15,0.98)',
          padding: '20px',
        }}>
          <div
            style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(99,102,241,0.15)' }}
            dangerouslySetInnerHTML={{ __html: emailHtml }}
          />
        </div>

        {/* Barre actions basse */}
        <div style={{
          background: 'rgba(15,10,35,0.9)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(99,102,241,0.12)',
          padding: '12px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <span style={{ color: 'rgba(139,92,246,0.4)', fontSize: 10, fontFamily: 'monospace' }}>
            ✦ Rendu fidèle à l'email réel envoyé via Brevo
          </span>
          <button onClick={onClose} style={{
            background: 'rgba(99,102,241,0.12)',
            border: '1px solid rgba(99,102,241,0.25)',
            borderRadius: 10, padding: '6px 16px',
            color: 'rgba(165,180,252,0.8)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}>
            Fermer l'aperçu
          </button>
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
  const [name,    setName]    = useState(camp?.name ?? '');
  const [subject, setSubject] = useState(camp?.subject ?? '');
  const [body,    setBody]    = useState(camp?.body ?? '');
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
    if (!name.trim() || !subject.trim() || !body.trim()) { setErr('Tous les champs sont requis.'); return; }
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
        <div
          className="absolute inset-0"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(16px)' }}
          onClick={onClose}
        />
        <div
          className="relative w-full max-w-2xl flex flex-col"
          style={{
            maxHeight: '92vh',
            background: 'rgba(12,8,30,0.92)',
            backdropFilter: 'blur(40px)',
            border: '1px solid rgba(139,92,246,0.2)',
            borderRadius: 24,
            boxShadow: '0 0 0 1px rgba(99,102,241,0.1), 0 32px 80px rgba(0,0,0,0.7), 0 0 60px rgba(99,102,241,0.1)',
            overflow: 'hidden',
          }}
        >
          {/* Header éditeur */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '20px 28px', borderBottom: '1px solid rgba(99,102,241,0.12)',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 12,
                background: 'rgba(99,102,241,0.15)',
                border: '1px solid rgba(99,102,241,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Mail style={{ width: 16, height: 16, color: '#818cf8' }} />
              </div>
              <div>
                <div style={{ color: 'white', fontWeight: 800, fontSize: 15, lineHeight: 1.2 }}>
                  {mode === 'create' ? 'Nouvelle campagne' : 'Modifier la campagne'}
                </div>
                <div style={{ color: 'rgba(99,102,241,0.5)', fontSize: 11, marginTop: 2 }}>
                  {contactCount} contact{contactCount !== 1 ? 's' : ''} disponible{contactCount !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '6px 10px', color: 'rgba(255,255,255,0.25)', cursor: 'pointer' }}
            >
              <X style={{ width: 14, height: 14, display: 'block' }} />
            </button>
          </div>

          <form onSubmit={save} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {/* Nom */}
                <div>
                  <label style={{ display: 'block', color: 'rgba(196,181,253,0.5)', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>
                    Nom de la campagne *
                  </label>
                  <input
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(99,102,241,0.15)',
                      borderRadius: 14, padding: '10px 14px',
                      color: 'white', fontSize: 13, outline: 'none',
                    }}
                    placeholder="Ex: Newsletter mars 2026"
                    value={name} onChange={e => setName(e.target.value)} autoFocus
                  />
                </div>

                {/* Destinataires */}
                <div>
                  <label style={{ display: 'block', color: 'rgba(196,181,253,0.5)', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>
                    Destinataires
                  </label>
                  <select
                    style={{
                      width: '100%',
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(99,102,241,0.15)',
                      borderRadius: 14, padding: '10px 14px',
                      color: 'white', fontSize: 13, outline: 'none', colorScheme: 'dark',
                    }}
                    value={target} onChange={e => setTarget(e.target.value)}
                  >
                    <option value="all">🌍 Tous les contacts ({contactCount})</option>
                    <option value="commercial">💼 Commerciaux</option>
                    <option value="partner">🤝 Partenaires</option>
                    <option value="user_standard">👤 Utilisateurs standard</option>
                  </select>
                </div>
              </div>

              {/* Objet */}
              <div>
                <label style={{ display: 'block', color: 'rgba(196,181,253,0.5)', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>
                  Objet de l'email *
                </label>
                <input
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(99,102,241,0.15)',
                    borderRadius: 14, padding: '10px 14px',
                    color: 'white', fontSize: 13, outline: 'none',
                  }}
                  placeholder="Ex: Découvrez nos nouveautés de mars"
                  value={subject} onChange={e => setSubject(e.target.value)}
                />
              </div>

              {/* Corps */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ color: 'rgba(196,181,253,0.5)', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                    Contenu *
                  </label>
                  <span style={{ color: 'rgba(99,102,241,0.3)', fontSize: 10, fontFamily: 'monospace' }}>
                    {'{{first_name}}'} {'{{last_name}}'} {'{{email}}'}
                  </span>
                </div>
                <textarea
                  rows={10}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(99,102,241,0.12)',
                    borderRadius: 14, padding: '12px 14px',
                    color: '#94a3b8', fontSize: 13, outline: 'none',
                    resize: 'none', fontFamily: 'monospace', lineHeight: 1.75,
                  }}
                  placeholder={'Bonjour {{first_name}},\n\nVotre message ici...\n\nCordialement,\nL\'équipe AAAS'}
                  value={body} onChange={e => setBody(e.target.value)}
                />
              </div>

              {err && (
                <div style={{ color: '#f87171', fontSize: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 12, padding: '10px 14px' }}>
                  {err}
                </div>
              )}
            </div>

            {/* Footer éditeur */}
            <div style={{
              padding: '16px 28px', borderTop: '1px solid rgba(99,102,241,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'rgba(8,5,20,0.5)', flexShrink: 0,
            }}>
              <button
                type="button"
                onClick={() => setShowPre(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
                  borderRadius: 12, padding: '8px 16px',
                  color: '#818cf8', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}
              >
                <Eye style={{ width: 14, height: 14 }} />
                Aperçu
              </button>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button" onClick={onClose}
                  style={{
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 12, padding: '8px 16px',
                    color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  Annuler
                </button>
                <button
                  type="submit" disabled={saving}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: saving ? 'rgba(255,255,255,0.5)' : 'white',
                    border: 'none', borderRadius: 12, padding: '8px 20px',
                    color: 'black', fontSize: 12, fontWeight: 800, cursor: saving ? 'default' : 'pointer',
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving
                    ? <><span style={{ width: 12, height: 12, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: 'black', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.6s linear infinite' }} />Sauvegarde…</>
                    : <><Check style={{ width: 13, height: 13 }} />{mode === 'create' ? 'Créer' : 'Enregistrer'}</>
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

// ─── Carte campagne premium ───────────────────────────────────────
function CampaignCard({
  c, onEdit, onDelete, onSend, onPreview, sending,
}: {
  c: Campaign;
  onEdit: () => void; onDelete: () => void;
  onSend: () => void; onPreview: () => void;
  sending: boolean;
}) {
  const isSent = c.status === 'sent';

  return (
    <div style={{
      background: isSent
        ? 'linear-gradient(135deg,rgba(16,185,129,0.04) 0%,rgba(5,150,105,0.02) 100%)'
        : 'rgba(255,255,255,0.03)',
      border: `1px solid ${isSent ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.07)'}`,
      borderRadius: 18,
      padding: '16px 20px',
      transition: 'all 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>

        {/* Infos */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>{c.name}</span>
            <span style={{
              fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em',
              padding: '2px 8px', borderRadius: 20,
              color: isSent ? '#34d399' : 'rgba(255,255,255,0.3)',
              background: isSent ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${isSent ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.08)'}`,
            }}>
              {isSent ? '✓ Envoyée' : 'Brouillon'}
            </span>
          </div>

          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, margin: '0 0 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {c.subject}
          </p>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>
              <Users style={{ width: 11, height: 11 }} />
              {isSent ? `${c.recipients} envoyé${c.recipients !== 1 ? 's' : ''}` : `Cible : ${c.target_role === 'all' ? 'tous' : c.target_role}`}
            </span>
            {c.sent_at && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>
                <Clock style={{ width: 11, height: 11 }} />
                {new Date(c.sent_at).toLocaleDateString('fr-FR')}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>

          {/* BOUTON APERÇU — toujours visible */}
          <button
            onClick={onPreview}
            title="Aperçu de l'email"
            style={{
              width: 34, height: 34, borderRadius: 10,
              background: 'rgba(99,102,241,0.08)',
              border: '1px solid rgba(99,102,241,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 0.15s',
              color: '#818cf8',
            }}
          >
            <Eye style={{ width: 14, height: 14 }} />
          </button>

          {/* Actions brouillon */}
          {!isSent && (
            <>
              <button
                onClick={onEdit}
                title="Modifier"
                style={{
                  width: 34, height: 34, borderRadius: 10,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'rgba(255,255,255,0.3)',
                }}
              >
                <Pencil style={{ width: 13, height: 13 }} />
              </button>

              <button
                onClick={onSend}
                disabled={sending}
                title="Envoyer via Brevo"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: sending ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                  border: 'none', borderRadius: 10,
                  padding: '8px 14px',
                  color: 'white', fontSize: 12, fontWeight: 700, cursor: sending ? 'default' : 'pointer',
                  boxShadow: sending ? 'none' : '0 4px 16px rgba(99,102,241,0.4)',
                  transition: 'all 0.15s',
                }}
              >
                {sending
                  ? <Loader2 style={{ width: 13, height: 13, animation: 'spin 0.6s linear infinite' }} />
                  : <Send style={{ width: 13, height: 13 }} />
                }
                {sending ? 'Envoi…' : 'Envoyer'}
              </button>
            </>
          )}

          <button
            onClick={onDelete}
            title="Supprimer"
            style={{
              width: 34, height: 34, borderRadius: 10,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'rgba(239,68,68,0.4)',
            }}
          >
            <Trash2 style={{ width: 13, height: 13 }} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────
export default function CampaignsPage() {
  const supabase   = getSupabaseClient();
  const [camps,    setCamps]    = useState<Campaign[]>([]);
  const [contacts, setContacts] = useState<{ email: string }[]>([]);
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
    const [{ data: cs }, { data: co }] = await Promise.all([
      supabase.from('email_campaigns').select('*').order('created_at', { ascending: false }),
      supabase.from('contacts').select('email').not('email', 'is', null),
    ]);

    const list = (cs ?? []) as Campaign[];
    if (list.length === 0) {
      for (const tpl of TEMPLATES) {
        await supabase.from('email_campaigns').insert({ ...tpl, recipients: 0 });
      }
      const { data: fresh } = await supabase.from('email_campaigns').select('*').order('created_at', { ascending: false });
      setCamps((fresh ?? []) as Campaign[]);
    } else {
      setCamps(list);
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
      setFeedback(`✅ "${c.name}" envoyée à ${j.sent} destinataire${j.sent !== 1 ? 's' : ''} !`);
      setTab('sent');
      load();
    } catch (e: any) { setErrMsg(e.message); }
    finally { setSending(null); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette campagne définitivement ?')) return;
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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'rgba(99,102,241,0.6)' }}>
        <Loader2 style={{ width: 20, height: 20, animation: 'spin 0.6s linear infinite' }} />
        <span style={{ fontSize: 14 }}>Chargement des campagnes…</span>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0;transform:translateY(8px); } to { opacity:1;transform:none; } }
        .camp-page { animation: fadeIn 0.4s ease; }
        .camp-card:hover { transform: translateY(-1px); }
        .btn-preview:hover { background: rgba(99,102,241,0.18) !important; border-color: rgba(99,102,241,0.35) !important; transform: scale(1.05); }
        .btn-edit:hover { background: rgba(255,255,255,0.08) !important; color: white !important; }
        .btn-delete:hover { background: rgba(239,68,68,0.1) !important; color: rgb(248,113,113) !important; }
        .btn-send:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(99,102,241,0.5) !important; }
        .tab-btn:hover { color: white !important; }
      `}</style>

      <div className="camp-page" style={{ padding: '32px 40px', maxWidth: 900 }}>

        {/* ── En-tête ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ color: 'white', fontSize: 28, fontWeight: 900, margin: 0, letterSpacing: -0.8, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{
                width: 42, height: 42, borderRadius: 14,
                background: 'rgba(99,102,241,0.12)',
                border: '1px solid rgba(99,102,241,0.2)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Mail style={{ width: 18, height: 18, color: '#818cf8' }} />
              </span>
              Campagnes Email
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.25)', marginTop: 6, marginLeft: 54, fontSize: 13 }}>
              Emailing automatisé via Brevo · {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              onClick={load}
              style={{
                width: 40, height: 40, borderRadius: 12,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'rgba(255,255,255,0.25)', cursor: 'pointer',
              }}
            >
              <RefreshCw style={{ width: 15, height: 15 }} />
            </button>
            <button
              onClick={() => setEditor({ mode: 'create' })}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'white', border: 'none', borderRadius: 14,
                padding: '10px 20px',
                color: 'black', fontSize: 13, fontWeight: 800, cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
              }}
            >
              <Plus style={{ width: 15, height: 15 }} /> Nouvelle campagne
            </button>
          </div>
        </div>

        {/* ── Stats ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 28 }}>
          {[
            { label: 'Total',       value: camps.length,    icon: FileText,    c: '#818cf8', bg: 'rgba(99,102,241,0.08)',   b: 'rgba(99,102,241,0.15)'   },
            { label: 'Brouillons',  value: drafts.length,   icon: Pencil,      c: '#fbbf24', bg: 'rgba(245,158,11,0.08)',   b: 'rgba(245,158,11,0.15)'   },
            { label: 'Envoyées',    value: sent.length,     icon: CheckCircle, c: '#34d399', bg: 'rgba(16,185,129,0.08)',   b: 'rgba(16,185,129,0.15)'   },
            { label: 'Contacts',    value: contacts.length, icon: Users,       c: '#c084fc', bg: 'rgba(139,92,246,0.08)',   b: 'rgba(139,92,246,0.15)'   },
          ].map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.b}`, borderRadius: 16, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <Icon style={{ width: 18, height: 18, color: s.c, flexShrink: 0 }} />
                <div>
                  <div style={{ color: 'white', fontSize: 22, fontWeight: 900, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Feedbacks ── */}
        {feedback && (
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: '#34d399', fontSize: 13, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 14, padding: '12px 18px' }}>
            <CheckCircle style={{ width: 15, height: 15, flexShrink: 0 }} />{feedback}
          </div>
        )}
        {errMsg && (
          <div style={{ marginBottom: 16, color: '#f87171', fontSize: 13, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 14, padding: '12px 18px' }}>
            ❌ {errMsg}
          </div>
        )}

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 4, width: 'fit-content', marginBottom: 20 }}>
          {[
            { key: 'drafts', label: 'Brouillons', icon: Pencil,      count: drafts.length },
            { key: 'sent',   label: 'Envoyées',   icon: CheckCircle, count: sent.length   },
          ].map(t => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key as any)}
                className="tab-btn"
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '9px 18px', borderRadius: 12, border: 'none',
                  background: active ? 'white' : 'transparent',
                  color: active ? 'black' : 'rgba(255,255,255,0.3)',
                  fontSize: 12, fontWeight: 800, cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <Icon style={{ width: 13, height: 13 }} />
                {t.label}
                {t.count > 0 && (
                  <span style={{
                    fontSize: 10, padding: '1px 6px', borderRadius: 20,
                    background: active ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)',
                    color: active ? 'black' : 'rgba(255,255,255,0.3)',
                  }}>{t.count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Liste campagnes ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(tab === 'drafts' ? drafts : sent).length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', gap: 16 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 20,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {tab === 'drafts'
                  ? <Pencil style={{ width: 22, height: 22, color: 'rgba(255,255,255,0.1)' }} />
                  : <CheckCircle style={{ width: 22, height: 22, color: 'rgba(255,255,255,0.1)' }} />
                }
              </div>
              <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13, margin: 0 }}>
                {tab === 'drafts' ? 'Aucun brouillon — créez votre première campagne' : 'Aucune campagne envoyée pour l\'instant'}
              </p>
              {tab === 'drafts' && (
                <button
                  onClick={() => setEditor({ mode: 'create' })}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#818cf8', background: 'none', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                >
                  <Plus style={{ width: 14, height: 14 }} /> Créer une campagne
                </button>
              )}
            </div>
          ) : (tab === 'drafts' ? drafts : sent).map(c => (
            <CampaignCard
              key={c.id} c={c}
              onEdit={() => setEditor({ mode: 'edit', camp: c })}
              onDelete={() => handleDelete(c.id)}
              onSend={() => handleSend(c)}
              onPreview={() => setPreview(c)}
              sending={sending === c.id}
            />
          ))}
        </div>

        {/* ── SQL info ── */}
        <details style={{ marginTop: 32 }}>
          <summary style={{ cursor: 'pointer', color: 'rgba(255,255,255,0.1)', fontSize: 11, fontWeight: 700, userSelect: 'none' }}>
            ⚙️ SQL — créer la table email_campaigns si manquante
          </summary>
          <pre style={{
            marginTop: 12, fontSize: 11, color: 'rgba(99,102,241,0.4)',
            background: 'rgba(0,0,0,0.4)', borderRadius: 14, padding: 16,
            border: '1px solid rgba(99,102,241,0.1)', overflowX: 'auto',
            fontFamily: 'monospace', whiteSpace: 'pre-wrap', lineHeight: 1.6,
          }}>{`CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL, subject TEXT NOT NULL, body TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','sent','scheduled')),
  recipients INT DEFAULT 0, target_role TEXT DEFAULT 'all',
  sent_at TIMESTAMPTZ, created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campaigns_all" ON public.email_campaigns FOR ALL USING (true);
GRANT ALL ON public.email_campaigns TO authenticated;`}</pre>
        </details>
      </div>

      {/* ── Modals ── */}
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
    </>
  );
}