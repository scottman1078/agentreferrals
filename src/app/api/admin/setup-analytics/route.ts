import { NextResponse } from 'next/server'

// GET /api/admin/setup-analytics — funnel + territory stats for setup wizard
export async function GET() {
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    // Fetch all real profiles with setup-relevant columns
    const { data: profiles, error } = await supabase
      .from('ar_profiles')
      .select('id, full_name, email, setup_step, territory_meta, territory_zips, created_at, setup_completed_at')
      .or('is_demo.is.null,is_demo.eq.false')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[admin/setup-analytics] Query error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const allProfiles = profiles ?? []

    // ── Funnel metrics ──
    const totalStarted = allProfiles.length
    const stepCounts: Record<string, number> = {
      null_step: 0,
      intake: 0,
      profile: 0,
      service_area: 0,
      invites: 0,
      complete: 0,
    }

    for (const p of allProfiles) {
      const step = p.setup_step ?? 'null_step'
      if (step in stepCounts) {
        stepCounts[step]++
      } else {
        stepCounts[step] = (stepCounts[step] || 0) + 1
      }
    }

    const completedCount = stepCounts.complete
    const completionRate = totalStarted > 0
      ? ((completedCount / totalStarted) * 100).toFixed(1)
      : '0.0'

    // Funnel steps in order — cumulative "reached at least this step"
    const orderedSteps = ['intake', 'profile', 'service_area', 'invites', 'complete']
    const stepIndex: Record<string, number> = {}
    orderedSteps.forEach((s, i) => { stepIndex[s] = i })

    const funnelSteps = orderedSteps.map((step, idx) => {
      // Count users who reached at least this step
      const reachedCount = allProfiles.filter((p) => {
        const userStep = p.setup_step
        if (!userStep) return false
        const userIdx = stepIndex[userStep] ?? -1
        return userIdx >= idx
      }).length

      const prevCount = idx === 0
        ? totalStarted
        : allProfiles.filter((p) => {
            const userStep = p.setup_step
            if (!userStep) return false
            const userIdx = stepIndex[userStep] ?? -1
            return userIdx >= idx - 1
          }).length

      const dropOff = prevCount > 0
        ? (((prevCount - reachedCount) / prevCount) * 100).toFixed(1)
        : '0.0'

      return {
        step,
        count: reachedCount,
        dropOff,
      }
    })

    // ── Territory mode popularity ──
    const modeCounts: Record<string, number> = {}
    let totalZipCount = 0
    let usersWithZips = 0

    for (const p of allProfiles) {
      const meta = p.territory_meta as { mode?: string; selections?: string[] } | null
      if (meta?.mode) {
        modeCounts[meta.mode] = (modeCounts[meta.mode] || 0) + 1
      }
      const zips = p.territory_zips as string[] | null
      if (zips && zips.length > 0) {
        totalZipCount += zips.length
        usersWithZips++
      }
    }

    const avgZipsPerUser = usersWithZips > 0
      ? (totalZipCount / usersWithZips).toFixed(1)
      : '0'

    const modeStats = Object.entries(modeCounts)
      .map(([mode, count]) => ({ mode, count }))
      .sort((a, b) => b.count - a.count)

    // ── Recent completions ──
    const recentCompletions = allProfiles
      .filter((p) => p.setup_step === 'complete' && p.setup_completed_at)
      .slice(0, 20)
      .map((p) => {
        const createdAt = new Date(p.created_at)
        const completedAt = new Date(p.setup_completed_at!)
        const diffMs = completedAt.getTime() - createdAt.getTime()
        const diffMins = Math.round(diffMs / 60000)
        let timeToComplete = ''
        if (diffMins < 60) {
          timeToComplete = `${diffMins}m`
        } else if (diffMins < 1440) {
          timeToComplete = `${Math.round(diffMins / 60)}h`
        } else {
          timeToComplete = `${Math.round(diffMins / 1440)}d`
        }
        return {
          id: p.id,
          name: p.full_name || 'No name',
          email: p.email,
          completedAt: p.setup_completed_at,
          timeToComplete,
        }
      })

    // ── Stuck users: setup_step != 'complete', no activity for 24h+ ──
    const now = Date.now()
    const twentyFourHoursMs = 24 * 60 * 60 * 1000
    const stuckUsers = allProfiles
      .filter((p) => {
        if (!p.setup_step || p.setup_step === 'complete') return false
        // Use the most recent timestamp as a proxy for last activity
        const lastActivity = new Date(p.setup_completed_at || p.created_at).getTime()
        return (now - lastActivity) > twentyFourHoursMs
      })
      .slice(0, 50)
      .map((p) => ({
        id: p.id,
        name: p.full_name || 'No name',
        email: p.email,
        step: p.setup_step,
        lastActivity: p.created_at,
      }))

    return NextResponse.json({
      funnel: {
        totalStarted,
        completedCount,
        completionRate,
        stepCounts,
        funnelSteps,
      },
      territory: {
        modeStats,
        avgZipsPerUser,
        totalZipCount,
        usersWithZips,
      },
      recentCompletions,
      stuckUsers,
    })
  } catch (error) {
    console.error('[admin/setup-analytics] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
