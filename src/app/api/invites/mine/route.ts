import { NextRequest, NextResponse } from 'next/server'

const MAX_INVITES_STARTER = 10
const MAX_INVITES_GROWTH = 25
const MAX_INVITES_PRO = 100
const MAX_INVITES_ELITE = 100

// GET /api/invites/mine?userId=xxx
// Returns the user's invite codes and remaining count
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId')
  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }

  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    // Get the user's tier to determine max invites
    const { data: profile } = await supabase
      .from('ar_profiles')
      .select('subscription_tier')
      .eq('id', userId)
      .single()

    const tier = profile?.subscription_tier || 'free'
    const maxInvites = tier === 'elite' ? MAX_INVITES_ELITE : tier === 'pro' ? MAX_INVITES_PRO : tier === 'growth' ? MAX_INVITES_GROWTH : MAX_INVITES_STARTER

    // Get existing invite codes for this user
    const { data: invites, error } = await supabase
      .from('ar_invites')
      .select('id, referral_code, invitee_name, invitee_email, status, created_at, signed_up_at')
      .eq('invited_by', userId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[invites/mine] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const codes = invites ?? []
    const usedCount = codes.filter(c => c.status === 'signed_up' || c.status === 'active').length
    const remaining = Math.max(0, maxInvites - codes.length)

    return NextResponse.json({
      codes,
      total: maxInvites,
      used: usedCount,
      remaining,
      generated: codes.length,
    })
  } catch (err) {
    console.error('[invites/mine] Error:', err)
    return NextResponse.json({ codes: [], total: 3, used: 0, remaining: 3, generated: 0 })
  }
}

// POST /api/invites/mine — generate invite codes for a user
export async function POST(request: NextRequest) {
  const { userId } = await request.json()
  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }

  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    // Get tier
    const { data: profile } = await supabase
      .from('ar_profiles')
      .select('subscription_tier, full_name')
      .eq('id', userId)
      .single()

    const tier = profile?.subscription_tier || 'free'
    const maxInvites = tier === 'elite' ? MAX_INVITES_ELITE : tier === 'pro' ? MAX_INVITES_PRO : tier === 'growth' ? MAX_INVITES_GROWTH : MAX_INVITES_STARTER
    const name = profile?.full_name || 'Agent'

    // Check how many they already have
    const { count } = await supabase
      .from('ar_invites')
      .select('*', { count: 'exact', head: true })
      .eq('invited_by', userId)

    const existing = count ?? 0
    const toGenerate = Math.max(0, maxInvites - existing)

    if (toGenerate === 0) {
      return NextResponse.json({ generated: 0, message: 'All invite codes already created' })
    }

    // Generate codes: FIRSTNAME-YYYY-NN format
    const firstName = name.split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '') || 'AR'
    const year = new Date().getFullYear()
    const codes = []

    for (let i = 0; i < toGenerate; i++) {
      const num = String(existing + i + 1).padStart(2, '0')
      const code = `${firstName}-${year}-${num}`
      codes.push({
        invited_by: userId,
        referral_code: code,
        invitee_name: null,
        invitee_email: `placeholder-${code}@pending.invite`,
        method: 'link',
        status: 'pending',
      })
    }

    const { error } = await supabase.from('ar_invites').insert(codes)
    if (error) {
      console.error('[invites/mine] Insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ generated: toGenerate })
  } catch (err) {
    console.error('[invites/mine] Error:', err)
    return NextResponse.json({ error: 'Failed to generate codes' }, { status: 500 })
  }
}
