import * as postmark from 'postmark'

const client = process.env.POSTMARK_SERVER_TOKEN
  ? new postmark.ServerClient(process.env.POSTMARK_SERVER_TOKEN)
  : null

const FROM_EMAIL = 'info@agentreferrals.ai'
const FROM_NAME = 'AgentReferrals'

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
      <h1 style="font-size:22px;font-weight:700;color:#1a1a2e;margin:0 0 8px;">You've been invited to join AgentReferrals</h1>
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
        <h3 style="font-size:14px;font-weight:700;color:#1a1a2e;margin:0 0 12px;">Why agents love AgentReferrals:</h3>
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
      <p>AgentReferrals — AI-powered referral network for real estate agents</p>
      <p style="margin-top:4px;">This email was sent because ${data.inviterName} invited you. <a href="https://agentreferrals.ai" style="color:#f59e0b;">Learn more</a></p>
    </div>
  </div>
</body>
</html>`

  try {
    const result = await client.sendEmail({
      From: `${FROM_NAME} <${FROM_EMAIL}>`,
      To: data.toEmail,
      Subject: `${data.inviterName} invited you to their referral network on AgentReferrals`,
      HtmlBody: htmlBody,
      TextBody: `${data.inviterName} from ${data.inviterBrokerage} invited you to join their referral network on AgentReferrals. Join here: ${data.referralLink}`,
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
      <p>AgentReferrals · <a href="https://agentreferrals.ai/dashboard/settings" style="color:#f59e0b;">Manage notifications</a></p>
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

// ═══════════════════════════════════════════════════════════════
// INVITER NOTIFICATION — someone they invited just joined
// ═══════════════════════════════════════════════════════════════

export interface InviterNotificationData {
  toEmail: string
  toName: string
  newMemberName: string
  newMemberBrokerage: string
  newMemberArea: string
}

export async function sendInviterNotification(data: InviterNotificationData) {
  if (!client) {
    console.log('[Postmark] No token — skipping inviter notification to', data.toEmail)
    return { success: false, reason: 'no_token' }
  }

  const firstName = data.toName.split(' ')[0] || 'there'

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
      <div style="text-align:center;margin-bottom:24px;">
        <div style="display:inline-block;width:56px;height:56px;background:linear-gradient(135deg,#10b981,#059669);border-radius:50%;line-height:56px;text-align:center;font-size:24px;">&#9989;</div>
      </div>

      <h1 style="font-size:22px;font-weight:700;color:#1a1a2e;margin:0 0 8px;text-align:center;">Great news, ${firstName}!</h1>
      <p style="font-size:15px;color:#6b7280;line-height:1.6;margin:0 0 24px;text-align:center;">
        <strong style="color:#1a1a2e;">${data.newMemberName}</strong> from ${data.newMemberBrokerage} (${data.newMemberArea}) just joined AgentReferrals using your invite.
      </p>

      <div style="background:#ecfdf5;border-radius:12px;padding:16px;margin-bottom:24px;text-align:center;">
        <p style="font-size:14px;color:#065f46;margin:0;font-weight:600;">They've been automatically added to your referral network.</p>
      </div>

      <div style="text-align:center;">
        <a href="https://agentreferrals.ai/dashboard" style="display:inline-block;background:#f59e0b;color:#0f1117;font-weight:700;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none;">View Your Network</a>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align:center;margin-top:24px;font-size:12px;color:#9ca3af;">
      <p>AgentReferrals — AI-powered referral network for real estate agents</p>
      <p style="margin-top:4px;"><a href="https://agentreferrals.ai/dashboard/settings" style="color:#f59e0b;">Manage notifications</a></p>
    </div>
  </div>
</body>
</html>`

  try {
    const result = await client.sendEmail({
      From: `${FROM_NAME} <${FROM_EMAIL}>`,
      To: data.toEmail,
      Subject: `${data.newMemberName} just joined AgentReferrals!`,
      HtmlBody: htmlBody,
      TextBody: `Great news, ${firstName}!\n\n${data.newMemberName} from ${data.newMemberBrokerage} (${data.newMemberArea}) just joined AgentReferrals using your invite.\n\nThey've been automatically added to your referral network.\n\nView your network: https://agentreferrals.ai/dashboard\n\n— AgentReferrals`,
      MessageStream: 'outbound',
    })
    return { success: true, messageId: result.MessageID }
  } catch (error) {
    console.error('[Postmark] Send inviter notification failed:', error)
    return { success: false, reason: 'send_failed', error }
  }
}

// ═══════════════════════════════════════════════════════════════
// MAGIC LINK EMAIL — branded sign-in link
// ═══════════════════════════════════════════════════════════════

export interface MagicLinkEmailData {
  toEmail: string
  firstName: string
  magicUrl: string
}

