import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { agents } from '@/data/agents'
import { getPartnerAgentIds } from '@/data/partnerships'
import { getAgentReviewStats } from '@/data/reviews'
import { formatCurrency, getInitials } from '@/lib/utils'
import { TAG_COLORS } from '@/lib/constants'
import { APP_DOMAIN } from '@/lib/constants'
import {
  Star,
  BadgeCheck,
  ShieldCheck,
  Zap,
  Clock,
  Home,
  Calendar,
  DollarSign,
  Handshake,
  Send,
  Users,
  MessageCircle,
  MapPin,
  Building2,
  ArrowLeft,
  ArrowUpRight,
  GraduationCap,
  ThumbsUp,
  Video,
} from 'lucide-react'
import Link from 'next/link'
import { ClientReviews, ClientMap, ClientNotes, ClientEndorsements, ClientVideoSection } from './client-sections'
import { getMentorProfile } from '@/data/mentoring'
import { getCommScore } from '@/data/communication-score'
import { getVerifiedCount } from '@/data/verified-referrals'
import { getEndorsementCount, getTopEndorsements, ENDORSEMENT_ICONS } from '@/data/endorsements'
import { getVideoIntro, getPublicInterviews } from '@/data/video-intros'
import ContactInfoGate from './contact-info-gate'
import AuthGate from './auth-gate'
import ProfileViewGate from './profile-view-gate'
import AgentAuthWrapper from './auth-wrapper'

// --------------- Static params ---------------
export function generateStaticParams() {
  return agents.map((agent) => ({ id: agent.id }))
}

// --------------- OG Metadata ---------------
type PageProps = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const agent = agents.find((a) => a.id === id)
  if (!agent) return { title: 'Agent Not Found' }

  const stats = getAgentReviewStats(agent.id)
  const ratingStr = stats ? ` | ${stats.avgRating} stars from ${stats.count} reviews` : ''

  return {
    title: `${agent.name} — ${agent.area} | ${APP_DOMAIN}`,
    description: `${agent.name} at ${agent.brokerage}. ${agent.dealsPerYear} deals/yr, ${agent.yearsLicensed} years licensed, ${formatCurrency(agent.avgSalePrice)} avg sale price.${ratingStr} Send a referral on AgentReferrals.`,
    openGraph: {
      title: `${agent.name} — ${agent.area}`,
      description: `${agent.brokerage} · ${agent.dealsPerYear} deals/yr · ${formatCurrency(agent.avgSalePrice)} avg${ratingStr}`,
      type: 'profile',
    },
  }
}

