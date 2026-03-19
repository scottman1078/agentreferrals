import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ── POST — confirm or dispute a referral via verification token ──
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, confirmed, preview } = body

    if (!token) {
      return NextResponse.json({ error: 'Missing verification token' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Look up the referral by token
    const { data: referral, error: lookupError } = await supabase
      .from('ar_verified_referrals')
      .select('*, submitter:submitter_id(full_name, email)')
      .eq('verification_token', token)
      .single()

    if (lookupError || !referral) {
      return NextResponse.json({ error: 'Invalid or expired verification token' }, { status: 404 })
    }

    // Preview mode — return referral details without modifying
    if (preview) {
      if (referral.status !== 'pending') {
        return NextResponse.json({
          error: 'This referral has already been processed',
          status: referral.status,
        }, { status: 400 })
      }

      const submitter = referral.submitter as { full_name: string; email: string } | null
      return NextResponse.json({
        success: true,
        referral: {
          id: referral.id,
          partner_name: referral.partner_name,
          partner_email: referral.partner_email,
          submitter_name: submitter?.full_name || 'An agent',
          direction: referral.direction,
          market: referral.market,
          sale_price: referral.sale_price,
          close_date: referral.close_date,
          status: referral.status,
        },
      })
    }

    if (referral.status !== 'pending') {
      return NextResponse.json({
        error: 'This referral has already been processed',
        status: referral.status,
      }, { status: 400 })
    }

    const newStatus = confirmed ? 'verified' : 'disputed'

    // Update the referral status
    const { error: updateError } = await supabase
      .from('ar_verified_referrals')
      .update({
        status: newStatus,
        verified_at: confirmed ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', referral.id)

    if (updateError) {
      console.error('[Referrals/Verify/Confirm] Update failed:', updateError)
      return NextResponse.json({ error: 'Failed to update referral' }, { status: 500 })
    }

    // If confirmed and partner is not already a user, create an invitation record
    let invitationCreated = false
    if (confirmed && !referral.partner_id) {
      // Check if the partner email is already registered
      const { data: existingUser } = await supabase
        .from('ar_profiles')
        .select('id')
        .eq('email', referral.partner_email)
        .single()

      if (!existingUser) {
        // Partner is not a user — they can sign up via the invite flow
        invitationCreated = true
      } else {
        // Link the partner to the referral
        await supabase
          .from('ar_verified_referrals')
          .update({ partner_id: existingUser.id })
          .eq('id', referral.id)
      }
    }

    return NextResponse.json({
      success: true,
      status: newStatus,
      invitationCreated,
      referralId: referral.id,
    })
  } catch (error) {
    console.error('[Referrals/Verify/Confirm] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
