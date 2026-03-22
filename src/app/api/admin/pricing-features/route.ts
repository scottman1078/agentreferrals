import { NextRequest, NextResponse } from 'next/server'

// GET /api/admin/pricing-features — return all features ordered by sort_order
export async function GET() {
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('ar_features')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ features: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/pricing-features — create a new feature { key, label, description?, category? }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { key, label, description, category } = body

    if (!key || !label) {
      return NextResponse.json({ error: 'key and label are required' }, { status: 400 })
    }

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    // Get the max sort_order to append at the end
    const { data: existing } = await supabase
      .from('ar_features')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)

    const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1

    const { data, error } = await supabase
      .from('ar_features')
      .insert({
        key,
        label,
        description: description ?? null,
        category: category ?? 'general',
        sort_order: nextOrder,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ feature: data })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/admin/pricing-features — update a feature { id, key?, label?, description?, category?, sort_order?, is_active? }
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const allowed: Record<string, unknown> = {}
    if (updates.key !== undefined) allowed.key = updates.key
    if (updates.label !== undefined) allowed.label = updates.label
    if (updates.description !== undefined) allowed.description = updates.description
    if (updates.category !== undefined) allowed.category = updates.category
    if (updates.sort_order !== undefined) allowed.sort_order = updates.sort_order
    if (updates.is_active !== undefined) allowed.is_active = updates.is_active

    if (Object.keys(allowed).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('ar_features')
      .update(allowed)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ feature: data })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/pricing-features?id=xxx — delete a feature by id
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id query param is required' }, { status: 400 })
    }

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    const { error } = await supabase
      .from('ar_features')
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
