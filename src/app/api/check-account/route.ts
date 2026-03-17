import { NextRequest, NextResponse } from 'next/server'

// GET /api/check-account?email=xxx
// Checks if an email already has a Hub account and which platforms they use
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email')

  if (!email || !email.includes('@')) {
    return NextResponse.json({ exists: false })
  }

  try {
    const { createClient } = await import('@supabase/supabase-js')

    const hubUrl = process.env.NEXT_PUBLIC_HUB_URL
    const hubServiceKey = process.env.HUB_SERVICE_ROLE_KEY

    // If we have Hub service role key, do a direct lookup
    if (hubUrl && hubServiceKey) {
      const hub = createClient(hubUrl, hubServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })

      // Check profiles table for this email
      const { data: profile } = await hub
        .from('profiles')
        .select('id, email, full_name')
        .eq('email', email.toLowerCase())
        .single()

      if (!profile) {
        return NextResponse.json({ exists: false })
      }

      // Get their platform subscriptions
      const { data: products } = await hub
        .from('user_products')
        .select('product_id, status, platforms:product_id(name, slug)')
        .eq('profile_id', profile.id)

      const platforms = (products ?? [])
        .filter((p: Record<string, unknown>) => p.status === 'active')
        .map((p: Record<string, unknown>) => {
          const platform = p.platforms as Record<string, string> | null
          return {
            name: platform?.name ?? 'Unknown',
            slug: platform?.slug ?? '',
          }
        })

      return NextResponse.json({
        exists: true,
        name: profile.full_name,
        platforms,
      })
    }

    // Fallback: try with anon key (limited — can only check if signup fails)
    return NextResponse.json({ exists: false, note: 'Hub service key not configured' })
  } catch (error) {
    console.error('[check-account] Error:', error)
    return NextResponse.json({ exists: false })
  }
}
