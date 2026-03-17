export interface CommNudge {
  id: string
  type: 'pipeline_stale' | 'no_messages' | 'congratulate' | 'weekly_summary' | 'score_dropping'
  agentId: string      // the partner agent this nudge is about
  agentName: string
  referralId?: string   // if related to a specific referral
  clientName?: string
  message: string       // the nudge text
  suggestedAction: string // e.g., "Send a status update"
  suggestedMessage?: string // pre-drafted message text
  priority: 'high' | 'medium' | 'low'
  daysOverdue?: number
  createdAt: string
}

const COMM_NUDGES: Record<string, CommNudge[]> = {
  jason: [
    {
      id: 'cn-1',
      type: 'pipeline_stale',
      agentId: 'carlos',
      agentName: 'Carlos Vega',
      referralId: 'ref-johnson',
      clientName: 'Johnson',
      message: "You haven't updated Carlos Vega on the Johnson referral in 12 days",
      suggestedAction: 'Send a status update',
      suggestedMessage: "Hey Carlos, quick update on the Johnson referral — we had a showing last week and they're still actively looking. I'll keep you posted on any offers. Let me know if you need anything from my end!",
      priority: 'high',
      daysOverdue: 12,
      createdAt: '2026-03-16T08:00:00Z',
    },
    {
      id: 'cn-2',
      type: 'no_messages',
      agentId: 'ashley',
      agentName: 'Ashley Monroe',
      message: 'No messages sent to Ashley Monroe this week on 2 active referrals',
      suggestedAction: 'Send a weekly check-in',
      suggestedMessage: "Hey Ashley, just touching base on our active referrals. The Martinez family is settling in nicely, and the Patel showing went well. Any updates from your side?",
      priority: 'high',
      createdAt: '2026-03-16T08:00:00Z',
    },
    {
      id: 'cn-3',
      type: 'congratulate',
      agentId: 'darius',
      agentName: 'Darius King',
      referralId: 'ref-williams',
      clientName: 'Williams',
      message: 'Darius King moved your referral to Under Contract — send congratulations',
      suggestedAction: 'Send congratulations',
      suggestedMessage: "Congrats on getting the Williams deal under contract, Darius! That's awesome news. Thanks for taking such great care of them. Let me know if you need anything as we head toward closing!",
      priority: 'medium',
      createdAt: '2026-03-16T09:00:00Z',
    },
    {
      id: 'cn-4',
      type: 'weekly_summary',
      agentId: 'jason',
      agentName: "Jason O'Brien",
      message: 'You have 3 active referrals with no communication this week — your Comm Score may drop',
      suggestedAction: 'Send updates on stale referrals',
      suggestedMessage: undefined,
      priority: 'medium',
      createdAt: '2026-03-16T07:00:00Z',
    },
    {
      id: 'cn-5',
      type: 'score_dropping',
      agentId: 'jason',
      agentName: "Jason O'Brien",
      message: 'Your Communication Score dropped 4 points this month — send updates on stale referrals',
      suggestedAction: 'Review stale referrals',
      suggestedMessage: undefined,
      priority: 'high',
      createdAt: '2026-03-16T06:00:00Z',
    },
    {
      id: 'cn-6',
      type: 'no_messages',
      agentId: 'rachel',
      agentName: 'Rachel Kim',
      referralId: 'ref-martinez',
      clientName: 'Martinez',
      message: "Rachel Kim hasn't heard from you in 8 days on the Martinez referral",
      suggestedAction: 'Send an update',
      suggestedMessage: "Hi Rachel, wanted to give you a quick update on the Martinez referral. We've been exploring a few properties in their price range and have a second showing scheduled this week. I'll send you a full update after!",
      priority: 'medium',
      daysOverdue: 8,
      createdAt: '2026-03-16T08:30:00Z',
    },
  ],
}

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 }

/** Get communication nudges for an agent, sorted by priority */
export function getCommNudges(agentId: string): CommNudge[] {
  return (COMM_NUDGES[agentId] ?? []).sort(
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
  )
}

/** Get a pre-drafted message based on nudge type and context */
export function getSuggestedMessage(
  nudgeType: CommNudge['type'],
  agentName: string,
  clientName?: string
): string {
  const firstName = agentName.split(' ')[0]

  switch (nudgeType) {
    case 'pipeline_stale':
      return clientName
        ? `Hey ${firstName}, just checking in on the ${clientName} referral. Wanted to make sure everything is moving along smoothly. Let me know if there's anything you need from my end!`
        : `Hey ${firstName}, wanted to touch base on our active referrals. Any updates to share? Happy to help with anything you need.`

    case 'no_messages':
      return clientName
        ? `Hi ${firstName}, quick update on the ${clientName} referral — things are progressing well on my end. Any news from your side?`
        : `Hey ${firstName}, just doing a weekly check-in on our referrals. Everything is on track here — any updates from your end?`

    case 'congratulate':
      return clientName
        ? `Congrats on the ${clientName} deal, ${firstName}! Great work getting it under contract. Looking forward to a smooth closing!`
        : `Congrats on the progress, ${firstName}! Great work. Let me know if there's anything I can do to help.`

    case 'weekly_summary':
      return `Hey team, here's my weekly update: all active referrals are progressing well. Reaching out to make sure we're all on the same page heading into the week.`

    case 'score_dropping':
      return `Hey ${firstName}, I've been meaning to send updates on a few of our referrals. Here's where things stand — let me know if you have any questions or need anything!`

    default:
      return `Hey ${firstName}, just checking in. How are things going?`
  }
}
