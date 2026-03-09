// app/api/brevo/route.ts
//    FIX : await createServerSupabaseClient() — sans await = crash TypeScript
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    //    await obligatoire — la fonction est async
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { leadId, leadTitle, recipientEmail, recipientName } = body;

    const BREVO_API_KEY = process.env.BREVO_API_KEY;
    const SENDER_EMAIL  = process.env.BREVO_SENDER_EMAIL ?? 'noreply@aaas-crm.fr';
    const SENDER_NAME   = process.env.BREVO_SENDER_NAME  ?? 'AAAS CRM';

    if (!BREVO_API_KEY) {
      return NextResponse.json({ error: 'BREVO_API_KEY manquante dans Vercel env vars' }, { status: 500 });
    }

    const toEmail = recipientEmail ?? user.email!;
    const toName  = recipientName  ?? toEmail;

    const htmlContent = `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:32px;background:#0f1629;color:#e2e8f0;border-radius:16px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
          <div style="width:40px;height:40px;background:#6366f1;border-radius:10px;display:flex;align-items:center;justify-content:center;">
            <span style="color:white;font-weight:900;font-style:italic;font-size:18px;">A</span>
          </div>
          <span style="color:white;font-weight:900;font-size:20px;letter-spacing:-0.5px;">AAAS CRM</span>
        </div>
        <h2 style="color:white;font-size:22px;margin:0 0 8px;">Nouveau lead créé</h2>
        <p style="color:#94a3b8;margin:0 0 24px;">Un nouveau lead a été ajouté à votre pipeline.</p>
        <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:20px;margin-bottom:24px;">
          <p style="color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:2px;margin:0 0 8px;">Lead</p>
          <p style="color:white;font-weight:700;font-size:18px;margin:0 0 4px;">${leadTitle ?? 'Nouveau lead'}</p>
          <p style="color:#64748b;font-size:13px;margin:0;">ID : ${leadId ?? 'N/A'}</p>
        </div>
        <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://votre-crm.vercel.app'}/pipeline"
           style="display:inline-block;background:#6366f1;color:white;font-weight:700;padding:12px 24px;border-radius:10px;text-decoration:none;font-size:14px;">
          Voir dans le pipeline →
        </a>
        <p style="color:#334155;font-size:12px;margin-top:32px;border-top:1px solid #1e293b;padding-top:16px;">
          AAAS CRM · Automatisation digitale · Envoyé via Brevo
        </p>
      </div>
    `;

    const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept':       'application/json',
        'Content-Type': 'application/json',
        'api-key':      BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender:      { name: SENDER_NAME, email: SENDER_EMAIL },
        to:          [{ email: toEmail, name: toName }],
        subject:     `Nouveau lead : ${leadTitle ?? 'Sans titre'}`,
        htmlContent,
      }),
    });

    const brevoData = await brevoRes.json();

    if (!brevoRes.ok) {
      console.error('Brevo error:', brevoData);
      return NextResponse.json(
        { error: brevoData.message ?? 'Erreur Brevo' },
        { status: brevoRes.status }
      );
    }

    return NextResponse.json({ success: true, messageId: brevoData.messageId });

  } catch (err: any) {
    console.error('Brevo route error:', err);
    return NextResponse.json({ error: err.message ?? 'Erreur serveur' }, { status: 500 });
  }
}