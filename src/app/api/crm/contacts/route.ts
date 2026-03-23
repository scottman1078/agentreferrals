import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabase } from '@/lib/supabase/server'
import { getLoftyAccessToken } from '@/lib/integration-utils'

// GET /api/crm/contacts — list user's synced contacts (paginated, searchable)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const provider = searchParams.get('provider')
    const search = searchParams.get('search') ?? ''
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100)
    const offset = (page - 1) * limit

    const admin = createAdminClient()
    let query = admin
      .from('ar_crm_contacts')
      .select('*', { count: 'exact' })
      .eq('agent_id', user.id)
      .order('last_name', { ascending: true })
      .range(offset, offset + limit - 1)

    if (provider) {
      query = query.eq('provider', provider)
    }

    if (search.trim()) {
      // Search across name, email, phone
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
      )
    }

    const { data, count, error } = await query

    if (error) {
      console.error('[CRM Contacts GET]', error)
      return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 })
    }

    return NextResponse.json({
      contacts: data ?? [],
      total: count ?? 0,
      page,
      limit,
    })
  } catch (err) {
    console.error('[CRM Contacts GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/crm/contacts — trigger sync for a provider
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { provider } = body

    if (!provider || !['fub', 'lofty'].includes(provider)) {
      return NextResponse.json({ error: 'Valid provider required' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Get the connection
    const { data: connection, error: connError } = await admin
      .from('ar_crm_connections')
      .select('*')
      .eq('agent_id', user.id)
      .eq('provider', provider)
      .single()

    if (connError || !connection) {
      return NextResponse.json({ error: 'CRM not connected' }, { status: 404 })
    }

    // Fetch contacts from the CRM
    let contacts: CrmContact[] = []
    try {
      if (provider === 'fub') {
        if (!connection.api_key) {
          return NextResponse.json({ error: 'No FUB API key configured' }, { status: 400 })
        }
        contacts = await fetchFubContacts(connection.api_key)
      } else if (provider === 'lofty') {
        // Get a valid access token (auto-refreshes if expired)
        const accessToken = await getLoftyAccessToken(connection, admin)
        contacts = await fetchLoftyContacts(accessToken)
      }
    } catch (syncErr) {
      console.error(`[CRM Sync] ${provider}:`, syncErr)
      // Update connection status to error
      await admin
        .from('ar_crm_connections')
        .update({ status: 'error', updated_at: new Date().toISOString() })
        .eq('id', connection.id)

      return NextResponse.json({ error: 'Failed to fetch contacts from CRM' }, { status: 502 })
    }

    // Upsert contacts
    if (contacts.length > 0) {
      const rows = contacts.map((c) => ({
        agent_id: user.id,
        provider,
        external_id: c.externalId,
        first_name: c.firstName ?? null,
        last_name: c.lastName ?? null,
        email: c.email ?? null,
        phone: c.phone ?? null,
        tags: c.tags ?? [],
        lead_status: c.leadStatus ?? null,
        lead_source: c.leadSource ?? null,
        property_address: c.propertyAddress ?? null,
        notes: c.notes ?? null,
        raw_data: c.rawData ?? null,
        synced_at: new Date().toISOString(),
      }))

      const { error: upsertError } = await admin
        .from('ar_crm_contacts')
        .upsert(rows, { onConflict: 'agent_id,provider,external_id' })

      if (upsertError) {
        console.error('[CRM Contacts upsert]', upsertError)
        return NextResponse.json({ error: 'Failed to save contacts' }, { status: 500 })
      }
    }

    // Update connection metadata
    await admin
      .from('ar_crm_connections')
      .update({
        status: 'connected',
        last_synced_at: new Date().toISOString(),
        contact_count: contacts.length,
        updated_at: new Date().toISOString(),
      })
      .eq('id', connection.id)

    return NextResponse.json({
      synced: contacts.length,
      provider,
    })
  } catch (err) {
    console.error('[CRM Contacts POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// --- Types & Helpers ---

interface CrmContact {
  externalId: string
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  phone?: string | null
  tags?: string[]
  leadStatus?: string | null
  leadSource?: string | null
  propertyAddress?: string | null
  notes?: string | null
  rawData?: Record<string, unknown>
}

async function fetchFubContacts(apiKey: string): Promise<CrmContact[]> {
  const contacts: CrmContact[] = []
  let offset = 0
  const limit = 100
  let hasMore = true

  while (hasMore) {
    const res = await fetch(
      `https://api.followupboss.com/v1/people?limit=${limit}&offset=${offset}`,
      {
        headers: {
          Authorization: 'Basic ' + Buffer.from(apiKey + ':').toString('base64'),
        },
      }
    )

    if (!res.ok) throw new Error(`FUB API error: ${res.status}`)

    const data = await res.json()
    const people = data.people ?? []

    for (const p of people) {
      const email = p.emails?.[0]?.value ?? null
      const phone = p.phones?.[0]?.value ?? null

      contacts.push({
        externalId: String(p.id),
        firstName: p.firstName ?? null,
        lastName: p.lastName ?? null,
        email,
        phone,
        tags: p.tags ?? [],
        leadStatus: p.stage ?? null,
        leadSource: p.source ?? null,
        propertyAddress: p.addresses?.[0]?.street ?? null,
        notes: null,
        rawData: p,
      })
    }

    hasMore = people.length === limit
    offset += limit

    // Safety cap at 5000 contacts per sync
    if (contacts.length >= 5000) break
  }

  return contacts
}

async function fetchLoftyContacts(accessToken: string): Promise<CrmContact[]> {
  const contacts: CrmContact[] = []
  let page = 1
  const limit = 100
  let hasMore = true

  while (hasMore) {
    const res = await fetch(
      `https://api.lofty.com/v1.0/contacts?page=${page}&per_page=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!res.ok) throw new Error(`Lofty API error: ${res.status}`)

    const data = await res.json()
    const items = data.data ?? data.contacts ?? []

    for (const c of items) {
      contacts.push({
        externalId: String(c.id),
        firstName: c.first_name ?? c.firstName ?? null,
        lastName: c.last_name ?? c.lastName ?? null,
        email: c.email ?? c.emails?.[0] ?? null,
        phone: c.phone ?? c.phones?.[0] ?? null,
        tags: c.tags ?? [],
        leadStatus: c.status ?? c.lead_status ?? null,
        leadSource: c.source ?? c.lead_source ?? null,
        propertyAddress: c.address ?? null,
        notes: c.notes ?? null,
        rawData: c,
      })
    }

    hasMore = items.length === limit
    page++

    // Safety cap
    if (contacts.length >= 5000) break
  }

  return contacts
}
