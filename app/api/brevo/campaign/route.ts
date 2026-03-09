// app/api/brevo/campaign/route.ts
//  FIX : await createServerSupabaseClient() + export dynamic
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { campaignId } = await req.json();
    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId requis' }, { status: 400 });
    }

    // ✅ await obligatoire
    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Accès refusé — admin uniquement' }, { status: 403 });
    }

    const { data: campaign, error: campErr } = await supabase
      .from('email_campaigns').select('*').eq('id', campaignId).single();
    if (campErr || !campaign) {
      return NextResponse.json({ error: 'Campagne introuvable' }, { status: 404 });
    }

    // Récupérer les destinataires
    let recipients: { email: string; first_name: string; last_name: string }[] = [];

    if (campaign.target_role && campaign.target_role !== 'all') {
      const { data: profiles } = await supabase
        .from('profiles').select('email').eq('role', campaign.target_role);
      const roleEmails = new Set((profiles ?? []).map((p: any) => p.email));
      const { data: contacts } = await supabase
        .from('contacts').select('email, first_name, last_name').not('email', 'is', null);
      recipients = (contacts ?? []).filter((c: any) => c.email && roleEmails.has(c.email));
    } else {
      const { data: contacts } = await supabase
        .from('contacts').select('email, first_name, last_name').not('email', 'is', null);
      recipients = (contacts ?? []) as any[];
    }

    if (recipients.length === 0) {
      return NextResponse.json({ error: 'Aucun destinataire trouvé' }, { status: 400 });
    }

    const BREVO_API_KEY = process.env.BREVO_API_KEY;
    const SENDER_EMAIL  = process.env.BREVO_SENDER_EMAIL ?? 'noreply@aaas-crm.fr';
    const SENDER_NAME   = process.env.BREVO_SENDER_NAME  ?? 'AAAS CRM';

    if (!BREVO_API_KEY) {
      return NextResponse.json({ error: 'BREVO_API_KEY manquante dans Vercel env vars' }, { status: 500 });
    }

    const batchSize = 50;
    let sent = 0;

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);

      // Envoyer un email personnalisé pour chaque destinataire du batch
      for (const recipient of batch) {
        const personalizedBody = (campaign.body ?? '')
          .replace(/\{\{first_name\}\}/g, recipient.first_name ?? '')
          .replace(/\{\{last_name\}\}/g,  recipient.last_name  ?? '')
          .replace(/\{\{email\}\}/g,       recipient.email      ?? '');

        const htmlContent = `
          <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:32px;background:#0f1629;color:#e2e8f0;border-radius:16px;">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
              <div style="width:36px;height:36px;background:#6366f1;border-radius:8px;display:flex;align-items:center;justify-content:center;">
                <span style="color:white;font-weight:900;font-style:italic;">A</span>
              </div>
              <span style="color:white;font-weight:900;font-size:18px;">AAAS CRM</span>
            </div>
            <h2 style="color:white;margin:0 0 16px;">${campaign.subject}</h2>
            <div style="color:#cbd5e1;line-height:1.7;">
              ${personalizedBody.replace(/\n/g, '<br/>')}
            </div>
            <hr style="border:none;border-top:1px solid #1e293b;margin:32px 0 16px;"/>
            <p style="color:#475569;font-size:12px;margin:0;">
              AAAS CRM · Automatisation digitale · Envoyé via Brevo
            </p>
          </div>
        `;

        const res = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'Accept':       'application/json',
            'Content-Type': 'application/json',
            'api-key':      BREVO_API_KEY,
          },
          body: JSON.stringify({
            sender: { name: SENDER_NAME, email: SENDER_EMAIL },
            to:     [{ email: recipient.email, name: `${recipient.first_name} ${recipient.last_name}`.trim() }],
            subject: campaign.subject,
            htmlContent,
          }),
        });

        if (res.ok) sent++;
      }
    }

    // Mettre à jour le statut
    await supabase.from('email_campaigns').update({
      status:     'sent',
      sent_at:    new Date().toISOString(),
      recipients: sent,
    }).eq('id', campaignId);

    return NextResponse.json({ success: true, sent });

  } catch (err: any) {
    console.error('Campaign route error:', err);
    return NextResponse.json({ error: err.message ?? 'Erreur serveur' }, { status: 500 });
  }
}