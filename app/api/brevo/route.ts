// app/api/brevo/route.ts
// ─────────────────────────────────────────────────────────────
// API route – send email via Brevo when a new lead is created
// POST /api/brevo
// ─────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, buildWelcomeLeadEmail } from '@/lib/brevo';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { leadId, leadTitle } = body as { leadId?: string; leadTitle?: string };

    if (!leadId || !leadTitle) {
      return NextResponse.json({ error: 'leadId and leadTitle are required' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch lead with contact info
    const { data: lead } = await supabase
      .from('leads')
      .select('*, contact:contacts(first_name, last_name, email), assigned:profiles!leads_assigned_to_fkey(full_name, email)')
      .eq('id', leadId)
      .single();

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const contactName  = lead.contact
      ? `${lead.contact.first_name} ${lead.contact.last_name}`
      : 'Client';
    const assignedName = lead.assigned?.full_name ?? user.email ?? 'Un commercial';
    const contactEmail = lead.contact?.email ?? lead.assigned?.email ?? user.email;

    if (!contactEmail) {
      return NextResponse.json({ message: 'No email address available, skipping.' });
    }

    const { subject, htmlContent, textContent } = buildWelcomeLeadEmail({
      contactName,
      leadTitle,
      assignedTo: assignedName,
    });

    await sendEmail({
      to: [{ email: contactEmail, name: contactName }],
      subject,
      htmlContent,
      textContent,
    });

    // Log interaction in DB
    await supabase.from('interactions').insert({
      lead_id:     leadId,
      type:        'email',
      description: `Email de bienvenue envoyé automatiquement à ${contactEmail}`,
      created_by:  user.id,
    });

    return NextResponse.json({ success: true, message: `Email sent to ${contactEmail}` });
  } catch (err: any) {
    console.error('[Brevo API] Error:', err);
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 });
  }
}
