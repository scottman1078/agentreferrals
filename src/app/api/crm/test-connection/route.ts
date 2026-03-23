import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabase } from '@/lib/supabase/server'
import { getLoftyAccessToken } from '@/lib/integration-utils'

// POST /api/crm/test-connection — test a CRM connection
// For API-key providers: accepts { provider, apiKey }
// For OAuth providers (lofty): accepts { provider } and uses stored tokens
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { provider, apiKey } = body

    if (!provider) {
      return NextResponse.json({ error: 'provider is required' }, { status: 400 })
    }

    if (!['fub', 'lofty'].includes(provider)) {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
    }

    if (provider === 'fub') {
      if (!apiKey) {
        return NextResponse.json({ error: 'apiKey is required for FUB' }, { status: 400 })
      }

      const res = await fetch('https://api.followupboss.com/v1/me', {
        headers: {
          Authorization: 'Basic ' + Buffer.from(apiKey + ':').toString('base64'),
        },
      })

      if (!res.ok) {
        return NextResponse.json({
          valid: false,
          error: 'Invalid Follow Up Boss API key',
        })
      }

      const data = await res.json()
      return NextResponse.json({
        valid: true,
        provider: 'fub',
        account: { name: data.name, email: data.email },
      })
    }

    if (provider === 'lofty') {
      // Lofty uses API key with 'token' prefix per their docs
      const res = await fetch('https://api.lofty.com/v1.0/org', {
        headers: {
          'Authorization': `token ${apiKey}`,
          'Content-Type': 'application/json',
        },
      })

      if (!res.ok) {
        return NextResponse.json({
          valid: false,
          error: 'Invalid Lofty API key',
        })
      }

      const data = await res.json()
      return NextResponse.json({
        valid: true,
        provider: 'lofty',
        account: { orgName: data.name, orgId: data.id },
      })
    }

    return NextResponse.json({ valid: false, error: 'Unknown provider' })
  } catch (err) {
    console.error('[CRM Test Connection]', err)
    return NextResponse.json({
      valid: false,
      error: 'Failed to test connection — CRM service unreachable',
    })
  }
}
