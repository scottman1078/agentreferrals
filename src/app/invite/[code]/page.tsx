'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AppLogo } from '@/components/ui/app-logo'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import {
  Users, Zap, Shield, ArrowRight, Star, MapPin, Building2,
  TrendingUp, CheckCircle2, Loader2, UserCheck, Sparkles,
  BadgeCheck, Award, Handshake, BarChart3, Globe
} from 'lucide-react'

interface InviterData {
  valid: boolean
  inviteId?: string
  inviterName: string
  inviterEmail: string | null
  inviterPhoto: string | null
  inviterBrokerage: string | null
  inviterMarket: string | null
  inviterTags: string[] | null
  inviterRcsScore: number | null
  inviterDealsPerYear: number | null
  inviterYearsLicensed: number | null
  inviteeEmail?: string | null
  inviteeName?: string | null
}

function InviterAvatar({ name, photoUrl }: { name: string; photoUrl: string | null }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  if (photoUrl) {
    return (
      <div className="w-24 h-24 rounded-full border-4 border-primary/20 overflow-hidden shadow-lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
      </div>
    )
  }

  return (
    <div className="w-24 h-24 rounded-full border-4 border-primary/20 bg-primary/10 flex items-center justify-center shadow-lg">
      <span className="text-2xl font-bold text-primary">{initials}</span>
    </div>
  )
}

