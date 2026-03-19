import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const userId = searchParams.get('userId')

    if (!code || !userId) {
      return NextResponse.json({ error: 'Missing code or userId' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('ar_profiles')
      .select('id')
      .eq('referral_code', code)
      .neq('id', userId)
      .limit(1)

    if (error) {
      console.error('[ReferralCode/Check] DB error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({ available: !data || data.length === 0 })
  } catch (error) {
    console.error('[ReferralCode/Check] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
