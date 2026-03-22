import { NextRequest, NextResponse } from 'next/server'

// PATCH /api/admin/tier-features — bulk update tier features
// Body: { tierId: string, features: Record<string, string> }
// Each key is a feature key, value is the string to store (e.g. 'true', 'false', '25', 'Priority')
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { tierId, features } = body as { tierId: string; features: Record<string, string> }

    if (!tierId || !features || typeof features !== 'object') {
      return NextResponse.json(
        { error: 'tierId and features object are required' },
        { status: 400 },
      )
    }

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    // Look up feature IDs by key
    const featureKeys = Object.keys(features)
    const { data: featureDefs, error: featsError } = await supabase
      .from('ar_features')
      .select('id, key')
      .in('key', featureKeys)

    if (featsError) {
      return NextResponse.json({ error: featsError.message }, { status: 500 })
    }

    const featureIdByKey: Record<string, string> = {}
    for (const f of featureDefs ?? []) {
      featureIdByKey[f.key] = f.id
    }

    // Upsert each feature value
    const upserts = featureKeys
      .filter((key) => featureIdByKey[key])
      .map((key) => ({
        tier_id: tierId,
        feature_id: featureIdByKey[key],
        value: String(features[key]),
      }))

    if (upserts.length === 0) {
      return NextResponse.json({ error: 'No matching feature keys found' }, { status: 400 })
    }

    const { error: upsertError } = await supabase
      .from('ar_tier_features')
      .upsert(upserts, { onConflict: 'tier_id,feature_id' })

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, updated: upserts.length })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
