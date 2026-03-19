import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const CODE_REGEX = /^[a-z0-9-]+$/

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, newCode } = body

    if (!userId || !newCode) {
      return NextResponse.json({ error: 'Missing userId or newCode' }, { status: 400 })
    }

    // Length validation
    if (newCode.length < 3 || newCode.length > 30) {
      return NextResponse.json({ error: 'Code must be between 3 and 30 characters' }, { status: 400 })
    }

    // URL-safe validation
    if (!CODE_REGEX.test(newCode)) {
      return NextResponse.json({ error: 'Only lowercase letters, numbers, and hyphens are allowed' }, { status: 400 })
    }

    // No leading/trailing hyphens
    if (newCode.startsWith('-') || newCode.endsWith('-')) {
      return NextResponse.json({ error: 'Code cannot start or end with a hyphen' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Check uniqueness
    const { data: existing, error: checkError } = await supabase
      .from('ar_profiles')
      .select('id')
      .eq('referral_code', newCode)
      .neq('id', userId)
      .limit(1)

    if (checkError) {
      console.error('[ReferralCode/Update] Check error:', checkError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: 'This code is already taken' }, { status: 409 })
    }

    // Update the code
    const { error: updateError } = await supabase
      .from('ar_profiles')
      .update({ referral_code: newCode })
      .eq('id', userId)

    if (updateError) {
      console.error('[ReferralCode/Update] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update referral code' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[ReferralCode/Update] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
