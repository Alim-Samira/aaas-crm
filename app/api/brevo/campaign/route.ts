// app/api/brevo/campaign/route.ts
//     FIX: Recipients now filtered from profiles table by role (not contacts)
//         → "partner" sends only to profiles with role='partner'
//     Click/open tracking: unique tracking URL injected per email
//     Webhook endpoint: GET /api/brevo/campaign?webhook=1 for Brevo events
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// ─── GET: test OR webhook handler ────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // ── Brevo webhook: ?webhook=1&event=click&campaignId=xxx&email=yyy
  if (searchParams.get('webhook') === '1') {
    const event      = searchParams.get('event');
    const campaignId = searchParams.get('campaignId');
    const email      = searchParams.get('email');

    if (campaignId && event) {
      const supabase = await createServerSupabaseClient();
      if (event === 'click') {
        await supabase.rpc('increment_campaign_clicks', { campaign_id: campaignId });
      } else if (event === 'open') {
        await supabase.rpc('increment_campaign_opens', { campaign_id: campaignId });
      }
    }
    return NextResponse.json({ ok: true });
  }

  // ── Test email endpoint: ?test=1
  if (searchParams.get('test') !== '1')
    return NextResponse.json({ info: 'Ajoute ?test=1 pour lancer le test Brevo' });

  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  const SENDER_EMAIL  = process.env.BREVO_SENDER_EMAIL;
  const SENDER_NAME   = process.env.BREVO_SENDER_NAME ?? 'AAAS CRM';

  const missing = [];
  if (!BREVO_API_KEY) missing.push('BREVO_API_KEY');
  if (!SENDER_EMAIL)  missing.push('BREVO_SENDER_EMAIL');
  if (missing.length > 0)
    return NextResponse.json({ error: `Variables manquantes : ${missing.join(', ')}` }, { status: 500 });

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': BREVO_API_KEY! },
    body: JSON.stringify({
      sender: { name: SENDER_NAME, email: SENDER_EMAIL },
      to: [{ email: user.email }],
      subject: '    Test Brevo AAAS CRM',
      htmlContent: `<div style="font-family:sans-serif;padding:32px;background:#0f1629;color:#e2e8f0;border-radius:16px;">
        <h2 style="color:#a5b4fc;">    Brevo fonctionne !</h2>
        <p style="color:#94a3b8;">Expéditeur : ${SENDER_EMAIL}</p>
      </div>`,
    }),
  });

  const json = await res.json();
  if (!res.ok) return NextResponse.json({ error: json.message, hint: 'Vérifiez sender dans Brevo → Senders & IP' }, { status: 400 });
  return NextResponse.json({ success: true, to: user.email });
}

