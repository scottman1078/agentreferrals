'use client'

import { useState } from 'react'
import {
  X,
  Eye,
  BadgeCheck,
  ShieldCheck,
  Clock,
  Home,
  Calendar,
  DollarSign,
  Handshake,
  Users,
  MapPin,
  Building2,
  Lock,
  Phone,
  Mail,
  Video,
  Send,
  MessageCircle,
} from 'lucide-react'
import { TAG_COLORS } from '@/lib/constants'
import { formatCurrency, getInitials } from '@/lib/utils'
import type { ArProfile } from '@/contexts/auth-context'

type ViewMode = 'non-partner' | 'partner'

interface ProfilePreviewModalProps {
  profile: ArProfile
  open: boolean
  onClose: () => void
}

export function ProfilePreviewModal({ profile, open, onClose }: ProfilePreviewModalProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('non-partner')

  if (!open) return null

  const name = profile.full_name || 'Agent'
  const brokerage = profile.brokerage?.name || 'Independent'
  const area = profile.primary_area || 'Unknown'
  const color = profile.brokerage?.color || profile.color || '#6366f1'
  const isElite = (profile.refernet_score ?? 0) >= 90
  const tags = profile.tags || []
  const bio = profile.bio || null
  const videoIntroUrl = profile.video_intro_url || null
  const responseTime = profile.response_time_minutes
    ? `< ${Math.ceil(profile.response_time_minutes / 60)}hr`
    : null

  // Mask the name for non-partners: show first name + last initial
  const maskedName = (() => {
    const parts = name.split(' ')
    if (parts.length < 2) return name
    return `${parts[0]} ${parts[parts.length - 1][0]}.`
  })()

  const displayName = viewMode === 'partner' ? name : maskedName

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4 my-8 bg-background rounded-2xl border border-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3.5 border-b border-border bg-background/95 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" />
            <span className="font-bold text-sm">Profile Preview</span>
          </div>
          <div className="flex items-center gap-3">
            {/* View mode toggle */}
            <div className="flex items-center rounded-lg border border-border overflow-hidden text-xs font-semibold">
              <button
                onClick={() => setViewMode('non-partner')}
                className={`px-3 py-1.5 transition-colors ${
                  viewMode === 'non-partner'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-muted-foreground hover:text-foreground'
                }`}
              >
                Non-Partner View
              </button>
              <button
                onClick={() => setViewMode('partner')}
                className={`px-3 py-1.5 transition-colors ${
                  viewMode === 'partner'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-muted-foreground hover:text-foreground'
                }`}
              >
                Partner View
              </button>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-accent transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Info banner */}
        <div className="px-5 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-700 dark:text-amber-400">
          {viewMode === 'non-partner'
            ? 'This is how your profile appears to agents who are NOT your partners. Your last name and contact info are hidden.'
            : 'This is how your profile appears to your direct partners. They can see your full name and contact info.'}
        </div>

        {/* Profile content */}
        <div className="max-h-[70vh] overflow-y-auto">
          {/* Hero */}
          <section className="relative overflow-hidden">
            <div
              className="absolute inset-0 opacity-[0.07] dark:opacity-[0.12]"
              style={{
                background: `linear-gradient(135deg, ${color} 0%, transparent 60%)`,
              }}
            />
            <div className="relative px-5 pt-5 pb-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                {/* Avatar */}
                <div className="relative">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Profile"
                      className="w-20 h-20 rounded-full object-cover shadow-lg ring-4 ring-background"
                    />
                  ) : (
                    <div
                      className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-extrabold text-white shadow-lg ring-4 ring-background"
                      style={{ background: color }}
                    >
                      {getInitials(displayName)}
                    </div>
                  )}
                </div>

                <div className="flex-1 text-center sm:text-left">
                  <h2 className="text-2xl font-extrabold tracking-tight mb-1">
                    {displayName}
                  </h2>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-1 text-sm text-muted-foreground mb-3">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" />
                      {brokerage}
                    </span>
                    <span className="hidden sm:inline text-border">|</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {area}
                    </span>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <BadgeCheck className="w-3 h-3" />
                      Active
                    </span>
                    {isElite && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        <ShieldCheck className="w-3 h-3" />
                        Verified Elite
                      </span>
                    )}
                    {responseTime && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-card border border-border text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {responseTime}
                      </span>
                    )}
                    {videoIntroUrl && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                        <Video className="w-3 h-3" />
                        Video Intro
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="px-5 pb-6 space-y-6">
            {/* Quick Stats */}
            <section className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                {
                  icon: Home,
                  label: profile.total_transactions ? 'Total Transactions' : 'Deals / Year',
                  value: (profile.total_transactions || profile.deals_per_year || 0).toString(),
                  colorClass: 'text-blue-500',
                },
                {
                  icon: Calendar,
                  label: 'Years Licensed',
                  value: (profile.years_licensed || 0).toString(),
                  colorClass: 'text-emerald-500',
                },
                {
                  icon: DollarSign,
                  label: 'Avg Sale Price',
                  value: formatCurrency(profile.avg_sale_price || 0),
                  colorClass: 'text-amber-500',
                },
                {
                  icon: Handshake,
                  label: 'Closed Referrals',
                  value: (profile.closed_referrals || 0).toString(),
                  colorClass: 'text-violet-500',
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="p-3 rounded-lg border border-border bg-card text-center"
                >
                  <stat.icon className={`w-4 h-4 ${stat.colorClass} mx-auto mb-1.5`} />
                  <div className="text-base font-extrabold">{stat.value}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{stat.label}</div>
                </div>
              ))}
            </section>

            {/* Specializations */}
            {tags.length > 0 && (
              <section>
                <h3 className="text-sm font-bold mb-2">Specializations</h3>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 rounded-full text-xs font-semibold text-white"
                      style={{ background: TAG_COLORS[tag] || '#6b7280' }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Contact Info */}
            <section className="p-4 rounded-xl border border-border bg-card space-y-2">
              <h3 className="text-sm font-bold">Contact Information</h3>
              {viewMode === 'partner' ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Phone className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Phone</div>
                      <div className="text-sm font-semibold">{profile.phone || 'Not set'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Mail className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Email</div>
                      <div className="text-sm font-semibold">{profile.email}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
                      <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground">Phone</div>
                      <div className="text-sm font-semibold text-muted-foreground/40 blur-[4px] select-none" aria-hidden>
                        (555) 123-4567
                      </div>
                    </div>
                    <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground">Email</div>
                      <div className="text-sm font-semibold text-muted-foreground/40 blur-[4px] select-none" aria-hidden>
                        agent@example.com
                      </div>
                    </div>
                    <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <div className="pt-2 border-t border-border">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Lock className="w-3 h-3" />
                      <span>Connect as a partner to view contact info</span>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Bio */}
            {bio && (
              <section>
                <h3 className="text-sm font-bold mb-2">About</h3>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {bio}
                </p>
              </section>
            )}

            {/* Video Intro */}
            {videoIntroUrl && (
              <section>
                <h3 className="text-sm font-bold mb-2">Video Introduction</h3>
                <div className="rounded-lg overflow-hidden border border-border bg-black">
                  <video
                    src={videoIntroUrl}
                    controls
                    className="w-full max-h-[280px]"
                    preload="metadata"
                  />
                </div>
              </section>
            )}

            {/* Social Links (if set) */}
            {(() => {
              const socials = [
                { key: 'social_instagram', label: 'Instagram' },
                { key: 'social_facebook', label: 'Facebook' },
                { key: 'social_linkedin', label: 'LinkedIn' },
                { key: 'social_tiktok', label: 'TikTok' },
                { key: 'social_youtube', label: 'YouTube' },
                { key: 'social_twitter', label: 'X / Twitter' },
              ].filter((s) => profile[s.key as keyof ArProfile])

              if (socials.length === 0) return null

              return (
                <section>
                  <h3 className="text-sm font-bold mb-2">Social Media</h3>
                  <div className="flex flex-wrap gap-2">
                    {socials.map((s) => (
                      <span
                        key={s.key}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-semibold text-muted-foreground"
                      >
                        {s.label}
                      </span>
                    ))}
                  </div>
                </section>
              )
            })()}

            {/* CTA section */}
            <section className="p-4 rounded-xl border border-border bg-card text-center space-y-3">
              <h3 className="text-base font-bold">
                Interested in partnering with {displayName.split(' ')[0]}?
              </h3>
              <p className="text-xs text-muted-foreground">
                Send a referral, request a partnership, or start a conversation.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground opacity-60 cursor-default">
                  <Send className="w-3.5 h-3.5" />
                  Send Referral
                </span>
                <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border border-border bg-card opacity-60 cursor-default">
                  <Users className="w-3.5 h-3.5" />
                  Request Partnership
                </span>
                <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border border-border bg-card opacity-60 cursor-default">
                  <MessageCircle className="w-3.5 h-3.5" />
                  Message
                </span>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