// --------------- Page ---------------
export default async function AgentProfilePage({ params }: PageProps) {
  const { id } = await params
  const agent = agents.find((a) => a.id === id)
  if (!agent) notFound()

  const stats = getAgentReviewStats(agent.id)
  const isElite = (agent.rcsScore ?? 0) >= 90
  const mentorProfile = getMentorProfile(agent.id)
  const commScore = getCommScore(agent.id)
  const verifiedRefCount = getVerifiedCount(agent.id)
  const endorsementCount = getEndorsementCount(agent.id)
  const topEndorsements = getTopEndorsements(agent.id, 3)
  const videoIntro = getVideoIntro(agent.id)
  const publicInterviewCount = getPublicInterviews(agent.id).length

  return (
    <AgentAuthWrapper>
    <div className="min-h-screen bg-background">
      {/* Profile view rate limiter */}
      <ProfileViewGate agentId={agent.id} />

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden">
        {/* Gradient backdrop */}
        <div
          className="absolute inset-0 opacity-[0.07] dark:opacity-[0.12]"
          style={{
            background: `linear-gradient(135deg, ${agent.color} 0%, transparent 60%)`,
          }}
        />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-6 pb-10">
          {/* Back button */}
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar */}
            <div
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center text-3xl sm:text-4xl font-extrabold text-white shrink-0 shadow-lg ring-4 ring-background"
              style={{ background: agent.color }}
            >
              {getInitials(agent.name)}
            </div>

            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <div className="flex-1">
                  <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-1">
                    {agent.name}
                  </h1>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-1 text-sm text-muted-foreground mb-3">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" />
                      {agent.brokerage}
                    </span>
                    <span className="hidden sm:inline text-border">|</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {agent.area}
                    </span>
                  </div>
                </div>

                {/* RCS Hero Score */}
                {commScore && (
                  <div className="flex flex-col items-center shrink-0">
                    <div
                      className={`relative w-[68px] h-[68px] rounded-full flex items-center justify-center font-extrabold text-2xl ${
                        commScore.overall >= 90
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : commScore.overall >= 70
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-red-600 dark:text-red-400'
                      }`}
                      style={{
                        background: `conic-gradient(${
                          commScore.overall >= 90 ? '#10b981' : commScore.overall >= 70 ? '#f59e0b' : '#ef4444'
                        } ${commScore.overall * 3.6}deg, transparent ${commScore.overall * 3.6}deg)`,
                      }}
                    >
                      <div className="absolute inset-[4px] rounded-full bg-background flex items-center justify-center">
                        {commScore.overall}
                      </div>
                    </div>
                    <span className={`text-[11px] font-semibold mt-1.5 ${
                      commScore.overall >= 90
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : commScore.overall >= 70
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-red-600 dark:text-red-400'
                    }`}>
                      {commScore.overall >= 90 ? 'Excellent' : commScore.overall >= 70 ? 'Good' : 'Needs Improvement'}
                    </span>
                    <span className="text-[10px] text-muted-foreground">Referral Comm Score</span>
                  </div>
                )}
              </div>

              {/* RCS Mini Breakdown */}
              {commScore && (
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-[11px] text-muted-foreground mb-3">
                  {([
                    { label: 'Pipeline', value: commScore.pipelineActivity },
                    { label: 'Messages', value: commScore.messageFrequency },
                    { label: 'Response', value: commScore.responseTime },
                    { label: 'Check-ins', value: commScore.checkInConsistency },
                  ] as const).map((item) => (
                    <span key={item.label} className="flex items-center gap-1">
                      <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                        item.value >= 90 ? 'bg-emerald-500' : item.value >= 70 ? 'bg-amber-500' : 'bg-red-500'
                      }`} />
                      {item.label}: {item.value}
                    </span>
                  ))}
                </div>
              )}

              {/* Badges row */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
                {/* Status badge */}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <BadgeCheck className="w-3 h-3" />
                  {agent.status === 'active' ? 'Active' : 'Invited'}
                </span>

                {/* Elite badge */}
                {isElite && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    <ShieldCheck className="w-3 h-3" />
                    Verified Elite
                  </span>
                )}

                {/* Mentor badge */}
                {mentorProfile?.available && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                    <GraduationCap className="w-3 h-3" />
                    Mentor
                  </span>
                )}

                {/* Verified Referrals badge */}
                {verifiedRefCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <BadgeCheck className="w-3 h-3" />
                    {verifiedRefCount} Verified Referral{verifiedRefCount !== 1 ? 's' : ''}
                  </span>
                )}

                {/* Star rating */}
                {stats && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-card border border-border">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    {stats.avgRating} ({stats.count} review{stats.count !== 1 ? 's' : ''})
                  </span>
                )}

                {/* Response time */}
                {agent.responseTime && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-card border border-border text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {agent.responseTime}
                  </span>
                )}

                {/* Endorsements badge */}
                {endorsementCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
                    <ThumbsUp className="w-3 h-3" />
                    {endorsementCount} Endorsement{endorsementCount !== 1 ? 's' : ''}
                    {topEndorsements.length > 0 && (
                      <span className="ml-0.5">
                        {topEndorsements.map((e) => ENDORSEMENT_ICONS[e.skill]).join('')}
                      </span>
                    )}
                  </span>
                )}

                {/* Video intro badge */}
                {videoIntro && (
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-16 space-y-8 sm:space-y-10">
        {/* ═══ QUICK STATS ═══ */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {[
            {
              icon: Home,
              label: agent.totalTransactions ? 'Total Transactions' : 'Deals / Year',
              value: agent.totalTransactions ? agent.totalTransactions.toString() : agent.dealsPerYear.toString(),
              color: 'text-blue-500',
              sublabel: (agent.totalTransactions && agent.zillowProfileUrl) ? 'via Zillow' : undefined as string | undefined,
            },
            {
              icon: Calendar,
              label: 'Years Licensed',
              value: agent.yearsLicensed.toString(),
              color: 'text-emerald-500',
              sublabel: undefined as string | undefined,
            },
            {
              icon: DollarSign,
              label: 'Avg Sale Price',
              value: formatCurrency(agent.avgSalePrice),
              color: 'text-amber-500',
              sublabel: undefined as string | undefined,
            },
            {
              icon: Handshake,
              label: 'Closed Referrals',
              value: (agent.closedReferrals ?? 0).toString(),
              color: 'text-violet-500',
              sublabel: undefined as string | undefined,
            },
            {
              icon: Users,
              label: 'Network Size',
              value: getPartnerAgentIds(agent.id).length.toString(),
              color: 'text-primary',
              sublabel: undefined as string | undefined,
            },
            ...(verifiedRefCount > 0 ? [{
              icon: BadgeCheck,
              label: 'Verified Referrals',
              value: verifiedRefCount.toString(),
              color: 'text-emerald-500',
              sublabel: undefined as string | undefined,
            }] : []),
            ...(endorsementCount > 0 ? [{
              icon: ThumbsUp,
              label: 'Endorsements',
              value: endorsementCount.toString(),
              color: 'text-violet-500',
              sublabel: topEndorsements.length > 0 ? topEndorsements.map((e) => ENDORSEMENT_ICONS[e.skill]).join(' ') : undefined as string | undefined,
            }] : []),
          ].map((stat) => (
            <div
              key={stat.label}
              className="p-3 rounded-lg border border-border bg-card text-center"
            >
              <stat.icon className={`w-4 h-4 ${stat.color} mx-auto mb-1.5`} />
              <div className="text-base sm:text-xl font-extrabold">{stat.value}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{stat.label}</div>
              {stat.sublabel && (
                <div className="text-[10px] text-muted-foreground mt-0.5">{stat.sublabel}</div>
              )}
            </div>
          ))}
        </section>

        {/* ═══ DATA SOURCES ═══ */}
        {agent.zillowProfileUrl && (
          <section className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-semibold">Sources:</span>
            <a
              href={agent.zillowProfileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
            >
              Transaction data from Zillow
              <ArrowUpRight className="w-3 h-3" />
            </a>
          </section>
        )}

        {/* ═══ SPECIALIZATIONS ═══ */}
        <section>
          <h2 className="text-lg font-bold mb-3">Specializations</h2>
          <div className="flex flex-wrap gap-2">
            {agent.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1.5 rounded-full text-xs font-semibold text-white"
                style={{ background: TAG_COLORS[tag] || '#6b7280' }}
              >
                {tag}
              </span>
            ))}
          </div>
        </section>

        {/* ═══ CONTACT INFO (gated) ═══ */}
        <AuthGate agentName={agent.name} section="contact information">
          <ContactInfoGate agentId={agent.id} phone={agent.phone} email={agent.email} />
        </AuthGate>

        {/* ═══ ABOUT / BIO ═══ */}
        <section>
          <h2 className="text-lg font-bold mb-3">About</h2>
          <div className="p-5 rounded-xl border border-border bg-card">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {agent.name} is a licensed real estate professional with{' '}
              {agent.yearsLicensed} years of experience serving the {agent.area} market.
              Specializing in{' '}
              {agent.tags.length > 1
                ? agent.tags.slice(0, -1).join(', ') + ' and ' + agent.tags[agent.tags.length - 1]
                : agent.tags[0]}
              , {agent.name.split(' ')[0]} consistently delivers exceptional results with{' '}
              {agent.dealsPerYear} transactions per year and an average sale price of{' '}
              {formatCurrency(agent.avgSalePrice)}. As a member of {agent.brokerage},{' '}
              {agent.name.split(' ')[0]} brings deep local market knowledge and a commitment to
              client satisfaction that makes referral partnerships seamless and productive.
            </p>
          </div>
        </section>

        {/* ═══ ENDORSEMENTS ═══ */}
        <AuthGate agentName={agent.name} section="endorsements">
          <section>
            <h2 className="text-lg font-bold mb-3">Endorsements</h2>
            <div className="p-5 rounded-xl border border-border bg-card">
              <ClientEndorsements agentId={agent.id} agentName={agent.name} />
            </div>
          </section>
        </AuthGate>

        {/* ═══ VIDEO ═══ */}
        <AuthGate agentName={agent.name} section="video">
          <section>
            <h2 className="text-lg font-bold mb-3">
              Video{videoIntro ? ' & Interviews' : ' Interviews'}
            </h2>
            <div className="p-5 rounded-xl border border-border bg-card">
              <ClientVideoSection agentId={agent.id} agentName={agent.name} agentColor={agent.color} />
            </div>
          </section>
        </AuthGate>

        {/* ═══ REVIEWS ═══ */}
        <AuthGate agentName={agent.name} section="referral reviews">
          <section>
            <h2 className="text-lg font-bold mb-3">Referral Reviews</h2>
            <div className="p-5 rounded-xl border border-border bg-card">
              <ClientReviews agentId={agent.id} agentName={agent.name} />
            </div>
          </section>
        </AuthGate>

        {/* ═══ COVERAGE MAP ═══ */}
        <section>
          <h2 className="text-lg font-bold mb-3">Coverage Area</h2>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <ClientMap
              polygon={agent.polygon}
              color={agent.color}
              name={agent.name}
              area={agent.area}
            />
          </div>
        </section>

        {/* ═══ PRIVATE NOTES ═══ */}
        <AuthGate agentName={agent.name} section="private notes">
          <section>
            <ClientNotes agentId={agent.id} />
          </section>
        </AuthGate>

        {/* ═══ CTA ═══ */}
        <AuthGate agentName={agent.name} section="partnership actions">
          <section className="p-6 rounded-xl border border-border bg-card text-center space-y-4">
            <h2 className="text-xl font-bold">
              Interested in partnering with {agent.name.split(' ')[0]}?
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Send a referral, request a partnership, or start a conversation.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <a
                href="/login"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                <Send className="w-4 h-4" />
                Send Referral to {agent.name.split(' ')[0]}
              </a>
              <a
                href="/login"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold border border-border bg-card hover:bg-accent transition-colors"
              >
                <Users className="w-4 h-4" />
                Request Partnership
              </a>
              <a
                href={`/dashboard/messages?agent=${agent.id}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold border border-border bg-card hover:bg-accent transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                Message {agent.name.split(' ')[0]}
              </a>
            </div>
          </section>
        </AuthGate>
      </div>
    </div>
    </AgentAuthWrapper>
  )

}
