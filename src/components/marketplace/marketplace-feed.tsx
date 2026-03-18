'use client'

import { useState } from 'react'
import { getOpenPosts, getDeadlineUrgency, isEarlyAccess, getEarlyAccessCountdown, timeAgo } from '@/data/referral-posts'
import type { ReferralPost } from '@/data/referral-posts'
import { useMarketplace } from '@/lib/marketplace-provider'
import { getInitials } from '@/lib/utils'
import { maskName } from '@/lib/agent-display-name'
import {
  Megaphone,
  MapPin,
  DollarSign,
  Clock,
  Eye,
  MessageSquare,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  Flame,
  Handshake,
  Timer,
  Star,
} from 'lucide-react'
import Link from 'next/link'

export default function MarketplaceFeed() {
  const [isOpen, setIsOpen] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)
  const { openPosts } = useMarketplace()

  // Posts in the user's market area
  const myAreaPosts = openPosts.filter(
    (p) =>
      p.market.toLowerCase().includes('michigan') ||
      p.market.toLowerCase().includes('grand rapids') ||
      p.market.toLowerCase().includes('plainwell') ||
      p.market.toLowerCase().includes('west michigan')
  )

  const displayPosts = isExpanded ? openPosts : openPosts.slice(0, 3)

  if (!isOpen) {
    // Collapsed state — just a small pill button
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed left-4 z-[400] flex items-center gap-2 px-3 py-2 rounded-xl bg-card/95 backdrop-blur-xl border border-border shadow-lg hover:shadow-xl transition-all"
        style={{ top: 120 }}
      >
        <Megaphone className="w-4 h-4 text-primary" />
        <span className="text-xs font-bold">{openPosts.length}</span>
        {myAreaPosts.length > 0 && (
          <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-500">
            <Flame className="w-3 h-3" />
            {myAreaPosts.length} in your area
          </span>
        )}
      </button>
    )
  }

  return (
    <div className="fixed left-2 right-2 sm:left-4 sm:right-auto sm:w-[320px] z-[400] max-h-[calc(100vh-10rem)] sm:max-h-[calc(100vh-12rem)] flex flex-col rounded-2xl bg-card/95 backdrop-blur-xl border border-border shadow-2xl overflow-hidden" style={{ top: 120 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-primary" />
          <span className="font-bold text-sm">Marketplace</span>
          <span className="text-[10px] font-bold text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
            {openPosts.length} open
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href="/dashboard/marketplace"
            className="text-[10px] font-semibold text-primary hover:underline mr-1"
          >
            View All
          </Link>
          <button
            onClick={() => setIsOpen(false)}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* My area callout */}
      {myAreaPosts.length > 0 && (
        <div className="px-4 py-2 bg-amber-500/5 border-b border-amber-500/10">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
            <Flame className="w-3.5 h-3.5" />
            {myAreaPosts.length} opportunit{myAreaPosts.length !== 1 ? 'ies' : 'y'} in your market
          </div>
        </div>
      )}

      {/* Post list */}
      <div className="flex-1 overflow-y-auto">
        {displayPosts.map((post) => (
          <FeedPostCard key={post.id} post={post} isMyArea={myAreaPosts.some((p) => p.id === post.id)} />
        ))}

        {openPosts.length > 3 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors flex items-center justify-center gap-1 border-t border-border"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3 h-3" /> Show Less
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" /> {openPosts.length - 3} More Opportunities
              </>
            )}
          </button>
        )}
      </div>

      {/* Post CTA */}
      <div className="px-3 py-2.5 border-t border-border shrink-0">
        <Link
          href="/dashboard/marketplace"
          className="w-full flex items-center justify-center gap-2 h-9 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity"
        >
          <Megaphone className="w-3.5 h-3.5" />
          Post a Referral Opportunity
        </Link>
      </div>
    </div>
  )
}

function FeedPostCard({ post, isMyArea }: { post: ReferralPost; isMyArea: boolean }) {
  return (
    <Link
      href="/dashboard/marketplace"
      className={`block px-4 py-3 border-b border-border hover:bg-accent/30 transition-colors ${
        isMyArea ? 'bg-amber-500/[0.03]' : ''
      }`}
    >
      <div className="flex items-start gap-2.5">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
          style={{ background: post.postingAgentColor }}
        >
          {getInitials(post.postingAgentName)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-xs font-semibold truncate">{maskName(post.postingAgentName)}</span>
            {isMyArea && (
              <span className="shrink-0 px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                YOUR AREA
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 text-[11px] font-semibold text-foreground mb-1">
            <MapPin className="w-3 h-3 text-primary shrink-0" />
            <span className="truncate">
              {post.market}
              {post.neighborhood && ` — ${post.neighborhood}`}
            </span>
          </div>

          <div className="flex items-center gap-1 mb-1">
            <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">{post.budgetRange}</span>
          </div>

          {/* Deadline + early access badges */}
          <div className="flex flex-wrap items-center gap-1 mb-1">
            {post.decisionDeadline && (() => {
              const urgency = getDeadlineUrgency(post.decisionDeadline)
              return (
                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold ${urgency.color}`}>
                  <Timer className={`w-2.5 h-2.5 ${urgency.isUrgent ? 'animate-pulse' : ''}`} />
                  {urgency.label}
                </span>
              )
            })()}
            {isEarlyAccess(post) && (() => {
              const countdown = getEarlyAccessCountdown(post)
              return countdown ? (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-violet-500/10 text-violet-500">
                  <Star className="w-2.5 h-2.5" />
                  Early Access — {countdown}
                </span>
              ) : null
            })()}
          </div>

          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <Handshake className="w-2.5 h-2.5" />
              {post.feePercent}% fee
            </span>
            <span className="flex items-center gap-0.5">
              <MessageSquare className="w-2.5 h-2.5" />
              {post.bidsCount} bids
            </span>
            <span>{timeAgo(post.postedAt)}</span>
          </div>

          {/* Client needs — show top 2 */}
          <div className="flex gap-1 mt-1.5">
            {post.clientNeeds.slice(0, 2).map((need) => (
              <span
                key={need}
                className="px-1.5 py-0.5 rounded text-[8px] font-semibold bg-primary/8 text-primary border border-primary/10"
              >
                {need}
              </span>
            ))}
            {post.clientNeeds.length > 2 && (
              <span className="text-[8px] text-muted-foreground self-center">
                +{post.clientNeeds.length - 2}
              </span>
            )}
          </div>
        </div>

        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-1" />
      </div>
    </Link>
  )
}
