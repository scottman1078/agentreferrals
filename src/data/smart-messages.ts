export interface SmartMessageTemplate {
  id: string
  category: 'check_in' | 'congratulations' | 'referral_ask' | 'thank_you' | 'market_update' | 'seasonal'
  label: string
  template: string
  emoji: string
}

export const smartMessageTemplates: SmartMessageTemplate[] = [
  {
    id: 'sm-1',
    category: 'check_in',
    label: 'Quick check-in',
    template: "Hey {partnerName}, just checking in! Have any clients looking in {yourMarket}? I'd love to help.",
    emoji: '👋',
  },
  {
    id: 'sm-2',
    category: 'check_in',
    label: 'Market catch-up',
    template: "Haven't connected in a while — how's the {partnerMarket} market treating you?",
    emoji: '💬',
  },
  {
    id: 'sm-3',
    category: 'congratulations',
    label: 'Closing congrats',
    template: "Congrats on the closing, {partnerName}! Great working together. Let's do it again soon.",
    emoji: '🎉',
  },
  {
    id: 'sm-4',
    category: 'congratulations',
    label: 'Deal shoutout',
    template: 'I heard about your recent deal — amazing work!',
    emoji: '🏆',
  },
  {
    id: 'sm-5',
    category: 'referral_ask',
    label: 'Relocation referral',
    template: 'I have a client relocating to {partnerMarket}. Are you taking referrals right now?',
    emoji: '🏠',
  },
  {
    id: 'sm-6',
    category: 'referral_ask',
    label: 'Buyer referral capacity',
    template: 'Quick question — do you have capacity for a new buyer referral in {partnerMarket}?',
    emoji: '🤝',
  },
  {
    id: 'sm-7',
    category: 'thank_you',
    label: 'Partner appreciation',
    template: "Just wanted to say thanks for being such a great referral partner. My clients always love working with you.",
    emoji: '🙏',
  },
  {
    id: 'sm-8',
    category: 'market_update',
    label: 'Market stats share',
    template: "Interesting stats from {yourMarket} this month — happy to share if helpful for your clients considering the area.",
    emoji: '📊',
  },
  {
    id: 'sm-9',
    category: 'seasonal',
    label: 'New year greeting',
    template: "Happy New Year, {partnerName}! Looking forward to another great year of referrals together.",
    emoji: '🎊',
  },
  {
    id: 'sm-10',
    category: 'seasonal',
    label: 'Q1 check-in',
    template: "End of Q1 check-in — any market trends you're seeing in {partnerMarket}?",
    emoji: '📅',
  },
]

// Category labels for display
export const categoryLabels: Record<SmartMessageTemplate['category'], string> = {
  check_in: 'Check-in',
  congratulations: 'Congratulations',
  referral_ask: 'Referral Ask',
  thank_you: 'Thank You',
  market_update: 'Market Update',
  seasonal: 'Seasonal',
}

// Fill in template placeholders
export function fillTemplate(
  template: string,
  vars: {
    partnerName?: string
    partnerMarket?: string
    yourName?: string
    yourMarket?: string
  }
): string {
  let result = template
  if (vars.partnerName) result = result.replace(/{partnerName}/g, vars.partnerName)
  if (vars.partnerMarket) result = result.replace(/{partnerMarket}/g, vars.partnerMarket)
  if (vars.yourName) result = result.replace(/{yourName}/g, vars.yourName)
  if (vars.yourMarket) result = result.replace(/{yourMarket}/g, vars.yourMarket)
  return result
}

// Get templates by category
export function getTemplatesByCategory(category: SmartMessageTemplate['category']): SmartMessageTemplate[] {
  return smartMessageTemplates.filter((t) => t.category === category)
}
