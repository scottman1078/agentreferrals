import { NextResponse } from 'next/server'
import { sendNotificationEmail } from '@/lib/postmark'

export async function POST() {
  const result = await sendNotificationEmail({
    toEmail: 'scott@agentdashboards.com',
    toName: 'Scott',
    subject: 'AgentReferrals — Test Email',
    preheader: 'Testing the new email template with updated branding',
    heading: 'Email Template Test',
    body: 'This is a test email to verify the new AgentReferrals branding is working correctly. The logo should appear at the top, colors should be deep blue (#1F2A5A) and teal (#1FA3A3), and buttons should be teal.',
    ctaText: 'Go to Dashboard',
    ctaUrl: 'https://agentreferrals.ai/dashboard',
  })

  return NextResponse.json(result)
}
