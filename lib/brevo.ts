// lib/brevo.ts
// ─────────────────────────────────────────────────────────────
// Brevo (formerly Sendinblue) email automation utility
// Uses the Brevo Transactional Email REST API v3
// ─────────────────────────────────────────────────────────────

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

interface EmailRecipient {
  email: string;
  name?: string;
}

interface SendEmailOptions {
  to: EmailRecipient[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  sender?: EmailRecipient;
  replyTo?: EmailRecipient;
}

/**
 * Send a transactional email via Brevo API
 */
export async function sendEmail(options: SendEmailOptions) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error('BREVO_API_KEY is not configured');

  const payload = {
    sender: options.sender ?? {
      name: process.env.BREVO_SENDER_NAME ?? 'CRM SaaS',
      email: process.env.BREVO_SENDER_EMAIL ?? 'noreply@yourcrm.com',
    },
    to: options.to,
    replyTo: options.replyTo,
    subject: options.subject,
    htmlContent: options.htmlContent,
    textContent: options.textContent,
  };

  const res = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Brevo API error ${res.status}: ${JSON.stringify(err)}`);
  }

  return res.json();
}

// ─────────────────────────────────────────────────────────────
// Pre-built email templates
// ─────────────────────────────────────────────────────────────

/**
 * Welcome email sent when a new lead is created
 */
export function buildWelcomeLeadEmail(params: {
  contactName: string;
  leadTitle: string;
  assignedTo: string;
}) {
  const { contactName, leadTitle, assignedTo } = params;
  return {
    subject: `🎯 Nouveau lead : ${leadTitle}`,
    htmlContent: `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: 'Helvetica Neue', sans-serif; background: #0f172a; margin: 0; padding: 40px 20px; }
    .card { background: linear-gradient(135deg, rgba(99,102,241,.15), rgba(168,85,247,.15));
            border: 1px solid rgba(99,102,241,.3); border-radius: 16px; max-width: 560px;
            margin: 0 auto; padding: 40px; }
    h1 { color: #e2e8f0; font-size: 24px; margin-bottom: 8px; }
    p  { color: #94a3b8; font-size: 15px; line-height: 1.6; }
    .badge { display:inline-block; background: rgba(99,102,241,.3); color: #a5b4fc;
             border-radius: 999px; padding: 4px 14px; font-size: 13px; font-weight: 600; }
    .divider { border: none; border-top: 1px solid rgba(255,255,255,.1); margin: 24px 0; }
    .btn { display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6);
           color: #fff; text-decoration: none; border-radius: 10px; padding: 12px 28px;
           font-weight: 700; font-size: 15px; margin-top: 16px; }
    .footer { color: #475569; font-size: 12px; text-align: center; margin-top: 32px; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">Nouveau Lead</span>
    <h1>Bonjour ${contactName} 👋</h1>
    <p>Un nouveau lead vient d'être créé dans votre CRM et vous a été assigné.</p>
    <hr class="divider" />
    <p><strong style="color:#e2e8f0">Lead :</strong> <span style="color:#a5b4fc">${leadTitle}</span></p>
    <p><strong style="color:#e2e8f0">Assigné à :</strong> ${assignedTo}</p>
    <a class="btn" href="${process.env.NEXT_PUBLIC_APP_URL ?? '#'}/pipeline">
      Voir le Pipeline →
    </a>
    <hr class="divider" />
    <p class="footer">CRM SaaS · ${new Date().getFullYear()} · Ne pas répondre à cet email.</p>
  </div>
</body>
</html>`,
    textContent: `Nouveau lead "${leadTitle}" assigné à ${assignedTo}.\nConnectez-vous pour voir le pipeline.`,
  };
}

/**
 * Notification email when a lead status changes
 */
export function buildLeadStatusEmail(params: {
  contactName: string;
  leadTitle: string;
  oldStatus: string;
  newStatus: string;
}) {
  const { contactName, leadTitle, oldStatus, newStatus } = params;
  const statusLabels: Record<string, string> = {
    new: 'Nouveau',
    in_progress: 'En cours',
    converted: ' Converti',
    lost: ' Perdu',
  };
  return {
    subject: `📊 Mise à jour lead : ${leadTitle}`,
    htmlContent: `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"/>
  <style>
    body{font-family:'Helvetica Neue',sans-serif;background:#0f172a;margin:0;padding:40px 20px;}
    .card{background:linear-gradient(135deg,rgba(99,102,241,.15),rgba(168,85,247,.15));
          border:1px solid rgba(99,102,241,.3);border-radius:16px;max-width:560px;margin:0 auto;padding:40px;}
    h1{color:#e2e8f0;font-size:22px;}
    p{color:#94a3b8;font-size:15px;line-height:1.6;}
    .arrow{color:#6366f1;font-weight:700;font-size:18px;padding:0 8px;}
    .footer{color:#475569;font-size:12px;text-align:center;margin-top:32px;}
  </style>
</head>
<body>
  <div class="card">
    <h1>Mise à jour du lead</h1>
    <p>Bonjour ${contactName},</p>
    <p>Le statut du lead <strong style="color:#a5b4fc">${leadTitle}</strong> a changé :</p>
    <p style="font-size:18px">
      <span style="color:#94a3b8">${statusLabels[oldStatus] ?? oldStatus}</span>
      <span class="arrow">→</span>
      <span style="color:#e2e8f0;font-weight:700">${statusLabels[newStatus] ?? newStatus}</span>
    </p>
    <p class="footer">CRM SaaS · ${new Date().getFullYear()}</p>
  </div>
</body>
</html>`,
    textContent: `Lead "${leadTitle}" : ${oldStatus} → ${newStatus}`,
  };
}
