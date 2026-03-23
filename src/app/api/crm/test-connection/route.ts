import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

// POST /api/crm/test-connection — test a CRM API key without saving
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { provider, apiKey } = body

    if (!provider || !apiKey) {
      return NextResponse.json({ error: 'provider and apiKey are required' }, { status: 400 })
    }

    if (!['fub', 'lofty'].includes(provider)) {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
    }

    if (provider === 'fub') {
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
      const res = await fetch('https://api.lofty.com/v1.0/org', {
        headers: {
          Authorization: `Bearer ${apiKey}`,
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
