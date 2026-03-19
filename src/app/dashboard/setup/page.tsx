'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { createHubClient } from '@/lib/supabase/hub'
import NoraOnboardingChat from '@/components/onboarding/nora-onboarding-chat'
import {
  MapPin, Users, Check, ChevronRight, ChevronLeft, Plus, X, Mail, Sparkles,
  Loader2, Search, Gift, Copy, Link2, ArrowUpRight, TrendingUp, MessageSquare,
  Clock, BarChart3, CheckCircle2, LogOut,
} from 'lucide-react'
import { getZipBoundary, getCentroid, getZipAtPoint, ZCTA_WMS_URL, ZCTA_WMS_LAYERS, ZCTA_WMS_LABELS } from '@/lib/zip-boundaries'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import type { OnboardingData, PastReferralEntry } from '@/types/onboarding'

let L: typeof import('leaflet') | null = null
const LIGHT_TILES = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'

const STEPS = ['Intake', 'Service Area', 'Invite Network', 'Done'] as const

export default function SetupPage() {
  const router = useRouter()
  const { profile, isLoading, isAuthenticated, refreshProfile } = useAuth()
  const [currentStep, setCurrentStep] = useState(-1) // -1 = determining step
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  // Auth info for NORA
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName] = useState('')

  // Step 1: Territory — simple zip code input
  const [zipInput, setZipInput] = useState('')
  const [zipLoading, setZipLoading] = useState(false)
  const [zipError, setZipError] = useState('')
  const [selectedZips, setSelectedZips] = useState<string[]>([])
  const zipBoundariesRef = useRef<Map<string, [number, number][]>>(new Map())

  // Map
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const zipLayersRef = useRef<L.Layer[]>([])
  const radiusCircleRef = useRef<L.Circle | null>(null)
  const [leafletReady, setLeafletReady] = useState(false)

  // Radius picker
  const [radiusMode, setRadiusMode] = useState(false)
  const [radiusMiles, setRadiusMiles] = useState(25)
  const [radiusLoading, setRadiusLoading] = useState(false)
  const radiusCenterRef = useRef<{ lat: number; lng: number } | null>(null)

  // Step 2: Invites
  const [emails, setEmails] = useState<string[]>([''])
  const [invitesSent, setInvitesSent] = useState(0)
  const [sendingInvites, setSendingInvites] = useState(false)
  const [inviteError, setInviteError] = useState('')

  // Step 2: Past referrals
  const [pastReferrals, setPastReferrals] = useState<PastReferralEntry[]>([])
  const [prDirection, setPrDirection] = useState<'sent' | 'received'>('sent')
  const [prPartnerName, setPrPartnerName] = useState('')
  const [prPartnerEmail, setPrPartnerEmail] = useState('')
  const [prMarket, setPrMarket] = useState('')
  const [prSalePrice, setPrSalePrice] = useState<number | null>(null)
  const [prCloseYear, setPrCloseYear] = useState<number | null>(null)
  const [showPastReferralForm, setShowPastReferralForm] = useState(false)

  // Step 2: Affiliate
  const [affiliateData, setAffiliateData] = useState<{
    referralCode: string | null
    summary: { totalEarned: number; count: number }
  }>({ referralCode: null, summary: { totalEarned: 0, count: 0 } })
  const [linkCopied, setLinkCopied] = useState(false)

  // Load existing zips from profile
  useEffect(() => {
    if (profile?.territory_zips && Array.isArray(profile.territory_zips)) {
      setSelectedZips(profile.territory_zips as string[])
    }
  }, [profile])

  // Scroll to top when step changes
  useEffect(() => {
    if (currentStep >= 0) {
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
  }, [currentStep])

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/')
    }
  }, [isLoading, isAuthenticated, router])

  // Resolve auth user for NORA step
  useEffect(() => {
    const hub = createHubClient()
    hub.auth.getUser().then(({ data: { user } }: { data: { user: { id: string; email?: string | null; user_metadata?: Record<string, string> } | null } }) => {
      if (user) {
        setUserId(user.id)
        setUserEmail(user.email ?? '')
        setUserName((user.user_metadata?.full_name as string) ?? '')
      }
    })
  }, [])

  // Smart step detection — uses setup_step from DB
  useEffect(() => {
    if (isLoading || !isAuthenticated) return
    if (currentStep !== -1) return // already determined

    const step = profile?.setup_step

    if (step === 'complete') {
      router.push('/dashboard')
    } else if (step === 'invites' || step === 'service_area') {
      // Already did intake + service area → go to invites
      setCurrentStep(2)
    } else if (step === 'intake') {
      // Completed intake → go to service area
      setCurrentStep(1)
    } else {
      // Not started or no profile → start at intake
      setCurrentStep(0)
    }
  }, [isLoading, isAuthenticated, profile, currentStep, router])

  // Save step progress to DB
  const saveStepProgress = useCallback((step: string) => {
    if (!profile?.id) return
    fetch('/api/onboarding/complete-setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: profile.id, step }),
    }).catch(() => {})
  }, [profile?.id])

  // Fetch affiliate data when reaching step 2
  useEffect(() => {
    if (currentStep !== 2 || !profile?.id) return
    fetch(`/api/affiliate/rewards?userId=${profile.id}`)
      .then((r) => r.json())
      .then((data) => {
        setAffiliateData({
          referralCode: data.referralCode,
          summary: data.summary ?? { totalEarned: 0, count: 0 },
        })
      })
      .catch(() => {})
  }, [currentStep, profile?.id])

  // Load Leaflet
  useEffect(() => {
    import('leaflet').then((leaflet) => {
      L = leaflet
      setLeafletReady(true)
    })
  }, [])

  // Initialize map when step 1 is active
  useEffect(() => {
    if (currentStep !== 1) return
    if (!leafletReady || !L || !mapRef.current || mapInstance.current) return

    if (!document.querySelector('link[href*="leaflet@1.9.4"]')) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }

    const timer = setTimeout(() => {
      if (!mapRef.current || mapInstance.current || !L) return

      const map = L.map(mapRef.current, {
        center: [39.5, -96.5],
        zoom: 4,
        zoomControl: true,
        maxBounds: L.latLngBounds([15, -175], [75, -45]),
        maxBoundsViscosity: 1.0,
        minZoom: 4,
      })

      L.tileLayer(LIGHT_TILES, { attribution: '' }).addTo(map)
      map.attributionControl.setPrefix('')

      L.tileLayer.wms(ZCTA_WMS_URL, {
        layers: ZCTA_WMS_LAYERS,
        format: 'image/png',
        transparent: true,
        opacity: 0.3,
      }).addTo(map)
      L.tileLayer.wms(ZCTA_WMS_URL, {
        layers: ZCTA_WMS_LABELS,
        format: 'image/png',
        transparent: true,
        opacity: 0.5,
      }).addTo(map)

      mapInstance.current = map

      if (profile?.primary_area) {
        fetch(`/api/geocode?q=${encodeURIComponent(profile.primary_area)}`)
          .then((r) => r.json())
          .then((data) => {
            if (data.lat && data.lng && mapInstance.current) {
              mapInstance.current.setView([data.lat, data.lng], 8, { animate: false })
            }
          })
          .catch(() => {})
      }

      map.on('click', async (e) => {
        const isRadius = document.body.dataset.radiusMode === 'true'
        if (isRadius) {
          const radiusMi = parseInt(document.body.dataset.radiusMiles || '25', 10)
          handleRadiusSelect(e.latlng.lat, e.latlng.lng, radiusMi)
          return
        }
        const zip = await getZipAtPoint(e.latlng.lat, e.latlng.lng)
        if (!zip) return
        setSelectedZips((prev) => {
          if (prev.includes(zip)) return prev
          if (prev.length >= 100) return prev
          return [...prev, zip]
        })
      })
    }, 300)

    return () => {
      clearTimeout(timer)
      if (mapInstance.current) {
        mapInstance.current.remove()
        mapInstance.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leafletReady, currentStep])

  // Render zip layers on map when selectedZips changes
  useEffect(() => {
    if (!mapInstance.current || !L) return
    const map = mapInstance.current

    zipLayersRef.current.forEach((l) => map.removeLayer(l))
    zipLayersRef.current = []

    if (selectedZips.length === 0) return

    const renderZips = async () => {
      const bounds: L.LatLngBounds[] = []
      for (const zip of selectedZips) {
        let ring = zipBoundariesRef.current.get(zip)
        if (!ring) {
          ring = (await getZipBoundary(zip)) ?? undefined
          if (ring) zipBoundariesRef.current.set(zip, ring)
        }
        if (!ring || !L) continue

        const poly = L.polygon(ring as L.LatLngExpression[], {
          color: '#f59e0b',
          weight: 2.5,
          fillColor: '#f59e0b',
          fillOpacity: 0.25,
        })
        poly.bindTooltip(zip, { permanent: true, direction: 'center', className: 'zip-label' })
        poly.on('click', (e) => { L!.DomEvent.stopPropagation(e) })
        poly.addTo(map)
        zipLayersRef.current.push(poly)
        bounds.push(poly.getBounds())
      }

      if (bounds.length > 0) {
        let combined = bounds[0]
        for (let i = 1; i < bounds.length; i++) combined = combined.extend(bounds[i])
        map.fitBounds(combined, { padding: [40, 40], maxZoom: 12, animate: false })
      }
    }
    renderZips()
  }, [selectedZips])

  // Add zip code or resolve county/city name to zip codes
  const handleAddZip = useCallback(async () => {
    const input = zipInput.trim()
    if (!input) return
    if (selectedZips.length >= 100) {
      setZipError('Maximum 100 zip codes')
      return
    }

    setZipLoading(true)
    setZipError('')

    if (/^\d{5}$/.test(input)) {
      if (selectedZips.includes(input)) {
        setZipError('Already added')
        setZipLoading(false)
        return
      }
      const ring = await getZipBoundary(input)
      if (!ring) {
        setZipError('Zip code not found')
        setZipLoading(false)
        return
      }
      zipBoundariesRef.current.set(input, ring)
      setSelectedZips((prev) => [...prev, input])
      setZipInput('')
      setZipLoading(false)
      if (mapInstance.current) {
        mapInstance.current.setView(getCentroid(ring), 10, { animate: true })
      }
      return
    }

    try {
      const geoRes = await fetch(`/api/geocode?q=${encodeURIComponent(input)}`)
      const geo = await geoRes.json()
      if (!geo.lat || !geo.lng) {
        setZipError('Location not found. Try a zip code instead.')
        setZipLoading(false)
        return
      }

      const centerZip = await getZipAtPoint(geo.lat, geo.lng)
      if (centerZip && !selectedZips.includes(centerZip)) {
        const ring = await getZipBoundary(centerZip)
        if (ring) {
          zipBoundariesRef.current.set(centerZip, ring)
          setSelectedZips((prev) => [...prev, centerZip])
        }
      }

      const offsets = [0.05, -0.05, 0.1, -0.1, 0.08, -0.08]
      const nearbyZips = new Set<string>(centerZip ? [centerZip] : [])
      for (const dlat of offsets) {
        for (const dlng of offsets) {
          if (nearbyZips.size >= 10) break
          const zip = await getZipAtPoint(geo.lat + dlat, geo.lng + dlng)
          if (zip && !selectedZips.includes(zip)) nearbyZips.add(zip)
        }
        if (nearbyZips.size >= 10) break
      }

      for (const zip of nearbyZips) {
        if (selectedZips.length + nearbyZips.size > 100) break
        if (!zipBoundariesRef.current.has(zip)) {
          const ring = await getZipBoundary(zip)
          if (ring) zipBoundariesRef.current.set(zip, ring)
        }
      }
      setSelectedZips((prev) => {
        const combined = new Set([...prev, ...nearbyZips])
        return Array.from(combined).slice(0, 100)
      })

      setZipInput('')
      if (mapInstance.current) {
        mapInstance.current.setView([geo.lat, geo.lng], 9, { animate: true })
      }
    } catch {
      setZipError('Failed to look up location.')
    }
    setZipLoading(false)
  }, [zipInput, selectedZips])

  const removeZip = useCallback((zip: string) => {
    setSelectedZips((prev) => prev.filter((z) => z !== zip))
  }, [])

  // Sync radius mode to DOM for the map click handler
  useEffect(() => {
    document.body.dataset.radiusMode = radiusMode ? 'true' : 'false'
    document.body.dataset.radiusMiles = String(radiusMiles)
  }, [radiusMode, radiusMiles])

  // Re-run radius search when miles changes and we have a center point
  const radiusMilesRef = useRef(radiusMiles)
  useEffect(() => {
    if (radiusMilesRef.current === radiusMiles) return
    radiusMilesRef.current = radiusMiles
    if (radiusCenterRef.current && radiusMode) {
      handleRadiusSelect(radiusCenterRef.current.lat, radiusCenterRef.current.lng, radiusMiles)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radiusMiles])

  // Handle radius selection
  const handleRadiusSelect = useCallback(async (lat: number, lng: number, miles: number) => {
    if (!mapInstance.current || !L) return
    radiusCenterRef.current = { lat, lng }
    setRadiusLoading(true)

    // Clear previous zips when re-running radius (fresh selection)
    setSelectedZips([])

    if (radiusCircleRef.current) mapInstance.current.removeLayer(radiusCircleRef.current)
    const radiusMeters = miles * 1609.34
    const circle = L.circle([lat, lng], {
      radius: radiusMeters,
      color: '#f59e0b',
      weight: 2,
      fillColor: '#f59e0b',
      fillOpacity: 0.08,
      dashArray: '6, 4',
    }).addTo(mapInstance.current)
    radiusCircleRef.current = circle
    mapInstance.current.fitBounds(circle.getBounds(), { padding: [20, 20] })

    // Use parallel batch lookups for speed
    const uniqueZips = new Set<string>()
    const degPerMile = 1 / 69
    const gridStep = Math.max(miles / 6, 3) * degPerMile

    const points: { lat: number; lng: number }[] = []
    for (let dlat = -miles * degPerMile; dlat <= miles * degPerMile; dlat += gridStep) {
      for (let dlng = -miles * degPerMile; dlng <= miles * degPerMile; dlng += gridStep) {
        const dist = Math.sqrt(dlat * dlat + dlng * dlng) / degPerMile
        if (dist > miles) continue
        points.push({ lat: lat + dlat, lng: lng + dlng })
      }
    }

    // Process in parallel batches of 10
    for (let i = 0; i < points.length; i += 10) {
      const batch = points.slice(i, i + 10)
      const results = await Promise.all(batch.map((p) => getZipAtPoint(p.lat, p.lng)))
      results.forEach((zip) => { if (zip) uniqueZips.add(zip) })
    }

    // Fetch boundaries in parallel batches
    const newZips = Array.from(uniqueZips).filter((z) => !zipBoundariesRef.current.has(z))
    for (let i = 0; i < newZips.length; i += 10) {
      const batch = newZips.slice(i, i + 10)
      const results = await Promise.all(batch.map((z) => getZipBoundary(z)))
      results.forEach((ring, idx) => {
        if (ring) zipBoundariesRef.current.set(batch[idx], ring)
      })
    }

    setSelectedZips(Array.from(uniqueZips).slice(0, 100))

    setRadiusLoading(false)
  }, [])

  // Save territory
  const handleSaveTerritory = useCallback(async () => {
    if (!profile?.id) return
    if (selectedZips.length === 0) {
      setSaveError('Please add at least one zip code.')
      return
    }

    setSaving(true)
    setSaveError('')

    try {
      const polygonRings: [number, number][][] = []
      for (const zip of selectedZips) {
        const ring = zipBoundariesRef.current.get(zip)
        if (ring) polygonRings.push(ring)
      }

      const res = await fetch('/api/territory/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.id,
          polygon: polygonRings,
          territory_zips: selectedZips,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save territory')
      }

      saveStepProgress('service_area')
      await refreshProfile()
      setCurrentStep(2)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }, [profile?.id, selectedZips, refreshProfile, saveStepProgress])

  // Send invites
  const handleSendInvites = useCallback(async () => {
    const validEmails = emails
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e && e.includes('@') && e.includes('.'))

    if (validEmails.length === 0) {
      setInviteError('Please enter at least one valid email address.')
      return
    }

    setSendingInvites(true)
    setInviteError('')

    try {
      const res = await fetch('/api/onboarding-invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile?.id,
          userName: profile?.full_name,
          emails: validEmails,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send invites')

      setInvitesSent(data.sent ?? validEmails.length)
      setEmails([''])
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to send invites.')
    } finally {
      setSendingInvites(false)
    }
  }, [emails, profile?.id, profile?.full_name])

  // Add past referral
  const handleAddPastReferral = useCallback(() => {
    if (!prPartnerName || !prPartnerEmail) return

    const entry: PastReferralEntry = {
      direction: prDirection,
      partnerName: prPartnerName,
      partnerEmail: prPartnerEmail,
      market: prMarket,
      salePrice: prSalePrice ?? 0,
      closeYear: prCloseYear ?? 2026,
    }

    setPastReferrals((prev) => [...prev, entry])
    setPrDirection('sent')
    setPrPartnerName('')
    setPrPartnerEmail('')
    setPrMarket('')
    setPrSalePrice(null)
    setPrCloseYear(null)
    setShowPastReferralForm(false)
  }, [prDirection, prPartnerName, prPartnerEmail, prMarket, prSalePrice, prCloseYear])

  // Copy affiliate link
  const handleCopyLink = useCallback(() => {
    const code = affiliateData.referralCode || profile?.referral_code
    if (!code) return
    const link = `${window.location.origin}/invite/${code}`
    navigator.clipboard.writeText(link).then(() => {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 3000)
    })
  }, [affiliateData.referralCode, profile?.referral_code])

  // NORA complete handler
  const handleNoraComplete = useCallback(async () => {
    saveStepProgress('intake')
    await refreshProfile()
    setCurrentStep(1)
  }, [refreshProfile, saveStepProgress])

  const handleComplete = useCallback(async () => {
    localStorage.setItem('ar_setup_wizard_completed', 'true')
    saveStepProgress('complete')
    router.push('/dashboard')
  }, [router, saveStepProgress])

  const firstName = profile?.full_name?.split(' ')[0] || 'there'
  const referralCode = affiliateData.referralCode || profile?.referral_code

  if (isLoading || currentStep === -1) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground"><path d="M16 3l4 4-4 4" /><path d="M20 7H4" /><path d="M8 21l-4-4 4-4" /><path d="M4 17h16" /></svg>
            </div>
            <span className="font-extrabold text-lg hidden sm:block">Agent<span className="text-primary">Referrals</span></span>
          </div>
          {/* Step indicator */}
          <div className="flex items-center gap-2">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    i < currentStep ? 'bg-green-500 text-white' : i === currentStep ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}>
                    {i < currentStep ? <Check className="w-3 h-3" /> : i + 1}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block ${
                    i === currentStep ? 'text-foreground' : 'text-muted-foreground'
                  }`}>{label}</span>
                </div>
                {i < STEPS.length - 1 && <div className={`w-8 h-px ${i < currentStep ? 'bg-green-500' : 'bg-border'}`} />}
              </div>
            ))}
          </div>
          {/* User info + actions */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold truncate max-w-[140px]">{profile?.full_name || userName}</div>
              <div className="text-[10px] text-muted-foreground truncate max-w-[140px]">{profile?.email || userEmail}</div>
            </div>
            <ThemeToggle />
            <button
              onClick={async () => {
                const hub = createHubClient()
                await hub.auth.signOut()
                window.location.href = '/'
              }}
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {/* Step 0: NORA Intake */}
      {currentStep === 0 && userId && (
        <div className="flex-1 flex flex-col">
          <NoraOnboardingChat
            userId={userId}
            userEmail={userEmail}
            userName={userName}
            onComplete={handleNoraComplete}
          />
        </div>
      )}

      {/* Step 1: Service Area */}
      {currentStep === 1 && (
        <div className="max-w-4xl mx-auto px-6 py-8 pb-32 w-full">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Define Your Service Area</h1>
            <p className="text-muted-foreground mt-1">
              Add zip codes or county names where you work. This helps other agents find you for referrals.
            </p>
          </div>

          {/* Input */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={zipInput}
                onChange={(e) => { setZipInput(e.target.value); setZipError('') }}
                onKeyDown={(e) => e.key === 'Enter' && handleAddZip()}
                placeholder="Zip code or county name (e.g. 49001 or Kalamazoo)"
                className="w-full h-10 pl-9 pr-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <button
              onClick={handleAddZip}
              disabled={zipLoading || !zipInput.trim()}
              className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 disabled:opacity-40"
            >
              {zipLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
            </button>
            <span className="flex items-center text-xs text-muted-foreground whitespace-nowrap">
              {selectedZips.length}/100
            </span>
          </div>

          {/* Radius picker toggle */}
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => setRadiusMode(!radiusMode)}
              className={`flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold border transition-all ${
                radiusMode
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              <MapPin className="w-3 h-3" />
              {radiusMode ? 'Radius Mode ON' : 'Select by Radius'}
            </button>
            {radiusMode && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Radius:</span>
                {[10, 25, 50].map((mi) => (
                  <button
                    key={mi}
                    onClick={() => setRadiusMiles(mi)}
                    className={`h-7 px-2.5 rounded-md text-xs font-semibold transition-all ${
                      radiusMiles === mi ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {mi}mi
                  </button>
                ))}
                <span className="text-xs text-muted-foreground">— click the map to set center</span>
              </div>
            )}
            {radiusLoading && (
              <div className="flex items-center gap-1.5 text-xs text-primary">
                <Loader2 className="w-3 h-3 animate-spin" /> Finding zip codes...
              </div>
            )}
          </div>

          {zipError && <p className="text-sm text-destructive mb-3">{zipError}</p>}

          <p className="text-xs text-muted-foreground mb-2">
            <MapPin className="w-3 h-3 inline mr-1" />
            Click on the map to add zip codes, or type them above.
          </p>

          {selectedZips.length > 0 && (
            <div className="mb-3">
              <div className="flex flex-wrap gap-1.5">
                {selectedZips.map((zip) => (
                  <span
                    key={zip}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20"
                  >
                    {zip}
                    <button onClick={() => removeZip(zip)} className="hover:bg-primary/20 rounded-full p-0.5">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Map */}
          <div
            ref={mapRef}
            className="w-full h-[400px] rounded-xl border border-border mb-4 cursor-crosshair"
            style={{ background: '#f2f2f2' }}
          />

          {saveError && <p className="text-sm text-destructive mb-3">{saveError}</p>}

          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-6">
            <p className="text-xs text-amber-700 dark:text-amber-400">
              <Sparkles className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
              You&apos;re on the free plan — only agents in your direct network will see your service area.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentStep(0)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentStep(2)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Skip for now
              </button>
              <button
                onClick={handleSaveTerritory}
                disabled={saving || selectedZips.length === 0}
                className="flex items-center gap-2 h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Save & Continue <ChevronRight className="w-4 h-4" /></>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Invite Network */}
      {currentStep === 2 && (
        <div className="max-w-4xl mx-auto px-6 py-8 pb-32 w-full">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Invite Your Network</h1>
            <p className="text-muted-foreground mt-1">
              Grow your referral network and earn rewards for every agent who joins.
            </p>
          </div>

          {/* Affiliate Rewards Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-primary/10 border border-emerald-500/20 mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Gift className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Earn $10 for Every Agent Who Joins</h3>
                <p className="text-xs text-muted-foreground">
                  When an agent you invite completes their profile, you earn $10 in cash back rewards.
                </p>
              </div>
            </div>
            {affiliateData.summary.count > 0 && (
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/50">
                <div>
                  <div className="text-lg font-extrabold text-emerald-600">${affiliateData.summary.totalEarned}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Earned</div>
                </div>
                <div>
                  <div className="text-lg font-extrabold">{affiliateData.summary.count}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Rewards</div>
                </div>
              </div>
            )}
          </div>

          {/* Shareable Link */}
          {referralCode && (
            <div className="mb-6">
              <label className="text-sm font-medium mb-2 block">Your Invite Link</label>
              <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-2 h-10 px-3 rounded-lg border border-input bg-muted/50 text-sm">
                  <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="truncate text-muted-foreground">
                    {typeof window !== 'undefined' ? `${window.location.origin}/invite/${referralCode}` : `/invite/${referralCode}`}
                  </span>
                </div>
                <button
                  onClick={handleCopyLink}
                  className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-bold flex items-center gap-2 hover:opacity-90"
                >
                  {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {linkCopied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          {/* Email Invites */}
          <div className="mb-8">
            <label className="text-sm font-medium mb-2 block">Send Email Invites</label>
            <div className="space-y-2 mb-3">
              {emails.map((email, i) => (
                <div key={i} className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmails((prev) => prev.map((em, idx) => idx === i ? e.target.value : em))}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setEmails((prev) => [...prev, '']) } }}
                      placeholder="agent@example.com"
                      className="w-full h-10 pl-9 pr-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  {emails.length > 1 && (
                    <button
                      onClick={() => setEmails((prev) => prev.filter((_, idx) => idx !== i))}
                      className="h-10 w-10 flex items-center justify-center rounded-lg border border-input text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setEmails((prev) => [...prev, ''])}
                className="flex items-center gap-1.5 text-sm text-primary font-medium hover:text-primary/80"
              >
                <Plus className="w-4 h-4" /> Add another
              </button>
              <button
                onClick={handleSendInvites}
                disabled={sendingInvites}
                className="flex items-center gap-2 h-9 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 disabled:opacity-50"
              >
                {sendingInvites ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                Send Invites
              </button>
            </div>
            {inviteError && <p className="text-sm text-destructive mt-2">{inviteError}</p>}
            {invitesSent > 0 && (
              <p className="text-sm text-emerald-600 font-medium mt-2">
                <Check className="w-4 h-4 inline mr-1" />
                {invitesSent} invite{invitesSent !== 1 ? 's' : ''} sent!
              </p>
            )}
          </div>

          {/* Past Referrals */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold">Past Referrals</h3>
                <p className="text-xs text-muted-foreground">Add referral deals you&apos;ve done to build your verified track record.</p>
              </div>
              <button
                onClick={() => setShowPastReferralForm(true)}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-xs font-semibold hover:bg-accent"
              >
                <Plus className="w-3 h-3" /> Add Referral
              </button>
            </div>

            {pastReferrals.length > 0 && (
              <div className="space-y-2 mb-3">
                {pastReferrals.map((ref, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      ref.direction === 'sent' ? 'bg-blue-500/10 text-blue-600' : 'bg-emerald-500/10 text-emerald-600'
                    }`}>
                      <ArrowUpRight className={`w-4 h-4 ${ref.direction === 'received' ? 'rotate-180' : ''}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{ref.partnerName}</div>
                      <div className="text-xs text-muted-foreground">
                        {ref.direction === 'sent' ? 'Sent' : 'Received'} &middot; {ref.market || 'Unknown market'} &middot; {ref.closeYear}
                      </div>
                    </div>
                    <button
                      onClick={() => setPastReferrals((prev) => prev.filter((_, idx) => idx !== i))}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Past referral form */}
            {showPastReferralForm && (
              <div className="p-4 rounded-xl border border-border bg-card space-y-3">
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

                <input
                  type="text"
                  value={prPartnerName}
                  onChange={(e) => setPrPartnerName(e.target.value)}
                  placeholder="Partner name"
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />

                <input
                  type="email"
                  value={prPartnerEmail}
                  onChange={(e) => setPrPartnerEmail(e.target.value)}
                  placeholder="Partner email"
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />

                <input
                  type="text"
                  value={prMarket}
                  onChange={(e) => setPrMarket(e.target.value)}
                  placeholder="Market (e.g. Nashville, TN)"
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />

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

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAddPastReferral}
                    disabled={!prPartnerName || !prPartnerEmail}
                    className="flex items-center gap-2 h-9 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 disabled:opacity-50"
                  >
                    Add Referral
                  </button>
                  <button
                    onClick={() => setShowPastReferralForm(false)}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentStep(1)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={() => setCurrentStep(3)}
              className="flex items-center gap-2 h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Done + RCS Introduction */}
      {currentStep === 3 && (
        <div className="max-w-4xl mx-auto px-6 py-8 pb-32 w-full">
          <div className="text-center py-6">
            <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10 mb-5">
              <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="w-8 h-8 text-green-600" strokeWidth={3} />
              </div>
              <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-amber-500 animate-bounce" />
            </div>

            <h1 className="text-2xl font-bold mb-1">
              Welcome to AgentReferrals{firstName !== 'there' ? `, ${firstName}` : ''}!
            </h1>
            <p className="text-muted-foreground mb-8">
              Your profile is live and your service area is set. Here&apos;s one more thing to know about.
            </p>
          </div>

          {/* RCS Introduction */}
          <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold">Your Referral Communication Score (RCS)</h2>
                <p className="text-xs text-muted-foreground">The score that makes or breaks referral partnerships</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              Your <strong className="text-foreground">RCS</strong> is a 0-100 score that measures how responsive and reliable you are as a referral partner. Agents use it to decide who to send their best referrals to — the higher your score, the more business comes your way.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              <div className="p-3 rounded-xl bg-card border border-border">
                <div className="flex items-center gap-2 mb-1.5">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Messages</span>
                </div>
                <p className="text-[11px] text-muted-foreground">Respond to inquiries quickly and consistently</p>
              </div>
              <div className="p-3 rounded-xl bg-card border border-border">
                <div className="flex items-center gap-2 mb-1.5">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Response Time</span>
                </div>
                <p className="text-[11px] text-muted-foreground">Fast replies show you value the relationship</p>
              </div>
              <div className="p-3 rounded-xl bg-card border border-border">
                <div className="flex items-center gap-2 mb-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pipeline</span>
                </div>
                <p className="text-[11px] text-muted-foreground">Keep referrals moving through your pipeline</p>
              </div>
              <div className="p-3 rounded-xl bg-card border border-border">
                <div className="flex items-center gap-2 mb-1.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-500" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Check-ins</span>
                </div>
                <p className="text-[11px] text-muted-foreground">Regular updates build trust with partners</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-card border border-border">
              <h3 className="text-sm font-bold mb-2">How to improve your RCS:</h3>
              <ul className="space-y-1.5">
                <li className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  <span>Respond to messages within 2 hours</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  <span>Send referral status updates at least weekly</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  <span>Complete referral transactions and log outcomes</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  <span>Keep your profile and service area up to date</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Stats summary */}
          <div className="inline-flex flex-col gap-2 text-left bg-muted/50 rounded-xl p-4 mb-6 w-full">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 text-green-600" />
              </div>
              <span>Service area: <strong>{selectedZips.length || (profile?.territory_zips as string[] | undefined)?.length || 0} zip code{(selectedZips.length || (profile?.territory_zips as string[] | undefined)?.length || 0) !== 1 ? 's' : ''}</strong></span>
            </div>
            {invitesSent > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-green-600" />
                </div>
                <span>Invites sent: <strong>{invitesSent} agent{invitesSent !== 1 ? 's' : ''}</strong></span>
              </div>
            )}
            {pastReferrals.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-green-600" />
                </div>
                <span>Past referrals: <strong>{pastReferrals.length} submitted</strong></span>
              </div>
            )}
          </div>

          {/* Affiliate link in Done step */}
          {referralCode && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 mb-6">
              <Gift className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">Share your invite link to earn $10 per agent</p>
                <p className="text-xs text-muted-foreground truncate">
                  {typeof window !== 'undefined' ? `${window.location.origin}/invite/${referralCode}` : `/invite/${referralCode}`}
                </p>
              </div>
              <button
                onClick={handleCopyLink}
                className="h-8 px-3 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 hover:opacity-90 shrink-0"
              >
                {linkCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {linkCopied ? 'Copied' : 'Copy'}
              </button>
            </div>
          )}

          <div className="text-center">
            <button
              onClick={handleComplete}
              className="flex items-center gap-2 h-11 px-8 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 mx-auto"
            >
              Explore Dashboard <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
