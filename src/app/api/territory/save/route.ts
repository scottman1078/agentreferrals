import { NextRequest, NextResponse } from 'next/server'

// POST /api/territory/save
// Body: { userId, polygon, territory_zips }
// Uses admin client to bypass RLS
export async function POST(request: NextRequest) {
  try {
    const { userId, polygon, territory_zips, territory_meta } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (polygon !== undefined) {
      updateData.polygon = polygon
    }

    if (territory_zips !== undefined) {
      updateData.territory_zips = territory_zips
    }

    if (territory_meta !== undefined) {
      updateData.territory_meta = territory_meta
    }

    const { error } = await supabase
      .from('ar_profiles')
      .update(updateData)
      .eq('id', userId)

    if (error) {
      console.error('[territory/save] Update failed:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[territory/save] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
