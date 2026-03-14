import * as postmark from 'postmark'

const client = process.env.POSTMARK_SERVER_TOKEN
  ? new postmark.ServerClient(process.env.POSTMARK_SERVER_TOKEN)
  : null

const FROM_EMAIL = 'noreply@agentreferrals.ai'
const FROM_NAME = 'AgentReferrals.ai'

export interface InviteEmailData {
  toEmail: string
  toName: string
  inviterName: string
  inviterBrokerage: string
  inviterArea: string
  referralLink: string
  personalMessage?: string
}

export interface NotificationEmailData {
  toEmail: string
  toName: string
  subject: string
  preheader: string
  heading: string
  body: string
  ctaText?: string
  ctaUrl?: string
}

export async function sendInviteEmail(data: InviteEmailData) {
  if (!client) {
    console.log('[Postmark] No token — skipping invite email to', data.toEmail)
    return { success: false, reason: 'no_token' }
  }

  const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8f9fa;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;width:40px;height:40px;background:#f59e0b;border-radius:10px;line-height:40px;text-align:center;font-weight:800;font-size:18px;color:#0f1117;">A</div>
      <div style="margin-top:8px;font-weight:800;font-size:20px;color:#1a1a2e;">Agent<span style="color:#f59e0b;">Referrals</span>.ai</div>
    </div>

    <!-- Card -->
    <div style="background:white;border-radius:16px;padding:40px 32px;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
      <h1 style="font-size:22px;font-weight:700;color:#1a1a2e;margin:0 0 8px;">You've been invited to join AgentReferrals.ai</h1>
      <p style="font-size:15px;color:#6b7280;line-height:1.6;margin:0 0 24px;">
        <strong style="color:#1a1a2e;">${data.inviterName}</strong> from ${data.inviterBrokerage} (${data.inviterArea}) wants to add you to their referral network.
      </p>

      ${data.personalMessage ? `
      <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:16px;border-radius:0 8px 8px 0;margin-bottom:24px;">
        <p style="font-size:13px;color:#92400e;margin:0;font-style:italic;">"${data.personalMessage}"</p>
        <p style="font-size:12px;color:#b45309;margin:8px 0 0;">— ${data.inviterName}</p>
      </div>
      ` : ''}

      <div style="background:#f8f9fa;border-radius:12px;padding:20px;margin-bottom:24px;">
        <h3 style="font-size:14px;font-weight:700;color:#1a1a2e;margin:0 0 12px;">Why agents love AgentReferrals.ai:</h3>
        <div style="font-size:13px;color:#4b5563;line-height:1.8;">
          ✓ AI-powered agent matching (NORA finds the perfect referral partner)<br>
          ✓ Keep 100% of your referral fees — zero platform cuts<br>
          ✓ Pipeline tracking from agreement to close<br>
          ✓ Multi-brokerage network — search across all brokerages<br>
          ✓ Smart agreements with e-signature
        </div>
      </div>

      <div style="text-align:center;">
        <a href="${data.referralLink}" style="display:inline-block;background:#f59e0b;color:#0f1117;font-weight:700;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none;">Join ${data.inviterName}'s Network</a>
      </div>

      <p style="font-size:12px;color:#9ca3af;text-align:center;margin:20px 0 0;">
        Or copy this link: ${data.referralLink}
      </p>
    </div>

    <!-- Footer -->
    <div style="text-align:center;margin-top:24px;font-size:12px;color:#9ca3af;">
      <p>AgentReferrals.ai — AI-powered referral network for real estate agents</p>
      <p style="margin-top:4px;">This email was sent because ${data.inviterName} invited you. <a href="https://agentreferrals.ai" style="color:#f59e0b;">Learn more</a></p>
    </div>
  </div>
</body>
</html>`

  try {
    const result = await client.sendEmail({
      From: `${FROM_NAME} <${FROM_EMAIL}>`,
      To: data.toEmail,
      Subject: `${data.inviterName} invited you to their referral network on AgentReferrals.ai`,
      HtmlBody: htmlBody,
      TextBody: `${data.inviterName} from ${data.inviterBrokerage} invited you to join their referral network on AgentReferrals.ai. Join here: ${data.referralLink}`,
      MessageStream: 'outbound',
    })
    return { success: true, messageId: result.MessageID }
  } catch (error) {
    console.error('[Postmark] Send invite failed:', error)
    return { success: false, reason: 'send_failed', error }
  }
}

export async function sendNotificationEmail(data: NotificationEmailData) {
  if (!client) {
    console.log('[Postmark] No token — skipping notification to', data.toEmail)
    return { success: false, reason: 'no_token' }
  }

  const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8f9fa;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:32px;height:32px;background:#f59e0b;border-radius:8px;line-height:32px;text-align:center;font-weight:800;font-size:14px;color:#0f1117;">A</div>
    </div>
    <div style="background:white;border-radius:16px;padding:32px;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
      <h1 style="font-size:20px;font-weight:700;color:#1a1a2e;margin:0 0 12px;">${data.heading}</h1>
      <div style="font-size:14px;color:#4b5563;line-height:1.7;margin-bottom:24px;">${data.body}</div>
      ${data.ctaText && data.ctaUrl ? `
      <div style="text-align:center;">
        <a href="${data.ctaUrl}" style="display:inline-block;background:#f59e0b;color:#0f1117;font-weight:700;font-size:14px;padding:12px 28px;border-radius:8px;text-decoration:none;">${data.ctaText}</a>
      </div>` : ''}
    </div>
    <div style="text-align:center;margin-top:20px;font-size:11px;color:#9ca3af;">
      <p>AgentReferrals.ai · <a href="https://agentreferrals.ai/dashboard/settings" style="color:#f59e0b;">Manage notifications</a></p>
    </div>
  </div>
</body>
</html>`

  try {
    const result = await client.sendEmail({
      From: `${FROM_NAME} <${FROM_EMAIL}>`,
      To: data.toEmail,
      Subject: data.subject,
      HtmlBody: htmlBody,
      TextBody: `${data.heading}\n\n${data.body.replace(/<[^>]*>/g, '')}${data.ctaUrl ? `\n\n${data.ctaText}: ${data.ctaUrl}` : ''}`,
      MessageStream: 'outbound',
    })
    return { success: true, messageId: result.MessageID }
  } catch (error) {
    console.error('[Postmark] Send notification failed:', error)
    return { success: false, reason: 'send_failed', error }
  }
}
