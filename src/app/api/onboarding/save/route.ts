import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

/**
 * Generate a URL-friendly referral code from a user's name.
 * Format: `firstname-lastname-abc123` (lowercase + 6 random hex chars)
 */
function generateReferralCode(fullName?: string | null): string {
  const slug = (fullName || 'agent')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 30) // keep it reasonable length
  const rand = crypto.randomBytes(3).toString('hex') // 6 hex chars
  return `${slug}-${rand}`
}

// POST /api/onboarding/save
// Saves the onboarding profile data using the admin client (bypasses RLS)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { profile, hubData } = body

    console.log('[onboarding/save] Received:', { profileId: profile?.id, email: profile?.email, fullName: profile?.full_name })

    if (!profile || !profile.id) {
      console.error('[onboarding/save] Missing profile data:', JSON.stringify(body).slice(0, 200))
      return NextResponse.json({ error: 'Missing profile data' }, { status: 400 })
    }

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    // ── Generate referral_code if the user doesn't already have one ──
    if (!profile.referral_code) {
      const { data: existing } = await supabase
        .from('ar_profiles')
        .select('referral_code')
        .eq('id', profile.id)
        .single()

      if (!existing?.referral_code) {
        profile.referral_code = generateReferralCode(profile.full_name)
      }
    }

    // Upsert ar_profiles
    const { error } = await supabase
      .from('ar_profiles')
      .upsert(profile, { onConflict: 'id' })

    if (error) {
      console.error('[onboarding/save] Profile upsert failed:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Also update Hub agents table if hubData provided
    if (hubData) {
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const hubUrl = process.env.NEXT_PUBLIC_HUB_URL
        const hubKey = process.env.HUB_SERVICE_ROLE_KEY
        if (hubUrl && hubKey) {
          const hub = createClient(hubUrl, hubKey, {
            auth: { autoRefreshToken: false, persistSession: false },
          })

          await hub.from('agents').upsert(hubData.agent, { onConflict: 'profile_id' })

          if (hubData.platform) {
            const { data: platform } = await hub
              .from('platforms')
              .select('id')
              .eq('slug', 'agentreferrals')
              .single()

            if (platform) {
              await hub.from('user_products').upsert({
                profile_id: profile.id,
                product_id: platform.id,
                status: 'active',
                tier: 'free',
              }, { onConflict: 'profile_id,product_id' })
            }
          }
        }
      } catch (hubError) {
        console.error('[onboarding/save] Hub registration failed:', hubError)
        // Don't fail — AR profile is saved
      }
    }

    // ── Auto-create partnership if user was invited ──────────────
    // Fire-and-forget: don't block onboarding completion
    processInvitePartnership(supabase, profile).catch((err) => {
      console.error('[onboarding/save] Invite partnership processing failed:', err)
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[onboarding/save] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Check if the newly onboarded user was invited, and if so:
 * 1. Create an active partnership with the inviter
 * 2. Update the invite record
 * 3. Send a notification email to the inviter
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processInvitePartnership(
  supabase: any,
  profile: { id: string; email: string; full_name?: string; primary_area?: string; brokerage_id?: string; subscription_tier?: string }
) {
  // Look for pending or signed_up invites matching this user's email
  const { data: invites, error: inviteError } = await supabase
    .from('ar_invites')
    .select('id, invited_by, status')
    .eq('invitee_email', profile.email)
    .in('status', ['pending', 'signed_up'])
    .limit(10)

  if (inviteError || !invites || invites.length === 0) {
    return // No matching invites — nothing to do
  }

  for (const invite of invites) {
    if (!invite.invited_by) continue

    try {
      // Get inviter's profile for market info
      const { data: inviterProfile } = await supabase
        .from('ar_profiles')
        .select('id, full_name, email, primary_area, brokerage_id')
        .eq('id', invite.invited_by)
        .single()

      if (!inviterProfile) continue

      // Create active partnership
      const { error: partnershipError } = await supabase
        .from('ar_partnerships')
        .insert({
          requesting_agent_id: invite.invited_by,
          receiving_agent_id: profile.id,
          requesting_market: inviterProfile.primary_area || 'Unknown',
          receiving_market: profile.primary_area || 'Unknown',
          status: 'active',
          message: 'Connected via invite code',
          accepted_at: new Date().toISOString(),
        })

      if (partnershipError) {
        console.error('[onboarding/save] Partnership insert failed:', partnershipError.message)
        continue
      }

      // Update the invite record
      await supabase
        .from('ar_invites')
        .update({
          status: 'active',
          signed_up_user_id: profile.id,
          signed_up_at: new Date().toISOString(),
        })
        .eq('id', invite.id)

      // Create affiliate reward for the inviter (10% subscription discount per invite)
      // If the invitee has a paid subscription, reward is 'earned' immediately.
      // If on the free tier, reward is 'pending' until they upgrade.
      const inviteeIsPaid =
        profile.subscription_tier && profile.subscription_tier !== 'free'
          ? true
          : false
      const rewardStatus = inviteeIsPaid ? 'earned' : 'pending'

      await supabase
        .from('ar_affiliate_rewards')
        .insert({
          user_id: invite.invited_by,
          invite_id: invite.id,
          reward_type: 'subscription_discount',
          amount: 10.00,
          status: rewardStatus,
          earned_at: inviteeIsPaid ? new Date().toISOString() : null,
        })
        .then(({ error: rewardError }: { error: { message: string } | null }) => {
          if (rewardError) {
            console.error('[onboarding/save] Affiliate reward insert failed:', rewardError.message)
          } else {
            console.log(`[onboarding/save] Affiliate reward created: status=${rewardStatus} for inviter=${invite.invited_by}`)
          }
        })

      // Send notification email to the inviter (fire-and-forget)
      const { sendInviterNotification } = await import('@/lib/postmark')

      // Look up brokerage name for the new user
      let brokerageName = 'their brokerage'
      if (profile.brokerage_id) {
        const { data: brokerage } = await supabase
          .from('ar_brokerages')
          .select('name')
          .eq('id', profile.brokerage_id)
          .single()
        if (brokerage) brokerageName = brokerage.name
      }

      sendInviterNotification({
        toEmail: inviterProfile.email,
        toName: inviterProfile.full_name || 'there',
        newMemberName: profile.full_name || 'A new agent',
        newMemberBrokerage: brokerageName,
        newMemberArea: profile.primary_area || 'Unknown area',
      }).catch((emailErr) => {
        console.error('[onboarding/save] Inviter notification email failed:', emailErr)
      })
    } catch (err) {
      console.error('[onboarding/save] Error processing invite:', invite.id, err)
    }
  }
}
