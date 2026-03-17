import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ── POST — confirm or dispute a verified referral ──
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { referralId, partnerId, confirmed } = body

    if (!referralId || !partnerId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const newStatus = confirmed ? 'verified' : 'disputed'

    const { data: referral, error: dbError } = await supabase
      .from('ar_verified_referrals')
      .update({
        status: newStatus,
        partner_id: partnerId,
        verified_at: confirmed ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', referralId)
      .select()
      .single()

    if (dbError) {
      console.error('[VerifiedReferrals] Confirm failed:', dbError)
      return NextResponse.json({ error: 'Failed to update referral' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      referral,
      status: newStatus,
    })
  } catch (error) {
    console.error('[VerifiedReferrals] Confirm error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