function RcsScoreBadge({ score }: { score: number }) {
  const color =
    score >= 90
      ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
      : score >= 70
        ? 'text-amber-500 bg-amber-500/10 border-amber-500/20'
        : 'text-muted-foreground bg-secondary border-border'
  const label = score >= 90 ? 'Excellent' : score >= 70 ? 'Great' : 'Good'

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold ${color}`}>
      <BarChart3 className="w-3.5 h-3.5" />
      <span>RCS {score}</span>
      <span className="opacity-60">({label})</span>
    </div>
  )
}

function BenefitCard({ icon: Icon, title, description, color }: {
  icon: React.ElementType
  title: string
  description: string
  color: string
}) {
  return (
    <div className="p-5 rounded-xl border border-border bg-card hover:border-primary/20 transition-all group">
      <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="font-bold text-sm mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Verifying your invite...</p>
      </div>
    </div>
  )
}

function InvalidInvite() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-border">
        <AppLogo size="md" href="/" />
        <ThemeToggle />
      </nav>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold mb-3">Invite Not Found</h1>
          <p className="text-muted-foreground mb-6">
            This invite link may have expired or already been used. AgentReferrals is an trusted network
            -- ask a current member for a fresh invite code.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => router.push('/')}
              className="h-11 px-6 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              Visit Homepage
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => router.push('/?signup=true')}
              className="h-11 px-6 rounded-xl border border-border font-semibold text-sm hover:bg-accent transition-colors"
            >
              Join the Waitlist
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function InviteLandingPage() {
  const params = useParams()
  const router = useRouter()
  const code = params.code as string

  const [loading, setLoading] = useState(true)
  const [inviter, setInviter] = useState<InviterData | null>(null)

  useEffect(() => {
    if (!code) return

    async function validate() {
      try {
        const res = await fetch(`/api/invite/validate?code=${encodeURIComponent(code)}`)
        const data = await res.json()
        setInviter(data)
      } catch {
        setInviter({ valid: false, inviterName: '', inviterEmail: null, inviterPhoto: null, inviterBrokerage: null, inviterMarket: null, inviterTags: null, inviterRcsScore: null, inviterDealsPerYear: null, inviterYearsLicensed: null })
      } finally {
        setLoading(false)
      }
    }

    validate()
  }, [code])

  if (loading) return <LoadingSkeleton />
  if (!inviter?.valid) return <InvalidInvite />

  const firstName = inviter.inviterName.split(' ')[0]

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <AppLogo size="md" href="/" />
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            onClick={() => router.push(`/?invite=${encodeURIComponent(code)}`)}
            className="h-9 px-4 rounded-lg border border-border text-sm font-semibold hover:bg-accent transition-colors hidden sm:flex items-center"
          >
            Sign In
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-primary/[0.02] to-transparent pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-3xl mx-auto px-6 pt-12 pb-8 sm:pt-16 sm:pb-12 text-center">
          {/* Inviter Profile Card */}
          <div className="mb-8">
            <InviterAvatar name={inviter.inviterName} photoUrl={inviter.inviterPhoto} />
          </div>

          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Personal Invitation
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
            You&apos;ve been invited by{' '}
            <span className="text-primary">{inviter.inviterName}</span>
            <br className="hidden sm:block" />
            {' '}to join AgentReferrals
          </h1>

          <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto mb-8">
            {firstName} wants you in their referral network. Join the platform where
            top agents exchange referrals, build trust, and grow their business together.
          </p>

          {/* Inviter Details Card */}
          <div className="max-w-lg mx-auto p-6 rounded-2xl border border-border bg-card shadow-sm mb-8">
            <div className="flex items-center gap-3 mb-4">
              {inviter.inviterPhoto ? (
                <div className="w-14 h-14 rounded-full border-2 border-primary/20 overflow-hidden shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={inviter.inviterPhoto} alt={inviter.inviterName} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-14 h-14 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-base font-bold text-primary">
                    {inviter.inviterName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="text-left min-w-0">
                <div className="font-bold text-sm flex items-center gap-1.5">
                  {inviter.inviterName}
                  <BadgeCheck className="w-4 h-4 text-primary shrink-0" />
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {[inviter.inviterBrokerage, inviter.inviterMarket].filter(Boolean).join(' · ') || 'AgentReferrals Member'}
                </div>
              </div>
            </div>

            {/* Stats Row */}
            {(inviter.inviterRcsScore || inviter.inviterDealsPerYear || inviter.inviterYearsLicensed) && (
              <div className="grid grid-cols-3 gap-3 mb-4">
                {inviter.inviterRcsScore && (
                  <div className="text-center p-2.5 rounded-lg bg-secondary/50">
                    <div className="text-lg font-extrabold text-primary">{inviter.inviterRcsScore}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">RCS Score</div>
                  </div>
                )}
                {inviter.inviterDealsPerYear && (
                  <div className="text-center p-2.5 rounded-lg bg-secondary/50">
                    <div className="text-lg font-extrabold">{inviter.inviterDealsPerYear}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Deals/yr</div>
                  </div>
                )}
                {inviter.inviterYearsLicensed && (
                  <div className="text-center p-2.5 rounded-lg bg-secondary/50">
                    <div className="text-lg font-extrabold">{inviter.inviterYearsLicensed}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Years Exp</div>
                  </div>
                )}
              </div>
            )}

            {/* Tags */}
            {inviter.inviterTags && inviter.inviterTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {inviter.inviterTags.slice(0, 5).map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 rounded-full bg-secondary text-[11px] font-semibold text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {inviter.inviterRcsScore && <RcsScoreBadge score={inviter.inviterRcsScore} />}
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <button
              onClick={() => router.push(`/?invite=${encodeURIComponent(code)}&signup=true`)}
              className="w-full sm:w-auto h-12 px-8 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
            >
              Create My Account
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => router.push(`/?invite=${encodeURIComponent(code)}`)}
              className="w-full sm:w-auto h-12 px-8 rounded-xl border border-border font-semibold text-sm hover:bg-accent transition-colors flex items-center justify-center gap-2"
            >
              Already have an account? Sign In
            </button>
          </div>
        </div>
      </div>

      {/* Mutual Benefit Section */}
      <div className="max-w-3xl mx-auto px-6 py-8 sm:py-12">
        <div className="p-6 sm:p-8 rounded-2xl border border-primary/20 bg-primary/5 text-center mb-12">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Handshake className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-xl font-bold mb-2">
            Join {firstName}&apos;s referral network
          </h2>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto">
            When you sign up, you and {firstName} will be automatically connected as referral partners.
            Start exchanging referrals, building trust, and earning together from day one.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2">What you get</h2>
          <p className="text-muted-foreground text-sm">Everything you need to grow your referral business</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          <BenefitCard
            icon={Users}
            title="Verified Partner Network"
            description="Connect with pre-vetted agents across all 50 states. Every member is trusted and license-verified."
            color="bg-primary/10 text-primary"
          />
          <BenefitCard
            icon={Zap}
            title="AI-Powered Matching"
            description="Our AI matches you with the best agents for each referral based on market expertise, track record, and communication style."
            color="bg-amber-500/10 text-amber-500"
          />
          <BenefitCard
            icon={Shield}
            title="Protected Agreements"
            description="Digital referral agreements with e-signatures. Fee tracking from agreement to close to payment."
            color="bg-emerald-500/10 text-emerald-500"
          />
          <BenefitCard
            icon={TrendingUp}
            title="RCS Trust Scores"
            description="Every agent has a Referral Communication Score measuring responsiveness, follow-through, and partner satisfaction."
            color="bg-blue-500/10 text-blue-500"
          />
          <BenefitCard
            icon={Globe}
            title="Nationwide Coverage"
            description="Fill your coverage gaps. Find trusted partners in any market your clients are moving to."
            color="bg-purple-500/10 text-purple-500"
          />
          <BenefitCard
            icon={Award}
            title="Earn While You Refer"
            description="Track every referral from introduction to closed deal. Transparent fee splits, no surprises."
            color="bg-rose-500/10 text-rose-500"
          />
        </div>

        {/* Social Proof */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-1 mb-3">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-5 h-5 fill-primary text-primary" />
            ))}
          </div>
          <blockquote className="text-lg font-medium italic text-foreground mb-3 max-w-lg mx-auto">
            &ldquo;AgentReferrals changed how I handle out-of-state clients. I went from losing those
            leads to earning referral fees on every one.&rdquo;
          </blockquote>
          <div className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Sarah Chen</span> &middot; Compass, San Francisco
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="border-t border-border bg-card/50">
        <div className="max-w-3xl mx-auto px-6 py-8 sm:py-12">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-bold mb-1">Ready to join {firstName}?</h3>
              <p className="text-sm text-muted-foreground">
                Create your account in under 2 minutes. No credit card required.
              </p>
            </div>
            <button
              onClick={() => router.push(`/?invite=${encodeURIComponent(code)}&signup=true`)}
              className="w-full sm:w-auto h-12 px-8 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shrink-0"
            >
              Create My Account
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-6 px-6">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <AppLogo size="sm" href="/" />
          <span>The trusted referral network for real estate agents</span>
        </div>
      </footer>
    </div>
  )
}
