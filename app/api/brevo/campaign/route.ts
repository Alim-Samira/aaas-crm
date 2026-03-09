// app/api/brevo/campaign/route.ts
// Envoie une campagne email via Brevo à tous les contacts ciblés
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const { campaignId } = await req.json();
    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId requis' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    // Vérifier que l'utilisateur est admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    // Récupérer la campagne
    const { data: campaign, error: campErr } = await supabase
      .from('email_campaigns').select('*').eq('id', campaignId).single();
    if (campErr || !campaign) {
      return NextResponse.json({ error: 'Campagne introuvable' }, { status: 404 });
    }

    // Récupérer les destinataires selon target_role
    let emailQuery = supabase.from('contacts').select('email, first_name, last_name').not('email', 'is', null);

    // Si ciblage par rôle, filtrer via profiles
    let recipients: { email: string; first_name: string; last_name: string }[] = [];

    if (campaign.target_role && campaign.target_role !== 'all') {
      const { data: profiles } = await supabase
        .from('profiles').select('email').eq('role', campaign.target_role);
      const roleEmails = new Set((profiles ?? []).map((p: any) => p.email));
      const { data: contacts } = await emailQuery;
      recipients = (contacts ?? []).filter((c: any) => c.email && roleEmails.has(c.email));
    } else {
      const { data: contacts } = await emailQuery;
      recipients = (contacts ?? []) as any[];
    }

    if (recipients.length === 0) {
      return NextResponse.json({ error: 'Aucun destinataire trouvé' }, { status: 400 });
    }

    // Envoyer via Brevo
    const BREVO_API_KEY  = process.env.BREVO_API_KEY;
    const SENDER_EMAIL   = process.env.BREVO_SENDER_EMAIL ?? 'noreply@aaas-crm.fr';
    const SENDER_NAME    = process.env.BREVO_SENDER_NAME  ?? 'AAAS CRM';

    if (!BREVO_API_KEY) {
      return NextResponse.json({ error: 'BREVO_API_KEY manquante dans les variables d\'environnement' }, { status: 500 });
    }

    // Envoyer en batch (max 50 par appel Brevo)
    const batchSize = 50;
    let sent = 0;

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      const to = batch.map(r => ({
        email: r.email,
        name:  `${r.first_name} ${r.last_name}`.trim(),
      }));

      // Remplacer les variables dans le contenu
      const htmlContent = campaign.body
        ? `<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:20px;">
            ${campaign.body
              .replace(/\{\{first_name\}\}/g, batch[0]?.first_name ?? '')
              .replace(/\{\{last_name\}\}/g,  batch[0]?.last_name  ?? '')
              .replace(/\{\{email\}\}/g,       batch[0]?.email      ?? '')
              .replace(/\n/g, '<br/>')}
           </div>`
        : `<p>Message de AAAS CRM</p>`;

      const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Accept':       'application/json',
          'Content-Type': 'application/json',
          'api-key':      BREVO_API_KEY,
        },
        body: JSON.stringify({
          sender:      { name: SENDER_NAME, email: SENDER_EMAIL },
          to,
          subject:     campaign.subject,
          htmlContent,
        }),
      });

      if (!brevoRes.ok) {
        const errBody = await brevoRes.json().catch(() => ({}));
        console.error('Brevo error:', errBody);
        // Continuer malgré l'erreur sur un batch
      } else {
        sent += batch.length;
      }
    }

    // Mettre à jour le statut de la campagne
    await supabase.from('email_campaigns')
      .update({
        status:     'sent',
        sent_at:    new Date().toISOString(),
        recipients: sent,
      })
      .eq('id', campaignId);

    return NextResponse.json({ success: true, sent });

  } catch (err: any) {
    console.error('Campaign API error:', err);
    return NextResponse.json({ error: err.message ?? 'Erreur serveur' }, { status: 500 });
  }
}