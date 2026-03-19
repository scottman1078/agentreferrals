import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Helper to build a rich inviter profile response
interface InviterProfile {
  inviterName: string
  inviterEmail: string | null
  inviterPhoto: string | null
  inviterBrokerage: string | null
  inviterMarket: string | null
  inviterTags: string[] | null
  inviterRcsScore: number | null
  inviterDealsPerYear: number | null
  inviterYearsLicensed: number | null
}

async function fetchInviterProfile(supabase: ReturnType<typeof createAdminClient>, inviterId: string): Promise<InviterProfile> {
  const { data: profile } = await supabase
    .from('ar_profiles')
    .select('id, full_name, email, avatar_url, primary_area, tags, refernet_score, deals_per_year, years_licensed, brokerage:ar_brokerages(name)')
    .eq('id', inviterId)
    .single()

  return {
    inviterName: profile?.full_name || 'An AgentReferrals member',
    inviterEmail: profile?.email || null,
    inviterPhoto: profile?.avatar_url || null,
    inviterBrokerage: (profile?.brokerage as { name?: string } | null)?.name || null,
    inviterMarket: profile?.primary_area || null,
    inviterTags: profile?.tags || null,
    inviterRcsScore: profile?.refernet_score || null,
    inviterDealsPerYear: profile?.deals_per_year || null,
    inviterYearsLicensed: profile?.years_licensed || null,
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')

    if (!code) {
      return NextResponse.json({ valid: false, error: 'No code provided' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Look up the code in ar_invites where status = 'pending' and referral_code matches
    const { data: invite } = await supabase
      .from('ar_invites')
      .select(`
        id,
        invited_by,
        invitee_name,
        invitee_email,
        referral_code,
        status
      `)
      .eq('referral_code', code)
      .eq('status', 'pending')
      .limit(1)
      .single()

    if (invite) {
      // Found a valid invite — look up inviter profile with rich data
      const inviterData = await fetchInviterProfile(supabase, invite.invited_by)

      return NextResponse.json({
        valid: true,
        inviteId: invite.id,
        ...inviterData,
        inviteeEmail: invite.invitee_email?.includes('@pending.invite') ? null : invite.invitee_email,
        inviteeName: invite.invitee_name || null,
      })
    }

    // Super admin bypass codes
    if (code === 'ADMIN-2026' || code === '847293' || code === 'SCOTT-2026-INVITE') {
      return NextResponse.json({
        valid: true,
        inviteId: 'admin-bypass',
        inviterName: 'AgentReferrals Team',
        inviterEmail: 'scott@agentdashboards.com',
        inviterPhoto: null,
        inviterBrokerage: 'AgentReferrals',
        inviterMarket: null,
        inviterTags: null,
        inviterRcsScore: null,
        inviterDealsPerYear: null,
        inviterYearsLicensed: null,
      })
    }

    // Also accept codes matching AR-XXXXXXXX pattern for demo purposes
    const demoPattern = /^AR-[A-Z0-9]{8}$/i
    if (demoPattern.test(code)) {
      return NextResponse.json({
        valid: true,
        inviteId: `demo-${code}`,
        inviterName: 'Jason Smith',
        inviterEmail: 'jason@sweethomerealty.com',
        inviterPhoto: null,
        inviterBrokerage: 'Sweet Home Realty',
        inviterMarket: 'Austin, TX',
        inviterTags: ['Luxury', 'Relocation', 'First-Time Buyers'],
        inviterRcsScore: 92,
        inviterDealsPerYear: 48,
        inviterYearsLicensed: 12,
      })
    }

    return NextResponse.json({ valid: false })
  } catch (error) {
    console.error('[Invite Validate] Error:', error)
    return NextResponse.json({ valid: false, error: 'Internal server error' }, { status: 500 })
  }
}
