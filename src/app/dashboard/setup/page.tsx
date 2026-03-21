'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { createHubClient } from '@/lib/supabase/hub'
import NoraOnboardingChat from '@/components/onboarding/nora-onboarding-chat'
import {
  MapPin, Users, Check, ChevronRight, ChevronLeft, Plus, X, Mail, Sparkles,
  Loader2, Search, Gift, Copy, Link2, ArrowUpRight, TrendingUp, MessageSquare,
  Clock, BarChart3, CheckCircle2, LogOut, Smartphone, Download, QrCode,
  User, Pencil, Camera, Briefcase, Award, Upload, FileText, ClipboardPaste, ContactRound, Video, Trash2,
} from 'lucide-react'
import { getZipBoundary, getCentroid, getZipAtPoint, ZCTA_WMS_URL, ZCTA_WMS_LAYERS, ZCTA_WMS_LABELS } from '@/lib/zip-boundaries'
import { uploadVideo } from '@/lib/supabase/upload-video'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import ExpectationsSelector from '@/components/expectations/expectations-selector'
import { ReferralCodeEditor } from '@/components/ui/referral-code-editor'
import type { OnboardingData, PastReferralEntry } from '@/types/onboarding'

let L: typeof import('leaflet') | null = null
const LIGHT_TILES = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'

