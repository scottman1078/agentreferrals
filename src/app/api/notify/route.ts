import { NextRequest, NextResponse } from 'next/server'
import { sendNotificationEmail } from '@/lib/postmark'

type NotificationType =
  | 'referral_received'
  | 'agreement_signed'
  | 'referral_stage_change'
  | 'partnership_request'
  | 'partnership_accepted'
  | 'fee_received'

interface NotifyPayload {
  type: NotificationType
  toEmail: string
  toName: string
  data: Record<string, string>
}

const TEMPLATES: Record<NotificationType, (data: Record<string, string>) => { subject: string; heading: string; body: string; ctaText: string; ctaUrl: string }> = {
  referral_received: (d) => ({
    subject: `New referral from ${d.fromAgent}`,
    heading: 'You received a new referral!',
    body: `<strong>${d.fromAgent}</strong> from ${d.fromBrokerage} sent you a referral for <strong>${d.clientName}</strong> in ${d.market}.<br><br>Estimated value: <strong>${d.estimatedPrice}</strong> · Referral fee: <strong>${d.feePercent}%</strong>`,
    ctaText: 'View Referral',
    ctaUrl: 'https://agentreferrals.ai/dashboard/pipeline',
  }),
  agreement_signed: (d) => ({
    subject: `${d.signerName} signed the referral agreement`,
    heading: 'Agreement Signed!',
    body: `<strong>${d.signerName}</strong> has signed the referral agreement for <strong>${d.clientName}</strong> (${d.market}).<br><br>The agreement is now ${d.fullyExecuted === 'true' ? 'fully executed. You\'re ready to go!' : 'awaiting your counter-signature.'}`,
    ctaText: 'View Agreement',
    ctaUrl: 'https://agentreferrals.ai/dashboard/documents',
  }),
  referral_stage_change: (d) => ({
    subject: `Referral update: ${d.clientName} → ${d.newStage}`,
    heading: `Referral Status Updated`,
    body: `The referral for <strong>${d.clientName}</strong> in ${d.market} has moved to <strong>${d.newStage}</strong>.<br><br>Updated by: ${d.updatedBy}`,
    ctaText: 'View Pipeline',
    ctaUrl: 'https://agentreferrals.ai/dashboard/pipeline',
  }),
  partnership_request: (d) => ({
    subject: `${d.requesterName} wants to partner with you`,
    heading: 'New Partnership Request',
    body: `<strong>${d.requesterName}</strong> from ${d.requesterBrokerage} (${d.requesterArea}) wants to be your referral partner for <strong>${d.market}</strong>.<br><br>They have a <strong>${d.referNetScore}</strong> ReferNet Score and close <strong>${d.dealsPerYear}</strong> deals per year.`,
    ctaText: 'View Request',
    ctaUrl: 'https://agentreferrals.ai/dashboard/partnerships',
  }),
  partnership_accepted: (d) => ({
    subject: `${d.partnerName} accepted your partnership request!`,
    heading: 'Partnership Accepted!',
    body: `Great news! <strong>${d.partnerName}</strong> from ${d.partnerBrokerage} has accepted your partnership request for <strong>${d.market}</strong>.<br><br>You're now referral partners. When either of you has a client in the other's market, you have a trusted agent ready to go.`,
    ctaText: 'View Partnerships',
    ctaUrl: 'https://agentreferrals.ai/dashboard/partnerships',
  }),
  fee_received: (d) => ({
    subject: `Referral fee received: ${d.amount}`,
    heading: 'Referral Fee Received!',
    body: `You received a referral fee of <strong>${d.amount}</strong> for the <strong>${d.clientName}</strong> transaction in ${d.market}.<br><br>Referring agent: ${d.referringAgent}<br>Close date: ${d.closeDate}`,
    ctaText: 'View ROI Dashboard',
    ctaUrl: 'https://agentreferrals.ai/dashboard/roi',
  }),
}

export async function POST(request: NextRequest) {
  try {
    const body: NotifyPayload = await request.json()
    const { type, toEmail, toName, data } = body

    if (!type || !toEmail || !TEMPLATES[type]) {
      return NextResponse.json({ error: 'Invalid notification type or missing email' }, { status: 400 })
    }

    const template = TEMPLATES[type](data)
    const result = await sendNotificationEmail({
      toEmail,
      toName,
      subject: template.subject,
      preheader: template.heading,
      heading: template.heading,
      body: template.body,
      ctaText: template.ctaText,
      ctaUrl: template.ctaUrl,
    })

    return NextResponse.json({ success: result.success, messageId: result.success ? (result as { messageId: string }).messageId : null })
  } catch (error) {
    console.error('[Notify] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