export async function sendMagicLinkEmail(data: MagicLinkEmailData) {
  if (!client) {
    console.log('[Postmark] No token — skipping magic link email to', data.toEmail)
    return { success: false, reason: 'no_token' }
  }

  const greeting = data.firstName && data.firstName !== 'there'
    ? `Hi ${data.firstName},`
    : 'Hi there,'

  const htmlBody = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
  <!-- Header -->
  <tr><td style="background:#1a1a1a;padding:24px 32px;">
    <span style="color:#f59e0b;font-weight:800;font-size:18px;">Agent</span><span style="color:#ffffff;font-weight:800;font-size:18px;">Referrals</span><span style="color:#9ca3af;font-size:12px;">.ai</span>
  </td></tr>
  <!-- Body -->
  <tr><td style="padding:32px;">
    <p style="margin:0 0 16px;font-size:16px;color:#1a1a1a;">${greeting}</p>
    <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">Click the button below to sign in to your AgentReferrals account. This link expires in 15 minutes.</p>
    <table cellpadding="0" cellspacing="0" width="100%"><tr><td align="center">
      <a href="${data.magicUrl}" style="display:inline-block;background:#f59e0b;color:#ffffff;font-weight:700;font-size:14px;padding:14px 32px;border-radius:8px;text-decoration:none;">Sign In to AgentReferrals</a>
    </td></tr></table>
    <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;line-height:1.5;">If you didn't request this link, you can safely ignore this email. Your account is secure.</p>
  </td></tr>
  <!-- Footer -->
  <tr><td style="padding:16px 32px;border-top:1px solid #f3f4f6;">
    <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;">AgentReferrals — The AI-powered agent referral network</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`

  try {
    const result = await client.sendEmail({
      From: `${FROM_NAME} <${FROM_EMAIL}>`,
      To: data.toEmail,
      Subject: 'Your AgentReferrals sign-in link',
      HtmlBody: htmlBody,
      TextBody: `${greeting}\n\nClick the link below to sign in to AgentReferrals:\n\n${data.magicUrl}\n\nThis link expires in 15 minutes.\n\nIf you didn't request this, you can safely ignore this email.\n\n— AgentReferrals`,
      MessageStream: 'outbound',
    })
    return { success: true, messageId: result.MessageID }
  } catch (error) {
    console.error('[Postmark] Send magic link email failed:', error)
    return { success: false, reason: 'send_failed', error }
  }
}

// ═══════════════════════════════════════════════════════════════
// WELCOME EMAIL — sent when a new agent registers an account
// ═══════════════════════════════════════════════════════════════

export interface WelcomeEmailData {
  toEmail: string
  toName: string
  referralCode: string
}

