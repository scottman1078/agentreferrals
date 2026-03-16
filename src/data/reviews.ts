export interface AgentReview {
  id: string
  reviewerName: string
  reviewerBrokerage: string
  reviewerArea: string
  reviewerColor: string
  agentId: string // the agent being reviewed
  rating: number // 1-5
  communicationRating: number
  professionalismRating: number
  clientCareRating: number
  comment: string
  referralMarket: string
  date: string
}

export const reviews: AgentReview[] = [
  // Ashley Monroe reviews (Nashville)
  { id: 'rev1', reviewerName: "Jason O'Brien", reviewerBrokerage: 'Real Broker LLC', reviewerArea: 'Plainwell, MI', reviewerColor: '#f0a500', agentId: 'ashley', rating: 5, communicationRating: 5, professionalismRating: 5, clientCareRating: 5, comment: 'Ashley was incredible with the Martinez family relocation. She had them in showings within 24 hours and under contract in 2 weeks. My clients raved about her.', referralMarket: 'Nashville, TN', date: 'Mar 2, 2025' },
  { id: 'rev2', reviewerName: 'Tomás Reyes', reviewerBrokerage: 'Real Broker LLC', reviewerArea: 'San Antonio, TX', reviewerColor: '#10b981', agentId: 'ashley', rating: 5, communicationRating: 5, professionalismRating: 5, clientCareRating: 4, comment: 'Smooth transaction from start to finish. Ashley kept me in the loop every step of the way. Andrea Flores closed in Brentwood — exactly what she wanted.', referralMarket: 'Nashville, TN', date: 'Feb 28, 2025' },
  { id: 'rev3', reviewerName: 'Omar Hassan', reviewerBrokerage: 'eXp Realty', reviewerArea: 'Minneapolis, MN', reviewerColor: '#38bdf8', agentId: 'ashley', rating: 4, communicationRating: 4, professionalismRating: 5, clientCareRating: 5, comment: 'Great agent to partner with. Very responsive and knowledgeable about the Nashville market. Would refer again.', referralMarket: 'Nashville, TN', date: 'Jan 15, 2025' },

  // Carlos Vega reviews (Dallas)
  { id: 'rev4', reviewerName: 'Marcus Reid', reviewerBrokerage: 'Compass Chicago', reviewerArea: 'Chicago, IL', reviewerColor: '#818cf8', agentId: 'carlos', rating: 5, communicationRating: 5, professionalismRating: 5, clientCareRating: 5, comment: 'Carlos is a machine. The Castillo family was blown away by his knowledge of Highland Park. Closed at $940k — smooth as butter.', referralMarket: 'Dallas, TX', date: 'Mar 8, 2025' },
  { id: 'rev5', reviewerName: 'Brendan Walsh', reviewerBrokerage: "Sotheby's Boston", reviewerArea: 'Boston, MA', reviewerColor: '#7c3aed', agentId: 'carlos', rating: 5, communicationRating: 4, professionalismRating: 5, clientCareRating: 5, comment: 'Top-tier luxury agent. He understood exactly what my clients needed and delivered. Will use Carlos for every Dallas referral.', referralMarket: 'Dallas, TX', date: 'Feb 10, 2025' },

  // Darius King reviews (Phoenix)
  { id: 'rev6', reviewerName: "Jason O'Brien", reviewerBrokerage: 'Real Broker LLC', reviewerArea: 'Plainwell, MI', reviewerColor: '#f0a500', agentId: 'darius', rating: 5, communicationRating: 5, professionalismRating: 5, clientCareRating: 5, comment: 'Darius found the Watts family their dream home in McCormick Ranch. His new construction expertise was invaluable. Highly recommend.', referralMarket: 'Scottsdale, AZ', date: 'Feb 22, 2025' },
  { id: 'rev7', reviewerName: 'Lily Park', reviewerBrokerage: 'Real Broker LLC', reviewerArea: 'Denver, CO', reviewerColor: '#059669', agentId: 'darius', rating: 4, communicationRating: 5, professionalismRating: 4, clientCareRating: 5, comment: 'Great communicator. Kept my clients informed throughout. The only note is he could be a bit faster on paperwork, but overall excellent.', referralMarket: 'Phoenix, AZ', date: 'Jan 30, 2025' },

  // Rachel Kim reviews (LA)
  { id: 'rev8', reviewerName: 'Sofia Chen', reviewerBrokerage: 'RE/MAX Seattle', reviewerArea: 'Seattle, WA', reviewerColor: '#14b8a6', agentId: 'rachel', rating: 5, communicationRating: 5, professionalismRating: 5, clientCareRating: 5, comment: 'Rachel is the gold standard for luxury real estate. My tech exec client said she was "the best agent they ever worked with." Closed $2.1M in Beverly Hills.', referralMarket: 'Los Angeles, CA', date: 'Mar 5, 2025' },
  { id: 'rev9', reviewerName: 'Elena Vasquez', reviewerBrokerage: 'Compass Miami', reviewerArea: 'Miami, FL', reviewerColor: '#16a34a', agentId: 'rachel', rating: 5, communicationRating: 5, professionalismRating: 5, clientCareRating: 5, comment: 'Exceptional. My client was very particular and Rachel nailed it. Her market knowledge is unmatched.', referralMarket: 'Los Angeles, CA', date: 'Feb 18, 2025' },

  // Tanya Hill reviews (Atlanta)
  { id: 'rev10', reviewerName: 'Michelle Foster', reviewerBrokerage: 'Compass Charlotte', reviewerArea: 'Charlotte, NC', reviewerColor: '#e879f9', agentId: 'tanya', rating: 5, communicationRating: 5, professionalismRating: 5, clientCareRating: 5, comment: 'Tanya is phenomenal. She treated my referral clients like her own. Buckhead luxury at its finest. Already sent her another family.', referralMarket: 'Atlanta, GA', date: 'Mar 1, 2025' },
  { id: 'rev11', reviewerName: 'James Whitfield', reviewerBrokerage: 'eXp Realty Orlando', reviewerArea: 'Orlando, FL', reviewerColor: '#06b6d4', agentId: 'tanya', rating: 4, communicationRating: 4, professionalismRating: 5, clientCareRating: 4, comment: 'Solid agent. Very professional, knows Atlanta inside out. Communication was good — could be slightly more proactive on updates but overall great.', referralMarket: 'Atlanta, GA', date: 'Feb 5, 2025' },

  // Megan Torres reviews (Grand Rapids)
  { id: 'rev12', reviewerName: "Jason O'Brien", reviewerBrokerage: 'Real Broker LLC', reviewerArea: 'Plainwell, MI', reviewerColor: '#f0a500', agentId: 'megan', rating: 5, communicationRating: 5, professionalismRating: 5, clientCareRating: 5, comment: 'Megan is my go-to for Grand Rapids luxury. Sarah Kowalski loved working with her. The referral back to me was seamless.', referralMarket: 'Grand Rapids, MI', date: 'Feb 15, 2025' },
  { id: 'rev13', reviewerName: 'Derek Chung', reviewerBrokerage: 'Real Broker LLC', reviewerArea: 'Holland, MI', reviewerColor: '#14b8a6', agentId: 'megan', rating: 5, communicationRating: 5, professionalismRating: 5, clientCareRating: 4, comment: 'Always a pleasure working with Megan. She has the luxury market locked down in Kent County.', referralMarket: 'Grand Rapids, MI', date: 'Jan 20, 2025' },

  // Victoria Blake reviews (Aspen)
  { id: 'rev14', reviewerName: 'Lily Park', reviewerBrokerage: 'Real Broker LLC', reviewerArea: 'Denver, CO', reviewerColor: '#059669', agentId: 'victoria', rating: 5, communicationRating: 5, professionalismRating: 5, clientCareRating: 5, comment: 'Victoria is the queen of Aspen real estate. She sold my client a $6.5M property and made it feel effortless. Her network is insane.', referralMarket: 'Aspen, CO', date: 'Mar 10, 2025' },

  // Marcus Reid reviews (Chicago)
  { id: 'rev15', reviewerName: 'Priya Nair', reviewerBrokerage: 'eXp Realty', reviewerArea: 'Kalamazoo, MI', reviewerColor: '#a855f7', agentId: 'marcus', rating: 5, communicationRating: 5, professionalismRating: 5, clientCareRating: 5, comment: 'Marcus treated my referral clients like VIPs. Lincoln Park condo — closed in 18 days. Incredible agent.', referralMarket: 'Chicago, IL', date: 'Feb 20, 2025' },

  // Derek Chung reviews (Holland)
  { id: 'rev16', reviewerName: "Jason O'Brien", reviewerBrokerage: 'Real Broker LLC', reviewerArea: 'Plainwell, MI', reviewerColor: '#f0a500', agentId: 'derek', rating: 5, communicationRating: 5, professionalismRating: 5, clientCareRating: 5, comment: 'Derek nailed the Hoffman referral. New construction in Holland — exactly what they wanted. His builder relationships are unmatched.', referralMarket: 'Holland, MI', date: 'Mar 5, 2025' },

  // Lily Park reviews (Denver)
  { id: 'rev17', reviewerName: "Jason O'Brien", reviewerBrokerage: 'Real Broker LLC', reviewerArea: 'Plainwell, MI', reviewerColor: '#f0a500', agentId: 'lily', rating: 4, communicationRating: 4, professionalismRating: 5, clientCareRating: 5, comment: 'Lily did great with Patricia Nguyen. Cherry Creek was perfect. She really understood the lifestyle my client was after.', referralMarket: 'Denver, CO', date: 'Mar 3, 2025' },

  // Priya Nair reviews (Kalamazoo)
  { id: 'rev18', reviewerName: "Jason O'Brien", reviewerBrokerage: 'Real Broker LLC', reviewerArea: 'Plainwell, MI', reviewerColor: '#f0a500', agentId: 'priya', rating: 4, communicationRating: 4, professionalismRating: 4, clientCareRating: 5, comment: 'Priya is wonderful with first-time buyers. Patient, thorough, and really cares about her clients. The Chen-Williams couple loved her.', referralMarket: 'Kalamazoo, MI', date: 'Feb 25, 2025' },

  // Canadian agent reviews
  { id: 'rev19', reviewerName: "Jason O'Brien", reviewerBrokerage: 'Real Broker LLC', reviewerArea: 'Plainwell, MI', reviewerColor: '#f0a500', agentId: 'sarah_t', rating: 5, communicationRating: 5, professionalismRating: 5, clientCareRating: 5, comment: 'Sarah handled our client\'s Toronto relocation perfectly. The GTA market is complex and she navigated it like a pro. Cross-border paperwork was seamless.', referralMarket: 'Toronto, ON', date: 'Mar 8, 2025' },
  { id: 'rev20', reviewerName: 'David Wong', reviewerBrokerage: 'Sutton Group', reviewerArea: 'Vancouver, BC', reviewerColor: '#003366', agentId: 'sarah_t', rating: 5, communicationRating: 5, professionalismRating: 5, clientCareRating: 4, comment: 'Sarah is the top Royal LePage agent in the GTA for a reason. My Vancouver clients relocating to Toronto were in great hands. Closed a $1.2M condo in Yorkville.', referralMarket: 'Toronto, ON', date: 'Feb 20, 2025' },
  { id: 'rev21', reviewerName: "Jason O'Brien", reviewerBrokerage: 'Real Broker LLC', reviewerArea: 'Plainwell, MI', reviewerColor: '#f0a500', agentId: 'david_w', rating: 5, communicationRating: 5, professionalismRating: 5, clientCareRating: 5, comment: 'David was phenomenal with a cross-border relocation. My Michigan clients moved to Vancouver and David made the transition seamless. His knowledge of the Lower Mainland is outstanding.', referralMarket: 'Vancouver, BC', date: 'Mar 1, 2025' },
  { id: 'rev22', reviewerName: 'Sofia Chen', reviewerBrokerage: 'RE/MAX Seattle', reviewerArea: 'Seattle, WA', reviewerColor: '#14b8a6', agentId: 'david_w', rating: 4, communicationRating: 4, professionalismRating: 5, clientCareRating: 5, comment: 'Great partner for west coast cross-border referrals. David understands both the Canadian and US buyer mindset. My Seattle tech clients loved their new place in Kitsilano.', referralMarket: 'Vancouver, BC', date: 'Feb 12, 2025' },
]

// Helper to get reviews for an agent
export function getAgentReviews(agentId: string): AgentReview[] {
  return reviews.filter((r) => r.agentId === agentId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

// Helper to get aggregate stats for an agent
export function getAgentReviewStats(agentId: string) {
  const agentReviews = getAgentReviews(agentId)
  if (agentReviews.length === 0) return null

  const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length
  return {
    count: agentReviews.length,
    avgRating: Math.round(avg(agentReviews.map((r) => r.rating)) * 10) / 10,
    avgCommunication: Math.round(avg(agentReviews.map((r) => r.communicationRating)) * 10) / 10,
    avgProfessionalism: Math.round(avg(agentReviews.map((r) => r.professionalismRating)) * 10) / 10,
    avgClientCare: Math.round(avg(agentReviews.map((r) => r.clientCareRating)) * 10) / 10,
    reviews: agentReviews,
  }
}
