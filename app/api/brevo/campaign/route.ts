// app/api/brevo/campaign/route.ts
// FIX destinataires : charge contacts depuis table contacts (pas profiles)
// FIX : await createServerSupabaseClient() + export dynamic
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { campaignId } = body;
    if (!campaignId) return NextResponse.json({ error: 'campaignId requis' }, { status: 400 });

    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (profile?.role !== 'admin')
      return NextResponse.json({ error: 'Accès refusé — admin uniquement' }, { status: 403 });

    const { data: campaign, error: campErr } = await supabase
      .from('email_campaigns').select('*').eq('id', campaignId).single();
    if (campErr || !campaign)
      return NextResponse.json({ error: 'Campagne introuvable' }, { status: 404 });

    // ── Résolution des destinataires ───────────────────────────────
    // Tous les contacts avec un email valide (table contacts)
    const { data: allContacts } = await supabase
      .from('contacts')
      .select('email, first_name, last_name')
      .not('email', 'is', null)
      .neq('email', '');

    let recipients: { email: string; first_name: string; last_name: string }[] = (allContacts ?? []) as any[];

    // Si target_role n'est pas "all", filtrer par profils ayant ce rôle
    if (campaign.target_role && campaign.target_role !== 'all') {
      const { data: matchingProfiles } = await supabase
        .from('profiles')
        .select('email')
        .eq('role', campaign.target_role)
        .not('email', 'is', null);

      const roleEmailSet = new Set((matchingProfiles ?? []).map((p: any) => p.email?.toLowerCase()));

      // Garder les contacts dont l'email correspond à un profil du rôle cible
      // OU inclure tous les contacts si aucun profil ne correspond (fallback)
      const filtered = recipients.filter(r => r.email && roleEmailSet.has(r.email.toLowerCase()));
      recipients = filtered.length > 0 ? filtered : recipients; // fallback sur tous si filtre vide
    }

    if (recipients.length === 0)
      return NextResponse.json({ error: 'Aucun destinataire trouvé. Vérifiez que vos contacts ont des emails enregistrés.' }, { status: 400 });

    const BREVO_API_KEY = process.env.BREVO_API_KEY;
    const SENDER_EMAIL  = process.env.BREVO_SENDER_EMAIL  ?? 'noreply@aaas-crm.fr';
    const SENDER_NAME   = process.env.BREVO_SENDER_NAME   ?? 'AAAS CRM';

    if (!BREVO_API_KEY)
      return NextResponse.json({ error: 'BREVO_API_KEY manquante dans Vercel env vars' }, { status: 500 });

    let sent = 0;
    const errors: string[] = [];

    for (const recipient of recipients) {
      const personalizedBody = (campaign.body ?? '')
        .replace(/\{\{first_name\}\}/g, recipient.first_name ?? '')
        .replace(/\{\{last_name\}\}/g,  recipient.last_name  ?? '')
        .replace(/\{\{email\}\}/g,      recipient.email      ?? '');

      const htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#080d1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:32px 16px;">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#1e1b4b 0%,#2e1065 50%,#1e1b4b 100%);border-radius:20px 20px 0 0;padding:28px 32px;border:1px solid rgba(99,102,241,0.25);border-bottom:none;">
    <div style="display:flex;align-items:center;gap:12px;">
      <div style="width:44px;height:44px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:20px;color:white;font-weight:900;font-style:italic;box-shadow:0 8px 24px rgba(99,102,241,0.5);">A</div>
      <div>
        <div style="color:white;font-weight:900;font-size:18px;letter-spacing:-0.5px;">AAAS CRM</div>
        <div style="color:rgba(199,210,254,0.5);font-size:10px;letter-spacing:2px;text-transform:uppercase;">Communication Digitale</div>
      </div>
    </div>
  </div>

  <!-- Corps -->
  <div style="background:rgba(15,23,42,0.96);padding:32px;border-left:1px solid rgba(99,102,241,0.15);border-right:1px solid rgba(99,102,241,0.15);">
    <h2 style="margin:0 0 20px;font-size:22px;font-weight:800;line-height:1.3;color:#c7d2fe;">${campaign.subject}</h2>
    <div style="color:#94a3b8;line-height:1.85;font-size:14px;">
      ${personalizedBody.replace(/\n/g, '<br/>')}
    </div>
  </div>

  <!-- Footer -->
  <div style="background:rgba(8,12,25,0.98);padding:16px 32px;border-radius:0 0 20px 20px;border:1px solid rgba(99,102,241,0.1);border-top:none;display:flex;justify-content:space-between;align-items:center;">
    <span style="color:#334155;font-size:11px;">AAAS CRM · Automatisation digitale</span>
    <span style="color:rgba(99,102,241,0.45);font-size:10px;padding:3px 10px;border:1px solid rgba(99,102,241,0.2);border-radius:20px;">Brevo</span>
  </div>

</div>
</body>
</html>`;

      try {
        const res = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'Accept':       'application/json',
            'Content-Type': 'application/json',
            'api-key':      BREVO_API_KEY,
          },
          body: JSON.stringify({
            sender:      { name: SENDER_NAME, email: SENDER_EMAIL },
            to:          [{ email: recipient.email, name: `${recipient.first_name ?? ''} ${recipient.last_name ?? ''}`.trim() || recipient.email }],
            subject:     campaign.subject,
            htmlContent,
          }),
        });

        if (res.ok) {
          sent++;
        } else {
          const errBody = await res.json().catch(() => ({}));
          errors.push(`${recipient.email}: ${errBody.message ?? res.status}`);
        }
      } catch (fetchErr: any) {
        errors.push(`${recipient.email}: ${fetchErr.message}`);
      }
    }

    // Mettre à jour statut
    await supabase.from('email_campaigns').update({
      status:     'sent',
      sent_at:    new Date().toISOString(),
      recipients: sent,
    }).eq('id', campaignId);

    return NextResponse.json({
      success: true,
      sent,
      total: recipients.length,
      errors: errors.length > 0 ? errors.slice(0, 5) : undefined,
    });

  } catch (err: any) {
    console.error('[campaign route]', err);
    return NextResponse.json({ error: err.message ?? 'Erreur serveur' }, { status: 500 });
  }
}