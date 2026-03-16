export interface Message {
  id: string
  fromUserId: string
  toUserId: string
  referralId?: string
  content: string
  read: boolean
  readAt?: string
  createdAt: string
}

export interface Conversation {
  agentId: string
  agentName: string
  brokerage: string
  color: string
  messages: Message[]
  /** Group conversations have multiple participants */
  isGroup?: boolean
  groupName?: string
  participantIds?: string[]
  participantNames?: string[]
  participantColors?: string[]
}

// Current user is always Jason O'Brien (id: 'jason')
const JASON = 'jason'

function msg(
  id: string,
  from: string,
  to: string,
  content: string,
  createdAt: string,
  read = true,
  referralId?: string
): Message {
  return { id, fromUserId: from, toUserId: to, content, read, createdAt, referralId }
}

export const conversations: Conversation[] = [
  {
    agentId: 'ashley',
    agentName: 'Ashley Monroe',
    brokerage: 'Real Broker LLC — Nashville',
    color: '#f472b6',
    messages: [
      msg('m-ash-1', JASON, 'ashley', "Hey Ashley, I have a family relocating to Nashville. Budget around $600k, great schools are a must. Interested?", '2026-03-13T09:14:00Z'),
      msg('m-ash-2', 'ashley', JASON, "Absolutely! Brentwood and Franklin are perfect for that budget and great school districts. Happy to help!", '2026-03-13T09:22:00Z'),
      msg('m-ash-3', JASON, 'ashley', "Perfect. I'll send the referral agreement over. The Martinez family — husband is taking a healthcare position at Vanderbilt.", '2026-03-13T09:31:00Z'),
      msg('m-ash-4', 'ashley', JASON, "Got it! I'll start pulling properties in Brentwood. 25% referral fee work for you?", '2026-03-13T09:45:00Z'),
      msg('m-ash-5', JASON, 'ashley', "Works for me. Sending the agreement now.", '2026-03-13T09:52:00Z'),
      msg('m-ash-6', 'ashley', JASON, "Agreement signed \u2713 I'll reach out to the Martinez family today.", '2026-03-13T10:15:00Z', false),
    ],
  },
  {
    agentId: 'carlos',
    agentName: 'Carlos Vega',
    brokerage: 'RE/MAX — Dallas',
    color: '#f43f5e',
    messages: [
      msg('m-car-1', 'carlos', JASON, "Jason! I just closed on the Henderson deal — your referral was solid. Commission check should be processing this week.", '2026-03-11T14:30:00Z'),
      msg('m-car-2', JASON, 'carlos', "That's great to hear, Carlos! The Hendersons mentioned they loved working with you. Quick close too.", '2026-03-11T15:02:00Z'),
      msg('m-car-3', 'carlos', JASON, "They were a dream to work with. New construction in Frisco — basically sold itself. Your referral fee will be $8,750.", '2026-03-11T15:18:00Z'),
      msg('m-car-4', JASON, 'carlos', "Appreciate the update. I actually have another family looking at DFW, corporate relo from Chicago. Want me to send them your way?", '2026-03-11T15:45:00Z'),
      msg('m-car-5', 'carlos', JASON, "Budget is around $850k, looking at Southlake or Colleyville area.", '2026-03-11T15:46:00Z'),
      msg('m-car-6', 'carlos', JASON, "Send them over! I just listed two properties in Southlake that would be perfect. I can do a virtual tour before they fly in.", '2026-03-12T08:10:00Z'),
      msg('m-car-7', JASON, 'carlos', "Done. I'll make the intro today. Same 25% terms?", '2026-03-12T08:35:00Z'),
      msg('m-car-8', 'carlos', JASON, "Same terms. Looking forward to it \ud83d\udc4a", '2026-03-12T08:41:00Z', false),
    ],
  },
  {
    agentId: 'megan',
    agentName: 'Megan Torres',
    brokerage: 'Keller Williams Realty GR',
    color: '#22c55e',
    messages: [
      msg('m-meg-1', JASON, 'megan', "Hey Megan, wanted to reach out about potential collaboration. I have a lot of buyers who want Grand Rapids but my coverage is more Allegan County. Could be a win-win.", '2026-03-09T11:00:00Z'),
      msg('m-meg-2', 'megan', JASON, "Jason! I was actually thinking the same thing. I get referral requests for the Plainwell/Otsego area pretty regularly and have no one to send them to.", '2026-03-09T11:34:00Z'),
      msg('m-meg-3', JASON, 'megan', "That's exactly what I was hoping. Want to formalize a partnership? We can set up a mutual referral agreement.", '2026-03-09T12:05:00Z'),
      msg('m-meg-4', 'megan', JASON, "Let's do it. I'm free Thursday for a quick call to hash out the details. 2pm work?", '2026-03-09T12:22:00Z'),
      msg('m-meg-5', JASON, 'megan', "2pm Thursday works great. Talk then!", '2026-03-09T12:30:00Z'),
    ],
  },
  {
    agentId: 'darius',
    agentName: 'Darius King',
    brokerage: 'Real Broker LLC — Arizona',
    color: '#d97706',
    messages: [
      msg('m-dar-1', 'darius', JASON, "Hey Jason, I saw your profile on AgentReferrals. I'm with Real Broker out in Phoenix. We should connect — I get Michigan relocation requests from snowbirds all the time.", '2026-03-07T16:45:00Z'),
      msg('m-dar-2', JASON, 'darius', "Darius! I've seen your numbers — 86 deals last year is impressive. I'd love to be your Michigan connection.", '2026-03-07T17:10:00Z'),
      msg('m-dar-3', 'darius', JASON, "Likewise. I actually have a retired couple right now looking at lakefront property in your area. They're selling their Scottsdale home and want something on one of the lakes near Kalamazoo.", '2026-03-07T17:25:00Z'),
      msg('m-dar-4', JASON, 'darius', "Perfect timing — I just got a new listing on Gun Lake. 3 bed, 2 bath, 180 feet of lake frontage. $425k. Want me to send the details?", '2026-03-07T17:42:00Z'),
      msg('m-dar-5', 'darius', JASON, "That could be exactly what they're looking for. Send it over and I'll forward to the Nelsons.", '2026-03-08T09:00:00Z'),
      msg('m-dar-6', JASON, 'darius', "Just emailed you the listing sheet and virtual tour link. Let me know if they want to schedule a showing — I can do a FaceTime walkthrough too.", '2026-03-08T09:30:00Z'),
    ],
  },
  {
    agentId: 'marcus',
    agentName: 'Marcus Reid',
    brokerage: 'Compass Chicago',
    color: '#818cf8',
    messages: [
      msg('m-mar-1', JASON, 'marcus', "Marcus, quick question — do you handle the western suburbs or just the city proper?", '2026-03-05T10:00:00Z'),
      msg('m-mar-2', 'marcus', JASON, "I cover everything from the Loop to Naperville. Western suburbs are actually where most of my volume comes from. What do you have?", '2026-03-05T10:18:00Z'),
      msg('m-mar-3', JASON, 'marcus', "Client relocating from Kalamazoo to Hinsdale for work. Looking at $900k+, 4 bedrooms minimum, and they need to be in District 181 schools.", '2026-03-05T10:40:00Z'),
      msg('m-mar-4', 'marcus', JASON, "Hinsdale is my bread and butter. District 181 is excellent. I have three off-market listings that could work. When are they looking to move?", '2026-03-05T10:55:00Z'),
      msg('m-mar-5', JASON, 'marcus', "They need to be settled by August for school. So they'd like to close by end of June.", '2026-03-05T11:10:00Z'),
      msg('m-mar-6', 'marcus', JASON, "Very doable. Let me put together a packet and I'll send you something to forward to them by end of day.", '2026-03-05T11:20:00Z'),
      msg('m-mar-7', JASON, 'marcus', "Sounds great. I'll send the referral agreement. 25% standard?", '2026-03-05T11:25:00Z'),
      msg('m-mar-8', 'marcus', JASON, "25% works. I'll have the packet ready in a few hours.", '2026-03-05T11:32:00Z'),
    ],
  },
]

// Helper: get total unread count
export function getUnreadCount(): number {
  return conversations.reduce((total, conv) => {
    return total + conv.messages.filter((m) => !m.read && m.toUserId === 'jason').length
  }, 0)
}

// Helper: get last message for a conversation
export function getLastMessage(conv: Conversation): Message {
  return conv.messages[conv.messages.length - 1]
}

// Helper: format time ago from ISO string
export function formatTimeAgo(isoString: string): string {
  const now = new Date('2026-03-14T12:00:00Z') // fixed "now" for mock data
  const date = new Date(isoString)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Helper: format message timestamp
export function formatMessageTime(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

// Helper: format date divider
export function formatDateDivider(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date('2026-03-14T12:00:00Z')
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000)

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}
