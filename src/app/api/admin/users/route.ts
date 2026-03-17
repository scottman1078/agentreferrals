import { NextRequest, NextResponse } from 'next/server'

// GET /api/admin/users — list real users from ar_profiles
export async function GET() {
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    // Only fetch real users (exclude demo/seeded agents)
    const { data, error } = await supabase
      .from('ar_profiles')
      .select('id, email, full_name, primary_area, phone, avatar_url, tags, status, subscription_tier, phone_verified, is_on_team, team_name, years_licensed, deals_per_year, avg_sale_price, is_demo, created_at')
      .or('is_demo.is.null,is_demo.eq.false')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ users: [], error: error.message }, { status: 500 })
    }

    return NextResponse.json({ users: data ?? [] })
  } catch {
    return NextResponse.json({ users: [] })
  }
}

// DELETE /api/admin/users — delete a user from Hub + AR
export async function DELETE(request: NextRequest) {
  const { userId, email } = await request.json()

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }

  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createAdminClient()

    // Delete AR profile
    await supabase.from('ar_profiles').delete().eq('id', userId)

    // Delete AR invites by this user
    await supabase.from('ar_invites').delete().eq('invited_by', userId)

    // Delete AR partnerships
    await supabase.from('ar_partnerships').delete().or(`requesting_agent_id.eq.${userId},receiving_agent_id.eq.${userId}`)

    // Delete AR magic links
    if (email) {
      await supabase.from('ar_magic_links').delete().eq('email', email)
    }

    // Remove from Hub — only remove the AR product subscription, NOT the user
    // The user may be on other platforms (OnSpec, PipelinePulse, etc.)
    const hubUrl = process.env.NEXT_PUBLIC_HUB_URL
    const hubKey = process.env.HUB_SERVICE_ROLE_KEY
    if (hubUrl && hubKey) {
      const hub = createClient(hubUrl, hubKey, { auth: { autoRefreshToken: false, persistSession: false } })

      // Remove AR from user_products (keep user and other products intact)
      const { data: platform } = await hub
        .from('platforms')
        .select('id')
        .eq('slug', 'agentreferrals')
        .single()

      if (platform) {
        await hub.from('user_products').delete()
          .eq('profile_id', userId)
          .eq('product_id', platform.id)
      }

      // Remove from Hub agents table (AR-specific agent record)
      await hub.from('agents').delete().eq('profile_id', userId)

      // DO NOT delete Hub profile or Hub auth — they may use other platforms
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[admin/users] Delete error:', err)
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}