// ─── POST: Send campaign ──────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { campaignId } = body;
    if (!campaignId) return NextResponse.json({ error: 'campaignId requis' }, { status: 400 });

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

    const { data: campaign, error: campErr } = await supabase
      .from('email_campaigns').select('*').eq('id', campaignId).single();
    if (campErr || !campaign)
      return NextResponse.json({ error: 'Campagne introuvable' }, { status: 404 });

    const BREVO_API_KEY = process.env.BREVO_API_KEY;
    const SENDER_EMAIL  = process.env.BREVO_SENDER_EMAIL;
    const SENDER_NAME   = process.env.BREVO_SENDER_NAME ?? 'AAAS CRM';
    const APP_URL       = process.env.NEXT_PUBLIC_APP_URL ?? 'https://aaas-crm.vercel.app';

    const missing = [];
    if (!BREVO_API_KEY) missing.push('BREVO_API_KEY');
    if (!SENDER_EMAIL)  missing.push('BREVO_SENDER_EMAIL');
    if (missing.length > 0)
      return NextResponse.json({ error: `Variables Vercel manquantes : ${missing.join(', ')}` }, { status: 500 });

    // ── FIXED: Get recipients from PROFILES table filtered by role ──
    // Previously it was querying the contacts table and then trying to
    // match by email — this caused ALL contacts to receive the email.
    // Now we query profiles directly by role.
    let recipientProfiles: { email: string; full_name: string | null }[] = [];

    if (!campaign.target_role || campaign.target_role === 'all') {
      // Send to ALL profiles that have an email
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('email, full_name')
        .not('email', 'is', null)
        .neq('email', '');
      recipientProfiles = (allProfiles ?? []) as any[];
    } else {
      // Send ONLY to profiles with the specific role
      const { data: roleProfiles } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('role', campaign.target_role)
        .not('email', 'is', null)
        .neq('email', '');
      recipientProfiles = (roleProfiles ?? []) as any[];
    }

    // Fallback: if no profiles found, send to admin
    if (recipientProfiles.length === 0) {
      const { data: adminProfile } = await supabase
        .from('profiles').select('email, full_name').eq('id', user.id).maybeSingle();
      if (adminProfile?.email) {
        recipientProfiles = [{ email: adminProfile.email, full_name: adminProfile.full_name }];
        console.log('[brevo] No recipients found — sending to admin:', adminProfile.email);
      } else {
        return NextResponse.json({
          error: `Aucun utilisateur avec le rôle "${campaign.target_role}" trouvé.`,
        }, { status: 400 });
      }
    }

    let sent = 0;
    const errors: string[] = [];

    for (const recipient of recipientProfiles) {
      const firstName   = recipient.full_name?.split(' ')[0] ?? recipient.email.split('@')[0];
      const lastName    = recipient.full_name?.split(' ').slice(1).join(' ') ?? '';
      const trackingUrl = `${APP_URL}/api/brevo/campaign?webhook=1&event=click&campaignId=${campaignId}&email=${encodeURIComponent(recipient.email)}`;
      const openUrl     = `${APP_URL}/api/brevo/campaign?webhook=1&event=open&campaignId=${campaignId}&email=${encodeURIComponent(recipient.email)}`;

      const personalizedBody = (campaign.body ?? '')
        .replace(/\{\{first_name\}\}/g, firstName)
        .replace(/\{\{last_name\}\}/g,  lastName)
        .replace(/\{\{email\}\}/g,      recipient.email);

      const htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#080d1a;">
<!-- Open tracking pixel -->
<img src="${openUrl}" width="1" height="1" style="display:none;" alt=""/>
<div style="max-width:600px;margin:0 auto;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="background:linear-gradient(135deg,#1e1b4b,#2e1065,#1e1b4b);border-radius:20px 20px 0 0;padding:28px 32px;border:1px solid rgba(99,102,241,0.3);border-bottom:none;">
    <div style="display:flex;align-items:center;gap:12px;">
      <div style="width:44px;height:44px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:14px;text-align:center;line-height:44px;font-size:20px;color:white;font-weight:900;font-style:italic;">A</div>
      <div style="color:white;font-weight:900;font-size:18px;letter-spacing:-0.5px;">AAAS CRM</div>
    </div>
  </div>
  <div style="background:#0f172a;padding:32px;border-left:1px solid rgba(99,102,241,0.15);border-right:1px solid rgba(99,102,241,0.15);">
    <h2 style="margin:0 0 20px;font-size:22px;font-weight:800;color:#c7d2fe;line-height:1.3;">${campaign.subject}</h2>
    <div style="color:#94a3b8;line-height:1.85;font-size:14px;white-space:pre-line;">${personalizedBody}</div>
    <div style="margin-top:28px;">
      <a href="${trackingUrl}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;padding:12px 28px;border-radius:12px;font-weight:700;font-size:14px;text-decoration:none;">
        Voir dans le CRM →
      </a>
    </div>
  </div>
  <div style="background:#080d1a;padding:16px 32px;border-radius:0 0 20px 20px;border:1px solid rgba(99,102,241,0.1);border-top:1px solid rgba(99,102,241,0.1);">
    <span style="color:#334155;font-size:11px;">AAAS CRM · Automatisation digitale · Envoyé via Brevo</span>
  </div>
</div>
</body>
</html>`;

      try {
        const res = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'api-key': BREVO_API_KEY!,
          },
          body: JSON.stringify({
            sender:      { name: SENDER_NAME, email: SENDER_EMAIL },
            to:          [{ email: recipient.email, name: recipient.full_name || recipient.email }],
            subject:     campaign.subject,
            htmlContent,
          }),
        });
        const json = await res.json();
        if (res.ok) {
          sent++;
          console.log(`[brevo]     ${recipient.email} — ${json.messageId}`);
        } else {
          errors.push(`${recipient.email}: ${json.message ?? res.status}`);
        }
      } catch (e: any) {
        errors.push(`${recipient.email}: ${e.message}`);
      }
    }

    // Update campaign status
    await supabase.from('email_campaigns').update({
      status:     'sent',
      sent_at:    new Date().toISOString(),
      recipients: sent,
    }).eq('id', campaignId);

    return NextResponse.json({
      success: true,
      sent,
      total: recipientProfiles.length,
      target_role: campaign.target_role || 'all',
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
    });

  } catch (err: any) {
    console.error('[campaign route error]', err);
    return NextResponse.json({ error: err.message ?? 'Erreur serveur' }, { status: 500 });
  }
}