import { NextRequest, NextResponse } from 'next/server'

// GET /api/admin/tiers — return all tiers with features (including inactive)
export async function GET() {
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    const { data: tiers, error: tiersError } = await supabase
      .from('ar_tiers')
      .select('*')
      .order('sort_order', { ascending: true })

    if (tiersError) {
      return NextResponse.json({ error: tiersError.message }, { status: 500 })
    }

    // Fetch junction rows
    const tierIds = (tiers ?? []).map((t) => t.id)
    const { data: tierFeatures } = await supabase
      .from('ar_tier_features')
      .select('tier_id, feature_id, value')
      .in('tier_id', tierIds)

    // Fetch feature definitions for key lookup
    const { data: featureDefs } = await supabase
      .from('ar_features')
      .select('id, key')

    const featureKeyById: Record<string, string> = {}
    for (const f of featureDefs ?? []) {
      featureKeyById[f.id] = f.key
    }

    const tiersWithFeatures = (tiers ?? []).map((tier) => {
      const features: Record<string, string | boolean> = {}
      const rows = (tierFeatures ?? []).filter((tf) => tf.tier_id === tier.id)
      for (const row of rows) {
        const key = featureKeyById[row.feature_id]
        if (!key) continue
        if (row.value === 'true') features[key] = true
        else if (row.value === 'false') features[key] = false
        else features[key] = row.value
      }
      return { ...tier, features }
    })

    return NextResponse.json({ tiers: tiersWithFeatures })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/tiers — create a new tier
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { slug, name, description, price_cents, price_label, period, is_recommended, cta_label, landing_features } = body

    if (!slug || !name) {
      return NextResponse.json({ error: 'slug and name are required' }, { status: 400 })
    }

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    // Get next sort_order
    const { data: existing } = await supabase
      .from('ar_tiers')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)

    const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1

    const { data, error } = await supabase
      .from('ar_tiers')
      .insert({
        slug,
        name,
        description: description ?? null,
        price_cents: price_cents ?? 0,
        price_label: price_label ?? 'Free',
        period: period ?? '/month',
        is_recommended: is_recommended ?? false,
        cta_label: cta_label ?? 'Get Started',
        landing_features: landing_features ?? [],
        sort_order: nextOrder,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ tier: data })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/admin/tiers — update a tier
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const allowed: Record<string, unknown> = {}
    const fields = [
      'slug', 'name', 'description', 'price_cents', 'price_label', 'period',
      'is_recommended', 'cta_label', 'landing_features', 'stripe_product_id',
      'stripe_price_id', 'stripe_price_founding_id', 'sort_order', 'is_active',
    ]
    for (const f of fields) {
      if (updates[f] !== undefined) allowed[f] = updates[f]
    }

    if (Object.keys(allowed).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    allowed.updated_at = new Date().toISOString()

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('ar_tiers')
      .update(allowed)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ tier: data })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/tiers?id=xxx — soft delete (set is_active=false)
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id query param is required' }, { status: 400 })
    }

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    const { error } = await supabase
      .from('ar_tiers')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
