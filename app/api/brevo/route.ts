// app/api/brevo/route.ts
// FIX build : createServerSupabaseClient() est async → il faut await
// Erreur originale : "Property 'auth' does not exist on type 'Promise<...>'"
// Cause : on appelait supabase.auth sans avoir attendu la résolution de la Promise
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    //  FIX : await obligatoire — createServerSupabaseClient() retourne une Promise
    const supabase = await createServerSupabaseClient();

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { leadId, leadTitle, recipientEmail, recipientName } = body;

    const BREVO_API_KEY   = process.env.BREVO_API_KEY;
    const SENDER_EMAIL    = process.env.BREVO_SENDER_EMAIL ?? 'noreply@aaas-crm.fr';
    const SENDER_NAME     = process.env.BREVO_SENDER_NAME  ?? 'AAAS CRM';

    if (!BREVO_API_KEY) {
      return NextResponse.json({ error: 'BREVO_API_KEY manquante' }, { status: 500 });
    }

    // Construire l'email
    const toEmail = recipientEmail ?? user.email;
    const toName  = recipientName  ?? user.email;

    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px;">
        <h2 style="color: #6366f1;">AAAS CRM — Nouveau lead</h2>
        <p>Un nouveau lead a été créé :</p>
        <div style="background: #f8fafc; border-left: 4px solid #6366f1; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <strong>${leadTitle ?? 'Nouveau lead'}</strong><br/>
          <small style="color: #64748b;">ID : ${leadId ?? 'N/A'}</small>
        </div>
        <p style="color: #64748b; font-size: 14px;">
          Connectez-vous à votre CRM pour voir les détails.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="color: #94a3b8; font-size: 12px;">AAAS CRM · Automatisation digitale</p>
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
    return NextResponse.json(
      { error: err.message ?? 'Erreur serveur' },
      { status: 500 }
    );
  }
}