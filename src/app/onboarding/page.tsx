'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createHubClient } from '@/lib/supabase/hub'
import { createClient } from '@/lib/supabase/client'
import { brokerages } from '@/data/brokerages'
import { ALL_TAGS, TAG_COLORS } from '@/lib/constants'
import {
  Check,
  Sparkles,
  Loader2,
  Send,
  ArrowRight,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────

interface PastReferralEntry {
  direction: 'sent' | 'received'
  partnerName: string
  partnerEmail: string
  market: string
  salePrice: number
  closeYear: number
}

interface OnboardingData {
  brokerageId: string | null
  customBrokerage: string
  teamName: string
  isOnTeam: boolean
  fullName: string
  phone: string
  yearsLicensed: number | null
  referralsPerYear: number | null
  primaryArea: string
  avgSalePrice: number | null
  avgReferralFee: number
  specializations: string[]
  licenseNumber: string
  inviteEmails: string[]
  pastReferrals: PastReferralEntry[]
}

type InteractiveType =
  | { kind: 'chips'; options: string[]; selected?: string }
  | { kind: 'brokerage' }
  | { kind: 'brokerageAutocomplete' }
  | { kind: 'multiSelect'; options: string[]; selected: string[] }
  | { kind: 'input'; placeholder: string; type?: string }
  | { kind: 'licenseInput' }
  | { kind: 'dualInput'; fields: { key: string; placeholder: string; type?: string }[] }
  | { kind: 'emailList' }
  | { kind: 'buttons'; options: { label: string; value: string; primary?: boolean }[] }
  | { kind: 'pastReferralForm' }
  | { kind: 'profileSummary' }

interface ChatMessage {
  id: string
  role: 'nora' | 'user'
  content: string
  interactive?: InteractiveType
  resolved?: boolean // true once the user has answered this question
}

type OnboardingStep =
  | 'welcome'
  | 'brokerage'
  | 'custom_brokerage'
  | 'team'
  | 'team_name'
  | 'experience'
  | 'referral_volume'
  | 'service_area'
  | 'specializations'
  | 'avg_price'
  | 'referral_fee'
  | 'name_phone'
  | 'license_number'
  | 'invites'
  | 'invite_emails'
  | 'past_referrals'
  | 'past_referral_form'
  | 'summary'
  | 'complete'

const PROGRESS_STEPS = [
  { key: 'brokerage', label: 'Brokerage' },
  { key: 'team', label: 'Team' },
  { key: 'experience', label: 'Experience' },
  { key: 'service_area', label: 'Area' },
  { key: 'specializations', label: 'Specializations' },
  { key: 'avg_price', label: 'Pricing' },
  { key: 'name_phone', label: 'Profile' },
  { key: 'license_number', label: 'License' },
  { key: 'invites', label: 'Invites' },
  { key: 'past_referrals', label: 'Referrals' },
  { key: 'summary', label: 'Review' },
]

const STEP_ORDER: OnboardingStep[] = [
  'welcome',
  'brokerage',
  'custom_brokerage',
  'team',
  'team_name',
  'experience',
  'referral_volume',
  'service_area',
  'specializations',
  'avg_price',
  'referral_fee',
  'name_phone',
  'license_number',
  'invites',
  'invite_emails',
  'past_referrals',
  'past_referral_form',
  'complete',
]

const ALL_BROKERAGES = [
  'Real Broker LLC', 'eXp Realty', 'Compass', 'Keller Williams',
  'Berkshire Hathaway HomeServices', 'RE/MAX', "Sotheby's International Realty",
  'Coldwell Banker', 'Century 21', 'EXIT Realty', 'HomeSmart',
  'Fathom Realty', 'United Real Estate', 'Redfin', 'Douglas Elliman',
  'Howard Hanna', 'Weichert Realtors', 'Long & Foster', 'Windermere',
  'Baird & Warner', 'William Raveis', 'Engel & Völkers', 'Side Inc',
  'The Agency', 'Brown Harris Stevens', 'Corcoran Group', 'Alain Pinel',
  'Better Homes and Gardens RE', 'ERA Real Estate', 'NextHome',
  // Canadian
  'Royal LePage', 'Sutton Group', 'Right at Home Realty', 'RE/MAX Canada',
  'Century 21 Canada', 'Keller Williams Canada',
]

const STORAGE_KEY = 'ar_onboarding_state'

function getProgressIndex(step: OnboardingStep): number {
  const map: Record<string, number> = {
    welcome: -1,
    brokerage: 0,
    custom_brokerage: 0,
    team: 1,
    team_name: 1,
    experience: 2,
    referral_volume: 2,
    service_area: 3,
    specializations: 4,
    avg_price: 5,
    referral_fee: 5,
    name_phone: 6,
    license_number: 7,
    invites: 8,
    invite_emails: 8,
    past_referrals: 9,
    past_referral_form: 9,
    summary: 10,
    complete: 11,
  }
  return map[step] ?? -1
}

// ── Typing Indicator ───────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 nora-msg-enter">
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <Sparkles className="w-4 h-4 text-primary" />
      </div>
      <div className="bg-card border border-border rounded-2xl rounded-tl-md px-4 py-3 flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-primary/60 nora-typing-dot" />
        <div className="w-2 h-2 rounded-full bg-primary/60 nora-typing-dot" />
        <div className="w-2 h-2 rounded-full bg-primary/60 nora-typing-dot" />
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()
  const hub = createHubClient()
  const supabase = createClient()

  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isTyping, setIsTyping] = useState(false)

  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [data, setData] = useState<OnboardingData>({
    brokerageId: null,
    customBrokerage: '',
    teamName: '',
    isOnTeam: false,
    fullName: '',
    phone: '',
    yearsLicensed: null,
    referralsPerYear: null,
    primaryArea: '',
    avgSalePrice: null,
    avgReferralFee: 25,
    specializations: [],
    licenseNumber: '',
    inviteEmails: [],
    pastReferrals: [],
  })

  // For multi-select state (specializations)
  const [pendingSpecializations, setPendingSpecializations] = useState<string[]>([])
  // For email list state
  const [pendingEmails, setPendingEmails] = useState<string[]>([''])
  // For dual input state
  const [pendingDualInput, setPendingDualInput] = useState<Record<string, string>>({})
  // For text input
  const [inputValue, setInputValue] = useState('')
  // For brokerage autocomplete search
  const [brokerageSearch, setBrokerageSearch] = useState('')
  // For zip code validation error
  const [zipError, setZipError] = useState('')
  // For past referral form
  const [prDirection, setPrDirection] = useState<'sent' | 'received'>('sent')
  const [prPartnerName, setPrPartnerName] = useState('')
  const [prPartnerEmail, setPrPartnerEmail] = useState('')
  const [prMarket, setPrMarket] = useState('')
  const [prSalePrice, setPrSalePrice] = useState<number | null>(null)
  const [prCloseYear, setPrCloseYear] = useState<number | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const initializedRef = useRef(false)

  // ── Scroll to bottom on new messages ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // ── Load user info on mount ──
  useEffect(() => {
    type AuthUser = { id: string; email?: string | null; user_metadata?: Record<string, string> }

    const resolveUser = async (retries = 3): Promise<AuthUser | null> => {
      const { data: { user } } = await hub.auth.getUser() as { data: { user: AuthUser | null } }
      if (user) return user
      if (retries > 0) {
        await new Promise((r) => setTimeout(r, 500))
        return resolveUser(retries - 1)
      }
      return null
    }

    resolveUser().then((user) => {
      if (!user) {
        router.push('/')
        return
      }
      setUserId(user.id)
      setUserEmail(user.email ?? '')
      const name = user.user_metadata?.full_name ?? ''
      setUserName(name)
      setData((prev) => ({ ...prev, fullName: name }))
    })
  }, [hub, router])

  // ── Persist state to localStorage ──
  const saveToStorage = useCallback((newData: OnboardingData, step: OnboardingStep, msgs: ChatMessage[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ data: newData, step, messages: msgs }))
    } catch {
      // silently fail
    }
  }, [])

  // ── Restore state from localStorage on mount ──
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.data && parsed.step && parsed.messages) {
          setData(parsed.data)
          setCurrentStep(parsed.step)
          setMessages(parsed.messages)
          if (parsed.data.specializations) {
            setPendingSpecializations(parsed.data.specializations)
          }
          return
        }
      }
    } catch {
      // ignore parse errors
    }

    // No saved state — start fresh with welcome message
    addNoraMessage(
      "Hey! I'm NORA, your AI assistant at AgentReferrals. Let's get your profile set up \u2014 it'll only take a couple minutes.\n\nFirst up: what brokerage are you with?",
      { kind: 'brokerage' },
      'brokerage'
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Helper: add a NORA message with typing delay ──
  const addNoraMessage = useCallback((
    content: string,
    interactive?: InteractiveType,
    nextStep?: OnboardingStep
  ) => {
    setIsTyping(true)
    const delay = Math.min(400 + content.length * 3, 900)
    setTimeout(() => {
      setIsTyping(false)
      const msg: ChatMessage = {
        id: `nora-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        role: 'nora',
        content,
        interactive,
        resolved: false,
      }
      setMessages((prev) => {
        const updated = [...prev, msg]
        if (nextStep) {
          setCurrentStep(nextStep)
          saveToStorage(data, nextStep, updated)
        }
        return updated
      })
    }, delay)
  }, [data, saveToStorage])

  // ── Helper: add a user message ──
  const addUserMessage = useCallback((content: string) => {
    setMessages((prev) => {
      // Mark the last NORA message as resolved
      const updated = prev.map((m, i) =>
        i === prev.length - 1 && m.role === 'nora' ? { ...m, resolved: true } : m
      )
      return [
        ...updated,
        {
          id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          role: 'user',
          content,
        },
      ]
    })
  }, [])

  // ── Update data helper ──
  const updateData = useCallback((updates: Partial<OnboardingData>) => {
    setData((prev) => {
      const next = { ...prev, ...updates }
      return next
    })
  }, [])

  // ── Get brokerage name by ID ──
  const getBrokerageName = (id: string | null): string => {
    if (!id) return 'Not selected'
    if (id === 'other') return data.customBrokerage || 'Other / Independent'
    const match = brokerages.find((b) => b.id === id)
    return match?.name ?? 'Not selected'
  }

  // ── Handle chip selection ──
  const handleChipSelect = useCallback((value: string) => {
    switch (currentStep) {
      case 'brokerage': {
        const brokerageId = value === 'other' ? 'other' : value
        updateData({ brokerageId })
        const bName = brokerageId === 'other' ? 'Other / Independent' : getBrokerageName(brokerageId)
        addUserMessage(bName)

        if (brokerageId === 'other') {
          setTimeout(() => {
            addNoraMessage(
              "What's the name of your brokerage?",
              { kind: 'brokerageAutocomplete' },
              'custom_brokerage'
            )
          }, 200)
        } else {
          setTimeout(() => {
            addNoraMessage(
              `Got it! Are you on a team at ${bName}, or do you work independently?`,
              { kind: 'buttons', options: [
                { label: "I'm on a team", value: 'team' },
                { label: 'Independent', value: 'independent', primary: false },
              ]},
              'team'
            )
          }, 200)
        }
        break
      }

      case 'team': {
        const isTeam = value === 'team'
        updateData({ isOnTeam: isTeam })
        addUserMessage(isTeam ? "I'm on a team" : 'Independent')

        if (isTeam) {
          setTimeout(() => {
            addNoraMessage(
              "What's your team name?",
              { kind: 'input', placeholder: 'Enter your team name' },
              'team_name'
            )
          }, 200)
        } else {
          setTimeout(() => {
            addNoraMessage(
              'How long have you been a licensed agent?',
              { kind: 'chips', options: ['< 1 year', '1-3 years', '3-5 years', '5-10 years', '10+ years'] },
              'experience'
            )
          }, 200)
        }
        break
      }

      case 'experience': {
        const yearMap: Record<string, number> = {
          '< 1 year': 0,
          '1-3 years': 2,
          '3-5 years': 4,
          '5-10 years': 7,
          '10+ years': 15,
        }
        updateData({ yearsLicensed: yearMap[value] ?? null })
        addUserMessage(value)

        setTimeout(() => {
          addNoraMessage(
            'How many referrals do you typically send or receive per year?',
            { kind: 'chips', options: ['0-5', '5-10', '10-20', '20+'] },
            'referral_volume'
          )
        }, 200)
        break
      }

      case 'referral_volume': {
        const refMap: Record<string, number> = { '0-5': 3, '5-10': 7, '10-20': 15, '20+': 25 }
        updateData({ referralsPerYear: refMap[value] ?? null })
        addUserMessage(value)

        setTimeout(() => {
          addNoraMessage(
            "What's your primary zip code? This is the main area where you work.",
            { kind: 'input', placeholder: 'e.g. 90210', type: 'text' },
            'service_area'
          )
        }, 200)
        break
      }

      case 'avg_price': {
        const priceMap: Record<string, number> = {
          '$100k-250k': 175000,
          '$250k-500k': 375000,
          '$500k-750k': 625000,
          '$750k-1M': 875000,
          '$1M+': 1500000,
        }
        updateData({ avgSalePrice: priceMap[value] ?? null })
        addUserMessage(value)

        setTimeout(() => {
          addNoraMessage(
            'What referral fee percentage do you typically work with?',
            { kind: 'chips', options: ['20%', '25%', '30%', 'Other'], selected: '25%' },
            'referral_fee'
          )
        }, 200)
        break
      }

      case 'referral_fee': {
        const feeMap: Record<string, number> = { '20%': 20, '25%': 25, '30%': 30 }
        if (value === 'Other') {
          addUserMessage('Other')
          setTimeout(() => {
            addNoraMessage(
              'What percentage do you typically work with?',
              { kind: 'input', placeholder: 'e.g. 22', type: 'number' },
              'referral_fee'
            )
          }, 200)
        } else {
          updateData({ avgReferralFee: feeMap[value] ?? 25 })
          addUserMessage(value)
          proceedToNamePhone()
        }
        break
      }

      case 'invites': {
        addUserMessage(value === 'send' ? 'Send Invites' : 'Skip for Now')

        if (value === 'send') {
          setTimeout(() => {
            addNoraMessage(
              'Enter up to 5 email addresses of agents you want to invite.',
              { kind: 'emailList' },
              'invite_emails'
            )
          }, 200)
        } else {
          proceedToPastReferrals()
        }
        break
      }

      case 'past_referrals': {
        addUserMessage(value === 'add' ? 'Add Past Referrals' : 'Skip for Now')

        if (value === 'add') {
          setTimeout(() => {
            addNoraMessage(
              "Let's add one. Tell me about the referral:",
              { kind: 'pastReferralForm' },
              'past_referral_form'
            )
          }, 200)
        } else {
          showSummary()
        }
        break
      }

      case 'past_referral_form': {
        // "Add Another" or "Continue"
        if (value === 'another') {
          addUserMessage('Add Another')
          // Reset form state
          setPrDirection('sent')
          setPrPartnerName('')
          setPrPartnerEmail('')
          setPrMarket('')
          setPrSalePrice(null)
          setPrCloseYear(null)
          setTimeout(() => {
            addNoraMessage(
              "Let's add another one:",
              { kind: 'pastReferralForm' },
              'past_referral_form'
            )
          }, 200)
        } else {
          addUserMessage('Continue')
          showSummary()
        }
        break
      }

      default:
        break
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, data])

  // ── Handle text input submission ──
  const handleInputSubmit = useCallback((value: string) => {
    if (!value.trim()) return
    setInputValue('')

    switch (currentStep) {
      case 'custom_brokerage': {
        updateData({ brokerageId: 'other', customBrokerage: value.trim() })
        addUserMessage(value.trim())

        setTimeout(() => {
          addNoraMessage(
            `Got it! Are you on a team at ${value.trim()}, or do you work independently?`,
            { kind: 'buttons', options: [
              { label: "I'm on a team", value: 'team' },
              { label: 'Independent', value: 'independent', primary: false },
            ]},
            'team'
          )
        }, 200)
        break
      }

      case 'team_name': {
        updateData({ teamName: value.trim() })
        addUserMessage(value.trim())

        setTimeout(() => {
          addNoraMessage(
            'How long have you been a licensed agent?',
            { kind: 'chips', options: ['< 1 year', '1-3 years', '3-5 years', '5-10 years', '10+ years'] },
            'experience'
          )
        }, 200)
        break
      }

      case 'experience': {
        const num = parseInt(value.trim(), 10)
        if (!isNaN(num)) {
          updateData({ yearsLicensed: num })
          addUserMessage(`${num} years`)

          setTimeout(() => {
            addNoraMessage(
              'How many referrals do you typically send or receive per year?',
              { kind: 'chips', options: ['0-5', '5-10', '10-20', '20+'] },
              'referral_volume'
            )
          }, 200)
        }
        break
      }

      case 'referral_volume': {
        const num = parseInt(value.trim(), 10)
        if (!isNaN(num)) {
          updateData({ referralsPerYear: num })
          addUserMessage(`${num} per year`)

          setTimeout(() => {
            addNoraMessage(
              "What's your primary zip code? This is the main area where you work.",
              { kind: 'input', placeholder: 'e.g. 90210', type: 'text' },
              'service_area'
            )
          }, 200)
        }
        break
      }

      case 'service_area': {
        const zip = value.trim()
        if (!/^\d{5}$/.test(zip)) {
          setZipError('Please enter a valid 5-digit zip code.')
          return
        }
        setZipError('')
        updateData({ primaryArea: zip })
        addUserMessage(zip)

        setTimeout(() => {
          addNoraMessage(
            "You can add more service areas later from your Settings.\n\nWhat types of properties do you specialize in? Select all that apply.",
            { kind: 'multiSelect', options: ALL_TAGS, selected: [] },
            'specializations'
          )
        }, 200)
        break
      }

      case 'avg_price': {
        const num = parseInt(value.trim().replace(/[$,]/g, ''), 10)
        if (!isNaN(num)) {
          updateData({ avgSalePrice: num })
          addUserMessage(`$${num.toLocaleString()}`)

          setTimeout(() => {
            addNoraMessage(
              'What referral fee percentage do you typically work with?',
              { kind: 'chips', options: ['20%', '25%', '30%', 'Other'], selected: '25%' },
              'referral_fee'
            )
          }, 200)
        }
        break
      }

      case 'referral_fee': {
        const num = parseInt(value.trim().replace('%', ''), 10)
        if (!isNaN(num) && num > 0 && num <= 100) {
          updateData({ avgReferralFee: num })
          addUserMessage(`${num}%`)
          proceedToNamePhone()
        }
        break
      }

      case 'license_number': {
        const license = value.trim()
        updateData({ licenseNumber: license })
        addUserMessage(license)
        proceedToInvites()
        break
      }

      default:
        break
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep])

  // ── Proceed to name/phone step ──
  const proceedToNamePhone = useCallback(() => {
    setTimeout(() => {
      addNoraMessage(
        "Almost done! What's your full name and phone number?",
        { kind: 'dualInput', fields: [
          { key: 'fullName', placeholder: 'Full name', type: 'text' },
          { key: 'phone', placeholder: '(555) 123-4567', type: 'tel' },
        ]},
        'name_phone'
      )
    }, 200)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Proceed to invites step ──
  const proceedToInvites = useCallback(() => {
    setTimeout(() => {
      addNoraMessage(
        `You're all set! AgentReferrals is invite-only during our founding member period. You have 5 invite codes to share with agents you trust. Want to send some now, or skip for later?`,
        { kind: 'buttons', options: [
          { label: 'Send Invites', value: 'send', primary: true },
          { label: 'Skip for Now', value: 'skip' },
        ]},
        'invites'
      )
    }, 200)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Handle dual input submission ──
  const handleDualInputSubmit = useCallback(() => {
    const name = pendingDualInput.fullName?.trim() || data.fullName
    const phone = pendingDualInput.phone?.trim() || ''
    if (!name) return

    updateData({ fullName: name, phone })
    addUserMessage(`${name}${phone ? ` \u2022 ${phone}` : ''}`)
    setPendingDualInput({})

    setTimeout(() => {
      addNoraMessage(
        "What's your real estate license number? This helps us verify your credentials and adds a trust badge to your profile.",
        { kind: 'licenseInput' },
        'license_number'
      )
    }, 200)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingDualInput, data.fullName])

  // ── Handle multi-select continue ──
  const handleSpecializationsContinue = useCallback(() => {
    if (pendingSpecializations.length === 0) return

    updateData({ specializations: pendingSpecializations })
    addUserMessage(pendingSpecializations.join(', '))

    setTimeout(() => {
      addNoraMessage(
        "What's the average price of homes you sell?",
        { kind: 'chips', options: ['$100k-250k', '$250k-500k', '$500k-750k', '$750k-1M', '$1M+'] },
        'avg_price'
      )
    }, 200)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSpecializations])

  // ── Handle email list submission ──
  const handleEmailsSubmit = useCallback(() => {
    const validEmails = pendingEmails.filter((e) => e.trim() && e.includes('@'))
    updateData({ inviteEmails: validEmails })
    addUserMessage(validEmails.length > 0 ? `Inviting: ${validEmails.join(', ')}` : 'No invites sent')
    setPendingEmails([''])
    proceedToPastReferrals()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingEmails])

  // ── Proceed to past referrals step ──
  const proceedToPastReferrals = useCallback(() => {
    setTimeout(() => {
      addNoraMessage(
        "One more thing \u2014 have you done any referral deals in the past? Adding them helps build your verified track record. Other agents can see how many verified referrals you've completed.",
        { kind: 'buttons', options: [
          { label: 'Add Past Referrals', value: 'add', primary: true },
          { label: 'Skip for Now', value: 'skip' },
        ]},
        'past_referrals'
      )
    }, 200)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Handle past referral form submission ──
  const handlePastReferralSubmit = useCallback(() => {
    if (!prPartnerName || !prPartnerEmail) return

    const entry: PastReferralEntry = {
      direction: prDirection,
      partnerName: prPartnerName,
      partnerEmail: prPartnerEmail,
      market: prMarket,
      salePrice: prSalePrice ?? 0,
      closeYear: prCloseYear ?? 2025,
    }

    setData((prev) => ({
      ...prev,
      pastReferrals: [...prev.pastReferrals, entry],
    }))

    addUserMessage(`${prDirection === 'sent' ? 'Sent' : 'Received'} referral with ${prPartnerName} \u2022 ${prMarket || 'Unknown market'}`)

    // Reset form
    setPrDirection('sent')
    setPrPartnerName('')
    setPrPartnerEmail('')
    setPrMarket('')
    setPrSalePrice(null)
    setPrCloseYear(null)

    setTimeout(() => {
      addNoraMessage(
        "Got it! Want to add another, or continue?",
        { kind: 'buttons', options: [
          { label: 'Add Another', value: 'another', primary: true },
          { label: 'Continue', value: 'continue' },
        ]},
        'past_referral_form'
      )
    }, 200)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prDirection, prPartnerName, prPartnerEmail, prMarket, prSalePrice, prCloseYear])

  // ── Show summary for review ──
  const showSummary = useCallback(() => {
    setTimeout(() => {
      addNoraMessage(
        "Here's a summary of your profile. Everything look right?",
        { kind: 'profileSummary' },
        'summary'
      )
    }, 200)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Complete onboarding ──
  const completeOnboarding = useCallback(() => {
    const finalName = data.fullName || userName || 'there'
    setTimeout(() => {
      addNoraMessage(
        `Welcome to AgentReferrals, ${finalName.split(' ')[0]}! Your profile is live. Head to your dashboard to explore your network.`,
        { kind: 'buttons', options: [
          { label: 'Go to Dashboard', value: 'dashboard', primary: true },
        ]},
        'complete'
      )
    }, 200)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.fullName, userName])

  // ── Handle final submission + navigate ──
  const handleComplete = useCallback(async () => {
    if (!userId) return
    setIsSubmitting(true)

    // Resolve brokerage ID
    let brokerageIdForDb: string | null = null
    if (data.brokerageId && data.brokerageId !== 'other') {
      const selectedBrokerage = brokerages.find((b) => b.id === data.brokerageId)
      if (selectedBrokerage) {
        const { data: brokerageRow } = await supabase
          .from('ar_brokerages')
          .select('id')
          .eq('name', selectedBrokerage.name)
          .single()
        brokerageIdForDb = brokerageRow?.id ?? null
      }
    }

    const upsertPayload = {
      id: userId,
      email: userEmail,
      full_name: data.fullName.trim(),
      phone: data.phone.trim() || null,
      brokerage_id: brokerageIdForDb,
      primary_area: data.primaryArea.trim(),
      years_licensed: data.yearsLicensed,
      deals_per_year: data.referralsPerYear,
      avg_sale_price: data.avgSalePrice,
      avg_referral_fee: data.avgReferralFee,
      team_name: data.teamName.trim() || null,
      is_on_team: data.isOnTeam,
      license_number: data.licenseNumber.trim() || null,
      tags: data.specializations,
      polygon: [],
      territory_zips: data.primaryArea
        .split(',')
        .map((s) => s.trim())
        .filter((s) => /^\d{5}$/.test(s)),
      status: 'active',
      updated_at: new Date().toISOString(),
    }

    // Clean up territory_zips
    if (upsertPayload.territory_zips.length === 0) {
      upsertPayload.territory_zips = null as unknown as string[]
    }

    const { error } = await supabase
      .from('ar_profiles')
      .upsert(upsertPayload, { onConflict: 'id' })

    if (error) {
      console.error('[Onboarding] Profile upsert failed:', error.message)
    }

    // ── Fire-and-forget license verification ──
    if (data.licenseNumber.trim()) {
      fetch('/api/verify-license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          licenseNumber: data.licenseNumber.trim(),
          licenseState: '', // We don't ask for state separately in onboarding
          fullName: data.fullName.trim(),
        }),
      }).catch(() => {})
    }

    // ── Hub registration ──
    try {
      const hubClient = createHubClient()
      const areaParts = data.primaryArea.split(',').map((s: string) => s.trim())
      const city = areaParts[0] || ''
      const state = areaParts[1] || ''

      await hubClient.from('agents').upsert({
        profile_id: userId,
        email: userEmail,
        first_name: data.fullName.split(' ')[0] || '',
        last_name: data.fullName.split(' ').slice(1).join(' ') || '',
        phone: data.phone.trim() || null,
        city,
        state,
        is_agent: true,
        is_active: true,
        metadata: {
          source_platform: 'agentreferrals',
          years_licensed: data.yearsLicensed,
          deals_per_year: data.referralsPerYear,
          avg_sale_price: data.avgSalePrice,
          specializations: data.specializations,
          avg_referral_fee: data.avgReferralFee,
          team_name: data.teamName || null,
          is_on_team: data.isOnTeam,
        },
      }, { onConflict: 'profile_id' })

      const { data: platform } = await hubClient
        .from('platforms')
        .select('id')
        .eq('slug', 'agentreferrals')
        .single()

      if (platform) {
        await hubClient.from('user_products').upsert({
          profile_id: userId,
          product_id: platform.id,
          status: 'active',
          tier: 'free',
        }, { onConflict: 'profile_id,product_id' })
      }
    } catch (hubError) {
      console.error('[Onboarding] Hub registration failed:', hubError)
    }

    // Clear saved state
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }

    router.push('/dashboard')
  }, [userId, userEmail, data, supabase, router])

  // ── Render interactive elements ──
  const renderInteractive = (msg: ChatMessage) => {
    if (!msg.interactive || msg.resolved) return null
    const interactive = msg.interactive

    switch (interactive.kind) {
      case 'brokerage':
        return (
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-lg">
            {brokerages.map((b) => (
              <button
                key={b.id}
                onClick={() => handleChipSelect(b.id)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-border bg-card hover:bg-accent hover:border-primary/30 transition-all text-left"
              >
                {b.logoUrl ? (
                  <div className="w-8 h-8 rounded-lg bg-white border border-border flex items-center justify-center p-1 overflow-hidden shrink-0">
                    <img src={b.logoUrl} alt={b.name} className="w-7 h-7 object-contain" />
                  </div>
                ) : (
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center font-extrabold text-[10px] text-white shrink-0"
                    style={{ background: b.color }}
                  >
                    {b.logo}
                  </div>
                )}
                <span className="text-xs font-semibold truncate">{b.name}</span>
              </button>
            ))}
            <button
              onClick={() => handleChipSelect('other')}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-border bg-card hover:bg-accent hover:border-primary/30 transition-all text-left"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs bg-muted text-muted-foreground shrink-0">
                +
              </div>
              <span className="text-xs font-semibold">Other / Independent</span>
            </button>
          </div>
        )

      case 'chips':
        return (
          <div className="mt-3 flex flex-wrap gap-2">
            {interactive.options.map((opt) => (
              <button
                key={opt}
                onClick={() => handleChipSelect(opt)}
                className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                  interactive.selected === opt
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border bg-card hover:bg-accent'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        )

      case 'buttons': {
        const skippableSteps: OnboardingStep[] = ['invites', 'past_referrals']
        const isSkippable = skippableSteps.includes(currentStep)
        return (
          <div className="mt-3">
            <div className="flex flex-wrap gap-2">
              {interactive.options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    if (opt.value === 'dashboard') {
                      handleComplete()
                    } else {
                      handleChipSelect(opt.value)
                    }
                  }}
                  className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    opt.primary !== false
                      ? 'bg-primary text-primary-foreground hover:opacity-90'
                      : 'border border-border bg-card hover:bg-accent'
                  }`}
                >
                  {opt.value === 'dashboard' && isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      {opt.label}
                      {opt.value === 'dashboard' && <ArrowRight className="w-4 h-4" />}
                    </span>
                  )}
                </button>
              ))}
            </div>
            {isSkippable && (
              <button
                onClick={() => {
                  addUserMessage("I'll do this later")
                  if (currentStep === 'invites') {
                    proceedToPastReferrals()
                  } else if (currentStep === 'past_referrals') {
                    showSummary()
                  }
                }}
                className="text-xs text-muted-foreground hover:text-foreground mt-2 underline underline-offset-2"
              >
                Do this later
              </button>
            )}
          </div>
        )
      }

      case 'input':
        return (
          <div className="mt-3 max-w-md">
            <div className="flex gap-2">
              <input
                type={interactive.type || 'text'}
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value)
                  if (currentStep === 'service_area') setZipError('')
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleInputSubmit(inputValue)
                  }
                }}
                placeholder={interactive.placeholder}
                className="flex-1 h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                autoFocus
              />
              <button
                onClick={() => handleInputSubmit(inputValue)}
                className="h-10 w-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            {currentStep === 'service_area' && zipError && (
              <p className="text-xs text-red-500 mt-1.5">{zipError}</p>
            )}
          </div>
        )

      case 'brokerageAutocomplete': {
        const filtered = brokerageSearch.trim().length > 0
          ? ALL_BROKERAGES.filter((b) =>
              b.toLowerCase().includes(brokerageSearch.toLowerCase())
            ).slice(0, 5)
          : []
        const hasMatches = filtered.length > 0
        return (
          <div className="mt-3 max-w-md space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={brokerageSearch}
                onChange={(e) => setBrokerageSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && brokerageSearch.trim()) {
                    handleInputSubmit(brokerageSearch.trim())
                    setBrokerageSearch('')
                  }
                }}
                placeholder="Start typing..."
                className="flex-1 h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                autoFocus
              />
              <button
                onClick={() => {
                  if (brokerageSearch.trim()) {
                    handleInputSubmit(brokerageSearch.trim())
                    setBrokerageSearch('')
                  }
                }}
                className="h-10 w-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            {brokerageSearch.trim().length > 0 && (
              <>
                {hasMatches ? (
                  <div className="flex flex-wrap gap-1.5">
                    {filtered.map((name) => (
                      <button
                        key={name}
                        onClick={() => {
                          handleInputSubmit(name)
                          setBrokerageSearch('')
                        }}
                        className="px-3 py-1.5 rounded-full border border-border bg-card text-xs font-medium hover:bg-accent hover:border-primary/30 transition-all"
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {"Can't find your brokerage? Just type the name and hit enter."}
                  </p>
                )}
              </>
            )}
          </div>
        )
      }

      case 'licenseInput':
        return (
          <div className="mt-3 max-w-md">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && inputValue.trim()) {
                    handleInputSubmit(inputValue)
                  }
                }}
                placeholder="e.g. 6501234567"
                className="flex-1 h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                autoFocus
              />
              <button
                onClick={() => {
                  if (inputValue.trim()) handleInputSubmit(inputValue)
                }}
                className="h-10 w-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={() => {
                addUserMessage("I'll do this later")
                setInputValue('')
                proceedToInvites()
              }}
              className="text-xs text-muted-foreground hover:text-foreground mt-2 underline underline-offset-2"
            >
              Do this later
            </button>
          </div>
        )

      case 'dualInput':
        return (
          <div className="mt-3 space-y-2 max-w-md">
            {interactive.fields.map((field) => (
              <input
                key={field.key}
                type={field.type || 'text'}
                value={pendingDualInput[field.key] ?? (field.key === 'fullName' ? data.fullName : '')}
                onChange={(e) => setPendingDualInput((prev) => ({ ...prev, [field.key]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleDualInputSubmit()
                }}
                placeholder={field.placeholder}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                autoFocus={field.key === 'fullName'}
              />
            ))}
            <button
              onClick={handleDualInputSubmit}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )

      case 'multiSelect':
        return (
          <div className="mt-3 space-y-3 max-w-lg">
            <div className="flex flex-wrap gap-2">
              {interactive.options.map((tag) => {
                const isSelected = pendingSpecializations.includes(tag)
                const color = TAG_COLORS[tag] ?? '#6b7280'
                return (
                  <button
                    key={tag}
                    onClick={() => {
                      setPendingSpecializations((prev) =>
                        prev.includes(tag)
                          ? prev.filter((t) => t !== tag)
                          : [...prev, tag]
                      )
                    }}
                    className={`px-4 py-2 rounded-full border text-sm font-semibold transition-all ${
                      isSelected
                        ? 'shadow-md scale-105'
                        : 'border-border bg-card hover:border-primary/30 hover:shadow-sm'
                    }`}
                    style={
                      isSelected
                        ? { borderColor: color, backgroundColor: `${color}15`, color }
                        : undefined
                    }
                  >
                    {isSelected && <Check className="w-3 h-3 inline mr-1" />}
                    {tag}
                  </button>
                )
              })}
            </div>
            {pendingSpecializations.length > 0 && (
              <button
                onClick={handleSpecializationsContinue}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all"
              >
                Continue with {pendingSpecializations.length} selected
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
            {pendingSpecializations.length === 0 && (
              <p className="text-xs text-muted-foreground">Select at least 1 to continue</p>
            )}
          </div>
        )

      case 'emailList':
        return (
          <div className="mt-3 space-y-2 max-w-md">
            {pendingEmails.map((email, i) => (
              <input
                key={i}
                type="email"
                value={email}
                onChange={(e) => {
                  setPendingEmails((prev) => {
                    const updated = [...prev]
                    updated[i] = e.target.value
                    return updated
                  })
                }}
                placeholder={`agent${i + 1}@email.com`}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                autoFocus={i === 0}
              />
            ))}
            <div className="flex gap-2">
              {pendingEmails.length < 5 && (
                <button
                  onClick={() => setPendingEmails((prev) => [...prev, ''])}
                  className="px-4 py-2 rounded-lg border border-border bg-card text-sm font-medium hover:bg-accent transition-colors"
                >
                  + Add another
                </button>
              )}
              <button
                onClick={handleEmailsSubmit}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all"
              >
                {pendingEmails.some((e) => e.trim() && e.includes('@')) ? 'Send Invites' : 'Skip'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={() => {
                addUserMessage("I'll do this later")
                setPendingEmails([''])
                proceedToPastReferrals()
              }}
              className="text-xs text-muted-foreground hover:text-foreground mt-2 underline underline-offset-2"
            >
              Do this later
            </button>
          </div>
        )

      case 'pastReferralForm':
        return (
          <div className="mt-3 space-y-3 max-w-md">
            {/* Direction toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setPrDirection('sent')}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                  prDirection === 'sent'
                    ? 'bg-blue-500/10 text-blue-600 border border-blue-500/30'
                    : 'border border-border bg-card hover:bg-accent'
                }`}
              >
                I sent
              </button>
              <button
                onClick={() => setPrDirection('received')}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                  prDirection === 'received'
                    ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30'
                    : 'border border-border bg-card hover:bg-accent'
                }`}
              >
                I received
              </button>
            </div>

            {/* Partner name */}
            <input
              type="text"
              value={prPartnerName}
              onChange={(e) => setPrPartnerName(e.target.value)}
              placeholder="Partner name"
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />

            {/* Partner email */}
            <input
              type="email"
              value={prPartnerEmail}
              onChange={(e) => setPrPartnerEmail(e.target.value)}
              placeholder="Partner email"
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />

            {/* Market */}
            <input
              type="text"
              value={prMarket}
              onChange={(e) => setPrMarket(e.target.value)}
              placeholder="Market (e.g. Nashville, TN)"
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />

            {/* Sale price chips */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Approximate sale price</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: '$100k-250k', value: 175000 },
                  { label: '$250k-500k', value: 375000 },
                  { label: '$500k-750k', value: 625000 },
                  { label: '$750k+', value: 1000000 },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => setPrSalePrice(opt.value)}
                    className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                      prSalePrice === opt.value
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border bg-card hover:bg-accent'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Close year chips */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Close year</label>
              <div className="flex gap-2">
                {[2024, 2025, 2026].map((year) => (
                  <button
                    key={year}
                    onClick={() => setPrCloseYear(year)}
                    className={`px-4 py-1.5 rounded-full border text-xs font-medium transition-all ${
                      prCloseYear === year
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border bg-card hover:bg-accent'
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handlePastReferralSubmit}
              disabled={!prPartnerName || !prPartnerEmail}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Referral
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                addUserMessage("I'll do this later")
                showSummary()
              }}
              className="text-xs text-muted-foreground hover:text-foreground mt-2 underline underline-offset-2"
            >
              Do this later
            </button>
          </div>
        )

      case 'profileSummary': {
        const brokerageName = getBrokerageName(data.brokerageId)
        const priceLabel = data.avgSalePrice ? `$${data.avgSalePrice.toLocaleString()}` : 'Not set'
        return (
          <div className="mt-3 max-w-lg space-y-3">
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Name</div>
                  <div className="text-sm font-semibold mt-0.5">{data.fullName || '—'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Phone</div>
                  <div className="text-sm font-semibold mt-0.5">{data.phone || '—'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Brokerage</div>
                  <div className="text-sm font-semibold mt-0.5">{brokerageName}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Team</div>
                  <div className="text-sm font-semibold mt-0.5">{data.isOnTeam ? data.teamName || 'Yes' : 'Independent'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Years Licensed</div>
                  <div className="text-sm font-semibold mt-0.5">{data.yearsLicensed ?? '—'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Referrals / Year</div>
                  <div className="text-sm font-semibold mt-0.5">{data.referralsPerYear ?? '—'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Avg Sale Price</div>
                  <div className="text-sm font-semibold mt-0.5">{priceLabel}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Referral Fee</div>
                  <div className="text-sm font-semibold mt-0.5">{data.avgReferralFee}%</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">License Number</div>
                  <div className={`text-sm font-semibold mt-0.5 ${!data.licenseNumber ? 'text-muted-foreground' : ''}`}>
                    {data.licenseNumber || 'Not provided'}
                  </div>
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Service Area</div>
                <div className="text-sm font-semibold mt-0.5">{data.primaryArea || '—'}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Specializations</div>
                <div className="flex flex-wrap gap-1.5">
                  {data.specializations.length > 0 ? data.specializations.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold text-white"
                      style={{ background: TAG_COLORS[tag] || '#6b7280' }}
                    >
                      {tag}
                    </span>
                  )) : <span className="text-sm text-muted-foreground">—</span>}
                </div>
              </div>
              {data.pastReferrals.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Past Referrals</div>
                  <div className="text-sm font-semibold mt-0.5">{data.pastReferrals.length} submitted for verification</div>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  addUserMessage('Looks good!')
                  completeOnboarding()
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all"
              >
                <Check className="w-4 h-4" />
                Looks Good!
              </button>
              <button
                onClick={() => {
                  addUserMessage('I want to make changes')
                  // Reset to beginning — clear messages and restart
                  setMessages([])
                  setCurrentStep('welcome')
                  localStorage.removeItem(STORAGE_KEY)
                  setTimeout(() => {
                    addNoraMessage(
                      "No problem! Let's go through it again. What brokerage are you with?",
                      { kind: 'brokerage' },
                      'brokerage'
                    )
                  }, 200)
                }}
                className="px-5 py-2.5 rounded-xl border border-border bg-card text-sm font-semibold hover:bg-accent transition-colors"
              >
                Make Changes
              </button>
            </div>
          </div>
        )
      }

      default:
        return null
    }
  }

  // ── Progress bar ──
  const progressIdx = getProgressIndex(currentStep)
  const progressPercent = progressIdx >= 0 ? ((progressIdx + 1) / PROGRESS_STEPS.length) * 100 : 0

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="h-14 min-h-14 flex items-center justify-between px-6 border-b border-border bg-card">
        <a href="/dashboard" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center font-extrabold text-xs text-primary-foreground">
            A
          </div>
          <span className="font-extrabold text-[15px] tracking-tight">
            Agent<span className="text-primary">Referrals</span>
            <span className="text-muted-foreground text-xs font-medium">.ai</span>
          </span>
        </a>
        <a
          href="/dashboard"
          className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip for now &rarr;
        </a>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Progress step dots */}
      <div className="flex items-center justify-center gap-2 py-3 px-4 border-b border-border bg-card/50">
        {PROGRESS_STEPS.map((s, i) => {
          const isComplete = progressIdx > i
          const isCurrent = progressIdx === i
          return (
            <div key={s.key} className="flex items-center gap-2">
              {i > 0 && (
                <div className={`w-6 h-px ${isComplete ? 'bg-primary' : 'bg-border'}`} />
              )}
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                    isComplete
                      ? 'bg-primary text-primary-foreground'
                      : isCurrent
                        ? 'bg-primary/10 text-primary border-2 border-primary'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isComplete ? <Check className="w-3 h-3" /> : i + 1}
                </div>
                <span
                  className={`text-[10px] font-medium hidden md:block ${
                    isCurrent
                      ? 'text-foreground'
                      : isComplete
                        ? 'text-primary'
                        : 'text-muted-foreground'
                  }`}
                >
                  {s.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Chat area */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className="nora-msg-enter">
              {msg.role === 'nora' ? (
                <div>
                  {/* NORA message */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="bg-card border border-border rounded-2xl rounded-tl-md px-4 py-3 text-sm leading-relaxed whitespace-pre-line max-w-lg">
                        {msg.content}
                      </div>
                      {renderInteractive(msg)}
                    </div>
                  </div>
                </div>
              ) : (
                /* User message */
                <div className="flex justify-end">
                  <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-md px-4 py-3 text-sm leading-relaxed max-w-md">
                    {msg.content}
                  </div>
                </div>
              )}
            </div>
          ))}

          {isTyping && <TypingIndicator />}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Bottom bar — subtle branding */}
      <div className="h-12 flex items-center justify-center border-t border-border bg-card/50">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span>Powered by <span className="font-semibold text-foreground">NORA</span> AI</span>
        </div>
      </div>
    </div>
  )
}
