import { NextRequest, NextResponse } from 'next/server'

// GET /api/admin/expectations — return all expectation items (including inactive)
export async function GET() {
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('ar_expectation_items')
      .select('*')
      .order('category')
      .order('sort_order', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ items: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/expectations — create a new expectation item
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { category, event_key, label, description, trigger_type, trigger_config, notification_template } = body

    if (!category || !event_key || !label || !trigger_type) {
      return NextResponse.json({ error: 'category, event_key, label, and trigger_type are required' }, { status: 400 })
    }

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    // Get next sort_order
    const { data: existing } = await supabase
      .from('ar_expectation_items')
      .select('sort_order')
      .eq('category', category)
      .order('sort_order', { ascending: false })
      .limit(1)

    const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1

    const { data, error } = await supabase
      .from('ar_expectation_items')
      .insert({
        category,
        event_key,
        label,
        description: description || null,
        trigger_type,
        trigger_config: trigger_config || {},
        notification_template: notification_template || {},
        sort_order: nextOrder,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ item: data })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/admin/expectations — update an expectation item
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const allowed: Record<string, unknown> = {}
    if (updates.label !== undefined) allowed.label = updates.label
    if (updates.description !== undefined) allowed.description = updates.description
    if (updates.category !== undefined) allowed.category = updates.category
    if (updates.event_key !== undefined) allowed.event_key = updates.event_key
    if (updates.trigger_type !== undefined) allowed.trigger_type = updates.trigger_type
    if (updates.trigger_config !== undefined) allowed.trigger_config = updates.trigger_config
    if (updates.notification_template !== undefined) allowed.notification_template = updates.notification_template
    if (updates.is_active !== undefined) allowed.is_active = updates.is_active
    if (updates.sort_order !== undefined) allowed.sort_order = updates.sort_order

    if (Object.keys(allowed).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('ar_expectation_items')
      .update(allowed)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ item: data })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/expectations?id=xxx
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id query param is required' }, { status: 400 })
    }

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    const { error } = await supabase
      .from('ar_expectation_items')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
