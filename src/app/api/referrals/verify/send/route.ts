import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendNotificationEmail } from '@/lib/postmark'
import crypto from 'crypto'

// ── POST — submit a past referral and send verification email ──
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, referral } = body

    if (!userId || !referral) {
      return NextResponse.json({ error: 'Missing userId or referral data' }, { status: 400 })
    }

    const { partnerName, partnerEmail, direction, market, salePrice, closeYear } = referral

    if (!partnerEmail || !direction) {
      return NextResponse.json({ error: 'Missing required referral fields (partnerEmail, direction)' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Generate a unique verification token
    const verificationToken = crypto.randomBytes(32).toString('hex')

    // Check if partner already exists in ar_profiles
    const { data: existingPartner } = await supabase
      .from('ar_profiles')
      .select('id, full_name')
      .eq('email', partnerEmail)
      .single()

    // Build close_date from closeYear
    const closeDate = closeYear ? `${closeYear}-01-01` : null

    // Insert the verified referral record
    const { data: record, error: dbError } = await supabase
      .from('ar_verified_referrals')
      .insert({
        submitter_id: userId,
        partner_email: partnerEmail,
        partner_id: existingPartner?.id || null,
        partner_name: partnerName || partnerEmail.split('@')[0],
        direction,
        market: market || null,
        sale_price: salePrice || null,
        close_date: closeDate,
        verification_token: verificationToken,
        invite_sent: true,
      })
      .select()
      .single()

    if (dbError) {
      console.error('[Referrals/Verify/Send] DB insert failed:', dbError)
      return NextResponse.json({ error: 'Failed to create referral record' }, { status: 500 })
    }

    // Get the submitter's name for the email
    const { data: submitter } = await supabase
      .from('ar_profiles')
      .select('full_name')
      .eq('id', userId)
      .single()

    const submitterName = submitter?.full_name || 'An agent'
    const yearDisplay = closeYear || 'recent'
    const marketDisplay = market || 'your area'

    // Build the verification link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://agentreferrals.ai'
    const verifyUrl = `${baseUrl}/referrals/verify?token=${verificationToken}`

    // Send verification email
    try {
      await sendNotificationEmail({
        toEmail: partnerEmail,
        toName: partnerName || '',
        subject: `${submitterName} says you completed a referral together — can you confirm?`,
        preheader: `Verify a referral in ${marketDisplay} (${yearDisplay})`,
        heading: 'Verify a Past Referral',
        body: `<p><strong>${submitterName}</strong> says you completed a referral together in <strong>${marketDisplay}</strong> (${yearDisplay}). Can you confirm this?</p>
<p><strong>Direction:</strong> ${direction === 'sent' ? `${submitterName} sent you the referral` : `You sent the referral to ${submitterName}`}</p>
${salePrice ? `<p><strong>Approximate sale price:</strong> $${Number(salePrice).toLocaleString()}</p>` : ''}
<p>Click the button below to review and confirm or dispute this referral.</p>`,
        ctaText: 'Review Referral',
        ctaUrl: verifyUrl,
      })
    } catch (emailError) {
      console.error('[Referrals/Verify/Send] Email send failed:', emailError)
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      id: record.id,
      verificationToken,
      partnerExists: !!existingPartner,
    })
  } catch (error) {
    console.error('[Referrals/Verify/Send] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
