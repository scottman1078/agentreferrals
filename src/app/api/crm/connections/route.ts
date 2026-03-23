import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabase } from '@/lib/supabase/server'

// GET /api/crm/connections — list user's CRM connections
export async function GET() {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('ar_crm_connections')
      .select('id, provider, status, last_synced_at, contact_count, metadata, created_at, updated_at')
      .eq('agent_id', user.id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[CRM Connections GET]', error)
      return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 })
    }

    return NextResponse.json({ connections: data ?? [] })
  } catch (err) {
    console.error('[CRM Connections GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/crm/connections — connect a CRM { provider, apiKey }
// OAuth providers (fub, lofty) are connected via their callback routes, not this endpoint.
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
      return NextResponse.json({ error: 'Invalid provider. Must be "fub" or "lofty".' }, { status: 400 })
    }

    // OAuth providers are connected via their OAuth callback routes
    const oauthProviders = ['fub', 'lofty']
    if (oauthProviders.includes(provider)) {
      return NextResponse.json(
        { error: `${provider} uses OAuth. Use the Connect button to authorize via the provider.` },
        { status: 400 }
      )
    }

    if (!apiKey) {
      return NextResponse.json({ error: 'apiKey is required for this provider' }, { status: 400 })
    }

    // Validate the API key against the CRM
    const validation = await validateCrmKey(provider, apiKey)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error ?? 'Invalid API key' },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    // Upsert connection
    const { data, error } = await admin
      .from('ar_crm_connections')
      .upsert(
        {
          agent_id: user.id,
          provider,
          api_key: apiKey,
          status: 'connected',
          metadata: validation.metadata ?? {},
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'agent_id,provider' }
      )
      .select('id, provider, status, last_synced_at, contact_count, metadata, created_at, updated_at')
      .single()

    if (error) {
      console.error('[CRM Connections POST]', error)
      return NextResponse.json({ error: 'Failed to save connection' }, { status: 500 })
    }

    return NextResponse.json({ connection: data })
  } catch (err) {
    console.error('[CRM Connections POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/crm/connections — disconnect { provider }
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const provider = searchParams.get('provider')

    if (!provider || !['fub', 'lofty'].includes(provider)) {
      return NextResponse.json({ error: 'Valid provider required' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Delete synced contacts for this provider
    await admin
      .from('ar_crm_contacts')
      .delete()
      .eq('agent_id', user.id)
      .eq('provider', provider)

    // Delete the connection
    const { error } = await admin
      .from('ar_crm_connections')
      .delete()
      .eq('agent_id', user.id)
      .eq('provider', provider)

    if (error) {
      console.error('[CRM Connections DELETE]', error)
      return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[CRM Connections DELETE]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// --- helpers ---

async function validateCrmKey(
  provider: string,
  apiKey: string
): Promise<{ valid: boolean; error?: string; metadata?: Record<string, unknown> }> {
  try {
    if (provider === 'fub') {
      const res = await fetch('https://api.followupboss.com/v1/me', {
        headers: {
          Authorization: 'Basic ' + Buffer.from(apiKey + ':').toString('base64'),
        },
      })
      if (!res.ok) {
        return { valid: false, error: 'Invalid Follow Up Boss API key' }
      }
      const data = await res.json()
      return {
        valid: true,
        metadata: { name: data.name, email: data.email, accountId: data.accountId },
      }
    }

    if (provider === 'lofty') {
      // Lofty uses OAuth — connections are created via the OAuth callback route
      return { valid: false, error: 'Lofty uses OAuth. Use the Connect button to authorize.' }
    }

    return { valid: false, error: 'Unknown provider' }
  } catch (err) {
    console.error(`[CRM validateKey] ${provider}:`, err)
    return { valid: false, error: 'Failed to validate API key — CRM service unreachable' }
  }
}
