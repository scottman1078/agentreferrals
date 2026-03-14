'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import {
  MapPin, Users, FileText, TrendingUp, Zap, Shield,
  ArrowRight, Star, ChevronRight, Sparkles, Globe, Building2,
  MessageSquare, BarChart3, Search
} from 'lucide-react'

export default function LandingPage() {
  const router = useRouter()
  const [showLogin, setShowLogin] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('jason@jobrienhomes.com')
  const [password, setPassword] = useState('demo1234')
  const [fullName, setFullName] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(false)

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ═══ NAV ═══ */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center font-extrabold text-sm text-primary-foreground">
              A
            </div>
            <span className="font-extrabold text-lg tracking-tight">
              Agent<span className="text-primary">Referrals</span><span className="text-muted-foreground text-xs font-medium">.ai</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            <a href="#brokerages" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Brokerages</a>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={() => setShowLogin(true)}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => setShowLogin(true)}
              className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold font-bold hover:opacity-90 transition-opacity"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="relative pt-32 pb-20 px-6">
        {/* Gradient bg */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-primary/3 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-semibold mb-8">
            <Sparkles className="w-3.5 h-3.5" />
            Powered by NORA AI
          </div>
          <h1 className="font-extrabold text-5xl md:text-7xl tracking-tight leading-[1.1] mb-6">
            Stop posting in<br />
            <span className="text-primary">Facebook groups.</span><br />
            Start closing referrals.
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            AgentReferrals.ai replaces chaotic brokerage Facebook groups with an AI-powered platform that instantly matches your clients with verified agents — across any brokerage, any market.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => setShowLogin(true)}
              className="h-12 px-8 rounded-xl bg-primary text-primary-foreground font-bold text-base hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
            >
              Start Free Trial <ArrowRight className="w-4 h-4" />
            </button>
            <button className="h-12 px-8 rounded-xl border border-border bg-card text-foreground font-semibold text-base hover:bg-accent transition-all flex items-center gap-2">
              Watch Demo <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center justify-center gap-6 mt-10 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Shield className="w-4 h-4 text-primary" /> Zero platform fees</span>
            <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-primary" /> 17,000+ agents</span>
            <span className="flex items-center gap-1.5"><Star className="w-4 h-4 text-primary" /> Keep 100% of your fees</span>
          </div>
        </div>
      </section>

      {/* ═══ SOCIAL PROOF ═══ */}
      <section className="py-12 border-y border-border bg-card/50">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-center text-sm text-muted-foreground mb-8 font-medium">Trusted by agents at leading brokerages</p>
          <div className="flex items-center justify-center gap-10 flex-wrap opacity-60">
            {['Real Broker', 'eXp Realty', 'Compass', 'Keller Williams', 'RE/MAX', "Sotheby's", 'Coldwell Banker', 'Berkshire Hathaway'].map((b) => (
              <span key={b} className="font-bold text-sm text-muted-foreground whitespace-nowrap">{b}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PROBLEM / SOLUTION ═══ */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-destructive">The Problem</span>
              <h2 className="font-extrabold text-3xl mt-3 mb-4">3,000 agents. One Facebook group. Zero structure.</h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Every day, agents post &quot;Looking for someone in [city]!&quot; into brokerage Facebook groups. Replies get buried. There&apos;s no vetting, no tracking, no accountability. Referral fees get lost. Clients fall through the cracks.
              </p>
              <div className="space-y-3">
                {[
                  'Posts get buried in minutes — no way to search',
                  'No agent vetting or performance data',
                  'Manual agreements, no tracking',
                  'Zero visibility into referral outcomes',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <span className="text-destructive mt-0.5">✕</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-primary">The Solution</span>
              <h2 className="font-extrabold text-3xl mt-3 mb-4">AI-matched referrals in seconds. Not hours.</h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Tell NORA your client&apos;s needs. She instantly surfaces verified agents matched by market, price point, specialization, and track record — with one-click referral agreements.
              </p>
              <div className="space-y-3">
                {[
                  'NORA AI matches agents in seconds',
                  'ReferNet Score verifies every agent',
                  'Auto-generated agreements with e-sign',
                  'Full lifecycle tracking to close',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3 text-sm">
                    <span className="text-primary mt-0.5">✓</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section id="features" className="py-24 px-6 bg-card/50 border-y border-border">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Features</span>
            <h2 className="font-extrabold text-4xl mt-3">Everything you need to refer with confidence</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Sparkles, title: 'NORA AI Assistant', desc: 'Describe your client\'s needs in natural language. NORA finds the perfect agent match across your entire network.', color: 'text-primary' },
              { icon: MapPin, title: 'Network Map', desc: 'Visualize agent territories, identify coverage gaps, and spot market opportunities with an interactive map.', color: 'text-blue-500' },
              { icon: Building2, title: 'Multi-Brokerage', desc: 'Search within your brokerage first, then expand to the full network. Every brokerage gets their own space.', color: 'text-purple-500' },
              { icon: BarChart3, title: 'Pipeline Tracking', desc: 'Kanban board tracks every referral from agreement to close. Never lose track of a deal again.', color: 'text-emerald-500' },
              { icon: FileText, title: 'Smart Agreements', desc: 'Auto-generated referral agreements with e-signature. Terms, fees, and expiration built in.', color: 'text-orange-500' },
              { icon: TrendingUp, title: 'ROI Dashboard', desc: 'See your referral revenue, conversion rates, top markets, and top partners at a glance.', color: 'text-rose-500' },
              { icon: Search, title: 'Agent Discovery', desc: 'Find agents by production, specialization, price range, and area. Filter by brokerage or search globally.', color: 'text-cyan-500' },
              { icon: MessageSquare, title: 'Direct Messaging', desc: 'Chat directly with referral partners. No middleman, no company taking your fee.', color: 'text-indigo-500' },
              { icon: Globe, title: 'Coverage Gaps', desc: 'See where your network has holes. Get AI-powered recommendations for agents to recruit.', color: 'text-amber-500' },
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

      {/* ═══ HOW IT WORKS ═══ */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">How It Works</span>
            <h2 className="font-extrabold text-4xl mt-3">Three steps. One closed referral.</h2>
          </div>
          <div className="space-y-12">
            {[
              { step: '01', title: 'Tell NORA about your client', desc: '"I have a family relocating to Nashville, $600k budget, great schools." NORA searches your brokerage first, then the full network.' },
              { step: '02', title: 'Review matched agents', desc: 'See agent profiles with ReferNet Score, response time, closed referrals, specializations, and reviews. Pick your partner.' },
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

      {/* ═══ BROKERAGES ═══ */}
      <section id="brokerages" className="py-24 px-6 bg-card/50 border-y border-border">
        <div className="max-w-5xl mx-auto text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-primary">Multi-Brokerage</span>
          <h2 className="font-extrabold text-4xl mt-3 mb-4">Your brokerage. Your space. Your network.</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-12">
            Every brokerage gets their own private space. Search within your brokerage first — when you need to go outside, expand to the full AgentReferrals.ai network with one click.
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

      {/* ═══ PRICING ═══ */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Pricing</span>
            <h2 className="font-extrabold text-4xl mt-3 mb-4">Keep 100% of your referral fees.</h2>
            <p className="text-muted-foreground">No platform fees. No percentage cuts. Just a simple monthly subscription.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
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
                  <span className="font-extrabold text-4xl">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-6">{plan.desc}</p>
                <button
                  onClick={() => setShowLogin(true)}
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
                      <span className="text-primary">✓</span>
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

      {/* ═══ CTA ═══ */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-extrabold text-4xl mb-4">Ready to modernize your referral network?</h2>
          <p className="text-muted-foreground text-lg mb-8">Join 17,000+ agents who&apos;ve upgraded from Facebook groups to AI-powered referrals.</p>
          <button
            onClick={() => setShowLogin(true)}
            className="h-12 px-8 rounded-xl bg-primary text-primary-foreground font-bold text-base hover:opacity-90 transition-all shadow-lg shadow-primary/20"
          >
            Get Started Free
          </button>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-border py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center font-extrabold text-xs text-primary-foreground">A</div>
            <span className="font-bold text-sm">Agent<span className="text-primary">Referrals</span>.ai</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="hover:text-foreground transition-colors">Contact</a>
          </div>
          <p className="text-xs text-muted-foreground">© 2025 AgentReferrals.ai. All rights reserved.</p>
        </div>
      </footer>

      {/* ═══ LOGIN MODAL ═══ */}
      {showLogin && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowLogin(false); setAuthError(null) } }}
        >
          <div className="w-[420px] max-w-full rounded-2xl border border-border bg-card p-10 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center font-extrabold text-sm text-primary-foreground">A</div>
              <span className="font-extrabold text-xl tracking-tight">
                Agent<span className="text-primary">Referrals</span><span className="text-muted-foreground text-xs font-medium">.ai</span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              {authMode === 'signin' ? 'Sign in to your referral network' : 'Create your account'}
            </p>

            {/* Tabs */}
            <div className="flex gap-1 p-1 rounded-lg bg-muted mb-6">
              <button
                onClick={() => { setAuthMode('signin'); setAuthError(null) }}
                className={`flex-1 h-8 rounded-md text-xs font-semibold transition-all ${
                  authMode === 'signin' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => { setAuthMode('signup'); setAuthError(null) }}
                className={`flex-1 h-8 rounded-md text-xs font-semibold transition-all ${
                  authMode === 'signup' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Sign Up
              </button>
            </div>

            {authError && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium mb-4">
                {authError}
              </div>
            )}

            <form onSubmit={async (e) => {
              e.preventDefault()
              setAuthLoading(true)
              setAuthError(null)
              const supabase = createClient()

              if (authMode === 'signin') {
                const { error } = await supabase.auth.signInWithPassword({ email, password })
                if (error) {
                  setAuthError(error.message)
                  setAuthLoading(false)
                  return
                }
              } else {
                const { error } = await supabase.auth.signUp({
                  email,
                  password,
                  options: { data: { full_name: fullName } },
                })
                if (error) {
                  setAuthError(error.message)
                  setAuthLoading(false)
                  return
                }
              }

              setAuthLoading(false)
              const params = new URLSearchParams(window.location.search)
              // New signups go to onboarding; returning users go to dashboard
              const defaultRedirect = authMode === 'signup' ? '/onboarding' : '/dashboard'
              const redirect = params.get('redirect') || defaultRedirect
              router.push(redirect)
            }}>
              {authMode === 'signup' && (
                <>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    required
                  />
                </>
              )}
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-primary/50"
                required
              />
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm mb-6 focus:outline-none focus:ring-2 focus:ring-primary/50"
                required
              />
              <button
                type="submit"
                disabled={authLoading}
                className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {authLoading ? 'Please wait...' : authMode === 'signin' ? 'Sign In' : 'Create Account'}
              </button>
            </form>
            <p className="text-center text-xs text-muted-foreground mt-5">
              Demo credentials pre-filled — <span className="text-primary font-medium cursor-pointer">click Sign In</span>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
