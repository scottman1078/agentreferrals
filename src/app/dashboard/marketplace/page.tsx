'use client'

import { useState } from 'react'
import { useDemoGuard } from '@/hooks/use-demo-guard'
import { useAgentDisplayName } from '@/hooks/use-agent-display-name'
import {
  getOpenPosts,
  getPostsByAgent,
  getBidsForPost,
  getBidsByAgent,
  getAwardedBid,
  getDeadlineUrgency,
  isEarlyAccess,
  getEarlyAccessCountdown,
  timeAgo,
} from '@/data/referral-posts'
import type { ReferralPost, ReferralBid } from '@/data/referral-posts'
import { useMarketplace } from '@/lib/marketplace-provider'
import { getInitials, formatCurrency } from '@/lib/utils'
import {
  Megaphone,
  MapPin,
  Clock,
  DollarSign,
  Eye,
  MessageSquare,
  Users,
  Video,
  Play,
  ChevronDown,
  ChevronUp,
  Send,
  Plus,
  Check,
  X,
  Zap,
  Shield,
  Star,
  Trophy,
  Filter,
  Search,
  Upload,
  Handshake,
  Timer,
} from 'lucide-react'
import BackToDashboard from '@/components/layout/back-to-dashboard'

type Tab = 'browse' | 'my-posts' | 'my-bids'

