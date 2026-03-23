'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { brokerages } from '@/data/brokerages'
import { useSpecializations } from '@/hooks/use-specializations'
import {
  Check,
  CheckCircle2,
  Sparkles,
  Loader2,
  Send,
  ArrowRight,
  Phone,
  Camera,
} from 'lucide-react'
import type {
  OnboardingData,
  PastReferralEntry,
  InteractiveType,
  ChatMessage,
  OnboardingStep,
} from '@/types/onboarding'

// ── Constants ──────────────────────────────────────────────────────────

const ALL_BROKERAGES = [
  'Real Broker LLC', 'eXp Realty', 'Compass', 'Keller Williams',
  'Berkshire Hathaway HomeServices', 'RE/MAX', "Sotheby's International Realty",
  'Coldwell Banker', 'Century 21', 'EXIT Realty', 'HomeSmart',
  'Fathom Realty', 'United Real Estate', 'Redfin', 'Douglas Elliman',
  'Howard Hanna', 'Weichert Realtors', 'Long & Foster', 'Windermere',
  'Baird & Warner', 'William Raveis', 'Engel & Völkers', 'Side Inc',
  'The Agency', 'Brown Harris Stevens', 'Corcoran Group', 'Alain Pinel',
  'Better Homes and Gardens RE', 'ERA Real Estate', 'NextHome',
  'Royal LePage', 'Sutton Group', 'Right at Home Realty', 'RE/MAX Canada',
  'Century 21 Canada', 'Keller Williams Canada',
]

const STORAGE_KEY = 'ar_nora_intake_state'

const PROGRESS_STEPS = [
  { key: 'brokerage', label: 'Brokerage' },
  { key: 'team', label: 'Team' },
  { key: 'experience', label: 'Experience' },
  { key: 'service_area', label: 'Location' },
  { key: 'specializations', label: 'Specializations' },
  { key: 'avg_price', label: 'Pricing' },
  { key: 'license_number', label: 'License' },
  { key: 'photo_upload', label: 'Photo' },
  { key: 'phone_verify', label: 'Verify' },
  { key: 'summary', label: 'Review' },
]

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
    name_phone: 5,
    license_number: 6,
    photo_upload: 7,
    phone_verify: 8,
    phone_code: 7,
    summary: 8,
    complete: 9,
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

// ── Props ──────────────────────────────────────────────────────────────

interface NoraOnboardingChatProps {
  userId: string
  userEmail: string
  userName: string
  onComplete: (data: OnboardingData) => void
}

// ── Main Component ─────────────────────────────────────────────────────

