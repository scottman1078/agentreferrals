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
  MessageSquareMore,
  MapPin,
  Building2,
  ArrowLeft,
  GraduationCap,
} from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const AgentProfileReviews = dynamic(() => import('./agent-profile-reviews').then(m => ({ default: m.AgentProfileReviews })), { ssr: false })
const AgentProfileMap = dynamic(() => import('./agent-profile-map').then(m => ({ default: m.AgentProfileMap })), { ssr: false })
const AgentNotesSection = dynamic(() => import('./agent-notes-section'), { ssr: false })
import { getMentorProfile } from '@/data/mentoring'
import { getCommScore, getCommScoreColor } from '@/data/communication-score'

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
  const isElite = (agent.referNetScore ?? 0) >= 90
  const mentorProfile = getMentorProfile(agent.id)
  const commScore = getCommScore(agent.id)

  return (
    <div className="min-h-screen bg-background">
      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden">
        {/* Gradient backdrop */}
        <div
          className="absolute inset-0 opacity-[0.07] dark:opacity-[0.12]"
          style={{
            background: `linear-gradient(135deg, ${agent.color} 0%, transparent 60%)`,
          }}
        />
        <div className="relative max-w-4xl mx-auto px-6 pt-6 pb-10">
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

              {/* Badges row */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                {/* Status badge */}
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <BadgeCheck className="w-3.5 h-3.5" />
                  {agent.status === 'active' ? 'Active' : 'Invited'}
                </span>

                {/* Elite badge */}
                {isElite && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verified Elite
                  </span>
                )}

                {/* Mentor badge */}
                {mentorProfile?.available && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                    <GraduationCap className="w-3.5 h-3.5" />
                    Mentor
                  </span>
                )}

                {/* ReferNet Score */}
                {agent.referNetScore && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                    <Zap className="w-3.5 h-3.5" />
                    ReferNet Score: {agent.referNetScore}
                  </span>
                )}

                {/* Star rating */}
                {stats && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-card border border-border">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    {stats.avgRating} ({stats.count} review{stats.count !== 1 ? 's' : ''})
                  </span>
                )}

                {/* Response time */}
                {agent.responseTime && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-card border border-border text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    {agent.responseTime}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-6 pb-16 space-y-10">
        {/* ═══ QUICK STATS ═══ */}
        <section className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {[
            {
              icon: Home,
              label: 'Deals / Year',
              value: agent.dealsPerYear.toString(),
              color: 'text-blue-500',
              sublabel: undefined as string | undefined,
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
            {
              icon: MessageSquareMore,
              label: 'Comm Score',
              value: commScore ? commScore.overall.toString() : '—',
              color: commScore ? getCommScoreColor(commScore.overall).split(' ')[0] : 'text-muted-foreground',
              sublabel: commScore?.label,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="p-4 rounded-xl border border-border bg-card text-center"
            >
              <stat.icon className={`w-5 h-5 ${stat.color} mx-auto mb-2`} />
              <div className="text-2xl font-extrabold">{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
              {stat.sublabel && (
                <div className="text-[10px] text-muted-foreground mt-0.5">{stat.sublabel}</div>
              )}
            </div>
          ))}
        </section>

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

        {/* ═══ REVIEWS ═══ */}
        <section>
          <h2 className="text-lg font-bold mb-3">Referral Reviews</h2>
          <div className="p-5 rounded-xl border border-border bg-card">
            <AgentProfileReviews agentId={agent.id} agentName={agent.name} />
          </div>
        </section>

        {/* ═══ COVERAGE MAP ═══ */}
        <section>
          <h2 className="text-lg font-bold mb-3">Coverage Area</h2>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <AgentProfileMap
              polygon={agent.polygon}
              color={agent.color}
              name={agent.name}
              area={agent.area}
            />
          </div>
        </section>

        {/* ═══ PRIVATE NOTES ═══ */}
        <section>
          <AgentNotesSection agentId={agent.id} />
        </section>

        {/* ═══ CTA ═══ */}
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
      </div>
    </div>
  )
}
