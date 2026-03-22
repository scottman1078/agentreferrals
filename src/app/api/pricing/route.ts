import { NextResponse } from 'next/server'

// GET /api/pricing — public endpoint returning active tiers with features
export async function GET() {
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    // Fetch active tiers ordered by sort_order
    const { data: tiers, error: tiersError } = await supabase
      .from('ar_tiers')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (tiersError) {
      return NextResponse.json({ error: tiersError.message }, { status: 500 })
    }

    // Fetch all active features
    const { data: featureDefs, error: featsError } = await supabase
      .from('ar_features')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (featsError) {
      return NextResponse.json({ error: featsError.message }, { status: 500 })
    }

    // Fetch all tier-feature junction rows for active tiers
    const tierIds = (tiers ?? []).map((t) => t.id)

    const { data: tierFeatures, error: junctionError } = await supabase
      .from('ar_tier_features')
      .select('tier_id, feature_id, value')
      .in('tier_id', tierIds)

    if (junctionError) {
      return NextResponse.json({ error: junctionError.message }, { status: 500 })
    }

    // Build a feature key lookup
    const featureKeyById: Record<string, string> = {}
    for (const f of featureDefs ?? []) {
      featureKeyById[f.id] = f.key
    }

    // Attach features object to each tier, coercing 'true'/'false' to booleans
    const tiersWithFeatures = (tiers ?? []).map((tier) => {
      const features: Record<string, string | boolean> = {}
      const rows = (tierFeatures ?? []).filter((tf) => tf.tier_id === tier.id)
      for (const row of rows) {
        const key = featureKeyById[row.feature_id]
        if (!key) continue
        if (row.value === 'true') {
          features[key] = true
        } else if (row.value === 'false') {
          features[key] = false
        } else {
          features[key] = row.value
        }
      }
      return { ...tier, features }
    })

    return NextResponse.json({
      tiers: tiersWithFeatures,
      featureDefinitions: featureDefs ?? [],
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
