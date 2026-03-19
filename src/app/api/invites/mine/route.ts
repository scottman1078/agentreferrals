import { NextRequest, NextResponse } from 'next/server'

// GET /api/invites/mine?userId=xxx
// Returns the user's invite history (unlimited invites, no caps)
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId')
  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }

  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    // Get the user's referral_code from their profile
    const { data: profile } = await supabase
      .from('ar_profiles')
      .select('referral_code')
      .eq('id', userId)
      .single()

    // Get invite history for this user
    const { data: invites, error } = await supabase
      .from('ar_invites')
      .select('id, referral_code, invitee_name, invitee_email, status, created_at, signed_up_at')
      .eq('invited_by', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[invites/mine] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const codes = invites ?? []
    const usedCount = codes.filter(c => c.status === 'signed_up' || c.status === 'active').length

    return NextResponse.json({
      codes,
      referralCode: profile?.referral_code || null,
      used: usedCount,
      total: codes.length,
    })
  } catch (err) {
    console.error('[invites/mine] Error:', err)
    return NextResponse.json({ codes: [], used: 0, total: 0 })
  }
}

// POST /api/invites/mine — ensure the user has a referral_code on their profile
export async function POST(request: NextRequest) {
  const { userId } = await request.json()
  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }

  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    // Check if user already has a referral_code
    const { data: profile } = await supabase
      .from('ar_profiles')
      .select('referral_code, full_name')
      .eq('id', userId)
      .single()

    if (profile?.referral_code) {
      return NextResponse.json({ referralCode: profile.referral_code, message: 'Referral code already exists' })
    }

    // Generate a referral code if they don't have one
    const name = profile?.full_name || 'Agent'
    const firstName = name.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '') || 'agent'
    const randomSuffix = Math.random().toString(36).substring(2, 8)
    const referralCode = `${firstName}-${randomSuffix}`

    const { error } = await supabase
      .from('ar_profiles')
      .update({ referral_code: referralCode })
      .eq('id', userId)

    if (error) {
      console.error('[invites/mine] Update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ referralCode, message: 'Referral code created' })
  } catch (err) {
    console.error('[invites/mine] Error:', err)
    return NextResponse.json({ error: 'Failed to ensure referral code' }, { status: 500 })
  }
}