export default function MarketplacePage() {
  const [tab, setTab] = useState<Tab>('browse')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null)
  const getDisplayName = useAgentDisplayName()

  const marketplace = useMarketplace()
  const { openPosts, myPosts, myBids } = marketplace

  const filteredPosts = searchQuery.trim()
    ? openPosts.filter(
        (p) =>
          p.market.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.neighborhood?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : openPosts

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6">
      <BackToDashboard />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <Megaphone className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            Referral Marketplace
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Post referral opportunities or bid on deals in your market.
          </p>
        </div>
        <PostReferralButton />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-secondary/50 mb-6">
        {([
          { key: 'browse' as Tab, label: 'Browse', fullLabel: 'Browse Opportunities', count: openPosts.length },
          { key: 'my-posts' as Tab, label: 'My Posts', fullLabel: 'My Posts', count: myPosts.length },
          { key: 'my-bids' as Tab, label: 'My Bids', fullLabel: 'My Bids', count: myBids.length },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 px-2 sm:px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              tab === t.key
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="sm:hidden">{t.label}</span>
            <span className="hidden sm:inline">{t.fullLabel}</span>
            <span className="ml-1 text-[10px] sm:text-xs opacity-60">({t.count})</span>
          </button>
        ))}
      </div>

      {/* Browse Tab */}
      {tab === 'browse' && (
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by market, neighborhood, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div className="text-xs text-muted-foreground">
            {filteredPosts.length} open opportunit{filteredPosts.length !== 1 ? 'ies' : 'y'}
          </div>

          {filteredPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              isExpanded={expandedPostId === post.id}
              onToggle={() =>
                setExpandedPostId(expandedPostId === post.id ? null : post.id)
              }
              showBidButton
            />
          ))}
        </div>
      )}

      {/* My Posts Tab */}
      {tab === 'my-posts' && (
        <div className="space-y-4">
          {myPosts.length === 0 ? (
            <EmptyState
              icon={Megaphone}
              title="No posts yet"
              description="Post a referral opportunity to find the best agent for your client."
            />
          ) : (
            myPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                isExpanded={expandedPostId === post.id}
                onToggle={() =>
                  setExpandedPostId(expandedPostId === post.id ? null : post.id)
                }
                showBids
              />
            ))
          )}
        </div>
      )}

      {/* My Bids Tab */}
      {tab === 'my-bids' && (
        <div className="space-y-4">
          {myBids.length === 0 ? (
            <EmptyState
              icon={Send}
              title="No bids yet"
              description="Browse open opportunities and pitch for referrals in your market."
            />
          ) : (
            myBids.map((bid) => <MyBidCard key={bid.id} bid={bid} allPosts={[...openPosts, ...myPosts]} />)
          )}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════
// POST CARD
// ══════════════════════════════════════

function PostCard({
  post,
  isExpanded,
  onToggle,
  showBidButton,
  showBids,
}: {
  post: ReferralPost
  isExpanded: boolean
  onToggle: () => void

  showBidButton?: boolean
  showBids?: boolean
}) {
  const getDisplayName = useAgentDisplayName()
  const bids = getBidsForPost(post.id)
  const awardedBid = getAwardedBid(post)
  const isAwarded = post.status === 'awarded'

  return (
    <div
      className={`rounded-xl border bg-card overflow-hidden transition-all ${
        isAwarded ? 'border-emerald-500/30' : 'border-border'
      }`}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full text-left p-4 hover:bg-accent/30 transition-colors"
      >
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ background: post.postingAgentColor }}
          >
            {getInitials(post.postingAgentName)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm">{getDisplayName({ id: post.postingAgentId, name: post.postingAgentName })}</span>
              <span className="text-xs text-muted-foreground">{post.postingAgentBrokerage}</span>
              {isAwarded && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500">
                  <Trophy className="w-3 h-3" />
                  Awarded
                </span>
              )}
              {!isAwarded && isEarlyAccess(post) && (() => {
                const countdown = getEarlyAccessCountdown(post)
                return countdown ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/10 text-violet-500 animate-pulse">
                    <Star className="w-3 h-3" />
                    Early Access — {countdown}
                  </span>
                ) : null
              })()}
            </div>

            {/* Market + details */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mb-2">
              <span className="flex items-center gap-1 font-semibold text-foreground">
                <MapPin className="w-3 h-3 text-primary" />
                {post.market}
                {post.neighborhood && ` — ${post.neighborhood}`}
              </span>
              <span className="flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                {post.budgetRange}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {post.timeline}
              </span>
              <span className="flex items-center gap-1">
                <Handshake className="w-3 h-3" />
                {post.feePercent}% fee
              </span>
            </div>

            {/* Client needs pills */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {post.clientNeeds.slice(0, 4).map((need) => (
                <span
                  key={need}
                  className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/8 text-primary border border-primary/15"
                >
                  {need}
                </span>
              ))}
              {post.clientNeeds.length > 4 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-muted-foreground">
                  +{post.clientNeeds.length - 4} more
                </span>
              )}
            </div>

            {/* Decision deadline */}
            {post.status === 'open' && post.decisionDeadline && (() => {
              const urgency = getDeadlineUrgency(post.decisionDeadline)
              return (
                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${urgency.color} mb-1.5`}>
                  <Timer className={`w-3 h-3 ${urgency.isUrgent ? 'animate-pulse' : ''}`} />
                  {urgency.label}
                </div>
              )
            })()}

            {/* Stats row */}
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {post.viewCount} views
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                {post.bidsCount} bids
              </span>
              <span>{timeAgo(post.postedAt)}</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  post.representation === 'Buyer'
                    ? 'bg-blue-500/10 text-blue-500'
                    : post.representation === 'Seller'
                      ? 'bg-amber-500/10 text-amber-500'
                      : 'bg-violet-500/10 text-violet-500'
                }`}
              >
                {post.representation}
              </span>
            </div>
          </div>

          <div className="shrink-0">
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-border">
          {/* Description */}
          <div className="px-4 py-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {post.description}
            </p>
          </div>

          {/* Bid button */}
          {showBidButton && post.status === 'open' && (
            <div className="px-4 pb-4">
              {post.decisionDeadline && new Date(post.decisionDeadline).getTime() < Date.now() ? (
                <div className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-muted text-muted-foreground text-sm font-bold cursor-not-allowed">
                  <Clock className="w-4 h-4" />
                  Deadline Passed — Pitching Closed
                </div>
              ) : (
                <BidForm postId={post.id} market={post.market} postingAgentName={getDisplayName({ id: post.postingAgentId, name: post.postingAgentName })} />
              )}
            </div>
          )}

          {/* Show bids (for poster) */}
          {showBids && bids.length > 0 && (
            <div className="px-4 pb-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Bids ({bids.length})
              </h4>
              {bids.map((bid) => (
                <BidCard key={bid.id} bid={bid} isAwarded={bid.id === post.awardedBidId} />
              ))}
            </div>
          )}

          {/* Awarded bid display */}
          {isAwarded && awardedBid && !showBids && (
            <div className="px-4 pb-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-500 mb-2 flex items-center gap-1">
                <Trophy className="w-3 h-3" />
                Awarded to
              </h4>
              <BidCard bid={awardedBid} isAwarded />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════
// BID CARD
// ══════════════════════════════════════

function BidCard({ bid, isAwarded }: { bid: ReferralBid; isAwarded?: boolean }) {
  const getDisplayName = useAgentDisplayName()
  const [showVideo, setShowVideo] = useState(false)

  return (
    <div
      className={`rounded-xl border p-4 ${
        isAwarded
          ? 'border-emerald-500/30 bg-emerald-500/[0.03]'
          : 'border-border bg-background'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
          style={{ background: bid.agentColor }}
        >
          {getInitials(bid.agentName)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm">{getDisplayName({ id: bid.agentId, name: bid.agentName })}</span>
            {isAwarded && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500">
                <Check className="w-3 h-3" />
                Awarded
              </span>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground mb-2">
            {bid.agentBrokerage}
          </div>

          {/* Agent stats */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary">
              <Zap className="w-3 h-3" />
              {bid.agentRCSScore} RCS
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-card border border-border">
              <Handshake className="w-3 h-3" />
              {bid.agentClosedReferrals} closed
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-card border border-border">
              <Clock className="w-3 h-3" />
              {bid.agentResponseTime}
            </span>
          </div>

          {/* Highlights */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {bid.highlights.map((h) => (
              <span
                key={h}
                className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/8 text-amber-600 dark:text-amber-400 border border-amber-500/15"
              >
                {h}
              </span>
            ))}
          </div>

          {/* Pitch text */}
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            &ldquo;{bid.pitch}&rdquo;
          </p>

          {/* Video pitch */}
          {bid.videoUrl && (
            <div>
              {showVideo ? (
                <div className="rounded-xl overflow-hidden border border-border">
                  <div className="aspect-video bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <div
                        className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white mx-auto ring-4 ring-white/10"
                        style={{ background: bid.agentColor }}
                      >
                        {getInitials(bid.agentName)}
                      </div>
                      <p className="text-white/80 text-sm font-semibold">
                        {getDisplayName({ id: bid.agentId, name: bid.agentName })}&apos;s Video Pitch
                      </p>
                      <p className="text-white/40 text-xs">
                        {bid.videoDuration ? `${Math.floor(bid.videoDuration / 60)}:${(bid.videoDuration % 60).toString().padStart(2, '0')}` : ''}
                      </p>
                      <div className="w-32 sm:w-40 h-1 bg-white/20 rounded-full mx-auto overflow-hidden">
                        <div className="h-full bg-primary rounded-full animate-[progress_6s_ease-in-out_infinite]" style={{ width: '25%' }} />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowVideo(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors text-xs font-semibold"
                >
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                    <Play className="w-3 h-3 text-primary ml-0.5" />
                  </div>
                  Watch Video Pitch
                  <span className="text-muted-foreground">
                    ({bid.videoDuration ? `${Math.floor(bid.videoDuration / 60)}:${(bid.videoDuration % 60).toString().padStart(2, '0')}` : ''})
                  </span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Award / View actions */}
        {!isAwarded && bid.status === 'pending' && (
          <div className="shrink-0 flex flex-col gap-1.5">
            <button className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 hover:bg-emerald-500/20 transition-colors" title="Award referral">
              <Check className="w-4 h-4" />
            </button>
            <button className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 hover:bg-red-500/20 transition-colors" title="Decline">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════
// BID FORM (for browsing agents to pitch)
// ══════════════════════════════════════

function BidForm({
  postId,
  market,
  postingAgentName,
}: {
  postId: string
  market: string
  postingAgentName: string
}) {
  const demoGuardBid = useDemoGuard()
  const [isOpen, setIsOpen] = useState(false)
  const [pitch, setPitch] = useState('')
  const [highlights, setHighlights] = useState('')
  const [includeVideo, setIncludeVideo] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  if (submitted) {
    return (
      <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
            <Check className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <p className="text-sm font-semibold">Bid Submitted!</p>
            <p className="text-xs text-muted-foreground">
              {postingAgentName} will review your pitch and respond.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity"
      >
        <Send className="w-4 h-4" />
        Pitch for This Referral
      </button>
    )
  }

  return (
    <div className="p-4 rounded-xl border border-primary/20 bg-primary/[0.02] space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold">Your Pitch — {market}</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Pitch text */}
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
          Why should you get this referral?
        </label>
        <textarea
          rows={4}
          value={pitch}
          onChange={(e) => setPitch(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder={`Tell ${postingAgentName.split(' ')[0]} why you're the best agent for this client in ${market}...`}
        />
      </div>

      {/* Highlights */}
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
          Key qualifications (comma separated)
        </label>
        <input
          value={highlights}
          onChange={(e) => setHighlights(e.target.value)}
          className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder="e.g. 10 yrs in market, 15 closed referrals, luxury specialist"
        />
      </div>

      {/* Video toggle */}
      <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
        <div className="flex items-center gap-2">
          <Video className="w-4 h-4 text-indigo-500" />
          <div>
            <span className="text-xs font-semibold">Include Video Pitch</span>
            <p className="text-[10px] text-muted-foreground">Record a short video explaining why you&apos;re the right fit</p>
          </div>
        </div>
        <button
          onClick={() => setIncludeVideo(!includeVideo)}
          className={`w-10 h-6 rounded-full transition-colors relative ${
            includeVideo ? 'bg-primary' : 'bg-secondary'
          }`}
        >
          <div
            className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${
              includeVideo ? 'left-5' : 'left-1'
            }`}
          />
        </button>
      </div>

      {includeVideo && (
        <div className="p-4 rounded-xl border border-dashed border-indigo-500/30 bg-indigo-500/5 text-center">
          <Upload className="w-6 h-6 text-indigo-500 mx-auto mb-2" />
          <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            Upload or Record Video Pitch
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Max 2 minutes. MP4, MOV, or WebM.
          </p>
          <button className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500 text-white hover:opacity-90 transition-opacity">
            <Video className="w-3 h-3" />
            Record Now
          </button>
        </div>
      )}

      {/* Submit */}
      <button
        onClick={() => {
          if (demoGuardBid()) return
          if (pitch.trim()) setSubmitted(true)
        }}
        disabled={!pitch.trim()}
        className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Send className="w-4 h-4" />
        Submit Pitch
      </button>
    </div>
  )
}

// ══════════════════════════════════════
// MY BID CARD (for bid tab)
// ══════════════════════════════════════

function MyBidCard({ bid, allPosts }: { bid: ReferralBid; allPosts: ReferralPost[] }) {
  const getDisplayName = useAgentDisplayName()
  const post = allPosts.find((p) => p.id === bid.postId)

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            bid.status === 'accepted'
              ? 'bg-emerald-500/10 text-emerald-500'
              : bid.status === 'declined'
                ? 'bg-red-500/10 text-red-500'
                : 'bg-amber-500/10 text-amber-500'
          }`}
        >
          {bid.status === 'accepted' ? 'Awarded' : bid.status === 'declined' ? 'Not Selected' : 'Pending Review'}
        </span>
        <span className="text-xs text-muted-foreground">
          Submitted {timeAgo(bid.submittedAt)}
        </span>
      </div>

      {post && (
        <div className="mb-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            {post.market}
            {post.neighborhood && ` — ${post.neighborhood}`}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Posted by {getDisplayName({ id: post.postingAgentId, name: post.postingAgentName })} · {post.budgetRange} · {post.representation}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground leading-relaxed">
        &ldquo;{bid.pitch.slice(0, 150)}...&rdquo;
      </p>

      {bid.videoUrl && (
        <div className="flex items-center gap-1.5 mt-2 text-xs text-indigo-500 font-semibold">
          <Video className="w-3 h-3" />
          Video pitch included
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════
// POST REFERRAL BUTTON (opens inline form)
// ══════════════════════════════════════

function PostReferralButton() {
  const demoGuard = useDemoGuard()
  const [isOpen, setIsOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({
    market: '',
    neighborhood: '',
    representation: 'Buyer' as 'Buyer' | 'Seller' | 'Both',
    budgetRange: '',
    timeline: '90 days',
    decisionDeadline: '',
    description: '',
    clientNeeds: '',
    feePercent: 25,
  })

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
      >
        <Plus className="w-4 h-4" />
        Post Referral
      </button>
    )
  }

  if (submitted) {
    return (
      <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => { setIsOpen(false); setSubmitted(false) }}>
        <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl p-8 text-center" onClick={(e) => e.stopPropagation()}>
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
            <Check className="w-7 h-7 text-emerald-500" />
          </div>
          <h2 className="font-bold text-lg mb-2">Referral Posted!</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Agents in {form.market || 'your target market'} will be notified and can bid on this opportunity.
          </p>
          <button
            onClick={() => { setIsOpen(false); setSubmitted(false) }}
            className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity"
          >
            Done
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
      <div className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border shrink-0">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-primary" />
            Post Referral Opportunity
          </h2>
          <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center border border-border text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Market *</label>
              <input
                value={form.market}
                onChange={(e) => setForm((p) => ({ ...p, market: e.target.value }))}
                className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="e.g. Nashville, TN"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Neighborhood</label>
              <input
                value={form.neighborhood}
                onChange={(e) => setForm((p) => ({ ...p, neighborhood: e.target.value }))}
                className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="e.g. Brentwood / Franklin"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Representation</label>
            <div className="flex gap-2">
              {(['Buyer', 'Seller', 'Both'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setForm((p) => ({ ...p, representation: type }))}
                  className={`flex-1 h-9 rounded-lg text-xs font-semibold border transition-all ${
                    form.representation === type
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Budget Range</label>
              <input
                value={form.budgetRange}
                onChange={(e) => setForm((p) => ({ ...p, budgetRange: e.target.value }))}
                className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="$400k - $600k"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Timeline</label>
              <input
                value={form.timeline}
                onChange={(e) => setForm((p) => ({ ...p, timeline: e.target.value }))}
                className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="90 days"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Decision Deadline *</label>
              <input
                type="date"
                value={form.decisionDeadline}
                onChange={(e) => setForm((p) => ({ ...p, decisionDeadline: e.target.value }))}
                className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <p className="text-[10px] text-muted-foreground mt-1">When you&apos;ll choose an agent — creates urgency for bidders</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Referral Fee %</label>
              <input
                type="number"
                value={form.feePercent}
                onChange={(e) => setForm((p) => ({ ...p, feePercent: parseInt(e.target.value) || 25 }))}
                className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
              Describe what you need *
            </label>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Tell agents about your client and what kind of agent you're looking for..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
              Client needs (comma separated)
            </label>
            <input
              value={form.clientNeeds}
              onChange={(e) => setForm((p) => ({ ...p, clientNeeds: e.target.value }))}
              className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Pre-approved, Family of 4, Good schools, 4+ bed"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border shrink-0">
          <button
            onClick={() => setIsOpen(false)}
            className="h-10 px-5 rounded-lg border border-border text-sm font-semibold hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (demoGuard()) return
              if (form.market.trim() && form.description.trim()) setSubmitted(true)
            }}
            disabled={!form.market.trim() || !form.description.trim()}
            className="flex items-center gap-2 h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Megaphone className="w-4 h-4" />
            Post Opportunity
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Empty State ──
function EmptyState({ icon: Icon, title, description }: { icon: typeof Megaphone; title: string; description: string }) {
  return (
    <div className="p-8 rounded-xl border border-border bg-card text-center">
      <Icon className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
      <p className="text-sm font-semibold mb-1">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  )
}
