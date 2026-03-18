'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createHubClient } from '@/lib/supabase/hub'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import {
  MapPin, Users, FileText, TrendingUp, Zap, Shield,
  ArrowRight, Star, ChevronRight, Sparkles, Globe, Building2,
  MessageSquare, BarChart3, Search, Eye, EyeOff, Lock, Mail,
  CheckCircle2, Loader2, KeyRound, Clock, ShoppingBag, BadgeCheck,
  Video, ThumbsUp, UserCheck, Megaphone
} from 'lucide-react'

const TOTAL_SPOTS = 5000

export default function LandingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showLogin, setShowLogin] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetMessage, setResetMessage] = useState<string | null>(null)
  const [resetError, setResetError] = useState<string | null>(null)
  const [signupSuccess, setSignupSuccess] = useState(false)
  const [signInMethod, setSignInMethod] = useState<'magic' | 'password'>('magic')
  const [magicLinkSent, setMagicLinkSent] = useState(false)

  // Invite-only sign-up state
  const [signupPath, setSignupPath] = useState<'invite' | 'waitlist' | null>(null)
  const [inviteCode, setInviteCode] = useState('')
  const [inviteVerifying, setInviteVerifying] = useState(false)
  const [inviteValid, setInviteValid] = useState(false)
  const [inviterName, setInviterName] = useState('')
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [waitlistEmail, setWaitlistEmail] = useState('')
  const [waitlistLoading, setWaitlistLoading] = useState(false)
  const [waitlistSuccess, setWaitlistSuccess] = useState(false)
  const [waitlistPosition, setWaitlistPosition] = useState<number | null>(null)
  const [validatedInviteCode, setValidatedInviteCode] = useState('')
  const [inviteeEmailLocked, setInviteeEmailLocked] = useState(false)

  // Existing account detection
  const [existingAccount, setExistingAccount] = useState<{
    exists: boolean
    name?: string
    platforms?: { name: string; slug: string }[]
  } | null>(null)
  const [checkingAccount, setCheckingAccount] = useState(false)

  // Spots counter — live from DB
  const [spotsRemaining, setSpotsRemaining] = useState(TOTAL_SPOTS)
  useEffect(() => {
    fetch('/api/spots')
      .then((r) => r.json())
      .then((data) => {
        if (data.remaining != null) setSpotsRemaining(data.remaining)
      })
      .catch(() => {})
  }, [])

  // Read invite code / signup from URL params
  useEffect(() => {
    const inviteParam = searchParams.get('invite') || searchParams.get('ref')
    if (inviteParam) {
      setInviteCode(inviteParam)
      setShowLogin(true)
      setAuthMode('signup')
      setSignupPath('invite')
    }
    if (searchParams.get('signup') === 'true') {
      setShowLogin(true)
      setAuthMode('signup')
      setSignupPath(null)
    }
  }, [searchParams])

  // If user is already authenticated, redirect to dashboard
  useEffect(() => {
    const hub = createHubClient()
    hub.auth.getSession().then(({ data: { session } }: { data: { session: unknown } }) => {
      if (session) {
        router.push('/dashboard')
      }
    })
  }, [router])

  async function verifyInviteCode() {
    if (!inviteCode.trim()) return
    setInviteVerifying(true)
    setInviteError(null)
    try {
      const res = await fetch(`/api/invite/validate?code=${encodeURIComponent(inviteCode.trim())}`)
      const data = await res.json()
      if (data.valid) {
        setInviteValid(true)
        setInviterName(data.inviterName || 'An AgentReferrals member')
        setValidatedInviteCode(inviteCode.trim())
        // Pre-fill email as a convenience (not locked — user can change it)
        if (data.inviteeEmail) {
          setEmail(data.inviteeEmail)
        } else {
          setEmail('')
        }
        setPassword('')
      } else {
        setInviteError('Invalid or expired invite code')
      }
    } catch {
      setInviteError('Failed to verify code. Please try again.')
    } finally {
      setInviteVerifying(false)
    }
  }

  async function submitWaitlist() {
    if (!waitlistEmail.trim()) return
    setWaitlistLoading(true)
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: waitlistEmail.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        setWaitlistSuccess(true)
        setWaitlistPosition(data.position)
      }
    } catch {
      // Silently handle — show generic success
      setWaitlistSuccess(true)
      setWaitlistPosition(4847)
    } finally {
      setWaitlistLoading(false)
    }
  }

  function resetSignupState() {
    setSignupPath(null)
    setInviteCode('')
    setInviteVerifying(false)
    setInviteValid(false)
    setInviterName('')
    setInviteError(null)
    setValidatedInviteCode('')
    setWaitlistEmail('')
    setWaitlistLoading(false)
    setWaitlistSuccess(false)
    setWaitlistPosition(null)
  }

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground"><path d="M16 3l4 4-4 4" /><path d="M20 7H4" /><path d="M8 21l-4-4 4-4" /><path d="M4 17h16" /></svg>
            </div>
            <span className="font-extrabold text-lg tracking-tight">
              Agent<span className="text-primary">Referrals</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            <a href="#brokerages" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Brokerages</a>
          </div>
          <div className="flex items-center gap-5">
            <ThemeToggle />
            <button
              onClick={() => { setShowLogin(true); setAuthMode('signin') }}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => { setShowLogin(true); setAuthMode('signup'); resetSignupState() }}
              className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold font-bold hover:opacity-90 transition-opacity"
            >
              Claim Your Spot
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6">
        {/* Gradient bg */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-primary/3 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-semibold mb-6">
            <Lock className="w-3.5 h-3.5" />
            Invite-Only Access
          </div>
          <h1 className="font-extrabold text-3xl sm:text-5xl md:text-7xl tracking-tight leading-[1.1] mb-6">
            The Referral Network<br />
            <span className="text-primary">Agents Actually Trust.</span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-4xl mx-auto mb-6 leading-relaxed px-2 sm:px-0">
            The most advanced and intelligent agent-to-agent referral platform that provides referral opportunities across all brokerages, in any market.
          </p>

          {/* Spots counter */}
          <div className="inline-flex flex-col items-center gap-2 mb-8">
            <div className="flex items-center gap-3 px-5 py-3 rounded-2xl border border-primary/20 bg-card shadow-lg">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
                </span>
                <span className="font-extrabold text-2xl sm:text-3xl tracking-tight tabular-nums">
                  {spotsRemaining.toLocaleString()}
                </span>
              </div>
              <span className="text-sm text-muted-foreground">
                of {TOTAL_SPOTS.toLocaleString()} founding spots remaining
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Join agents from <span className="font-semibold text-foreground">Real Broker</span>, <span className="font-semibold text-foreground">Compass</span>, <span className="font-semibold text-foreground">Keller Williams</span>, and more
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => { setShowLogin(true); setAuthMode('signup'); resetSignupState() }}
              className="h-12 px-8 rounded-xl bg-primary text-primary-foreground font-bold text-base hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
            >
              Claim Your Spot <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="/demo"
              target="_blank"
              rel="noopener noreferrer"
              className="h-12 px-8 rounded-xl border border-border bg-card text-foreground font-semibold text-base hover:bg-accent transition-all flex items-center gap-2 no-underline"
            >
              <Eye className="w-4 h-4" />
              View Live Demo
            </a>
          </div>
          {/* Brokerage logos — above the fold */}
          <div className="mt-8 sm:mt-10">
            <p className="text-xs text-muted-foreground font-medium mb-3">Trusted by agents at</p>
            <div className="flex items-center justify-center gap-6 sm:gap-8">
              {[
                { name: 'Real Broker', src: '/logos/real.png' },
                { name: 'eXp Realty', src: '/logos/exp.png' },
                { name: 'Compass', src: '/logos/compass.png' },
                { name: 'KW', src: '/logos/kw.png' },
                { name: 'RE/MAX', src: '/logos/remax.png' },
                { name: "Sotheby's", src: '/logos/sothebys.png' },
                { name: 'Coldwell Banker', src: '/logos/coldwell.png' },
              ].map((b) => (
                <img key={b.name} src={b.src} alt={b.name} className="h-5 sm:h-6 w-auto" />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* WHY AGENTREFERRALS */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Why AgentReferrals</span>
            <h2 className="font-extrabold text-2xl sm:text-3xl md:text-4xl mt-3">Built by agents, for agents</h2>
            <p className="text-muted-foreground mt-4 max-w-3xl mx-auto">
              Stop losing referral fees to broken processes.<br className="hidden sm:block" />
              AgentReferrals gives you a trusted network of verified agents, AI-powered matching, and full pipeline visibility from agreement to close.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: '5,000', label: 'Founding Spots', desc: 'Exclusive invite-only network for top-producing agents' },
              { value: '92', label: 'Avg ReferNet Score', desc: 'Every agent is vetted with performance data' },
              { value: '< 1hr', label: 'Avg Response Time', desc: 'Partners who communicate and close deals' },
              { value: '25%', label: 'Referral Fee Standard', desc: 'Transparent agreements with e-signature' },
            ].map((stat) => (
              <div key={stat.label} className="p-6 rounded-xl border border-border bg-card text-center">
                <div className="font-extrabold text-3xl text-primary mb-1">{stat.value}</div>
                <div className="font-bold text-sm mb-2">{stat.label}</div>
                <p className="text-xs text-muted-foreground">{stat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-24 px-6 bg-card/50 border-y border-border">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Features</span>
            <h2 className="font-extrabold text-2xl sm:text-3xl md:text-4xl mt-3">Everything you need to refer with confidence</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {[
              { icon: Sparkles, title: 'NORA AI Assistant', desc: 'Tell NORA the market you need a partner in. She finds verified agents across your entire network in seconds.', color: 'text-primary' },
              { icon: ShoppingBag, title: 'Referral Marketplace', desc: 'Post referral opportunities for agents to bid on. Find deals in your market posted by agents across the country.', color: 'text-pink-500' },
              { icon: BadgeCheck, title: 'Verified Referrals', desc: 'Build your track record with verified closed referrals. Show other agents you close deals and communicate.', color: 'text-emerald-500' },
              { icon: MapPin, title: 'Network Map', desc: 'Visualize agent territories, identify coverage gaps, and spot market opportunities with an interactive map.', color: 'text-blue-500' },
              { icon: ThumbsUp, title: 'Agent Endorsements', desc: 'Give and receive endorsements from agents you\'ve worked with. Social proof that builds trust and credibility.', color: 'text-violet-500' },
              { icon: Video, title: 'Video Introductions', desc: 'Record a short video intro so referral partners can see who they\'re working with before connecting.', color: 'text-red-500' },
              { icon: Users, title: 'Degrees of Separation', desc: 'See how you\'re connected to any agent through your network. Request warm introductions through mutual partners — just like LinkedIn for referrals.', color: 'text-purple-500' },
              { icon: BarChart3, title: 'Pipeline Tracking', desc: 'Kanban board tracks every referral from agreement to close. Never lose track of a deal again.', color: 'text-teal-500' },
              { icon: FileText, title: 'Smart Agreements', desc: 'Auto-generated referral agreements with e-signature. Terms, fees, and expiration built in.', color: 'text-orange-500' },
              { icon: TrendingUp, title: 'ROI Dashboard', desc: 'See your referral revenue, conversion rates, top markets, and top partners at a glance.', color: 'text-rose-500' },
              { icon: UserCheck, title: 'Agent Discovery', desc: 'Find agents by production, specialization, price range, and area. Filter by brokerage or search globally.', color: 'text-cyan-500' },
              { icon: MessageSquare, title: 'Direct Messaging', desc: 'Chat directly with referral partners. No middleman, no company taking your fee.', color: 'text-indigo-500' },
              { icon: Globe, title: 'Coverage Gaps', desc: 'See where your network has holes. Get AI-powered recommendations for agents to recruit.', color: 'text-amber-500' },
              { icon: Megaphone, title: 'Check-In Nudges', desc: 'AI-powered reminders to stay in touch with your referral partners. Never let a relationship go cold.', color: 'text-sky-500' },
              { icon: Shield, title: 'Name Protection', desc: 'Agent identities are masked until you connect. No one can look up your clients\' agents online.', color: 'text-slate-500' },
            ].map((f) => (
              <div key={f.title} className="p-6 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all group">
                <f.icon className={`w-10 h-10 ${f.color} mb-4 group-hover:scale-110 transition-transform`} />
                <h3 className="font-bold text-base mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">How It Works</span>
            <h2 className="font-extrabold text-2xl sm:text-3xl md:text-4xl mt-3">Three steps. One closed referral.</h2>
          </div>
          <div className="space-y-12">
            {[
              { step: '01', title: 'Tell NORA the market you need', desc: '"I need a referral partner in Nashville who does luxury and relocation." NORA searches your brokerage first, then the full network.' },
              { step: '02', title: 'Review matched agents', desc: 'See agent profiles with ReferNet Score, Communication Score, closed referrals, specializations, and reviews. Pick your partner.' },
              { step: '03', title: 'Send agreement & track to close', desc: 'One-click referral agreement with auto-filled terms. Track the referral through every stage — from introduction to fee received.' },
            ].map((s) => (
              <div key={s.step} className="flex gap-6 items-start">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center font-extrabold text-xl text-primary shrink-0">
                  {s.step}
                </div>
                <div>
                  <h3 className="font-bold text-xl mb-2">{s.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-24 px-6 bg-card/50 border-y border-border">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">What Agents Are Saying</span>
            <h2 className="font-extrabold text-2xl sm:text-3xl md:text-4xl mt-3">Real agents. Real results.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                quote: "I closed 3 referrals in my first month. The network actually works because every agent is vetted and responsive.",
                name: "Sarah M.",
                brokerage: "Real Broker LLC",
                stat: "3 referrals closed in 30 days",
              },
              {
                quote: "I used to lose referral fees to platforms that take a cut. Here I keep 100% and know exactly who I'm sending my clients to.",
                name: "Marcus R.",
                brokerage: "eXp Realty",
                stat: "$47K in referral fees earned",
              },
              {
                quote: "NORA found me a luxury agent in Scottsdale in 30 seconds. The AI matching is a game changer for finding the right partner.",
                name: "Jennifer K.",
                brokerage: "Compass",
                stat: "12 markets covered",
              },
            ].map((t) => (
              <div key={t.name} className="p-6 rounded-2xl border border-border bg-background">
                <div className="flex gap-1 mb-4">
                  {[1,2,3,4,5].map((s) => (
                    <Star key={s} className="w-4 h-4 text-primary fill-primary" />
                  ))}
                </div>
                <p className="text-sm leading-relaxed mb-6">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-sm">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.brokerage}</div>
                  </div>
                  <div className="text-[10px] font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                    {t.stat}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BROKERAGES */}
      <section id="brokerages" className="py-24 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-primary">Multi-Brokerage</span>
          <h2 className="font-extrabold text-2xl sm:text-3xl md:text-4xl mt-3 mb-4">Your brokerage. Your space. Your network.</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-12">
            Every brokerage gets their own private space. Search within your brokerage first — when you need to go outside, expand to the full AgentReferrals network with one click.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: 'Real Broker', agents: '3,247', color: '#F59E0B' },
              { name: 'eXp Realty', agents: '2,891', color: '#3B82F6' },
              { name: 'Compass', agents: '1,834', color: '#22C55E' },
              { name: 'Keller Williams', agents: '4,102', color: '#EF4444' },
              { name: 'Berkshire Hathaway', agents: '1,245', color: '#A855F7' },
              { name: 'RE/MAX', agents: '2,156', color: '#F97316' },
              { name: "Sotheby's", agents: '876', color: '#14B8A6' },
              { name: 'Coldwell Banker', agents: '1,567', color: '#6366F1' },
            ].map((b) => (
              <div key={b.name} className="p-5 rounded-xl border border-border bg-card hover:border-primary/20 transition-all">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center font-extrabold text-xs text-white mb-3 mx-auto" style={{ background: b.color }}>
                  {b.name.charAt(0)}
                </div>
                <div className="font-bold text-sm">{b.name}</div>
                <div className="text-xs text-muted-foreground mt-1">{b.agents} agents</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Pricing</span>
            <h2 className="font-extrabold text-2xl sm:text-3xl md:text-4xl mt-3 mb-4">Keep 100% of your referral fees.</h2>
            <p className="text-muted-foreground">No platform fees. No percentage cuts. Just a simple monthly subscription.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {[
              {
                name: 'Starter', price: '$0', period: '/forever', desc: 'Try the network risk-free',
                features: ['Browse the agent network', 'Basic agent profile', 'Up to 2 active referrals', 'Direct messaging', 'Coverage gap alerts'],
                cta: 'Get Started Free', highlight: false,
              },
              {
                name: 'Growth', price: '$29', period: '/month', desc: 'For agents building their network',
                features: ['Everything in Starter', 'Up to 10 active referrals', 'Referral pipeline tracking', 'Partnership requests', 'Agent reviews', 'Invite up to 25 agents/mo'],
                cta: 'Start Growth', highlight: false,
              },
              {
                name: 'Pro', price: '$59', period: '/month', desc: 'AI-powered referral machine',
                features: ['Everything in Growth', 'NORA AI matching', 'Unlimited referrals', 'Smart agreements & e-sign', 'ROI analytics dashboard', 'CRM integration', 'Priority in search results'],
                cta: 'Start Pro Trial', highlight: true,
              },
              {
                name: 'Elite', price: '$149', period: '/month', desc: 'Dominate your market',
                features: ['Everything in Pro', 'Market exclusivity (limited slots)', 'Verified Elite badge', 'White-label referral page', 'Brokerage admin tools', 'API access', 'Dedicated success manager'],
                cta: 'Contact Sales', highlight: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`p-8 rounded-2xl border ${plan.highlight ? 'border-primary shadow-xl shadow-primary/10 relative' : 'border-border'} bg-card`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-[11px] font-bold">
                    Most Popular
                  </div>
                )}
                <div className="text-sm font-semibold text-muted-foreground mb-2">{plan.name}</div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="font-extrabold text-3xl sm:text-4xl">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-6">{plan.desc}</p>
                <button
                  onClick={() => { setShowLogin(true); setAuthMode('signup'); resetSignupState() }}
                  className={`w-full h-11 rounded-lg font-bold text-sm transition-all ${
                    plan.highlight
                      ? 'bg-primary text-primary-foreground hover:opacity-90'
                      : 'border border-border bg-card hover:bg-accent'
                  }`}
                >
                  {plan.cta}
                </button>
                <div className="mt-6 space-y-3">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-sm">
                      <span className="text-primary">&#10003;</span>
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground mt-8">
            Zero platform fees. Zero referral cuts. <span className="text-primary font-semibold">You keep 100% of every referral fee you earn.</span>
          </p>
        </div>
      </section>

      {/* DATA PRIVACY PLEDGE */}
      <section className="py-20 px-6 bg-card/50 border-y border-border">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-5">
            <Shield className="w-7 h-7 text-emerald-500" />
          </div>
          <h2 className="font-extrabold text-2xl sm:text-3xl md:text-4xl mb-4">Our Data Privacy Pledge</h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
            Your data is yours. Period. We built AgentReferrals on trust — and that starts with how we treat your information.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
            <div className="p-5 rounded-xl border border-border bg-background">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-3">
                <Shield className="w-5 h-5 text-emerald-500" />
              </div>
              <h3 className="font-bold text-sm mb-1">We Never Sell Your Data</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your contact info, client details, and referral history are never sold, shared, or monetized. Not to brokerages, not to lead companies, not to anyone.
              </p>
            </div>
            <div className="p-5 rounded-xl border border-border bg-background">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-3">
                <Mail className="w-5 h-5 text-emerald-500" />
              </div>
              <h3 className="font-bold text-sm mb-1">Zero Spam. Ever.</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                No cold emails, no marketing blasts, no selling your inbox to third parties. We only send notifications you&apos;ve opted into — referral updates, partner messages, and platform alerts.
              </p>
            </div>
            <div className="p-5 rounded-xl border border-border bg-background">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-3">
                <Lock className="w-5 h-5 text-emerald-500" />
              </div>
              <h3 className="font-bold text-sm mb-1">Agent Identity Protection</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Agent names are masked until you connect. Your profile, phone number, and client information are only visible to your approved referral partners.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-extrabold text-2xl sm:text-3xl md:text-4xl mb-4">Ready to refer with confidence?</h2>
          <p className="text-muted-foreground text-lg mb-8">Join agents who&apos;ve upgraded from Facebook groups to AI-powered referrals.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => { setShowLogin(true); setAuthMode('signup'); setSignupPath('invite') }}
              className="h-12 px-8 rounded-xl bg-primary text-primary-foreground font-bold text-base hover:opacity-90 transition-all shadow-lg shadow-primary/20"
            >
              Enter Invite Code
            </button>
            <button
              onClick={() => { setShowLogin(true); setAuthMode('signup'); setSignupPath('waitlist') }}
              className="h-12 px-8 rounded-xl border border-border bg-card text-foreground font-semibold text-base hover:bg-accent transition-all"
            >
              Join the Waitlist
            </button>
          </div>
          <a
            href="/demo"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-4 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.64 0 8.577 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.64 0-8.577-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            See the platform with demo data
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center"><svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground"><path d="M16 3l4 4-4 4" /><path d="M20 7H4" /><path d="M8 21l-4-4 4-4" /><path d="M4 17h16" /></svg></div>
            <span className="font-bold text-sm">Agent<span className="text-primary">Referrals</span></span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="hover:text-foreground transition-colors">Contact</a>
          </div>
          <p className="text-xs text-muted-foreground">&copy; 2025 AgentReferrals. All rights reserved.</p>
        </div>
      </footer>

      {/* LOGIN MODAL */}
      {showLogin && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowLogin(false); setAuthError(null); resetSignupState() } }}
        >
          <div className="w-[420px] max-w-full rounded-2xl border border-border bg-card p-10 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center"><svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground"><path d="M16 3l4 4-4 4" /><path d="M20 7H4" /><path d="M8 21l-4-4 4-4" /><path d="M4 17h16" /></svg></div>
              <span className="font-extrabold text-xl tracking-tight">
                Agent<span className="text-primary">Referrals</span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              {authMode === 'signin' ? 'Sign in to your referral network' : 'Join the invite-only referral network'}
            </p>

            {/* Sign In link — only show when in signup mode */}
            {authMode === 'signup' && (
              <button
                onClick={() => { setAuthMode('signin'); setAuthError(null); resetSignupState() }}
                className="text-xs text-muted-foreground hover:text-foreground mb-4"
              >
                Already have an account? <span className="font-semibold underline">Sign In</span>
              </button>
            )}
            {authMode === 'signin' && (
              <button
                onClick={() => { setAuthMode('signup'); setAuthError(null); resetSignupState() }}
                className="text-xs text-muted-foreground hover:text-foreground mb-4"
              >
                Don&apos;t have an account? <span className="font-semibold underline">Sign Up</span>
              </button>
            )}

            {authError && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium mb-4">
                {authError}
              </div>
            )}

            {signupSuccess && (
              <div className="flex flex-col items-center text-center py-8 px-4">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                  <svg className="w-7 h-7 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                </div>
                <h3 className="font-bold text-lg mb-1">Check your email</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  We sent a confirmation link to<br />
                  <span className="font-semibold text-foreground">{email}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Click the link to activate your account, then come back to sign in.
                </p>
                <button
                  onClick={() => { setSignupSuccess(false); setAuthMode('signin') }}
                  className="mt-6 h-10 px-6 rounded-lg border border-border bg-card text-sm font-semibold hover:bg-accent transition-colors"
                >
                  Back to Sign In
                </button>
              </div>
            )}

            {/* ═══ SIGN IN MODE ═══ */}
            {authMode === 'signin' && (
              <>
                {/* Google OAuth */}
                <button
                  type="button"
                  onClick={async () => {
                    setAuthLoading(true)
                    setAuthError(null)
                    const hub = createHubClient()
                    const isDev = window.location.hostname === 'localhost'
                    const redirectTo = isDev
                      ? 'http://localhost:5500/auth/callback'
                      : 'https://agentreferrals.ai/auth/callback'
                    const { error } = await hub.auth.signInWithOAuth({
                      provider: 'google',
                      options: { redirectTo },
                    })
                    if (error) {
                      setAuthError(error.message)
                      setAuthLoading(false)
                    }
                  }}
                  disabled={authLoading}
                  className="w-full h-11 rounded-lg border border-border bg-card text-foreground font-semibold text-sm hover:bg-accent transition-all flex items-center justify-center gap-3 mb-4 disabled:opacity-50"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                    <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                    <path d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
                    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 7.294C4.672 5.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </button>

                {/* Sign-in method toggle */}
                <div className="flex rounded-lg border border-border bg-background p-0.5 mb-4">
                  <button
                    type="button"
                    onClick={() => setSignInMethod('magic')}
                    className={`flex-1 py-2 rounded-md text-xs font-semibold transition-all ${
                      signInMethod === 'magic'
                        ? 'bg-background shadow-sm text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Magic Link
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignInMethod('password')}
                    className={`flex-1 py-2 rounded-md text-xs font-semibold transition-all ${
                      signInMethod === 'password'
                        ? 'bg-background shadow-sm text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Password
                  </button>
                </div>

                {signInMethod === 'magic' && !magicLinkSent && (
                  <form onSubmit={async (e) => {
                    e.preventDefault()
                    setAuthLoading(true)
                    setAuthError(null)
                    try {
                      const res = await fetch('/api/auth/magic-link', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email }),
                      })
                      const data = await res.json()
                      if (!data.success) {
                        setAuthError(data.error || 'Failed to send magic link')
                        setAuthLoading(false)
                        return
                      }
                      setMagicLinkSent(true)
                      setAuthLoading(false)
                    } catch {
                      setAuthError('Failed to send magic link. Please try again.')
                      setAuthLoading(false)
                    }
                  }}>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@email.com"
                      className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-primary/50"
                      required
                    />
                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {authLoading ? 'Sending...' : 'Send Magic Link'}
                    </button>
                    <p className="text-center text-xs text-muted-foreground mt-3">
                      We&apos;ll email you a sign-in link — no password needed.
                    </p>
                  </form>
                )}

                {signInMethod === 'magic' && magicLinkSent && (
                  <div className="flex flex-col items-center text-center py-6 px-4">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                    </div>
                    <h3 className="font-bold text-lg mb-1">Check your email</h3>
                    <p className="text-sm text-muted-foreground mb-1">
                      We sent a magic link to
                    </p>
                    <p className="text-sm font-semibold text-foreground mb-4">{email}</p>
                    <p className="text-xs text-muted-foreground">
                      Click the link to sign in instantly.
                    </p>
                    <button
                      onClick={() => setMagicLinkSent(false)}
                      className="mt-5 text-xs text-primary hover:underline font-medium"
                    >
                      Send again or try a different email
                    </button>
                  </div>
                )}

                {signInMethod === 'password' && (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs text-muted-foreground font-medium">sign in with email</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>

                    <form onSubmit={async (e) => {
                      e.preventDefault()
                      setAuthLoading(true)
                      setAuthError(null)
                      const hub = createHubClient()
                      const { error } = await hub.auth.signInWithPassword({ email, password })
                      if (error) {
                        setAuthError(error.message)
                        setAuthLoading(false)
                        return
                      }
                      const params = new URLSearchParams(window.location.search)
                      const redirect = params.get('redirect') || '/dashboard'
                      window.location.href = redirect
                    }}>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-primary/50"
                        required
                      />
                      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Password</label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full h-10 px-3 pr-10 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <div className="mb-2" />
                      <div className="text-right mb-4">
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); setShowForgotPassword(true); setResetEmail(email); setResetMessage(null); setResetError(null) }}
                          className="text-xs text-primary hover:underline font-medium"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <button
                        type="submit"
                        disabled={authLoading}
                        className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        {authLoading ? 'Please wait...' : 'Sign In'}
                      </button>
                    </form>
                  </>
                )}
              </>
            )}

            {/* ═══ SIGN UP MODE ═══ */}
            {authMode === 'signup' && (
              <>
                {/* Path selection */}
                {!signupPath && !signupSuccess && (
                  <div className="space-y-3">
                    {/* Path A: Invite Code */}
                    <button
                      onClick={() => setSignupPath('invite')}
                      className="w-full p-4 rounded-xl border-2 border-primary/30 bg-primary/5 hover:border-primary/50 hover:bg-primary/10 transition-all text-left group"
                    >
                      <div className="flex items-center gap-3 mb-1.5">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                          <KeyRound className="w-4.5 h-4.5 text-primary" />
                        </div>
                        <div>
                          <div className="font-bold text-sm">I Have an Invite Code</div>
                          <div className="text-xs text-muted-foreground">Enter your code to claim your spot</div>
                        </div>
                      </div>
                    </button>

                    {/* Path B: Waitlist */}
                    <button
                      onClick={() => setSignupPath('waitlist')}
                      className="w-full p-4 rounded-xl border border-border bg-card hover:border-border hover:bg-accent/50 transition-all text-left group"
                    >
                      <div className="flex items-center gap-3 mb-1.5">
                        <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
                          <Clock className="w-4.5 h-4.5 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="font-bold text-sm text-muted-foreground">Request Access</div>
                          <div className="text-xs text-muted-foreground">Join the waitlist — no code needed</div>
                        </div>
                      </div>
                    </button>

                    <p className="text-center text-xs text-muted-foreground pt-2">
                      Invite-only during our founding member period.
                    </p>
                  </div>
                )}

                {/* Path A: Invite Code Entry */}
                {signupPath === 'invite' && !inviteValid && !signupSuccess && (
                  <div className="space-y-4">
                    <button
                      onClick={() => setSignupPath(null)}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                    >
                      &larr; Back
                    </button>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Invite Code</label>
                      <input
                        type="text"
                        value={inviteCode}
                        onChange={(e) => { setInviteCode(e.target.value.toUpperCase()); setInviteError(null) }}
                        placeholder="AR-XXXXXXXX"
                        className="w-full h-12 px-4 rounded-lg border-2 border-primary/30 bg-background text-base font-mono tracking-wider text-center focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
                        autoFocus
                      />
                    </div>

                    {inviteError && (
                      <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
                        {inviteError}
                      </div>
                    )}

                    <button
                      onClick={verifyInviteCode}
                      disabled={inviteVerifying || !inviteCode.trim()}
                      className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {inviteVerifying ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>
                      ) : (
                        <><KeyRound className="w-4 h-4" /> Verify Code</>
                      )}
                    </button>

                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs text-muted-foreground">no code?</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>

                    <button
                      onClick={() => setSignupPath('waitlist')}
                      className="w-full h-10 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
                    >
                      Join the Waitlist Instead
                    </button>
                  </div>
                )}

                {/* Path A: Invite Verified — Show Sign-Up Form */}
                {signupPath === 'invite' && inviteValid && !signupSuccess && (
                  <div className="space-y-4">
                    <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        Invite verified! Invited by <span className="font-bold">{inviterName}</span>
                      </span>
                    </div>

                    {/* Google OAuth */}
                    <button
                      type="button"
                      onClick={async () => {
                        setAuthLoading(true)
                        setAuthError(null)
                        const hub = createHubClient()
                        const isDev = window.location.hostname === 'localhost'
                        const redirectTo = isDev
                          ? 'http://localhost:5500/auth/callback'
                          : 'https://agentreferrals.ai/auth/callback'
                        const { error } = await hub.auth.signInWithOAuth({
                          provider: 'google',
                          options: { redirectTo },
                        })
                        if (error) {
                          setAuthError(error.message)
                          setAuthLoading(false)
                        }
                      }}
                      disabled={authLoading}
                      className="w-full h-11 rounded-lg border border-border bg-card text-foreground font-semibold text-sm hover:bg-accent transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                        <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                        <path d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
                        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 7.294C4.672 5.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
                      </svg>
                      Continue with Google
                    </button>

                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs text-muted-foreground font-medium">or continue with email</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>

                    <form onSubmit={async (e) => {
                      e.preventDefault()
                      setAuthLoading(true)
                      setAuthError(null)
                      const hub = createHubClient()

                      const { data: signUpData, error } = await hub.auth.signUp({
                        email,
                        password,
                        options: { data: { full_name: fullName, invited_by: inviterName } },
                      })
                      if (error) {
                        if (error.message?.toLowerCase().includes('already registered') || error.message?.toLowerCase().includes('already been registered')) {
                          setAuthError(null)
                          setExistingAccount({ exists: true, name: fullName || undefined })
                          setAuthLoading(false)
                          return
                        }
                        setAuthError(error.message)
                        setAuthLoading(false)
                        return
                      }

                      // Send welcome email (fire-and-forget)
                      const referralCode = signUpData?.user?.id
                        ? 'AR-' + signUpData.user.id.substring(0, 8).toUpperCase()
                        : 'WELCOME'
                      fetch('/api/welcome', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, name: fullName, referralCode }),
                      }).catch(() => {})

                      // Mark invite code as used (fire-and-forget)
                      if (validatedInviteCode && signUpData?.user?.id) {
                        fetch('/api/invite/use', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ code: validatedInviteCode, userId: signUpData.user.id }),
                        }).catch(() => {})
                      }

                      // If no session was created, email confirmation is required
                      // Send our own branded confirmation email via Postmark
                      if (!signUpData?.session) {
                        fetch('/api/auth/confirm-email', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ email, firstName: fullName.split(' ')[0] }),
                        }).catch(() => {})
                        setSignupSuccess(true)
                        setAuthLoading(false)
                        return
                      }

                      window.location.href = '/onboarding'
                    }}>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Full Name</label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Your full name"
                        className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-primary/50"
                        required
                      />
                      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setExistingAccount(null) }}
                        onBlur={async () => {
                          if (!email || !email.includes('@')) return
                          setCheckingAccount(true)
                          try {
                            const res = await fetch(`/api/check-account?email=${encodeURIComponent(email)}`)
                            const data = await res.json()
                            if (data.exists) setExistingAccount(data)
                            else setExistingAccount(null)
                          } catch { setExistingAccount(null) }
                          setCheckingAccount(false)
                        }}
                        placeholder="you@email.com"
                        className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        required
                      />
                      {checkingAccount && (
                        <p className="text-[11px] text-muted-foreground mt-1 mb-3">Checking account...</p>
                      )}
                      {existingAccount?.exists && (
                        <div className="mt-1.5 mb-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">
                            Welcome back, {existingAccount.name || 'there'}!
                          </p>
                          <p className="text-[11px] text-muted-foreground mb-2">
                            You already have an AgentDashboards account.
                            {existingAccount.platforms && existingAccount.platforms.length > 0 && (
                              <span> Active on: <span className="font-semibold text-foreground">{existingAccount.platforms.map(p => p.name).join(', ')}</span></span>
                            )}
                          </p>
                          <button
                            type="button"
                            onClick={() => { setAuthMode('signin'); setExistingAccount(null) }}
                            className="text-xs font-bold text-primary hover:underline"
                          >
                            Sign in instead &rarr;
                          </button>
                        </div>
                      )}
                      {!existingAccount?.exists && !checkingAccount && (
                        <div className="mb-4" />
                      )}
                      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Password</label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Create a password"
                          className="w-full h-10 px-3 pr-10 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <div className="mb-4" />
                      <button
                        type="submit"
                        disabled={authLoading}
                        className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        {authLoading ? 'Please wait...' : 'Create Account'}
                      </button>
                    </form>
                  </div>
                )}

                {/* Path B: Waitlist */}
                {signupPath === 'waitlist' && !waitlistSuccess && !signupSuccess && (
                  <div className="space-y-4">
                    <button
                      onClick={() => setSignupPath(null)}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                    >
                      &larr; Back
                    </button>

                    <div className="p-4 rounded-xl bg-muted/50 border border-border text-center">
                      <Mail className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm font-semibold mb-1">Join the Waitlist</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        AgentReferrals is currently invite-only. Leave your email and we&apos;ll notify you when a spot opens up.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Email Address</label>
                      <input
                        type="email"
                        value={waitlistEmail}
                        onChange={(e) => setWaitlistEmail(e.target.value)}
                        placeholder="you@email.com"
                        className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        autoFocus
                      />
                    </div>

                    <button
                      onClick={submitWaitlist}
                      disabled={waitlistLoading || !waitlistEmail.trim()}
                      className="w-full h-11 rounded-lg bg-foreground text-background font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {waitlistLoading ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Joining...</>
                      ) : (
                        'Join Waitlist'
                      )}
                    </button>

                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs text-muted-foreground">have a code?</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>

                    <button
                      onClick={() => setSignupPath('invite')}
                      className="w-full h-10 rounded-lg border border-primary/30 text-sm font-medium text-primary hover:bg-primary/5 transition-all"
                    >
                      Enter Invite Code
                    </button>
                  </div>
                )}

                {/* Waitlist Success */}
                {signupPath === 'waitlist' && waitlistSuccess && (
                  <div className="text-center py-4 space-y-4">
                    <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                    </div>
                    <div>
                      <p className="font-bold text-lg mb-1">You&apos;re on the list!</p>
                      <p className="text-sm text-muted-foreground">
                        We&apos;ll notify you when a spot opens up.
                      </p>
                    </div>
                    {waitlistPosition && (
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted text-sm">
                        <span className="text-muted-foreground">Your position:</span>
                        <span className="font-bold">#{waitlistPosition.toLocaleString()}</span>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Know someone on AgentReferrals? Ask them for an invite code to skip the line.
                    </p>
                    <button
                      onClick={() => { setShowLogin(false); resetSignupState() }}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      Close
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* FORGOT PASSWORD MODAL */}
      {showForgotPassword && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowForgotPassword(false) }}
        >
          <div className="w-[420px] max-w-full rounded-2xl border border-border bg-card p-10 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center"><svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground"><path d="M16 3l4 4-4 4" /><path d="M20 7H4" /><path d="M8 21l-4-4 4-4" /><path d="M4 17h16" /></svg></div>
              <span className="font-extrabold text-xl tracking-tight">
                Agent<span className="text-primary">Referrals</span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Enter your email and we&apos;ll send you a link to reset your password.
            </p>

            {resetMessage && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium mb-4">
                {resetMessage}
              </div>
            )}

            {resetError && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium mb-4">
                {resetError}
              </div>
            )}

            <form onSubmit={async (e) => {
              e.preventDefault()
              setResetLoading(true)
              setResetError(null)
              setResetMessage(null)
              const hub = createHubClient()
              const { error } = await hub.auth.resetPasswordForEmail(resetEmail, {
                redirectTo: 'https://agentreferrals.ai/reset-password',
              })
              setResetLoading(false)
              if (error) {
                setResetError(error.message)
                return
              }
              setResetMessage('Check your email for a reset link')
            }}>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Email</label>
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm mb-6 focus:outline-none focus:ring-2 focus:ring-primary/50"
                required
              />
              <button
                type="submit"
                disabled={resetLoading}
                className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {resetLoading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
            <button
              onClick={() => setShowForgotPassword(false)}
              className="w-full mt-3 text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Back to Sign In
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
