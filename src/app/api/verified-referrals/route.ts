import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendNotificationEmail } from '@/lib/postmark'
import { getVerifiedReferrals } from '@/data/verified-referrals'

// ── GET — fetch verified referrals for an agent ──
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')

    if (!agentId) {
      return NextResponse.json({ error: 'Missing agentId' }, { status: 400 })
    }

    // Return mock data for now (DB table may not exist yet)
    const referrals = getVerifiedReferrals(agentId)
    return NextResponse.json({ success: true, referrals })
  } catch (error) {
    console.error('[VerifiedReferrals] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ── POST — submit a new verified referral claim ──
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      submitterId,
      partnerEmail,
      partnerName,
      direction,
      clientName,
      market,
      salePrice,
      referralFeePercent,
      closeDate,
    } = body

    if (!submitterId || !partnerEmail || !direction) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createAdminClient()
    let inviteSent = false

    // Check if partner already exists in ar_profiles
    const { data: existingPartner } = await supabase
      .from('ar_profiles')
      .select('id, full_name')
      .eq('email', partnerEmail)
      .single()

    // Insert the verified referral record
    const { data: referral, error: dbError } = await supabase
      .from('ar_verified_referrals')
      .insert({
        submitter_id: submitterId,
        partner_email: partnerEmail,
        partner_id: existingPartner?.id || null,
        partner_name: partnerName || partnerEmail.split('@')[0],
        direction,
        client_name: clientName || null,
        market: market || null,
        sale_price: salePrice || null,
        referral_fee_percent: referralFeePercent || 25,
        close_date: closeDate || null,
        invite_sent: true,
      })
      .select()
      .single()

    if (dbError) {
      console.error('[VerifiedReferrals] DB insert failed:', dbError)
      // Graceful fallback — still send the email
    }

    // Get the submitter's name for the email
    const { data: submitter } = await supabase
      .from('ar_profiles')
      .select('full_name')
      .eq('id', submitterId)
      .single()

    const submitterName = submitter?.full_name || 'An agent'
    const referralId = referral?.id || 'unknown'

    // Send verification email (fire-and-forget)
    try {
      if (existingPartner) {
        // Partner is already on the platform — send in-app notification style email
        await sendNotificationEmail({
          toEmail: partnerEmail,
          toName: existingPartner.full_name || partnerName || '',
          subject: `${submitterName} wants to verify a referral with you`,
          preheader: 'Confirm your referral transaction on AgentReferrals',
          heading: 'Verify a Past Referral',
          body: `<p><strong>${submitterName}</strong> added a past referral transaction with you on AgentReferrals and is asking you to confirm it.</p>
<p><strong>Client:</strong> ${clientName || 'Not specified'}<br>
<strong>Market:</strong> ${market || 'Not specified'}<br>
<strong>Direction:</strong> ${direction === 'sent' ? `${submitterName} sent you the referral` : `You sent the referral to ${submitterName}`}</p>
<p>Confirm this transaction to build your verified track record.</p>`,
          ctaText: 'Confirm Referral',
          ctaUrl: `https://agentreferrals.ai/dashboard/referral-history?verify=${referralId}`,
        })
        inviteSent = true
      } else {
        // Partner is NOT on the platform — send invite-style email
        const inviteCode = `AR-${Math.random().toString(36).slice(2, 10).toUpperCase()}`
        await sendNotificationEmail({
          toEmail: partnerEmail,
          toName: partnerName || '',
          subject: `${submitterName} added you as a referral partner on AgentReferrals`,
          preheader: 'Confirm your transaction and claim your verified profile',
          heading: "You've Been Added as a Referral Partner",
          body: `<p><strong>${submitterName}</strong> added you as a referral partner on AgentReferrals. They've recorded a past referral transaction with you.</p>
<p><strong>Client:</strong> ${clientName || 'Not specified'}<br>
<strong>Market:</strong> ${market || 'Not specified'}</p>
<p>Confirm your transaction and claim your verified profile — it only takes 2 minutes.</p>`,
          ctaText: 'Confirm & Join',
          ctaUrl: `https://agentreferrals.ai/?invite=${inviteCode}&verify=${referralId}`,
        })
        inviteSent = true
      }
    } catch (emailError) {
      console.error('[VerifiedReferrals] Email send failed:', emailError)
      // Fire-and-forget — don't fail the request
    }

    return NextResponse.json({
      success: true,
      id: referralId,
      inviteSent,
      partnerExists: !!existingPartner,
    })
  } catch (error) {
    console.error('[VerifiedReferrals] POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
