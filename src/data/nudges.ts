export interface Nudge {
  id: string
  type: 'inactive_partner' | 'referral_anniversary' | 'market_activity' | 'referral_closed' | 'seasonal' | 'new_search'
  agentId: string
  agentName: string
  agentArea: string
  agentColor: string
  title: string
  message: string
  suggestedMessages: string[]
  daysInactive?: number
  priority: 'high' | 'medium' | 'low'
  createdAt: string
  dismissed: boolean
}

export const nudges: Nudge[] = [
  {
    id: 'nudge-1',
    type: 'inactive_partner',
    agentId: 'ashley',
    agentName: 'Ashley Monroe',
    agentArea: 'Nashville Metro, TN',
    agentColor: '#f472b6',
    title: "You haven't messaged Ashley Monroe in 42 days",
    message: 'Ashley is one of your top referral partners. A quick check-in keeps the relationship warm.',
    suggestedMessages: [
      "Hey Ashley, just checking in! Have any clients looking in Plainwell or the Kalamazoo area? I'd love to help.",
      "Haven't connected in a while — how's the Nashville market treating you?",
      'Hey Ashley! Any relocation clients headed to Michigan? I have a few looking at Nashville too.',
    ],
    daysInactive: 42,
    priority: 'high',
    createdAt: '2026-03-15T08:00:00Z',
    dismissed: false,
  },
  {
    id: 'nudge-2',
    type: 'referral_anniversary',
    agentId: 'carlos',
    agentName: 'Carlos Vega',
    agentArea: 'Dallas / Fort Worth, TX',
    agentColor: '#f43f5e',
    title: '1 year since your first referral with Carlos Vega',
    message: 'You closed your first deal together in March 2025. A thank-you goes a long way.',
    suggestedMessages: [
      "Carlos, just realized it's been a year since our first referral together. Thanks for being such a great partner!",
      'Happy referral anniversary! The Henderson deal was the start of something great. Looking forward to many more.',
      "Can you believe it's been a year? Here's to another great year of referrals together.",
    ],
    priority: 'medium',
    createdAt: '2026-03-15T08:00:00Z',
    dismissed: false,
  },
  {
    id: 'nudge-3',
    type: 'market_activity',
    agentId: 'carlos',
    agentName: 'Carlos Vega',
    agentArea: 'Dallas / Fort Worth, TX',
    agentColor: '#f43f5e',
    title: '3 agents searched for partners in Nashville this week',
    message: 'Nashville is heating up on AgentReferrals. Your coverage there with Ashley could generate more deals.',
    suggestedMessages: [],
    priority: 'low',
    createdAt: '2026-03-14T10:00:00Z',
    dismissed: false,
  },
  {
    id: 'nudge-4',
    type: 'referral_closed',
    agentId: 'ashley',
    agentName: 'Ashley Monroe',
    agentArea: 'Nashville Metro, TN',
    agentColor: '#f472b6',
    title: 'The Martinez deal closed! Congrats — send Ashley a note?',
    message: 'The Martinez family just closed in Brentwood. A congratulations message strengthens the partnership.',
    suggestedMessages: [
      'Congrats on the Martinez closing, Ashley! Great working together. Let me know if you need anything else from my side.',
      'The Martinez deal is done! Thanks for taking such great care of my clients. Let\'s do it again soon.',
      'Just saw the Martinez deal closed — amazing work! My clients loved working with you.',
    ],
    priority: 'high',
    createdAt: '2026-03-15T09:30:00Z',
    dismissed: false,
  },
  {
    id: 'nudge-5',
    type: 'seasonal',
    agentId: 'megan',
    agentName: 'Megan Torres',
    agentArea: 'Grand Rapids / Kent County, MI',
    agentColor: '#22c55e',
    title: 'Q1 is ending — check in with your 7 referral partners',
    message: 'End of quarter is a great time to reconnect. You have 7 active partners who could send you spring leads.',
    suggestedMessages: [
      "End of Q1 check-in — any market trends you're seeing in Grand Rapids?",
      'Spring market is ramping up! Any buyers looking at the Kalamazoo area?',
      "Hey Megan, Q1 wrap-up — how's your pipeline looking? Let's catch up.",
    ],
    priority: 'medium',
    createdAt: '2026-03-14T07:00:00Z',
    dismissed: false,
  },
  {
    id: 'nudge-6',
    type: 'inactive_partner',
    agentId: 'megan',
    agentName: 'Megan Torres',
    agentArea: 'Grand Rapids / Kent County, MI',
    agentColor: '#22c55e',
    title: "Megan Torres hasn't heard from you in 28 days",
    message: "It's been almost a month since your last conversation with Megan. Keep the partnership active.",
    suggestedMessages: [
      "Hey Megan, just checking in! How's the Grand Rapids market? I have a few buyers who might be interested.",
      "Haven't connected in a while — any referral opportunities on your end?",
      'Hey Megan! Spring is here and I bet Grand Rapids is heating up. Any clients looking south toward Kalamazoo?',
    ],
    daysInactive: 28,
    priority: 'medium',
    createdAt: '2026-03-15T08:00:00Z',
    dismissed: false,
  },
  {
    id: 'nudge-7',
    type: 'new_search',
    agentId: 'carlos',
    agentName: 'Carlos Vega',
    agentArea: 'Dallas / Fort Worth, TX',
    agentColor: '#f43f5e',
    title: 'Someone in Dallas is looking for a Michigan agent — let Carlos know?',
    message: 'A Dallas-based agent just searched for partners in Michigan. Carlos could refer them your way.',
    suggestedMessages: [
      "Hey Carlos, heard there's interest from a Dallas agent looking for Michigan connections. Want to coordinate?",
      'Carlos, I saw some search activity from DFW agents looking for Michigan partners. Could be a good intro opportunity for both of us.',
    ],
    priority: 'medium',
    createdAt: '2026-03-14T14:00:00Z',
    dismissed: false,
  },
  {
    id: 'nudge-8',
    type: 'seasonal',
    agentId: 'darius',
    agentName: 'Darius King',
    agentArea: 'Phoenix / Scottsdale, AZ',
    agentColor: '#d97706',
    title: "Darius King's birthday is next week",
    message: 'A quick birthday message shows you care about the relationship beyond just deals.',
    suggestedMessages: [
      'Happy birthday, Darius! Hope you have a great one. Looking forward to more deals together this year.',
      'Hey Darius, happy birthday! Here\'s to another great year of referrals.',
    ],
    priority: 'low',
    createdAt: '2026-03-15T06:00:00Z',
    dismissed: false,
  },
  {
    id: 'nudge-9',
    type: 'inactive_partner',
    agentId: 'marcus',
    agentName: 'Marcus Reid',
    agentArea: 'Chicago Metro, IL',
    agentColor: '#818cf8',
    title: "Marcus Reid hasn't heard from you in 35 days",
    message: 'Your Chicago connection is going cold. Marcus handles Hinsdale and western suburbs — prime relocation territory.',
    suggestedMessages: [
      "Hey Marcus, how's the spring market in Hinsdale? Any relocations coming to Michigan?",
      "Marcus! Haven't talked in a bit. I have a couple who might be looking at the western suburbs. You still doing a lot there?",
      "Quick check-in — how did that Hinsdale packet work out? Let's stay connected.",
    ],
    daysInactive: 35,
    priority: 'high',
    createdAt: '2026-03-15T08:00:00Z',
    dismissed: false,
  },
]

// Helper: get active (non-dismissed) nudges sorted by priority
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 }

export function getActiveNudges(nudgeList: Nudge[]): Nudge[] {
  return nudgeList
    .filter((n) => !n.dismissed)
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
}

// Helper: get nudges for a specific agent
export function getNudgesForAgent(nudgeList: Nudge[], agentId: string): Nudge[] {
  return nudgeList.filter((n) => !n.dismissed && n.agentId === agentId)
}

// Helper: count of active nudges
export function getActiveNudgeCount(nudgeList: Nudge[]): number {
  return nudgeList.filter((n) => !n.dismissed).length
}