export async function sendWelcomeEmail(data: WelcomeEmailData) {
  if (!client) {
    console.log('[Postmark] No token — skipping welcome email to', data.toEmail)
    return { success: false, reason: 'no_token' }
  }

  const firstName = data.toName.split(' ')[0] || 'there'
  const onboardingUrl = 'https://agentreferrals.ai/onboarding'
  const dashboardUrl = 'https://agentreferrals.ai/dashboard'
  const referralLink = `https://agentreferrals.ai?ref=${data.referralCode}`

  const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8f9fa;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px;">

    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;width:48px;height:48px;background:#f59e0b;border-radius:12px;line-height:48px;text-align:center;font-weight:800;font-size:22px;color:#0f1117;">A</div>
      <div style="margin-top:10px;font-weight:800;font-size:24px;color:#1a1a2e;">Agent<span style="color:#f59e0b;">Referrals</span>.ai</div>
    </div>

    <!-- Welcome Card -->
    <div style="background:white;border-radius:16px;padding:40px 32px;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="display:inline-block;width:64px;height:64px;background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:50%;line-height:64px;text-align:center;font-size:28px;">&#127881;</div>
      </div>

      <h1 style="font-size:24px;font-weight:800;color:#1a1a2e;margin:0 0 8px;text-align:center;">Welcome to AgentReferrals, ${firstName}!</h1>
      <p style="font-size:15px;color:#6b7280;line-height:1.6;margin:0 0 28px;text-align:center;">
        You just joined the AI-powered referral network trusted by thousands of agents across the country.
      </p>

      <!-- 3 Steps -->
      <div style="margin-bottom:28px;">
        <table role="presentation" style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="width:46px;vertical-align:top;padding-bottom:20px;">
              <div style="width:32px;height:32px;background:#fef3c7;border:2px solid #f59e0b;border-radius:50%;line-height:28px;text-align:center;font-weight:800;font-size:14px;color:#d97706;">1</div>
            </td>
            <td style="vertical-align:top;padding-bottom:20px;">
              <div style="font-weight:700;font-size:14px;color:#1a1a2e;margin-bottom:2px;">Complete your profile</div>
              <div style="font-size:13px;color:#6b7280;line-height:1.5;">Add your brokerage, service area, and specializations so agents can find you.</div>
            </td>
          </tr>
          <tr>
            <td style="width:46px;vertical-align:top;padding-bottom:20px;">
              <div style="width:32px;height:32px;background:#fef3c7;border:2px solid #f59e0b;border-radius:50%;line-height:28px;text-align:center;font-weight:800;font-size:14px;color:#d97706;">2</div>
            </td>
            <td style="vertical-align:top;padding-bottom:20px;">
              <div style="font-weight:700;font-size:14px;color:#1a1a2e;margin-bottom:2px;">Explore the network</div>
              <div style="font-size:13px;color:#6b7280;line-height:1.5;">Browse agents on the map, find partners in markets you need, and connect with NORA AI.</div>
            </td>
          </tr>
          <tr>
            <td style="width:46px;vertical-align:top;">
              <div style="width:32px;height:32px;background:#fef3c7;border:2px solid #f59e0b;border-radius:50%;line-height:28px;text-align:center;font-weight:800;font-size:14px;color:#d97706;">3</div>
            </td>
            <td style="vertical-align:top;">
              <div style="font-weight:700;font-size:14px;color:#1a1a2e;margin-bottom:2px;">Send your first referral</div>
              <div style="font-size:13px;color:#6b7280;line-height:1.5;">Match a client with a verified agent, send the agreement, and track it to close.</div>
            </td>
          </tr>
        </table>
      </div>

      <!-- CTA -->
      <div style="text-align:center;margin-bottom:24px;">
        <a href="${onboardingUrl}" style="display:inline-block;background:#f59e0b;color:#0f1117;font-weight:700;font-size:16px;padding:14px 36px;border-radius:10px;text-decoration:none;">Complete Your Profile</a>
      </div>

      <!-- Divider -->
      <div style="border-top:1px solid #e5e7eb;margin:24px 0;"></div>

      <!-- Invite friends -->
      <div style="background:#fefce8;border-radius:12px;padding:20px;text-align:center;">
        <div style="font-weight:700;font-size:14px;color:#92400e;margin-bottom:6px;">Invite agents, earn free months</div>
        <div style="font-size:13px;color:#a16207;line-height:1.5;margin-bottom:12px;">
          For every agent who joins with your link, you get 1 free month of Pro.
        </div>
        <div style="background:white;border:1px solid #fde68a;border-radius:8px;padding:10px 16px;font-size:13px;color:#1a1a2e;word-break:break-all;">
          ${referralLink}
        </div>
        <div style="font-size:11px;color:#b45309;margin-top:8px;">Your referral code: <strong>${data.referralCode}</strong></div>
      </div>
    </div>

    <!-- Key stats -->
    <table role="presentation" style="width:100%;border-collapse:separate;border-spacing:12px 0;margin-top:20px;">
      <tr>
        <td style="background:white;border-radius:12px;padding:16px;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,0.04);width:33%;">
          <div style="font-weight:800;font-size:22px;color:#f59e0b;">17,000+</div>
          <div style="font-size:11px;color:#6b7280;margin-top:2px;">Agents on network</div>
        </td>
        <td style="background:white;border-radius:12px;padding:16px;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,0.04);width:33%;">
          <div style="font-weight:800;font-size:22px;color:#22c55e;">100%</div>
          <div style="font-size:11px;color:#6b7280;margin-top:2px;">Of fees, you keep</div>
        </td>
        <td style="background:white;border-radius:12px;padding:16px;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,0.04);width:33%;">
          <div style="font-weight:800;font-size:22px;color:#3b82f6;">50+</div>
          <div style="font-size:11px;color:#6b7280;margin-top:2px;">Markets covered</div>
        </td>
      </tr>
    </table>

    <!-- Footer -->
    <div style="text-align:center;margin-top:24px;font-size:12px;color:#9ca3af;">
      <p style="margin:0 0 4px;">AgentReferrals — AI-powered referral network for real estate agents</p>
      <p style="margin:0;">
        <a href="${dashboardUrl}" style="color:#f59e0b;">Dashboard</a> ·
        <a href="https://agentreferrals.ai/#pricing" style="color:#f59e0b;">Pricing</a> ·
        <a href="https://agentreferrals.ai/dashboard/settings" style="color:#f59e0b;">Settings</a>
      </p>
    </div>

  </div>
</body>
</html>`

  try {
    const result = await client.sendEmail({
      From: `${FROM_NAME} <${FROM_EMAIL}>`,
      To: data.toEmail,
      Subject: `Welcome to AgentReferrals, ${firstName}!`,
      HtmlBody: htmlBody,
      TextBody: `Welcome to AgentReferrals, ${firstName}!\n\nYou just joined the AI-powered referral network trusted by thousands of agents.\n\n1. Complete your profile: ${onboardingUrl}\n2. Explore the network — browse agents, find partners, connect with NORA AI\n3. Send your first referral — match, send agreement, track to close\n\nYour referral link: ${referralLink}\nReferral code: ${data.referralCode}\n\nFor every agent who joins with your link, you get 1 free month of Pro.\n\n— The AgentReferrals Team`,
      MessageStream: 'outbound',
    })
    return { success: true, messageId: result.MessageID }
  } catch (error) {
    console.error('[Postmark] Send welcome failed:', error)
    return { success: false, reason: 'send_failed', error }
  }
}