const STEPS = ['Intake', 'Profile', 'Service Area', 'Invite Network', 'Done'] as const

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
  const [suggestions, setSuggestions] = useState<{ label: string; subtitle?: string; lat: number; lng: number; county?: string; state?: string }[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Map
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const zipLayersRef = useRef<L.Layer[]>([])
  const radiusCircleRef = useRef<L.Circle | null>(null)
  const wmsLayersRef = useRef<L.Layer[]>([])
  const [leafletReady, setLeafletReady] = useState(false)
  const [mapReady, setMapReady] = useState(false)

  // Territory mode tabs
  const [territoryMode, setTerritoryMode] = useState<'city' | 'county' | 'zip' | 'radius'>('city')
  const [territorySelections, setTerritorySelections] = useState<string[]>([])
  const selectionZipsRef = useRef<Map<string, string[]>>(new Map())

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

  // Step 2: Import contacts (CSV / paste)
  const [importMode, setImportMode] = useState<'csv' | 'paste' | null>(null)
  const [csvParsedEmails, setCsvParsedEmails] = useState<{ email: string; selected: boolean }[]>([])
  const [csvFileName, setCsvFileName] = useState('')
  const [pasteText, setPasteText] = useState('')
  const [bulkSending, setBulkSending] = useState(false)
  const [bulkResult, setBulkResult] = useState<{ sent: number; skipped: number; errors: number } | null>(null)
  const csvInputRef = useRef<HTMLInputElement>(null)

  // Step 2: Past referrals
  const [pastReferrals, setPastReferrals] = useState<PastReferralEntry[]>([])
  const [referralVerifyStatus, setReferralVerifyStatus] = useState<Record<number, 'sending' | 'sent' | 'error'>>({})
  const [prDirection, setPrDirection] = useState<'sent' | 'received'>('sent')
  const [prPartnerName, setPrPartnerName] = useState('')
  const [prPartnerEmail, setPrPartnerEmail] = useState('')
  const [prMarket, setPrMarket] = useState('')
  const [prSalePrice, setPrSalePrice] = useState<number | null>(null)
  const [prCloseYear, setPrCloseYear] = useState<number | null>(null)
  const [showPastReferralForm, setShowPastReferralForm] = useState(true)

  // Step 1: Profile Builder
  const [profileBuilderLoading, setProfileBuilderLoading] = useState(false)
  const [proposedBio, setProposedBio] = useState('')
  const [proposedSpecializations, setProposedSpecializations] = useState<string[]>([])
  const [proposedDealsPerYear, setProposedDealsPerYear] = useState<number | null>(null)
  const [proposedAnnualVolume, setProposedAnnualVolume] = useState<string | null>(null)
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null)
  const [editingBio, setEditingBio] = useState(false)
  const [editingSpecs, setEditingSpecs] = useState(false)
  const [editingVolume, setEditingVolume] = useState(false)
  const [profileBuilderReady, setProfileBuilderReady] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)

  // Step 1: Video intro
  const [videoIntroUrl, setVideoIntroUrl] = useState<string | null>(null)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [videoError, setVideoError] = useState('')
  const videoInputRef = useRef<HTMLInputElement>(null)

  // Step 1: Social media links
  const [socialInstagram, setSocialInstagram] = useState('')
  const [socialFacebook, setSocialFacebook] = useState('')
  const [socialLinkedin, setSocialLinkedin] = useState('')
  const [socialTiktok, setSocialTiktok] = useState('')
  const [socialYoutube, setSocialYoutube] = useState('')
  const [socialTwitter, setSocialTwitter] = useState('')

  // Step 1: Referral expectations
  const [expectationsSend, setExpectationsSend] = useState<string[]>([])
  const [expectationsReceive, setExpectationsReceive] = useState<string[]>([])
  const [referralUpdateMethod, setReferralUpdateMethod] = useState('email')
  const [referralResponseTime, setReferralResponseTime] = useState('24hrs')

  // Step 1: Zillow integration
  const [zillowSearchResult, setZillowSearchResult] = useState<{ platform: string; url: string; found: boolean; totalTransactions: number | null; rating: number | null } | null>(null)
  const [zillowSearching, setZillowSearching] = useState(false)
  const [zillowUrl, setZillowUrl] = useState('')
  const [zillowFetching, setZillowFetching] = useState(false)
  const [zillowData, setZillowData] = useState<{ totalTransactions: number | null; reviewCount: number | null; rating: number | null; name: string | null; found: boolean; error?: string } | null>(null)
  const [proposedTotalTransactions, setProposedTotalTransactions] = useState<number | null>(null)

  // Step 3: Affiliate
  const [affiliateData, setAffiliateData] = useState<{
    referralCode: string | null
    summary: { totalEarned: number; count: number }
  }>({ referralCode: null, summary: { totalEarned: 0, count: 0 } })
  const [linkCopied, setLinkCopied] = useState(false)
  const [fetchedReferralCode, setFetchedReferralCode] = useState<string | null>(null)
  const [customReferralCode, setCustomReferralCode] = useState<string | null>(null)

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

  // Resolve auth user for NORA step + ensure referral code exists early
  useEffect(() => {
    const hub = createHubClient()
    hub.auth.getUser().then(({ data: { user } }: { data: { user: { id: string; email?: string | null; user_metadata?: Record<string, string> } | null } }) => {
      if (user) {
        setUserId(user.id)
        setUserEmail(user.email ?? '')
        setUserName((user.user_metadata?.full_name as string) ?? '')
        // Ensure referral code exists so it's ready by the invite step
        fetch('/api/invites/mine', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id }),
        }).catch(() => {})
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
    } else if (step === 'invites') {
      // Already did intake + profile + service area → go to invites
      setCurrentStep(3)
    } else if (step === 'service_area') {
      // Already did intake + profile + service area → go to invites
      setCurrentStep(3)
    } else if (step === 'profile') {
      // Completed intake + profile → go to service area
      setCurrentStep(2)
    } else if (step === 'intake') {
      // Completed intake → go to profile builder
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

  // Fetch affiliate data and invite codes when reaching step 3 (Invite Network)
  useEffect(() => {
    if (currentStep !== 3 || !profile?.id) return
    fetch(`/api/affiliate/rewards?userId=${profile.id}`)
      .then((r) => r.json())
      .then((data) => {
        setAffiliateData({
          referralCode: data.referralCode,
          summary: data.summary ?? { totalEarned: 0, count: 0 },
        })
      })
      .catch(() => {})
    // Ensure referral code exists (POST creates if missing), then fetch it
    fetch('/api/invites/mine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: profile.id }),
    })
      .then(() => fetch(`/api/invites/mine?userId=${profile.id}`))
      .then((r) => r.json())
      .then((data) => {
        if (data.referralCode) {
          setFetchedReferralCode(data.referralCode)
        }
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

  // Initialize map when step 2 (Service Area) is active
  useEffect(() => {
    if (currentStep !== 2) return
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

      mapInstance.current = map
      setMapReady(true)

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
        setMapReady(false)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leafletReady, currentStep])

  // Render zip layers on map when selectedZips changes
  useEffect(() => {
    if (!mapInstance.current || !L) return
    const map = mapInstance.current
    let cancelled = false

    // Clear ALL polygon/tooltip layers from the map (not just tracked ones)
    zipLayersRef.current.forEach((l) => {
      try { map.removeLayer(l) } catch { /* already removed */ }
    })
    zipLayersRef.current = []

    if (selectedZips.length === 0) return

    const isCountyMode = territoryMode === 'county'

    const renderZips = async () => {
      const bounds: L.LatLngBounds[] = []
      for (const zip of selectedZips) {
        if (cancelled) return
        let ring = zipBoundariesRef.current.get(zip)
        if (!ring) {
          ring = (await getZipBoundary(zip)) ?? undefined
          if (ring) zipBoundariesRef.current.set(zip, ring)
        }
        if (!ring || !L || cancelled) continue

        const poly = L.polygon(ring as L.LatLngExpression[], {
          color: '#f59e0b',
          weight: isCountyMode ? 0.5 : 2.5,
          fillColor: '#f59e0b',
          fillOpacity: isCountyMode ? 0.15 : 0.25,
        })
        if (isCountyMode) {
          // County mode: show zip on hover only, still clickable to remove
          poly.bindTooltip(`${zip} ✕`, { permanent: false, direction: 'center', className: 'zip-label' })
        } else {
          poly.bindTooltip(`${zip} ✕`, { permanent: true, direction: 'center', className: 'zip-label' })
        }
        poly.on('click', (e) => {
          L!.DomEvent.stopPropagation(e)
          setSelectedZips((prev) => prev.filter((z) => z !== zip))
        })
        poly.addTo(map)
        zipLayersRef.current.push(poly)
        bounds.push(poly.getBounds())
      }

      if (cancelled) return
      if (bounds.length > 0) {
        let combined = bounds[0]
        for (let i = 1; i < bounds.length; i++) combined = combined.extend(bounds[i])
        map.fitBounds(combined, { padding: [40, 40], maxZoom: isCountyMode ? 9 : 12, animate: false })
      }
    }
    renderZips()
    return () => { cancelled = true }
  }, [selectedZips, territoryMode, mapReady])

  // Autocomplete suggestions
  const fetchSuggestions = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query || query.length < 2 || /^\d{5}$/.test(query)) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode/autocomplete?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        if (data.suggestions?.length > 0) {
          setSuggestions(data.suggestions)
          setShowSuggestions(true)
        } else {
          setSuggestions([])
          setShowSuggestions(false)
        }
      } catch {
        setSuggestions([])
      }
    }, 300)
  }, [])

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

    // Check if input looks like a county name — use county-zips API
    const countyMatch = input.match(/^(.+?)\s*county\s*,?\s*(\w{2})?\s*$/i)
    if (countyMatch) {
      const countyName = countyMatch[1].trim()
      let stateCode = countyMatch[2]?.toUpperCase() || ''

      // If no state code, try to resolve via geocode
      if (!stateCode) {
        try {
          const acRes = await fetch(`/api/geocode/autocomplete?q=${encodeURIComponent(input)}`)
          const acData = await acRes.json()
          const match = acData.suggestions?.find((s: { subtitle?: string }) => s.subtitle === 'County')
          if (match?.state) {
            // Extract state code from state name
            const stateMap: Record<string, string> = {
              'alabama':'AL','alaska':'AK','arizona':'AZ','arkansas':'AR','california':'CA',
              'colorado':'CO','connecticut':'CT','delaware':'DE','florida':'FL','georgia':'GA',
              'hawaii':'HI','idaho':'ID','illinois':'IL','indiana':'IN','iowa':'IA','kansas':'KS',
              'kentucky':'KY','louisiana':'LA','maine':'ME','maryland':'MD','massachusetts':'MA',
              'michigan':'MI','minnesota':'MN','mississippi':'MS','missouri':'MO','montana':'MT',
              'nebraska':'NE','nevada':'NV','new hampshire':'NH','new jersey':'NJ','new mexico':'NM',
              'new york':'NY','north carolina':'NC','north dakota':'ND','ohio':'OH','oklahoma':'OK',
              'oregon':'OR','pennsylvania':'PA','rhode island':'RI','south carolina':'SC',
              'south dakota':'SD','tennessee':'TN','texas':'TX','utah':'UT','vermont':'VT',
              'virginia':'VA','washington':'WA','west virginia':'WV','wisconsin':'WI','wyoming':'WY',
            }
            stateCode = stateMap[match.state.toLowerCase()] || ''
          }
        } catch { /* fall through */ }
      }

      if (stateCode) {
        try {
          const res = await fetch(`/api/geocode/county-zips?county=${encodeURIComponent(countyName)}&state=${encodeURIComponent(stateCode)}`)
          const data = await res.json()
          if (data.zips?.length > 0) {
            const newZips = data.zips.filter((z: string) => !zipBoundariesRef.current.has(z))
            for (let i = 0; i < newZips.length; i += 10) {
              const batch = newZips.slice(i, i + 10)
              const results = await Promise.all(batch.map((z: string) => getZipBoundary(z)))
              results.forEach((ring: [number, number][] | null, idx: number) => {
                if (ring) zipBoundariesRef.current.set(batch[idx], ring)
              })
            }
            setSelectedZips((prev) => {
              const combined = new Set([...prev, ...data.zips])
              return Array.from(combined).slice(0, 100)
            })
            // Center on county
            const geoRes = await fetch(`/api/geocode?q=${encodeURIComponent(input)}`)
            const geo = await geoRes.json()
            if (geo.lat && geo.lng && mapInstance.current) {
              mapInstance.current.setView([geo.lat, geo.lng], 9, { animate: true })
            }
            setZipInput('')
            setZipLoading(false)
            return
          }
        } catch { /* fall through to generic geocode */ }
      }
    }

    try {
      const geoRes = await fetch(`/api/geocode?q=${encodeURIComponent(input)}`)
      const geo = await geoRes.json()
      if (!geo.lat || !geo.lng) {
        setZipError('Location not found. Try a zip code instead.')
        setZipLoading(false)
        return
      }

      // Determine search radius based on input type
      // County names get a wider search (~30mi), cities get ~15mi
      const isCounty = input.toLowerCase().includes('county')
      const searchMiles = isCounty ? 30 : 15
      const degPerMile = 1 / 69
      const gridStep = Math.max(searchMiles / 8, 2) * degPerMile

      // Build grid of sample points
      const points: { lat: number; lng: number }[] = []
      for (let dlat = -searchMiles * degPerMile; dlat <= searchMiles * degPerMile; dlat += gridStep) {
        for (let dlng = -searchMiles * degPerMile; dlng <= searchMiles * degPerMile; dlng += gridStep) {
          const dist = Math.sqrt(dlat * dlat + dlng * dlng) / degPerMile
          if (dist > searchMiles) continue
          points.push({ lat: geo.lat + dlat, lng: geo.lng + dlng })
        }
      }

      // Lookup zips in parallel batches
      const nearbyZips = new Set<string>()
      for (let i = 0; i < points.length; i += 10) {
        const batch = points.slice(i, i + 10)
        const results = await Promise.all(batch.map((p) => getZipAtPoint(p.lat, p.lng)))
        results.forEach((zip) => { if (zip) nearbyZips.add(zip) })
      }

      // Fetch boundaries in parallel batches
      const newZips = Array.from(nearbyZips).filter((z) => !zipBoundariesRef.current.has(z))
      for (let i = 0; i < newZips.length; i += 10) {
        const batch = newZips.slice(i, i + 10)
        const results = await Promise.all(batch.map((z) => getZipBoundary(z)))
        results.forEach((ring, idx) => {
          if (ring) zipBoundariesRef.current.set(batch[idx], ring)
        })
      }

      setSelectedZips((prev) => {
        const combined = new Set([...prev, ...nearbyZips])
        return Array.from(combined).slice(0, 100)
      })

      setZipInput('')
      if (mapInstance.current) {
        mapInstance.current.setView([geo.lat, geo.lng], isCounty ? 9 : 10, { animate: true })
      }
    } catch {
      setZipError('Failed to look up location.')
    }
    setZipLoading(false)
  }, [zipInput, selectedZips])

  const removeZip = useCallback((zip: string) => {
    setSelectedZips((prev) => prev.filter((z) => z !== zip))
  }, [])

  // Switch WMS overlay based on territory mode
  const COUNTY_WMS_BOUNDARIES = '1'
  const COUNTY_WMS_LABELS = '0'
  useEffect(() => {
    if (!mapInstance.current || !L) return
    const map = mapInstance.current

    // Remove old WMS layers
    wmsLayersRef.current.forEach((l) => {
      try { map.removeLayer(l) } catch { /* */ }
    })
    wmsLayersRef.current = []

    if (territoryMode === 'county') {
      // Show county boundaries
      const boundaries = L.tileLayer.wms(ZCTA_WMS_URL, {
        layers: COUNTY_WMS_BOUNDARIES,
        format: 'image/png',
        transparent: true,
        opacity: 0.3,
      }).addTo(map)
      const labels = L.tileLayer.wms(ZCTA_WMS_URL, {
        layers: COUNTY_WMS_LABELS,
        format: 'image/png',
        transparent: true,
        opacity: 0.5,
      }).addTo(map)
      wmsLayersRef.current = [boundaries, labels]
    } else {
      // Show zip code boundaries
      const boundaries = L.tileLayer.wms(ZCTA_WMS_URL, {
        layers: ZCTA_WMS_LAYERS,
        format: 'image/png',
        transparent: true,
        opacity: 0.3,
      }).addTo(map)
      const labels = L.tileLayer.wms(ZCTA_WMS_URL, {
        layers: ZCTA_WMS_LABELS,
        format: 'image/png',
        transparent: true,
        opacity: 0.5,
      }).addTo(map)
      wmsLayersRef.current = [boundaries, labels]
    }
  }, [territoryMode, leafletReady])

  // Sync radius mode to DOM for the map click handler
  useEffect(() => {
    const isRadius = territoryMode === 'radius'
    document.body.dataset.radiusMode = isRadius ? 'true' : 'false'
    document.body.dataset.radiusMiles = String(radiusMiles)
    setRadiusMode(isRadius)
  }, [territoryMode, radiusMiles])

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
    setTerritorySelections([])

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
          territory_meta: {
            mode: territoryMode,
            selections: territorySelections,
          },
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save territory')
      }

      saveStepProgress('service_area')
      await refreshProfile()
      setCurrentStep(3)
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

  // CSV file upload handler
  const handleCsvUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvFileName(file.name)
    setBulkResult(null)
    const reader = new FileReader()
    reader.onload = (evt) => {
      const text = evt.target?.result as string
      if (!text) return
      const lines = text.split(/\r?\n/).filter(Boolean)
      if (lines.length === 0) return
      const header = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/['"]/g, ''))
      const emailColNames = ['email', 'e-mail', 'email_address', 'emailaddress', 'mail', 'email address']
      let emailIdx = header.findIndex((h) => emailColNames.includes(h))
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (emailIdx === -1) {
        for (let ci = 0; ci < header.length; ci++) {
          if (emailRegex.test(header[ci])) { emailIdx = ci; break }
        }
      }
      const found: string[] = []
      const startRow = emailIdx !== -1 && !emailRegex.test(header[emailIdx]) ? 1 : 0
      if (emailIdx === -1) emailIdx = 0
      for (let i = startRow; i < lines.length; i++) {
        const cols = lines[i].split(',').map((c) => c.trim().replace(/['"]/g, ''))
        const candidate = cols[emailIdx]?.toLowerCase()
        if (candidate && emailRegex.test(candidate)) {
          found.push(candidate)
        } else {
          for (const col of cols) {
            const cleaned = col.toLowerCase().trim()
            if (emailRegex.test(cleaned)) { found.push(cleaned); break }
          }
        }
      }
      const unique = [...new Set(found)]
      setCsvParsedEmails(unique.map((em) => ({ email: em, selected: true })))
      setImportMode('csv')
    }
    reader.readAsText(file)
    e.target.value = ''
  }, [])

  // Parse pasted emails
  const handleParsePaste = useCallback(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const parsed = pasteText.split(/[\n,;]+/).map((l) => l.trim().toLowerCase()).filter((l) => emailRegex.test(l))
    const unique = [...new Set(parsed)]
    setCsvParsedEmails(unique.map((em) => ({ email: em, selected: true })))
    setBulkResult(null)
  }, [pasteText])

  // Toggle selection of a parsed email
  const toggleCsvEmail = useCallback((idx: number) => {
    setCsvParsedEmails((prev) => prev.map((item, i) => i === idx ? { ...item, selected: !item.selected } : item))
  }, [])

  // Select/deselect all parsed emails
  const toggleAllCsvEmails = useCallback((selected: boolean) => {
    setCsvParsedEmails((prev) => prev.map((item) => ({ ...item, selected })))
  }, [])

  // Send bulk invites via /api/invites/bulk
  const handleBulkSend = useCallback(async () => {
    const selectedEmails = csvParsedEmails.filter((e) => e.selected).map((e) => e.email)
    if (selectedEmails.length === 0) return
    setBulkSending(true)
    setBulkResult(null)
    try {
      const res = await fetch('/api/invites/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile?.id, userName: profile?.full_name, emails: selectedEmails }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send invites')
      setBulkResult({ sent: data.sent, skipped: data.skipped, errors: data.errors })
      setCsvParsedEmails([])
      setPasteText('')
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to send bulk invites.')
    } finally {
      setBulkSending(false)
    }
  }, [csvParsedEmails, profile?.id, profile?.full_name])

  // Add past referral and send verification
  const handleAddPastReferral = useCallback(async () => {
    if (!prPartnerName || !prPartnerEmail) return

    const entry: PastReferralEntry = {
      direction: prDirection,
      partnerName: prPartnerName,
      partnerEmail: prPartnerEmail,
      market: prMarket,
      salePrice: prSalePrice ?? 0,
      closeYear: prCloseYear ?? 2026,
    }

    const newIndex = pastReferrals.length
    setPastReferrals((prev) => [...prev, entry])
    setPrDirection('sent')
    setPrPartnerName('')
    setPrPartnerEmail('')
    setPrMarket('')
    setPrSalePrice(null)
    setPrCloseYear(null)
    setShowPastReferralForm(false)

    // Send verification email via API
    if (userId) {
      setReferralVerifyStatus((prev) => ({ ...prev, [newIndex]: 'sending' }))
      try {
        const res = await fetch('/api/referrals/verify/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            referral: {
              partnerName: entry.partnerName,
              partnerEmail: entry.partnerEmail,
              direction: entry.direction,
              market: entry.market,
              salePrice: entry.salePrice,
              closeYear: entry.closeYear,
            },
          }),
        })
        if (res.ok) {
          setReferralVerifyStatus((prev) => ({ ...prev, [newIndex]: 'sent' }))
        } else {
          setReferralVerifyStatus((prev) => ({ ...prev, [newIndex]: 'error' }))
        }
      } catch {
        setReferralVerifyStatus((prev) => ({ ...prev, [newIndex]: 'error' }))
      }
    }
  }, [prDirection, prPartnerName, prPartnerEmail, prMarket, prSalePrice, prCloseYear, pastReferrals.length, userId])

  // Copy affiliate link
  const handleCopyLink = useCallback(() => {
    const code = affiliateData.referralCode || profile?.referral_code || fetchedReferralCode
    if (!code) return
    const link = `https://agentreferrals.ai/invite/${code}`
    navigator.clipboard.writeText(link).then(() => {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 3000)
    })
  }, [affiliateData.referralCode, profile?.referral_code, fetchedReferralCode])

  // NORA complete handler — advance to Profile Builder
  const handleNoraComplete = useCallback(async () => {
    saveStepProgress('intake')
    await refreshProfile()
    setCurrentStep(1)
  }, [refreshProfile, saveStepProgress])

  // Profile Builder: fetch proposed profile when step 1 is active
  useEffect(() => {
    if (currentStep !== 1 || !profile?.id) return
    if (profileBuilderReady) return // already loaded

    setProfileBuilderLoading(true)

    const fetchProposedProfile = async () => {
      try {
        // Get brokerage name for the search
        let brokerageName = ''
        if (profile.brokerage) {
          brokerageName = (profile.brokerage as { name?: string })?.name || ''
        }

        const res = await fetch('/api/profile-builder/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: profile.full_name,
            licenseNumber: profile.license_number,
            primaryArea: profile.primary_area,
            brokerage: brokerageName,
            yearsLicensed: profile.years_licensed,
            specializations: profile.tags || [],
            dealsPerYear: profile.deals_per_year,
            avgSalePrice: profile.avg_sale_price,
          }),
        })

        if (res.ok) {
          const data = await res.json()
          setProposedBio(data.bio || '')
          setProposedSpecializations(data.specializations || profile.tags || [])
          setProposedDealsPerYear(data.estimatedDealsPerYear || profile.deals_per_year || null)
          setProposedAnnualVolume(data.estimatedAnnualVolume || null)
          setProfilePhotoUrl(profile.avatar_url || null)
        } else {
          // Fallback: use existing profile data
          setProposedBio(profile.bio || '')
          setProposedSpecializations(profile.tags || [])
          setProposedDealsPerYear(profile.deals_per_year || null)
          setProfilePhotoUrl(profile.avatar_url || null)
        }
      } catch {
        // Fallback
        setProposedBio(profile.bio || '')
        setProposedSpecializations(profile.tags || [])
        setProposedDealsPerYear(profile.deals_per_year || null)
        setProfilePhotoUrl(profile.avatar_url || null)
      } finally {
        setProfileBuilderLoading(false)
        setProfileBuilderReady(true)
      }
    }

    fetchProposedProfile()
  }, [currentStep, profile, profileBuilderReady])

  // Load existing Zillow data and video intro from profile
  useEffect(() => {
    if (currentStep !== 1 || !profile) return
    if (profile.zillow_profile_url) setZillowUrl(profile.zillow_profile_url)
    if (profile.total_transactions) setProposedTotalTransactions(profile.total_transactions)
    if (profile.video_intro_url) setVideoIntroUrl(profile.video_intro_url)
  }, [currentStep, profile])

  // Fetch Zillow profile data from a URL
  const fetchZillowProfile = useCallback(async (url: string) => {
    if (!url) return
    setZillowFetching(true)
    setZillowData(null)

    try {
      const res = await fetch('/api/profile-builder/zillow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zillowUrl: url }),
      })

      const data = await res.json()
      setZillowData(data)

      if (data.found && data.totalTransactions) {
        setProposedTotalTransactions(data.totalTransactions)
      }
    } catch {
      setZillowData({ totalTransactions: null, reviewCount: null, rating: null, name: null, found: false, error: 'Failed to fetch Zillow profile' })
    } finally {
      setZillowFetching(false)
    }
  }, [])

  // Video upload handler
  async function handleVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    setVideoError('')

    // Validate file size (50MB)
    if (file.size > 50 * 1024 * 1024) {
      setVideoError('Video must be under 50MB')
      return
    }

    // Validate duration (60 seconds) by loading video metadata
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'

    const duration = await new Promise<number>((resolve) => {
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(url)
        resolve(video.duration)
      }
      video.onerror = () => {
        URL.revokeObjectURL(url)
        resolve(0)
      }
      video.src = url
    })

    if (duration === 0) {
      setVideoError('Could not read video file. Please try a different format.')
      return
    }
    if (duration > 60) {
      setVideoError(`Video is ${Math.ceil(duration)}s — max 60 seconds allowed`)
      return
    }

    setUploadingVideo(true)
    const { url: videoUrl, error } = await uploadVideo(profile.id, file, 'intro')

    if (error || !videoUrl) {
      // Fallback: save a data URL if bucket doesn't exist yet
      console.error('[Video] Upload error:', error)
      const reader = new FileReader()
      reader.onload = async () => {
        const dataUrl = reader.result as string
        setVideoIntroUrl(dataUrl)
        setUploadingVideo(false)
      }
      reader.readAsDataURL(file)
      return
    }

    setVideoIntroUrl(videoUrl)
    setUploadingVideo(false)
  }

  // Video remove handler
  function handleVideoRemove() {
    setVideoIntroUrl(null)
    setVideoError('')
    if (videoInputRef.current) videoInputRef.current.value = ''
  }

  // Save profile builder data and advance to Service Area
  const handleProfileAccept = useCallback(async () => {
    if (!profile?.id) return
    setProfileSaving(true)

    try {
      const profileData: Record<string, unknown> = {
        id: profile.id,
        email: profile.email,
        bio: proposedBio,
        tags: proposedSpecializations,
        deals_per_year: proposedDealsPerYear,
        avatar_url: profilePhotoUrl,
        video_intro_url: videoIntroUrl,
      }

      // Include referral preferences
      profileData.referral_update_method = referralUpdateMethod
      profileData.referral_response_time = referralResponseTime

      // Include social media links
      if (socialInstagram.trim()) profileData.social_instagram = socialInstagram.trim()
      if (socialFacebook.trim()) profileData.social_facebook = socialFacebook.trim()
      if (socialLinkedin.trim()) profileData.social_linkedin = socialLinkedin.trim()
      if (socialTiktok.trim()) profileData.social_tiktok = socialTiktok.trim()
      if (socialYoutube.trim()) profileData.social_youtube = socialYoutube.trim()
      if (socialTwitter.trim()) profileData.social_twitter = socialTwitter.trim()

      // Include Zillow data if available
      if (zillowUrl) {
        profileData.zillow_profile_url = zillowUrl
      }
      if (proposedTotalTransactions) {
        profileData.total_transactions = proposedTotalTransactions
      }
      if (zillowUrl || proposedTotalTransactions) {
        const sources: Record<string, string> = {}
        if (zillowUrl) sources.transactions = 'zillow'
        profileData.data_sources = sources
      }

      const res = await fetch('/api/onboarding/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: profileData }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save profile')
      }

      // Save referral expectations (optional — may be empty)
      if (expectationsSend.length > 0 || expectationsReceive.length > 0) {
        await fetch('/api/expectations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentId: profile.id,
            selections: { send: expectationsSend, receive: expectationsReceive },
          }),
        })
      }

      saveStepProgress('profile')
      await refreshProfile()
      setCurrentStep(2)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save profile.')
    } finally {
      setProfileSaving(false)
    }
  }, [profile?.id, proposedBio, proposedSpecializations, proposedDealsPerYear, profilePhotoUrl, videoIntroUrl, zillowUrl, proposedTotalTransactions, socialInstagram, socialFacebook, socialLinkedin, socialTiktok, socialYoutube, socialTwitter, expectationsSend, expectationsReceive, referralUpdateMethod, referralResponseTime, saveStepProgress, refreshProfile])

  const handleComplete = useCallback(async () => {
    localStorage.setItem('ar_setup_wizard_completed', 'true')
    saveStepProgress('complete')
    router.push('/dashboard')
  }, [router, saveStepProgress])

  const firstName = profile?.full_name?.split(' ')[0] || 'there'
  const referralCode = customReferralCode || affiliateData.referralCode || profile?.referral_code || fetchedReferralCode || null

  if (isLoading || currentStep === -1) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-border bg-card sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <img src="/logo.png?v=2" alt="AgentReferrals" className="h-8 w-auto shrink-0 dark:hidden" />
            <img src="/logo-dark.png?v=2" alt="AgentReferrals" className="h-8 w-auto shrink-0 hidden dark:block" />
          </div>
          {/* Step indicator — compact */}
          <div className="flex items-center gap-1">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center gap-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                  i < currentStep ? 'bg-green-500 text-white' : i === currentStep ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  {i < currentStep ? <Check className="w-3 h-3" /> : i + 1}
                </div>
                <span className={`text-[11px] font-medium hidden lg:block ${
                  i === currentStep ? 'text-foreground' : 'text-muted-foreground'
                }`}>{label}</span>
                {i < STEPS.length - 1 && <div className={`w-4 lg:w-6 h-px ${i < currentStep ? 'bg-green-500' : 'bg-border'}`} />}
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

      {/* Step 1: Profile Builder */}
      {currentStep === 1 && (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 py-8 w-full">
            {profileBuilderLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                  <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-amber-500 animate-pulse" />
                </div>
                <h2 className="text-xl font-bold mb-2">Building your profile...</h2>
                <p className="text-muted-foreground text-sm text-center max-w-md">
                  We&apos;re creating a professional profile based on your information. This will only take a moment.
                </p>
              </div>
            ) : (
              <>
                <button onClick={() => setCurrentStep(0)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <div className="mb-6">
                  <h1 className="text-2xl font-bold">Your Agent Profile</h1>
                  <p className="text-muted-foreground mt-1">
                    We&apos;ve built a profile based on your intake. Review and edit anything before continuing.
                  </p>
                </div>

                {/* Profile Card */}
                <div className="rounded-2xl border border-border bg-card overflow-hidden mb-6">
                  {/* Header with avatar */}
                  <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6 flex items-center gap-5">
                    <div className="relative group">
                      {profilePhotoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={profilePhotoUrl}
                          alt="Profile photo"
                          className="w-20 h-20 rounded-full object-cover border-2 border-white shadow-lg"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-muted border-2 border-white shadow-lg flex items-center justify-center">
                          <User className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                      <button
                        onClick={() => {
                          // Future: implement photo upload
                        }}
                        className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        title="Upload photo"
                      >
                        <Camera className="w-5 h-5 text-white" />
                      </button>
                    </div>
                    <div>
                      <h2 className="text-xl font-extrabold">{profile?.full_name || 'Agent'}</h2>
                      {profile?.primary_area && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <MapPin className="w-3.5 h-3.5" />
                          {profile.primary_area}
                        </p>
                      )}
                      {profile?.brokerage && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <Briefcase className="w-3.5 h-3.5" />
                          {(profile.brokerage as { name?: string })?.name || 'Brokerage'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Bio */}
                  <div className="p-5 border-b border-border">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Bio</label>
                      <button
                        onClick={() => setEditingBio(!editingBio)}
                        className="flex items-center gap-1 text-xs text-primary font-medium hover:text-primary/80"
                      >
                        <Pencil className="w-3 h-3" />
                        {editingBio ? 'Done' : 'Edit'}
                      </button>
                    </div>
                    {editingBio ? (
                      <textarea
                        value={proposedBio}
                        onChange={(e) => setProposedBio(e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                        placeholder="Write a short bio about yourself..."
                      />
                    ) : (
                      <p className="text-sm text-foreground leading-relaxed">
                        {proposedBio || <span className="text-muted-foreground italic">No bio yet. Click Edit to add one.</span>}
                      </p>
                    )}
                  </div>

                  {/* Specializations */}
                  <div className="p-5 border-b border-border">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Specializations</label>
                      <button
                        onClick={() => setEditingSpecs(!editingSpecs)}
                        className="flex items-center gap-1 text-xs text-primary font-medium hover:text-primary/80"
                      >
                        <Pencil className="w-3 h-3" />
                        {editingSpecs ? 'Done' : 'Edit'}
                      </button>
                    </div>
                    {editingSpecs ? (
                      <div>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {proposedSpecializations.map((spec, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium"
                            >
                              {spec}
                              <button
                                onClick={() => setProposedSpecializations(prev => prev.filter((_, idx) => idx !== i))}
                                className="hover:text-destructive"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {['Luxury', 'First-Time Buyers', 'Relocation', 'Investment', 'New Construction', 'Condos', 'Commercial', 'Land', 'Vacation Homes', 'Waterfront'].filter(s => !proposedSpecializations.includes(s)).map((spec) => (
                            <button
                              key={spec}
                              onClick={() => setProposedSpecializations(prev => [...prev, spec])}
                              className="px-2.5 py-1 rounded-full border border-border text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                            >
                              + {spec}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {proposedSpecializations.length > 0 ? (
                          proposedSpecializations.map((spec, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium"
                            >
                              <Award className="w-3 h-3" />
                              {spec}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground italic">No specializations yet. Click Edit to add some.</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Stats Row */}
                  <div className="p-5 grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Deals/Year</span>
                        <button
                          onClick={() => setEditingVolume(!editingVolume)}
                          className="text-primary hover:text-primary/80"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      </div>
                      {editingVolume ? (
                        <input
                          type="number"
                          value={proposedDealsPerYear ?? ''}
                          onChange={(e) => setProposedDealsPerYear(e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full h-8 px-2 rounded border border-input bg-background text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/50"
                          placeholder="e.g. 15"
                        />
                      ) : (
                        <div className="text-lg font-extrabold">{proposedDealsPerYear ?? '\u2014'}</div>
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Est. Volume</span>
                      <div className="text-lg font-extrabold">{proposedAnnualVolume ?? '\u2014'}</div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Experience</span>
                      <div className="text-lg font-extrabold">{profile?.years_licensed ? `${profile.years_licensed} yr${profile.years_licensed !== 1 ? 's' : ''}` : '\u2014'}</div>
                    </div>
                  </div>
                </div>

                {/* Transaction History & Zillow Profile */}
                <div className="rounded-2xl border border-border bg-card overflow-hidden mb-6">
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-1">
                      <BarChart3 className="w-4 h-4 text-primary" />
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Transaction History</label>
                    </div>
                    <p className="text-xs text-muted-foreground mb-4">
                      Enter your total career transactions. Link your Zillow profile so other agents can verify your track record.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Total Career Transactions</label>
                        <input
                          type="number"
                          value={proposedTotalTransactions ?? ''}
                          onChange={(e) => setProposedTotalTransactions(e.target.value ? parseInt(e.target.value, 10) : null)}
                          placeholder="e.g. 150"
                          className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Zillow Profile URL <span className="text-muted-foreground/60">(for verification)</span></label>
                        <input
                          type="url"
                          value={zillowUrl}
                          onChange={(e) => setZillowUrl(e.target.value)}
                          placeholder="https://www.zillow.com/profile/yourname"
                          className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      </div>
                    </div>

                    {zillowUrl && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Your Zillow profile will be linked on your agent page for verification</span>
                        <a href={zillowUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5 ml-1">
                          Preview <ArrowUpRight className="w-3 h-3" />
                        </a>
                      </div>
                    )}

                    {/* Total Transactions override */}
                    {proposedTotalTransactions !== null && (
                      <div className="mt-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <p className="text-xs text-blue-700 dark:text-blue-400">
                          <CheckCircle2 className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                          Total transactions ({proposedTotalTransactions}) will be shown on your profile instead of &quot;Deals/Year&quot;.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Video Introduction */}
                <div className="rounded-2xl border border-border bg-card overflow-hidden mb-6">
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-1">
                      <Video className="w-4 h-4 text-primary" />
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Video Introduction</label>
                    </div>
                    <p className="text-xs text-muted-foreground mb-4">
                      Record a 60-second intro video to help referral partners get to know you. Upload an MP4, MOV, or WebM file (max 60s, max 50MB).
                    </p>

                    {videoIntroUrl ? (
                      <div className="space-y-3">
                        <div className="rounded-lg overflow-hidden border border-border bg-black">
                          <video
                            src={videoIntroUrl}
                            controls
                            className="w-full max-h-[360px]"
                            preload="metadata"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => videoInputRef.current?.click()}
                            disabled={uploadingVideo}
                            className="h-8 px-4 rounded-lg border border-border text-sm font-semibold hover:bg-accent transition-colors inline-flex items-center gap-1.5"
                          >
                            <Video className="w-3.5 h-3.5" />
                            Replace Video
                          </button>
                          <button
                            onClick={handleVideoRemove}
                            className="h-8 px-4 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors inline-flex items-center gap-1.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-border rounded-lg">
                        <Video className="w-10 h-10 text-muted-foreground/40 mb-3" />
                        <p className="text-sm font-semibold mb-1">No video intro yet</p>
                        <p className="text-xs text-muted-foreground mb-4">A short intro helps you stand out to referral partners</p>
                        <button
                          onClick={() => videoInputRef.current?.click()}
                          disabled={uploadingVideo}
                          className="h-9 px-5 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 inline-flex items-center gap-2"
                        >
                          {uploadingVideo ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Video className="w-3.5 h-3.5" />
                              Upload Video Intro
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {videoError && (
                      <p className="text-xs text-red-500 font-semibold mt-2">{videoError}</p>
                    )}

                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/*"
                      onChange={handleVideoUpload}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Social Media Links */}
                <div className="rounded-2xl border border-border bg-card overflow-hidden mb-6">
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-1">
                      <Link2 className="w-4 h-4 text-primary" />
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Social Media</label>
                    </div>
                    <p className="text-xs text-muted-foreground mb-4">
                      Add your social profiles so referral partners can connect with you. These are optional and will show on your public profile.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Instagram</label>
                        <input
                          value={socialInstagram}
                          onChange={(e) => setSocialInstagram(e.target.value)}
                          placeholder="@yourhandle or full URL"
                          className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Facebook</label>
                        <input
                          value={socialFacebook}
                          onChange={(e) => setSocialFacebook(e.target.value)}
                          placeholder="facebook.com/yourpage"
                          className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-muted-foreground mb-1 block">LinkedIn</label>
                        <input
                          value={socialLinkedin}
                          onChange={(e) => setSocialLinkedin(e.target.value)}
                          placeholder="linkedin.com/in/yourprofile"
                          className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-muted-foreground mb-1 block">TikTok</label>
                        <input
                          value={socialTiktok}
                          onChange={(e) => setSocialTiktok(e.target.value)}
                          placeholder="@yourhandle"
                          className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-muted-foreground mb-1 block">YouTube</label>
                        <input
                          value={socialYoutube}
                          onChange={(e) => setSocialYoutube(e.target.value)}
                          placeholder="youtube.com/@yourchannel"
                          className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-muted-foreground mb-1 block">X (Twitter)</label>
                        <input
                          value={socialTwitter}
                          onChange={(e) => setSocialTwitter(e.target.value)}
                          placeholder="@yourhandle"
                          className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Referral Expectations (optional) */}
                <div className="rounded-2xl border border-border bg-card overflow-hidden mb-6">
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-1">
                      <ClipboardPaste className="w-4 h-4 text-primary" />
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Referral Expectations</label>
                      <span className="text-[10px] text-muted-foreground/60 font-medium ml-1">(Optional)</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-4">
                      Set expectations for referral transactions. Other agents will see what you commit to, and you&apos;ll get automatic updates based on your preferences.
                    </p>

                    {/* Preferences */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 p-3 rounded-lg bg-muted/50 border border-border">
                      <div>
                        <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Preferred Update Method</label>
                        <select
                          value={referralUpdateMethod}
                          onChange={(e) => setReferralUpdateMethod(e.target.value)}
                          className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm"
                        >
                          <option value="email">Email</option>
                          <option value="text">Text Message</option>
                          <option value="phone">Phone Call</option>
                          <option value="in_app">In-App Notification</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Response Time Commitment</label>
                        <select
                          value={referralResponseTime}
                          onChange={(e) => setReferralResponseTime(e.target.value)}
                          className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm"
                        >
                          <option value="same_day">Same Day</option>
                          <option value="24hrs">Within 24 Hours</option>
                          <option value="48hrs">Within 48 Hours</option>
                        </select>
                      </div>
                    </div>

                    {/* Two-column: Send / Receive */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-xs font-bold text-muted-foreground mb-2">When I Refer Out (What I Expect)</h3>
                        <ExpectationsSelector
                          agentId={profile?.id ?? ''}
                          side="send"
                          onSelectionsChange={setExpectationsSend}
                          compact
                        />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-muted-foreground mb-2">When I Receive a Referral (What I Commit To)</h3>
                        <ExpectationsSelector
                          agentId={profile?.id ?? ''}
                          side="receive"
                          onSelectionsChange={setExpectationsReceive}
                          compact
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {saveError && <p className="text-sm text-destructive mb-3">{saveError}</p>}

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setCurrentStep(0)}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    onClick={handleProfileAccept}
                    disabled={profileSaving}
                    className="flex items-center gap-2 h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 disabled:opacity-50"
                  >
                    {profileSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Looks Good <ChevronRight className="w-4 h-4" /></>}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Service Area */}
      {currentStep === 2 && (<>
        <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-6 pb-4 w-full flex flex-col h-full">
          <button onClick={() => setCurrentStep(1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <div className="mb-4">
            <h1 className="text-2xl font-bold">Define Your Service Area</h1>
            <p className="text-muted-foreground mt-1">
              Agents can search for partners by city, county, or address — but behind the scenes, all lookups match against zip codes. Use any method below to define your coverage area.
            </p>
          </div>

          {/* Mode tabs */}
          <div className="flex gap-1 p-1 rounded-xl bg-muted/50 border border-border mb-4 w-fit">
            {([
              { key: 'city', label: 'City', icon: Search },
              { key: 'county', label: 'County', icon: MapPin },
              { key: 'zip', label: 'Zip Code', icon: MapPin },
              { key: 'radius', label: 'Radius', icon: MapPin },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => {
                  setTerritoryMode(key)
                  setZipInput('')
                  setZipError('')
                  setSuggestions([])
                  setShowSuggestions(false)
                }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  territoryMode === key
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Mode-specific input */}
          {(territoryMode === 'city' || territoryMode === 'county') && (
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={zipInput}
                  onChange={(e) => {
                    setZipInput(e.target.value)
                    setZipError('')
                    fetchSuggestions(e.target.value)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setShowSuggestions(false)
                      handleAddZip()
                    }
                    if (e.key === 'Escape') setShowSuggestions(false)
                  }}
                  onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true) }}
                  onBlur={() => { setTimeout(() => setShowSuggestions(false), 200) }}
                  placeholder={territoryMode === 'city' ? 'Enter a city name (e.g. Austin, TX)' : 'Enter a county name (e.g. Travis County, TX)'}
                  className="w-full h-10 pl-9 pr-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                {/* Autocomplete dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-border bg-card shadow-lg z-[9999] overflow-hidden">
                    {suggestions
                      .filter((s) => territoryMode === 'county' ? s.subtitle === 'County' : s.subtitle === 'City')
                      .map((s, i) => (
                      <button
                        key={`${s.label}-${i}`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={async () => {
                          setShowSuggestions(false)
                          setSuggestions([])

                          if (s.subtitle === 'County' && s.county && s.state) {
                            setZipInput('')
                            setZipLoading(true)
                            try {
                              const res = await fetch(`/api/geocode/county-zips?county=${encodeURIComponent(s.county)}&state=${encodeURIComponent(s.state)}`)
                              const data = await res.json()
                              if (data.zips?.length > 0) {
                                const newZips = data.zips.filter((z: string) => !zipBoundariesRef.current.has(z))
                                for (let j = 0; j < newZips.length; j += 10) {
                                  const batch = newZips.slice(j, j + 10)
                                  const results = await Promise.all(batch.map((z: string) => getZipBoundary(z)))
                                  results.forEach((ring: [number, number][] | null, idx: number) => {
                                    if (ring) zipBoundariesRef.current.set(batch[idx], ring)
                                  })
                                }
                                setSelectedZips((prev) => {
                                  const combined = new Set([...prev, ...data.zips])
                                  return Array.from(combined).slice(0, 100)
                                })
                                if (mapInstance.current) {
                                  mapInstance.current.setView([s.lat, s.lng], 9, { animate: true })
                                }
                                selectionZipsRef.current.set(s.label, data.zips)
                                setTerritorySelections((prev) => [...prev, s.label])
                              }
                            } catch {
                              setZipError('Failed to load county zip codes.')
                            }
                            setZipLoading(false)
                          } else {
                            setZipInput(s.label)
                            setTimeout(() => handleAddZip(), 50)
                          }
                        }}
                        className="w-full text-left px-3 py-2.5 text-sm hover:bg-accent transition-colors flex items-center gap-2 border-b border-border last:border-b-0"
                      >
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">{s.label}</span>
                        {s.subtitle && <span className="text-xs text-muted-foreground shrink-0">{s.subtitle}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={handleAddZip}
                disabled={zipLoading || !zipInput.trim()}
                className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 disabled:opacity-40"
              >
                {zipLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
              </button>
            </div>
          )}

          {territoryMode === 'zip' && (
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={zipInput}
                  onChange={(e) => { setZipInput(e.target.value); setZipError('') }}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddZip()}
                  placeholder="Enter zip code (e.g. 78734)"
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
              <p className="flex items-center text-xs text-muted-foreground">
                or click on the map to add zip codes
              </p>
            </div>
          )}

          {territoryMode === 'radius' && (
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Radius:</span>
                {[5, 10, 25].map((mi) => (
                  <button
                    key={mi}
                    onClick={() => setRadiusMiles(mi)}
                    className={`h-8 px-3 rounded-lg text-sm font-semibold transition-all ${
                      radiusMiles === mi ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {mi} mi
                  </button>
                ))}
              </div>
              <span className="text-xs text-muted-foreground">Click the map to set your center point</span>
              {radiusLoading && (
                <div className="flex items-center gap-1.5 text-xs text-primary">
                  <Loader2 className="w-3 h-3 animate-spin" /> Finding zip codes...
                </div>
              )}
            </div>
          )}

          {zipError && <p className="text-sm text-destructive mb-3">{zipError}</p>}

          {/* Zip count + clear */}
          <div className="flex items-center justify-between mb-2 gap-2">
            {selectedZips.length > 0 ? (
              <div className="flex items-center gap-2 flex-wrap">
                {territorySelections.length > 0 ? (
                  <>
                    {territorySelections.map((sel) => (
                      <div key={sel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
                        <MapPin className="w-3 h-3 text-primary" />
                        <span className="text-xs font-semibold text-primary">{sel}</span>
                        <button
                          onClick={() => {
                            const zipsToRemove = new Set(selectionZipsRef.current.get(sel) || [])
                            selectionZipsRef.current.delete(sel)
                            setTerritorySelections((prev) => prev.filter((s) => s !== sel))
                            if (zipsToRemove.size > 0) {
                              setSelectedZips((prev) => prev.filter((z) => !zipsToRemove.has(z)))
                            }
                          }}
                          className="ml-0.5 text-primary/50 hover:text-primary"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <span className="text-xs text-muted-foreground">({selectedZips.length} zips)</span>
                  </>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    <span className="text-sm font-semibold text-primary">
                      {selectedZips.length} zip code{selectedZips.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
                <button
                  onClick={() => {
                    setSelectedZips([])
                    setTerritorySelections([])
                    radiusCenterRef.current = null
                    // Force-clear all layers from the map
                    if (mapInstance.current) {
                      zipLayersRef.current.forEach((l) => {
                        try { mapInstance.current!.removeLayer(l) } catch { /* */ }
                      })
                      zipLayersRef.current = []
                      if (radiusCircleRef.current) {
                        mapInstance.current.removeLayer(radiusCircleRef.current)
                        radiusCircleRef.current = null
                      }
                      // Remove any remaining polygon/tooltip layers
                      mapInstance.current.eachLayer((l) => {
                        if (l instanceof L!.Polygon || l instanceof L!.Circle) {
                          mapInstance.current!.removeLayer(l)
                        }
                      })
                    }
                  }}
                  className="text-xs text-destructive hover:text-destructive/80 font-medium"
                >
                  Clear all
                </button>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">{selectedZips.length}/100 zip codes</span>
            )}
          </div>

          {/* Map */}
          <div
            ref={mapRef}
            className="w-full flex-1 min-h-[250px] rounded-xl border border-border mb-4 cursor-crosshair"
            style={{ background: '#f2f2f2' }}
          />

          {saveError && <p className="text-sm text-destructive mb-3">{saveError}</p>}

          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-4">
            <p className="text-xs text-amber-700 dark:text-amber-400">
              <Sparkles className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
              You&apos;re on the free plan — only agents in your direct network will see your service area.
            </p>
          </div>
        </div>

        </div>
        {/* Bottom actions */}
        <div className="border-t border-border bg-card shrink-0">
          <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-end">
            <div className="flex items-center gap-3">
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
      </>)}

      {/* Step 3: Invite Network */}
      {currentStep === 3 && (
        <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8 pb-8 w-full">
          <button onClick={() => setCurrentStep(2)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
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
                <h3 className="text-sm font-bold">Earn 10% of Every Referral&apos;s Subscription</h3>
                <p className="text-xs text-muted-foreground">
                  When an agent you invite becomes a paid subscriber, you earn 10% of their subscription payment for up to 2 years.
                </p>
              </div>
            </div>
            {affiliateData.summary.count > 0 && (
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/50">
                <div>
                  <div className="text-lg font-extrabold text-emerald-600">{affiliateData.summary.count * 10}%</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Discount</div>
                </div>
                <div>
                  <div className="text-lg font-extrabold">{affiliateData.summary.count}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Rewards</div>
                </div>
              </div>
            )}
          </div>

          {/* Past Referrals */}
          <div className="mb-8">
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-bold">Past Referrals</h3>
                <button
                  onClick={() => setShowPastReferralForm(true)}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-xs font-semibold hover:bg-accent shrink-0"
                >
                  <Plus className="w-3 h-3" /> Add Referral
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Add referral deals you&apos;ve done to build your verified track record. We&apos;ll send your partner an invitation to join and verify the transaction.</p>
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
                    {referralVerifyStatus[i] === 'sending' && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full shrink-0">
                        <Loader2 className="w-3 h-3 animate-spin" /> Sending...
                      </span>
                    )}
                    {referralVerifyStatus[i] === 'sent' && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full shrink-0">
                        <Mail className="w-3 h-3" /> Verification sent
                      </span>
                    )}
                    {referralVerifyStatus[i] === 'error' && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-red-600 bg-red-500/10 px-2 py-0.5 rounded-full shrink-0">
                        Pending verification
                      </span>
                    )}
                    {!referralVerifyStatus[i] && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">
                        <Clock className="w-3 h-3" /> Pending verification
                      </span>
                    )}
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
                <input type="text" value={prPartnerName} onChange={(e) => setPrPartnerName(e.target.value)} placeholder="Partner name" className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                <input type="email" value={prPartnerEmail} onChange={(e) => setPrPartnerEmail(e.target.value)} placeholder="Partner email" className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                <input type="text" value={prMarket} onChange={(e) => setPrMarket(e.target.value)} placeholder="Market (e.g. Nashville, TN)" className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Approximate sale price</label>
                  <div className="flex flex-wrap gap-2">
                    {[{ label: '$100k-250k', value: 175000 }, { label: '$250k-500k', value: 375000 }, { label: '$500k-750k', value: 625000 }, { label: '$750k+', value: 1000000 }].map((opt) => (
                      <button key={opt.label} onClick={() => setPrSalePrice(opt.value)} className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${prSalePrice === opt.value ? 'bg-primary text-primary-foreground border-primary' : 'border-border bg-card hover:bg-accent'}`}>{opt.label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Close year</label>
                  <div className="flex gap-2">
                    {[2024, 2025, 2026].map((year) => (
                      <button key={year} onClick={() => setPrCloseYear(year)} className={`px-4 py-1.5 rounded-full border text-xs font-medium transition-all ${prCloseYear === year ? 'bg-primary text-primary-foreground border-primary' : 'border-border bg-card hover:bg-accent'}`}>{year}</button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handleAddPastReferral} disabled={!prPartnerName || !prPartnerEmail} className="flex items-center gap-2 h-9 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 disabled:opacity-50">Add Referral</button>
                  <button onClick={() => setShowPastReferralForm(false)} className="text-sm text-muted-foreground hover:text-foreground">Cancel</button>
                </div>
              </div>
            )}
          </div>

          {/* Shareable Link */}
          {referralCode && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium block">Your Invite Link</label>
                {profile?.id && (
                  <ReferralCodeEditor
                    currentCode={referralCode}
                    userId={profile.id}
                    onSaved={(newCode) => setCustomReferralCode(newCode)}
                    compact
                  />
                )}
              </div>
              <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-2 h-10 px-3 rounded-lg border border-input bg-muted/50 text-sm">
                  <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="truncate text-muted-foreground">
                    {typeof window !== 'undefined' ? `https://agentreferrals.ai/invite/${referralCode}` : `/invite/${referralCode}`}
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

          {/* ── Import Contacts ── */}
          <div className="mb-8">
            <label className="text-sm font-medium mb-3 block">Import Contacts</label>

            {/* Mode buttons */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => { setImportMode('csv'); setBulkResult(null) }}
                className={`flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-semibold transition-all ${
                  importMode === 'csv'
                    ? 'bg-primary/10 text-primary border border-primary/30'
                    : 'border border-border bg-card hover:bg-accent'
                }`}
              >
                <Upload className="w-4 h-4" /> Upload CSV
              </button>
              <button
                onClick={() => { setImportMode('paste'); setBulkResult(null) }}
                className={`flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-semibold transition-all ${
                  importMode === 'paste'
                    ? 'bg-primary/10 text-primary border border-primary/30'
                    : 'border border-border bg-card hover:bg-accent'
                }`}
              >
                <ClipboardPaste className="w-4 h-4" /> Paste Emails
              </button>
              <div className="relative group">
                <button
                  disabled
                  className="flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-semibold border border-border bg-card text-muted-foreground opacity-60 cursor-not-allowed"
                >
                  <ContactRound className="w-4 h-4" /> Google Contacts
                </button>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-lg bg-foreground text-background text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                  Coming soon — import contacts directly from Gmail
                </div>
              </div>
            </div>

            {/* CSV upload */}
            {importMode === 'csv' && (
              <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                <input
                  ref={csvInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleCsvUpload}
                  className="hidden"
                />
                <button
                  onClick={() => csvInputRef.current?.click()}
                  className="flex items-center gap-2 h-10 px-5 rounded-lg border-2 border-dashed border-border hover:border-primary/50 text-sm font-medium text-muted-foreground hover:text-foreground transition-all w-full justify-center"
                >
                  <FileText className="w-4 h-4" />
                  {csvFileName ? csvFileName : 'Choose a .csv file'}
                </button>
                <p className="text-xs text-muted-foreground">
                  CSV should have a column named &quot;email&quot;, &quot;Email&quot;, &quot;e-mail&quot;, or &quot;email_address&quot;. Max 50 per batch.
                </p>
              </div>
            )}

            {/* Paste emails */}
            {importMode === 'paste' && (
              <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder={'Paste emails here, one per line:\nagent1@example.com\nagent2@example.com'}
                  rows={5}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
                <button
                  onClick={handleParsePaste}
                  disabled={!pasteText.trim()}
                  className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 disabled:opacity-50"
                >
                  <Search className="w-4 h-4" /> Find Emails
                </button>
              </div>
            )}

            {/* Email preview with checkboxes */}
            {csvParsedEmails.length > 0 && (
              <div className="mt-3 p-4 rounded-xl border border-border bg-card space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">
                    {csvParsedEmails.filter((e) => e.selected).length} of {csvParsedEmails.length} emails selected
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleAllCsvEmails(true)}
                      className="text-xs text-primary font-medium hover:text-primary/80"
                    >
                      Select all
                    </button>
                    <button
                      onClick={() => toggleAllCsvEmails(false)}
                      className="text-xs text-muted-foreground font-medium hover:text-foreground"
                    >
                      Deselect all
                    </button>
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {csvParsedEmails.map((item, i) => (
                    <label
                      key={i}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-accent cursor-pointer text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => toggleCsvEmail(i)}
                        className="rounded border-border"
                      />
                      <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">{item.email}</span>
                    </label>
                  ))}
                </div>
                <button
                  onClick={handleBulkSend}
                  disabled={bulkSending || csvParsedEmails.filter((e) => e.selected).length === 0}
                  className="flex items-center gap-2 h-9 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 disabled:opacity-50"
                >
                  {bulkSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  Send {csvParsedEmails.filter((e) => e.selected).length} Invite{csvParsedEmails.filter((e) => e.selected).length !== 1 ? 's' : ''}
                </button>
              </div>
            )}

            {/* Bulk result */}
            {bulkResult && (
              <div className="mt-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-sm font-medium text-emerald-700">
                  <CheckCircle2 className="w-4 h-4 inline mr-1" />
                  {bulkResult.sent} invite{bulkResult.sent !== 1 ? 's' : ''} sent
                  {bulkResult.skipped > 0 && <span className="text-muted-foreground"> &middot; {bulkResult.skipped} already invited</span>}
                  {bulkResult.errors > 0 && <span className="text-destructive"> &middot; {bulkResult.errors} failed</span>}
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentStep(4)}
              className="flex items-center gap-2 h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 ml-auto"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        </div>
      )}

      {/* Step 4: Done + RCS Introduction */}
      {currentStep === 4 && (
        <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8 pb-8 w-full">
          <button onClick={() => setCurrentStep(3)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
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
                <p className="text-sm font-semibold">Share your invite link to earn 10% of their subscription</p>
                <p className="text-xs text-muted-foreground truncate">
                  {typeof window !== 'undefined' ? `https://agentreferrals.ai/invite/${referralCode}` : `/invite/${referralCode}`}
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
        </div>
      )}
    </div>
  )
}
