import { NextRequest, NextResponse } from 'next/server'

// GET /api/admin/specializations — return all specializations ordered by sort_order
export async function GET() {
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('ar_specializations')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ specializations: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/specializations — create a new specialization { name, color, emoji }
export async function POST(request: NextRequest) {
  try {
    const { name, color, emoji } = await request.json()

    if (!name || !color) {
      return NextResponse.json({ error: 'name and color are required' }, { status: 400 })
    }

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    // Get the max sort_order to append at the end
    const { data: existing } = await supabase
      .from('ar_specializations')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)

    const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1

    const { data, error } = await supabase
      .from('ar_specializations')
      .insert({ name, color, emoji: emoji || null, sort_order: nextOrder })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ specialization: data })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/specializations?id=xxx — delete a specialization by id
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id query param is required' }, { status: 400 })
    }

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    const { error } = await supabase
      .from('ar_specializations')
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

// PATCH /api/admin/specializations — update a specialization { id, name?, color?, emoji?, is_active?, sort_order? }
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    // Only allow known fields
    const allowed: Record<string, unknown> = {}
    if (updates.name !== undefined) allowed.name = updates.name
    if (updates.color !== undefined) allowed.color = updates.color
    if (updates.emoji !== undefined) allowed.emoji = updates.emoji
    if (updates.is_active !== undefined) allowed.is_active = updates.is_active
    if (updates.sort_order !== undefined) allowed.sort_order = updates.sort_order

    if (Object.keys(allowed).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('ar_specializations')
      .update(allowed)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ specialization: data })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