export default function NoraOnboardingChat({
  userId,
  userEmail,
  userName,
  onComplete,
}: NoraOnboardingChatProps) {
  const supabase = createClient()
  const { names: ALL_TAGS, colorMap: TAG_COLORS } = useSpecializations()

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
  // For dual input state
  const [pendingDualInput, setPendingDualInput] = useState<Record<string, string>>({})
  // For text input
  const [inputValue, setInputValue] = useState('')
  // For brokerage autocomplete search
  const [brokerageSearch, setBrokerageSearch] = useState('')
  // For zip code validation error
  const [zipError, setZipError] = useState('')

  // Phone verification state
  const [phoneVerified, setPhoneVerified] = useState(false)
  const [phoneVerifying, setPhoneVerifying] = useState(false)
  const [phoneCodeChecking, setPhoneCodeChecking] = useState(false)
  const [phoneResent, setPhoneResent] = useState(false)
  const [phoneError, setPhoneError] = useState('')
  const [phoneInputValue, setPhoneInputValue] = useState('')
  const [phoneCodeValue, setPhoneCodeValue] = useState('')
  const [normalizedPhone, setNormalizedPhone] = useState('')
  const normalizedPhoneRef = useRef('')

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

  const [needsWelcome, setNeedsWelcome] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const initializedRef = useRef(false)

  // ── Scroll to bottom on new messages ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // ── Set fullName from userName prop ──
  useEffect(() => {
    if (userName) {
      setData((prev) => prev.fullName ? prev : { ...prev, fullName: userName })
    }
  }, [userName])

  // ── Send personalized welcome once ready ──
  useEffect(() => {
    if (!needsWelcome) return
    if (!userName && !userId) return
    setNeedsWelcome(false)
    const firstName = userName?.split(' ')[0] || ''
    const greeting = firstName
      ? `Hey ${firstName}! I'm NORA, your AI assistant at AgentReferrals.`
      : "Hey! I'm NORA, your AI assistant at AgentReferrals."
    addNoraMessage(
      `${greeting} Let's get your profile set up \u2014 it'll only take a couple minutes.\n\nFirst up: what brokerage are you with?`,
      { kind: 'brokerage' },
      'brokerage'
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsWelcome, userName, userId])

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

    setNeedsWelcome(true)
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
      const updated = prev.map((m, i) =>
        i === prev.length - 1 && m.role === 'nora' ? { ...m, resolved: true } : m
      )
      return [
        ...updated,
        {
          id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          role: 'user' as const,
          content,
        },
      ]
    })
  }, [])

  // ── Update data helper ──
  const updateData = useCallback((updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }))
  }, [])

  // ── Get brokerage name by ID ──
  const getBrokerageName = (id: string | null): string => {
    if (!id) return 'Not selected'
    if (id === 'other') return data.customBrokerage || 'Other / Independent'
    const match = brokerages.find((b) => b.id === id)
    return match?.name ?? 'Not selected'
  }

  // ── Proceed to photo upload step (skipping invites/referrals) ──
  const proceedToPhotoUpload = useCallback(() => {
    setTimeout(() => {
      addNoraMessage(
        "Want to add a profile photo? This helps other agents recognize you and builds trust.",
        { kind: 'photoUpload' },
        'photo_upload'
      )
    }, 200)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Proceed to phone verification step ──
  const proceedToPhoneVerify = useCallback(() => {
    setTimeout(() => {
      addNoraMessage(
        "Last thing before we finalize \u2014 what's your phone number? We'll send a quick verification code to confirm it.",
        { kind: 'phoneInput' },
        'phone_verify'
      )
    }, 200)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Skip to license step ──
  const proceedToNamePhone = useCallback(() => {
    setTimeout(() => {
      addNoraMessage(
        "What's your real estate license number? This helps us verify your credentials and adds a trust badge to your profile.",
        { kind: 'licenseInput' },
        'license_number'
      )
    }, 200)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
          '< 1 year': 0, '1-3 years': 2, '3-5 years': 4, '5-10 years': 7, '10+ years': 15,
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
            "What's the zip code of your primary service area? Don't worry — you'll be able to add more zip codes in the next step.",
            { kind: 'input', placeholder: 'e.g. 49080', type: 'text' },
            'service_area'
          )
        }, 200)
        break
      }

      case 'service_area': {
        const zip = value.trim().replace(/\D/g, '').slice(0, 5)
        if (zip.length !== 5) {
          setZipError('Please enter a valid 5-digit zip code')
          break
        }
        setZipError('')
        updateData({ primaryArea: zip })
        addUserMessage(zip)

        setTimeout(() => {
          addNoraMessage(
            "What types of properties do you specialize in? Select all that apply.",
            { kind: 'multiSelect', options: ALL_TAGS, selected: [] },
            'specializations'
          )
        }, 200)
        break
      }

      case 'avg_price': {
        const priceMap: Record<string, number> = {
          '$100k-250k': 175000, '$250k-500k': 375000, '$500k-750k': 625000,
          '$750k-1M': 875000, '$1M+': 1500000,
        }
        updateData({ avgSalePrice: priceMap[value] ?? null })
        addUserMessage(value)

        setTimeout(() => {
          addNoraMessage(
            'What referral fee percentage do you typically work with?',
            { kind: 'chips', options: ['20%', '25%', '30%', 'Other'] },
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
              "What types of properties do you specialize in? Select all that apply.",
              { kind: 'multiSelect', options: ALL_TAGS, selected: [] },
              'specializations'
            )
          }, 200)
        }
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
              { kind: 'chips', options: ['20%', '25%', '30%', 'Other'] },
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
        // After license → go to photo upload (skip invites/referrals)
        proceedToPhotoUpload()
        break
      }

      default:
        break
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep])

  // ── Handle phone verification: send code ──
  const handleSendPhoneCode = useCallback(async () => {
    const phone = phoneInputValue.trim()
    if (!phone) return
    setPhoneVerifying(true)
    setPhoneError('')

    try {
      const res = await fetch('/api/auth/verify-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })
      const result = await res.json()

      if (!result.success) {
        setPhoneError(result.error || 'Failed to send code')
        setPhoneVerifying(false)
        return
      }

      const normalized = result.normalizedPhone || phone
      setNormalizedPhone(normalized)
      normalizedPhoneRef.current = normalized
      try { sessionStorage.setItem('ar_verify_phone', normalized) } catch {}
      updateData({ phone: normalized })
      addUserMessage(phone)

      setTimeout(() => {
        addNoraMessage(
          `I just sent a 6-digit code to ${phone}. Enter it below.`,
          { kind: 'phoneCode' },
          'phone_code'
        )
      }, 200)
    } catch {
      setPhoneError('Something went wrong. Please try again.')
    } finally {
      setPhoneVerifying(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phoneInputValue])

  // ── Handle phone verification: check code ──
  const handleCheckPhoneCode = async () => {
    const code = phoneCodeValue.trim()
    if (code.length !== 6) return
    setPhoneCodeChecking(true)
    setPhoneError('')

    try {
      let phone = normalizedPhoneRef.current
        || normalizedPhone
        || data.phone
        || (typeof window !== 'undefined' ? sessionStorage.getItem('ar_verify_phone') : null)
      if (!phone) {
        const codeMsg = messages.find((m) => m.content?.includes('sent a 6-digit code to'))
        const match = codeMsg?.content?.match(/code to (\+?\d[\d\s()-]+\d)/)
        if (match) phone = match[1].replace(/\D/g, '')
      }
      const res = await fetch('/api/auth/verify-phone/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      })
      const result = await res.json()

      if (result.verified) {
        setPhoneVerified(true)
        addUserMessage('Verified!')

        setTimeout(() => {
          addNoraMessage(
            'Phone verified! \u2705',
            undefined,
            'phone_code'
          )
          setTimeout(() => {
            showSummary()
          }, 400)
        }, 200)
      } else {
        setPhoneError(result.error || "That code didn't match. Try again.")
      }
    } catch {
      setPhoneError('Something went wrong. Please try again.')
    } finally {
      setPhoneCodeChecking(false)
    }
  }

  // ── Handle phone verification: resend code ──
  const handleResendPhoneCode = async () => {
    let phone = normalizedPhoneRef.current
      || normalizedPhone
      || data.phone
      || (typeof window !== 'undefined' ? sessionStorage.getItem('ar_verify_phone') : null)
      || phoneInputValue

    if (!phone) {
      const codeMsg = messages.find((m) => m.content?.includes('sent a 6-digit code to'))
      const match = codeMsg?.content?.match(/code to (\+?\d[\d\s()-]+\d)/)
      if (match) phone = match[1].replace(/\D/g, '')
    }
    if (!phone) {
      setPhoneError('No phone number found. Please re-enter your number.')
      return
    }
    setPhoneVerifying(true)
    setPhoneError('')

    try {
      const res = await fetch('/api/auth/verify-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })
      const result = await res.json()

      if (!result.success) {
        setPhoneError(result.error || 'Failed to resend code')
      } else {
        setPhoneError('')
        setPhoneCodeValue('')
        setPhoneResent(true)
        setTimeout(() => setPhoneResent(false), 4000)
      }
    } catch {
      setPhoneError('Something went wrong. Please try again.')
    } finally {
      setPhoneVerifying(false)
    }
  }

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
    addUserMessage('Looks good!')
    setTimeout(() => {
      addNoraMessage(
        `Great, ${finalName.split(' ')[0]}! Your profile is ready. Let's set up your service area next.`,
        undefined,
        'complete'
      )
    }, 200)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.fullName, userName])

  // ── Handle final submission ──
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
      avatar_url: avatarPreview || null,
      brokerage_id: brokerageIdForDb,
      primary_area: data.primaryArea.trim(),
      years_licensed: data.yearsLicensed,
      deals_per_year: data.referralsPerYear,
      avg_sale_price: data.avgSalePrice,
      avg_referral_fee: data.avgReferralFee,
      team_name: data.teamName.trim() || null,
      is_on_team: data.isOnTeam,
      license_number: data.licenseNumber.trim() || null,
      phone_verified: phoneVerified,
      phone_verified_at: phoneVerified ? new Date().toISOString() : null,
      tags: data.specializations,
      status: 'active',
      updated_at: new Date().toISOString(),
    } as Record<string, unknown>

    // Set territory_zips from primaryArea.
    // If the user typed zip codes directly, parse them.
    // If they typed a city/state, geocode it to find the zip at that location.
    const parsedZips = data.primaryArea
      .split(',')
      .map((s: string) => s.trim())
      .filter((s: string) => /^\d{5}$/.test(s))

    if (parsedZips.length > 0) {
      upsertPayload.polygon = []
      upsertPayload.territory_zips = parsedZips
    } else {
      // City/state name provided — geocode to lat/lng, then reverse-geocode to zip
      try {
        const geoRes = await fetch(`/api/geocode?q=${encodeURIComponent(data.primaryArea)}&limit=1`)
        if (geoRes.ok) {
          const geoData = await geoRes.json()
          if (geoData.results && geoData.results.length > 0) {
            const { lat, lng } = geoData.results[0]
            // Use Census TIGERweb to find the ZCTA at this point
            const tigerParams = new URLSearchParams({
              geometry: `${lng},${lat}`,
              geometryType: 'esriGeometryPoint',
              spatialRel: 'esriSpatialRelIntersects',
              outFields: 'ZCTA5',
              f: 'json',
              inSR: '4326',
            })
            const tigerRes = await fetch(
              `https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_ACS2021/MapServer/0/query?${tigerParams}`
            )
            if (tigerRes.ok) {
              const tigerData = await tigerRes.json()
              if (tigerData.features && tigerData.features.length > 0) {
                const zip = tigerData.features[0].attributes.ZCTA5
                if (zip && /^\d{5}$/.test(zip)) {
                  upsertPayload.polygon = []
                  upsertPayload.territory_zips = [zip]
                }
              }
            }
          }
        }
      } catch (geoErr) {
        console.error('[NORA] Geocode fallback failed (non-blocking):', geoErr)
        // Don't block onboarding — territory_zips will be set in Service Area step
      }
    }

    const areaParts = data.primaryArea.split(',').map((s: string) => s.trim())
    const city = areaParts[0] || ''
    const state = areaParts[1] || ''

    const saveRes = await fetch('/api/onboarding/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profile: upsertPayload,
        hubData: {
          agent: {
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
          },
          platform: true,
        },
      }),
    })

    const saveData = await saveRes.json()

    if (!saveRes.ok || saveData.error) {
      console.error('[NoraChat] Save failed:', saveData.error)
      setIsSubmitting(false)
      addNoraMessage(
        `Something went wrong saving your profile: "${saveData.error || 'Unknown error'}". Please try again.`,
        { kind: 'buttons', options: [
          { label: 'Try Again', value: 'retry', primary: true },
        ]},
        'summary'
      )
      return
    }

    // Fire-and-forget license verification
    if (data.licenseNumber.trim()) {
      fetch('/api/verify-license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          licenseNumber: data.licenseNumber.trim(),
          licenseState: '',
          fullName: data.fullName.trim(),
        }),
      }).catch(() => {})
    }

    // Ensure user has a referral code on their profile
    try {
      await fetch('/api/invites/mine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
    } catch { /* ignore */ }

    // Clear saved state
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }

    setIsSubmitting(false)
    onComplete(data)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, userEmail, data, phoneVerified, avatarPreview, onComplete])

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

      case 'buttons':
        return (
          <div className="mt-3">
            <div className="flex flex-wrap gap-2">
              {interactive.options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    if (opt.value === 'dashboard' || opt.value === 'retry') {
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
                  {(opt.value === 'dashboard' || opt.value === 'retry') && isSubmitting ? (
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
          </div>
        )

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
                  if (e.key === 'Enter') handleInputSubmit(inputValue)
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
                  if (e.key === 'Enter' && inputValue.trim()) handleInputSubmit(inputValue)
                }}
                placeholder="e.g. 6501234567"
                className="flex-1 h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                autoFocus
              />
              <button
                onClick={() => { if (inputValue.trim()) handleInputSubmit(inputValue) }}
                className="h-10 w-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={() => {
                addUserMessage("I'll do this later")
                setInputValue('')
                proceedToPhotoUpload()
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
                onKeyDown={(e) => { if (e.key === 'Enter') handleDualInputSubmit() }}
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
                        prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                      )
                    }}
                    className={`px-4 py-2 rounded-full border text-sm font-semibold transition-all ${
                      isSelected
                        ? 'shadow-md scale-105'
                        : 'border-border bg-card hover:border-primary/30 hover:shadow-sm'
                    }`}
                    style={isSelected ? { borderColor: color, backgroundColor: `${color}15`, color } : undefined}
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

      case 'photoUpload':
        return (
          <div className="mt-3 max-w-md space-y-3">
            {avatarPreview ? (
              <div className="flex items-center gap-4">
                <img src={avatarPreview} alt="Preview" className="w-16 h-16 rounded-full object-cover border-2 border-primary" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Looking good!</p>
                  <button onClick={() => photoInputRef.current?.click()} className="text-xs text-primary hover:underline">Change photo</button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => photoInputRef.current?.click()}
                disabled={avatarUploading}
                className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-border hover:border-primary/30 hover:bg-accent/50 transition-all w-full text-left"
              >
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  {avatarUploading ? (
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  ) : (
                    <Camera className="w-6 h-6 text-primary" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold">{avatarUploading ? 'Uploading...' : 'Upload a photo'}</p>
                  <p className="text-xs text-muted-foreground">JPG, PNG, or GIF. Max 5MB.</p>
                </div>
              </button>
            )}
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                setAvatarUploading(true)
                const reader = new FileReader()
                reader.onload = () => {
                  setAvatarPreview(reader.result as string)
                  setAvatarUploading(false)
                }
                reader.readAsDataURL(file)
              }}
            />
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (avatarPreview) {
                    addUserMessage('Photo uploaded!')
                  } else {
                    addUserMessage("I'll add a photo later")
                  }
                  proceedToPhoneVerify()
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all"
              >
                {avatarPreview ? 'Continue' : 'Skip'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            {!avatarPreview && (
              <button
                onClick={() => {
                  addUserMessage("I'll do this later")
                  proceedToPhoneVerify()
                }}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
              >
                Do this later
              </button>
            )}
          </div>
        )

      case 'phoneInput':
        return (
          <div className="mt-3 max-w-md space-y-2">
            <div className="flex gap-2">
              <input
                type="tel"
                value={phoneInputValue}
                onChange={(e) => { setPhoneInputValue(e.target.value); setPhoneError('') }}
                onKeyDown={(e) => { if (e.key === 'Enter' && phoneInputValue.trim()) handleSendPhoneCode() }}
                placeholder="(555) 123-4567"
                className="flex-1 h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                autoFocus
              />
              <button
                onClick={handleSendPhoneCode}
                disabled={phoneVerifying || !phoneInputValue.trim()}
                className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {phoneVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
                {phoneVerifying ? 'Sending...' : 'Send Code'}
              </button>
            </div>
            {phoneError && <p className="text-xs text-red-500">{phoneError}</p>}
          </div>
        )

      case 'phoneCode':
        return (
          <div className="mt-3 max-w-md space-y-2">
            {phoneVerified ? (
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-semibold">Phone verified!</span>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={phoneCodeValue}
                    onChange={(e) => {
                      setPhoneCodeValue(e.target.value.replace(/\D/g, '').slice(0, 6))
                      setPhoneError('')
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter' && phoneCodeValue.length === 6) handleCheckPhoneCode() }}
                    placeholder="000000"
                    className="flex-1 h-10 px-3 rounded-lg border border-input bg-background text-center text-lg font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/50"
                    autoFocus
                  />
                  <button
                    onClick={handleCheckPhoneCode}
                    disabled={phoneCodeChecking || phoneCodeValue.length !== 6}
                    className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {phoneCodeChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
                  </button>
                </div>
                {phoneError && <p className="text-xs text-red-500">{phoneError}</p>}
                {phoneResent && <p className="text-xs text-emerald-500 font-medium">Code sent! Check your phone.</p>}
                <button
                  onClick={handleResendPhoneCode}
                  disabled={phoneVerifying || phoneResent}
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 disabled:opacity-50"
                >
                  {phoneVerifying ? 'Sending...' : phoneResent ? 'Code Sent' : 'Resend Code'}
                </button>
              </>
            )}
          </div>
        )

      case 'profileSummary': {
        const brokerageName = getBrokerageName(data.brokerageId)
        const priceLabel = data.avgSalePrice ? `$${data.avgSalePrice.toLocaleString()}` : 'Not set'
        const initials = data.fullName
          ? data.fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
          : '?'
        return (
          <div className="mt-3 max-w-lg space-y-3">
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center gap-3 mb-2">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Profile" className="w-14 h-14 rounded-full object-cover border-2 border-primary" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                    {initials}
                  </div>
                )}
                <div>
                  <div className="text-sm font-bold">{data.fullName || 'No name'}</div>
                  <div className="text-xs text-muted-foreground">{userEmail}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Name</div>
                  <div className="text-sm font-semibold mt-0.5">{data.fullName || '\u2014'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Phone</div>
                  <div className="text-sm font-semibold mt-0.5 flex items-center gap-1.5">
                    {data.phone || '\u2014'}
                    {data.phone && phoneVerified && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600">
                        <CheckCircle2 className="w-3 h-3" /> Verified
                      </span>
                    )}
                    {data.phone && !phoneVerified && (
                      <span className="text-[10px] font-bold text-red-500">Not verified</span>
                    )}
                  </div>
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
                  <div className="text-sm font-semibold mt-0.5">{data.yearsLicensed ?? '\u2014'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Referrals / Year</div>
                  <div className="text-sm font-semibold mt-0.5">{data.referralsPerYear ?? '\u2014'}</div>
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
                  )) : <span className="text-sm text-muted-foreground">\u2014</span>}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  completeOnboarding()
                  handleComplete()
                }}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Saving...</span>
                ) : (
                  <><Check className="w-4 h-4" /> Looks Good!</>
                )}
              </button>
              <button
                onClick={() => {
                  addUserMessage('I want to make changes')
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
    <div className="flex flex-col h-full">
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
                    isCurrent ? 'text-foreground' : isComplete ? 'text-primary' : 'text-muted-foreground'
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

      {/* Bottom bar */}
      <div className="h-12 flex items-center justify-between px-6 border-t border-border bg-card/50">
        {messages.length > 1 ? (
          <button
            onClick={() => {
              localStorage.removeItem(STORAGE_KEY)
              setMessages([])
              setCurrentStep('welcome')
              setData({
                brokerageId: null, customBrokerage: '', teamName: '', isOnTeam: false,
                fullName: userName || '', phone: '', yearsLicensed: null, referralsPerYear: null,
                primaryArea: '', avgSalePrice: null, avgReferralFee: 25, specializations: [],
                licenseNumber: '', inviteEmails: [], pastReferrals: [],
              })
              setPendingSpecializations([])
              setNeedsWelcome(true)
            }}
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Start over
          </button>
        ) : <div />}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span>Powered by <span className="font-semibold text-foreground">NORA</span></span>
        </div>
      </div>
    </div>
  )
}
