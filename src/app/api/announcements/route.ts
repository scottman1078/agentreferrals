import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabase } from '@/lib/supabase/server'

// GET /api/announcements — active announcements for the current user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    const admin = createAdminClient()
    const now = new Date().toISOString()

    // Get user tier for filtering
    let userTier: string | null = null
    if (user) {
      const { data: profile } = await admin
        .from('ar_profiles')
        .select('subscription_tier')
        .eq('id', user.id)
        .single()
      userTier = profile?.subscription_tier || null
    }

    // Get page filter from query params
    const { searchParams } = new URL(request.url)
    const page = searchParams.get('page')

    let query = admin
      .from('ar_announcements')
      .select('*')
      .eq('is_active', true)
      .lte('starts_at', now)
      .order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error('[Announcements] GET error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Filter in JS for more complex logic (tier array, nullable ends_at, page)
    const filtered = (data || []).filter(a => {
      // Check ends_at
      if (a.ends_at && new Date(a.ends_at) < new Date()) return false
      // Check target_tier
      if (a.target_tier && a.target_tier.length > 0 && userTier && !a.target_tier.includes(userTier)) return false
      // Check target_page
      if (a.target_page && page && a.target_page !== page) return false
      return true
    })

    return NextResponse.json({ announcements: filtered })
  } catch (error) {
    console.error('[Announcements] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
