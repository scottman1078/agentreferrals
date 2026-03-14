import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendInviteEmail } from '@/lib/postmark'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { inviteeEmail, inviteeName, inviteeBrokerage, inviteeMarket, personalMessage, inviterId, inviterName, inviterBrokerage, inviterArea, referralCode } = body

    if (!inviteeEmail || !inviterId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Insert invite record
    const { data: invite, error: dbError } = await supabase
      .from('ar_invites')
      .insert({
        invited_by: inviterId,
        invitee_name: inviteeName || inviteeEmail.split('@')[0],
        invitee_email: inviteeEmail,
        invitee_brokerage: inviteeBrokerage,
        invitee_market: inviteeMarket,
        method: 'email',
        status: 'pending',
        referral_code: referralCode,
        message: personalMessage,
      })
      .select()
      .single()

    if (dbError) {
      console.error('[Invite] DB insert failed:', dbError)
      return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 })
    }

    // Send invite email
    const referralLink = `https://agentreferrals.ai?ref=${referralCode || 'INVITE'}`
    const emailResult = await sendInviteEmail({
      toEmail: inviteeEmail,
      toName: inviteeName || inviteeEmail.split('@')[0],
      inviterName: inviterName || 'An agent',
      inviterBrokerage: inviterBrokerage || 'AgentReferrals.ai',
      inviterArea: inviterArea || '',
      referralLink,
      personalMessage,
    })

    return NextResponse.json({
      success: true,
      invite,
      emailSent: emailResult.success,
      messageId: emailResult.success ? (emailResult as { messageId: string }).messageId : null,
    })
  } catch (error) {
    console.error('[Invite] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
