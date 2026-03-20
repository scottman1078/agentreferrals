import { NextRequest, NextResponse } from 'next/server'

// GET /api/expectations — return all active expectation items
export async function GET() {
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('ar_expectation_items')
      .select('id, category, event_key, label, description, sort_order, trigger_type, trigger_config')
      .eq('is_active', true)
      .order('category')
      .order('sort_order', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Group by category
    const buyer = (data ?? []).filter((i) => i.category === 'buyer')
    const seller = (data ?? []).filter((i) => i.category === 'seller')
    const general = (data ?? []).filter((i) => i.category === 'general')

    return NextResponse.json({ items: data ?? [], buyer, seller, general })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/expectations — save agent's selected expectations
// Body: { selections: { send: string[], receive: string[] } }
// where string[] = expectation item IDs
export async function POST(request: NextRequest) {
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    const { selections, agentId } = await request.json()

    if (!agentId || !selections) {
      return NextResponse.json({ error: 'agentId and selections required' }, { status: 400 })
    }

    // Delete existing selections for this agent
    await supabase
      .from('ar_profile_expectations')
      .delete()
      .eq('agent_id', agentId)

    // Insert new selections
    const rows: { agent_id: string; expectation_id: string; side: string }[] = []

    for (const id of selections.send ?? []) {
      rows.push({ agent_id: agentId, expectation_id: id, side: 'send' })
    }
    for (const id of selections.receive ?? []) {
      rows.push({ agent_id: agentId, expectation_id: id, side: 'receive' })
    }

    if (rows.length > 0) {
      const { error } = await supabase
        .from('ar_profile_expectations')
        .insert(rows)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, count: rows.length })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
