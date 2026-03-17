import { NextRequest, NextResponse } from 'next/server'

// POST /api/onboarding/save
// Saves the onboarding profile data using the admin client (bypasses RLS)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { profile, hubData } = body

    console.log('[onboarding/save] Received:', { profileId: profile?.id, email: profile?.email, fullName: profile?.full_name })

    if (!profile || !profile.id) {
      console.error('[onboarding/save] Missing profile data:', JSON.stringify(body).slice(0, 200))
      return NextResponse.json({ error: 'Missing profile data' }, { status: 400 })
    }

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    // Upsert ar_profiles
    const { error } = await supabase
      .from('ar_profiles')
      .upsert(profile, { onConflict: 'id' })

    if (error) {
      console.error('[onboarding/save] Profile upsert failed:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Also update Hub agents table if hubData provided
    if (hubData) {
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const hubUrl = process.env.NEXT_PUBLIC_HUB_URL
        const hubKey = process.env.HUB_SERVICE_ROLE_KEY
        if (hubUrl && hubKey) {
          const hub = createClient(hubUrl, hubKey, {
            auth: { autoRefreshToken: false, persistSession: false },
          })

          await hub.from('agents').upsert(hubData.agent, { onConflict: 'profile_id' })

          if (hubData.platform) {
            const { data: platform } = await hub
              .from('platforms')
              .select('id')
              .eq('slug', 'agentreferrals')
              .single()

            if (platform) {
              await hub.from('user_products').upsert({
                profile_id: profile.id,
                product_id: platform.id,
                status: 'active',
                tier: 'free',
              }, { onConflict: 'profile_id,product_id' })
            }
          }
        }
      } catch (hubError) {
        console.error('[onboarding/save] Hub registration failed:', hubError)
        // Don't fail — AR profile is saved
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[onboarding/save] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
