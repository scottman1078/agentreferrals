'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useDemoGuard } from '@/hooks/use-demo-guard'
import Link from 'next/link'
import BackToDashboard from '@/components/layout/back-to-dashboard'
import { CreditCard, ArrowRight, Loader2, Check, User, Bell, FileText, MapPin, Settings as SettingsIcon, Camera, Info, Search } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LocationAutocomplete } from '@/components/ui/location-autocomplete'
import { useFeatureGate } from '@/hooks/use-feature-gate'
import { getZipBoundary, getCentroid, getZipAtPoint, ZCTA_WMS_URL, ZCTA_WMS_LAYERS, ZCTA_WMS_LABELS } from '@/lib/zip-boundaries'

let L: typeof import('leaflet') | null = null
const LIGHT_TILES = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'

type Tab = 'profile' | 'territory' | 'billing' | 'referrals' | 'notifications'

const TABS: { id: Tab; label: string; icon: typeof User }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'territory', label: 'Service Area(s)', icon: MapPin },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'referrals', label: 'Referral Defaults', icon: FileText },
  { id: 'notifications', label: 'Notifications', icon: Bell },
]

function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  if (digits.length === 11 && digits[0] === '1') return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  if (digits.length > 10) return `+${digits.slice(0, digits.length - 10)} (${digits.slice(-10, -7)}) ${digits.slice(-7, -4)}-${digits.slice(-4)}`
  return phone
}

export default function SettingsPage() {
  const demoGuard = useDemoGuard()
  const { profile, isAuthenticated, refreshProfile } = useAuth()
  const { tier, plan } = useFeatureGate()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<Tab>('profile')

  // Auto-select tab from URL parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam && TABS.some(t => t.id === tabParam)) {
      setActiveTab(tabParam as Tab)
    }
  }, [searchParams])

  // Form state
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [serviceArea, setServiceArea] = useState('')
  const [brokerageName, setBrokerageName] = useState('')

  // Territory state (matching setup wizard approach)
  const [territoryMode, setTerritoryMode] = useState<'city' | 'county' | 'zip' | 'radius'>('city')
  const [selectedZips, setSelectedZips] = useState<string[]>([])
  const [territorySelections, setTerritorySelections] = useState<string[]>([])
  const [zipInput, setZipInput] = useState('')
  const [zipLoading, setZipLoading] = useState(false)
  const [zipError, setZipError] = useState('')
  const [suggestions, setSuggestions] = useState<{ label: string; subtitle?: string; lat: number; lng: number; county?: string; state?: string }[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const zipBoundariesRef = useRef<Map<string, [number, number][]>>(new Map())

  // Radius state
  const [radiusMiles, setRadiusMiles] = useState(25)
  const [radiusLoading, setRadiusLoading] = useState(false)
  const radiusCenterRef = useRef<{ lat: number; lng: number } | null>(null)
  const radiusCircleRef = useRef<L.Circle | null>(null)

  // Map state
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const zipLayersRef = useRef<L.Layer[]>([])
  const wmsLayersRef = useRef<L.Layer[]>([])
  const [leafletReady, setLeafletReady] = useState(false)
  const [mapReady, setMapReady] = useState(false)

  const [savingTerritory, setSavingTerritory] = useState(false)

  const [saving, setSaving] = useState(false)
  const [saveToast, setSaveToast] = useState('')
  const [zillowProfileUrl, setZillowProfileUrl] = useState('')
  const [zillowSaving, setZillowSaving] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [notifications, setNotifications] = useState({
    agreementSigned: true,
    clientIntroduced: true,
    referralCloses: true,
    feeReceived: false,
  })
  const toggleNotif = (key: keyof typeof notifications) =>
    setNotifications((p) => ({ ...p, [key]: !p[key] }))

  // Pre-fill form from profile
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '')
      setEmail(profile.email || '')
      setPhone(profile.phone ? formatPhoneDisplay(profile.phone) : '')
      setServiceArea(profile.primary_area || '')
      setBrokerageName(profile.brokerage?.name || '')
      setAvatarUrl(profile.avatar_url || null)
      setZillowProfileUrl(profile.zillow_profile_url || '')
      // Load existing territory zips
      if (profile.territory_zips && Array.isArray(profile.territory_zips)) {
        setSelectedZips(profile.territory_zips as string[])
      }
    } else if (!isAuthenticated) {
      setFullName("Jason Smith")
      setEmail('jason@sweethomerealty.com')
      setPhone('(269) 555-0147')
      setServiceArea('Plainwell / Allegan County, MI')
      setBrokerageName('Sweet Home Realty')
    }
  }, [profile, isAuthenticated])

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (demoGuard()) return
    const file = e.target.files?.[0]
    if (!file || !profile) return

    setUploadingAvatar(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `avatars/${profile.id}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('ar-assets')
        .upload(path, file, { upsert: true, contentType: file.type })

      if (uploadError) {
        // Storage bucket might not exist — upload to a mock URL instead
        console.error('[Avatar] Upload error:', uploadError.message)
        // Fallback: use a data URL
        const reader = new FileReader()
        reader.onload = async () => {
          const dataUrl = reader.result as string
          await supabase
            .from('ar_profiles')
            .update({ avatar_url: dataUrl })
            .eq('id', profile.id)
          setAvatarUrl(dataUrl)
          await refreshProfile()
          setSaveToast('Photo updated')
          setTimeout(() => setSaveToast(''), 3000)
        }
        reader.readAsDataURL(file)
        setUploadingAvatar(false)
        return
      }

      const { data: urlData } = supabase.storage.from('ar-assets').getPublicUrl(path)
      const publicUrl = urlData.publicUrl

      await supabase
        .from('ar_profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id)

      setAvatarUrl(publicUrl)
      await refreshProfile()
      setSaveToast('Photo updated')
      setTimeout(() => setSaveToast(''), 3000)
    } catch (err) {
      console.error('[Avatar] Error:', err)
      setSaveToast('Failed to upload photo')
      setTimeout(() => setSaveToast(''), 3000)
    }
    setUploadingAvatar(false)
  }

  async function handleSave() {
    if (demoGuard()) return
    if (!profile) return
    setSaving(true)
    setSaveToast('')

    const supabase = createClient()

    const { error } = await supabase
      .from('ar_profiles')
      .update({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        primary_area: serviceArea.trim() || null,
        zillow_profile_url: zillowProfileUrl.trim() || null,
      })
      .eq('id', profile.id)

    setSaving(false)

    if (error) {
      console.error('[Settings] Save error:', error)
      setSaveToast(`Failed to save: ${error.message}`)
      setTimeout(() => setSaveToast(''), 6000)
      return
    }

    await refreshProfile()
    setSaveToast('Settings saved successfully')
    setTimeout(() => setSaveToast(''), 3000)
  }

  // ── Territory: Load Leaflet ──
  useEffect(() => {
    import('leaflet').then((leaflet) => {
      L = leaflet
      setLeafletReady(true)
    })
  }, [])

  // ── Territory: Initialize map when territory tab is active ──
  useEffect(() => {
    if (activeTab !== 'territory') return
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
        const isRadius = document.body.dataset.settingsRadiusMode === 'true'
        if (isRadius) {
          const radiusMi = parseInt(document.body.dataset.settingsRadiusMiles || '25', 10)
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
  }, [leafletReady, activeTab])

  // ── Territory: Render zip layers on map ──
  useEffect(() => {
    if (!mapInstance.current || !L) return
    const map = mapInstance.current
    let cancelled = false

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
          poly.bindTooltip(`${zip} \u2715`, { permanent: false, direction: 'center', className: 'zip-label' })
        } else {
          poly.bindTooltip(`${zip} \u2715`, { permanent: true, direction: 'center', className: 'zip-label' })
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

  // ── Territory: Autocomplete suggestions ──
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

  // ── Territory: Add zip / resolve city/county ──
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

    // Check if input looks like a county name
    const countyMatch = input.match(/^(.+?)\s*county\s*,?\s*(\w{2})?\s*$/i)
    if (countyMatch) {
      const countyName = countyMatch[1].trim()
      let stateCode = countyMatch[2]?.toUpperCase() || ''

      if (!stateCode) {
        try {
          const acRes = await fetch(`/api/geocode/autocomplete?q=${encodeURIComponent(input)}`)
          const acData = await acRes.json()
          const match = acData.suggestions?.find((s: { subtitle?: string }) => s.subtitle === 'County')
          if (match?.state) {
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

      const isCounty = input.toLowerCase().includes('county')
      const searchMiles = isCounty ? 30 : 15
      const degPerMile = 1 / 69
      const gridStep = Math.max(searchMiles / 8, 2) * degPerMile

      const points: { lat: number; lng: number }[] = []
      for (let dlat = -searchMiles * degPerMile; dlat <= searchMiles * degPerMile; dlat += gridStep) {
        for (let dlng = -searchMiles * degPerMile; dlng <= searchMiles * degPerMile; dlng += gridStep) {
          const dist = Math.sqrt(dlat * dlat + dlng * dlng) / degPerMile
          if (dist > searchMiles) continue
          points.push({ lat: geo.lat + dlat, lng: geo.lng + dlng })
        }
      }

      const nearbyZips = new Set<string>()
      for (let i = 0; i < points.length; i += 10) {
        const batch = points.slice(i, i + 10)
        const results = await Promise.all(batch.map((p) => getZipAtPoint(p.lat, p.lng)))
        results.forEach((zip) => { if (zip) nearbyZips.add(zip) })
      }

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

  // ── Territory: Switch WMS overlay based on mode ──
  const COUNTY_WMS_BOUNDARIES = '1'
  const COUNTY_WMS_LABELS = '0'
  useEffect(() => {
    if (!mapInstance.current || !L) return
    const map = mapInstance.current

    wmsLayersRef.current.forEach((l) => {
      try { map.removeLayer(l) } catch { /* */ }
    })
    wmsLayersRef.current = []

    if (territoryMode === 'county') {
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

  // ── Territory: Sync radius mode to DOM for map click handler ──
  useEffect(() => {
    document.body.dataset.settingsRadiusMode = territoryMode === 'radius' ? 'true' : 'false'
    document.body.dataset.settingsRadiusMiles = String(radiusMiles)
  }, [territoryMode, radiusMiles])

  // ── Territory: Re-run radius when miles changes ──
  const radiusMilesRef = useRef(radiusMiles)
  useEffect(() => {
    if (radiusMilesRef.current === radiusMiles) return
    radiusMilesRef.current = radiusMiles
    if (radiusCenterRef.current && territoryMode === 'radius') {
      handleRadiusSelect(radiusCenterRef.current.lat, radiusCenterRef.current.lng, radiusMiles)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radiusMiles])

  // ── Territory: Handle radius selection ──
  const handleRadiusSelect = useCallback(async (lat: number, lng: number, miles: number) => {
    if (!mapInstance.current || !L) return
    radiusCenterRef.current = { lat, lng }
    setRadiusLoading(true)

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

    for (let i = 0; i < points.length; i += 10) {
      const batch = points.slice(i, i + 10)
      const results = await Promise.all(batch.map((p) => getZipAtPoint(p.lat, p.lng)))
      results.forEach((zip) => { if (zip) uniqueZips.add(zip) })
    }

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

  // ── Territory: Save handler ──
  const handleSaveServiceArea = useCallback(async () => {
    if (demoGuard()) return
    if (!profile) return
    setSavingTerritory(true)

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

      await refreshProfile()
      setSaveToast('Service area saved successfully')
    } catch (err) {
      setSaveToast(err instanceof Error ? `Failed to save: ${err.message}` : 'Failed to save service area.')
    }
    setSavingTerritory(false)
    setTimeout(() => setSaveToast(''), 3000)
  }, [profile, selectedZips, territoryMode, territorySelections, refreshProfile, demoGuard])

  return (
    <div className="overflow-y-auto h-full p-4 sm:p-6">
      <div className="max-w-[960px] mx-auto">
        <BackToDashboard />
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <SettingsIcon className="w-4.5 h-4.5 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-xl">Settings</h1>
            <p className="text-xs text-muted-foreground">Manage your account and preferences</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-secondary/50 mb-6">
          {TABS.map((tab) => {
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 flex-1 justify-center px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                  active
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* ═══ Profile Tab ═══ */}
        {activeTab === 'profile' && (
          <div className="space-y-4">
            <div className="p-5 rounded-xl border border-border bg-card">
              <div className="font-bold text-sm mb-5 pb-3 border-b border-border">
                Your Profile
              </div>

              {/* Avatar upload */}
              <div className="flex items-center gap-4 mb-6">
                <div className="relative">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Profile"
                      className="w-16 h-16 rounded-full object-cover border-2 border-border"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
                      {fullName ? fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'AG'}
                    </div>
                  )}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {uploadingAvatar ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Camera className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold">{fullName || 'Your Name'}</p>
                  <p className="text-xs text-muted-foreground">{email}</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-primary font-medium hover:underline mt-1"
                  >
                    {avatarUrl ? 'Change photo' : 'Upload photo'}
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Full Name
                  </label>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Brokerage
                  </label>
                  <input
                    value={brokerageName}
                    readOnly
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm text-muted-foreground cursor-not-allowed"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                      Email
                    </label>
                    <input
                      value={email}
                      readOnly
                      className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm text-muted-foreground cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                      Phone
                    </label>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
                    />
                  </div>
                </div>

                {/* Zillow Profile */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Zillow Profile URL
                  </label>
                  <input
                    value={zillowProfileUrl}
                    onChange={(e) => setZillowProfileUrl(e.target.value)}
                    placeholder="https://www.zillow.com/profile/yourscreenname"
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Link your Zillow profile to display verified transaction data on your agent profile.
                  </p>
                </div>

                <div className="text-right pt-2">
                  <button
                    onClick={handleSave}
                    disabled={saving || !isAuthenticated}
                    className="h-9 px-5 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>

            {/* Sign out moved to avatar dropdown in top bar */}
          </div>
        )}

        {/* ═══ Service Area Tab ═══ */}
        {activeTab === 'territory' && (
          <div className="space-y-4">
            {(tier === 'starter') && (
              <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 mb-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Free Plan — Limited Visibility</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      You&apos;re on the free version of AgentReferrals. Only agents in your direct referral network will see your service area.
                      <a href="/dashboard/billing" className="text-primary font-semibold hover:underline ml-1">Upgrade to be visible to all agents &rarr;</a>
                    </p>
                  </div>
                </div>
              </div>
            )}
            <div className="p-5 rounded-xl border border-border bg-card">
              <div className="font-bold text-sm mb-2 pb-3 border-b border-border">
                Your Service Area(s)
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Agents can search for partners by city, county, or address — but behind the scenes, all lookups match against zip codes. Use any method below to define your coverage area.
              </p>

              {/* Mode tabs */}
              <div className="flex gap-1 p-1 rounded-xl bg-muted/50 border border-border mb-4 w-fit">
                {([
                  { key: 'city', label: 'City' },
                  { key: 'county', label: 'County' },
                  { key: 'zip', label: 'Zip Code' },
                  { key: 'radius', label: 'Radius' },
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

              {/* City / County mode input */}
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
                      <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-border bg-card shadow-lg z-50 overflow-hidden">
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

              {/* Zip Code mode input */}
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

              {/* Radius mode input */}
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

              {/* Zip count badge + clear */}
              <div className="flex items-center justify-between mb-2">
                {selectedZips.length > 0 ? (
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
                      <MapPin className="w-3.5 h-3.5 text-primary" />
                      <span className="text-sm font-semibold text-primary">
                        {territorySelections.length > 0
                          ? territorySelections.join(', ')
                          : `${selectedZips.length} zip code${selectedZips.length !== 1 ? 's' : ''}`
                        }
                      </span>
                      {territorySelections.length > 0 && (
                        <span className="text-xs text-primary/60">({selectedZips.length} zips)</span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setSelectedZips([])
                        setTerritorySelections([])
                        radiusCenterRef.current = null
                        if (mapInstance.current) {
                          zipLayersRef.current.forEach((l) => {
                            try { mapInstance.current!.removeLayer(l) } catch { /* */ }
                          })
                          zipLayersRef.current = []
                          if (radiusCircleRef.current) {
                            mapInstance.current.removeLayer(radiusCircleRef.current)
                            radiusCircleRef.current = null
                          }
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
                className="w-full h-[350px] rounded-xl border border-border mb-4 cursor-crosshair"
                style={{ background: '#f2f2f2' }}
              />

              <div className="text-right pt-2">
                <button
                  onClick={handleSaveServiceArea}
                  disabled={savingTerritory || !isAuthenticated || selectedZips.length === 0}
                  className="h-9 px-5 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {savingTerritory && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {savingTerritory ? 'Saving...' : 'Save Service Area'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ Billing Tab ═══ */}
        {activeTab === 'billing' && (
          <div className="space-y-4">
            {/* Current plan summary */}
            <div className="p-5 rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <CreditCard className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <div>
                    <div className="font-bold text-sm capitalize">{plan.name} Plan</div>
                    <div className="text-xs text-muted-foreground">
                      {tier === 'starter' ? 'Free forever' : plan.priceLabel}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                  Current
                </span>
              </div>
            </div>

            <Link
              href="/dashboard/billing"
              className="flex items-center justify-between p-5 rounded-xl border border-border bg-card group hover:border-primary/30 transition-colors"
            >
              <div>
                <div className="font-bold text-sm">Manage Subscription</div>
                <div className="text-xs text-muted-foreground">
                  Change plan, payment method, and view invoices
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
          </div>
        )}

        {/* ═══ Referral Defaults Tab ═══ */}
        {activeTab === 'referrals' && (
          <div className="p-5 rounded-xl border border-border bg-card">
            <div className="font-bold text-sm mb-5 pb-3 border-b border-border">
              Referral Defaults
            </div>
            {[
              {
                label: 'Default Referral Fee %',
                sub: 'Applied when creating new agreements',
                defaultVal: '25%',
                w: 'w-20',
              },
              {
                label: 'Agreement Expiration',
                sub: 'Days before agreement expires',
                defaultVal: '180 days',
                w: 'w-24',
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between py-4 border-b border-border last:border-0"
              >
                <div>
                  <div className="text-sm font-medium">{item.label}</div>
                  <div className="text-[11px] text-muted-foreground">{item.sub}</div>
                </div>
                <input
                  defaultValue={item.defaultVal}
                  className={`${item.w} text-center h-9 px-3 rounded-lg border border-input bg-background text-sm`}
                />
              </div>
            ))}
          </div>
        )}

        {/* ═══ Notifications Tab ═══ */}
        {activeTab === 'notifications' && (
          <div className="p-5 rounded-xl border border-border bg-card">
            <div className="font-bold text-sm mb-5 pb-3 border-b border-border">
              Notifications
            </div>
            {(
              [
                {
                  key: 'agreementSigned' as const,
                  label: 'Referral agreement signed',
                  sub: 'Email when a partner signs',
                },
                {
                  key: 'clientIntroduced' as const,
                  label: 'Client introduced',
                  sub: 'Notify when partner introduces client',
                },
                {
                  key: 'referralCloses' as const,
                  label: 'Referral closes',
                  sub: 'Alert when a referral reaches closing',
                },
                {
                  key: 'feeReceived' as const,
                  label: 'Fee received',
                  sub: 'Confirm when referral fee arrives',
                },
              ] as const
            ).map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between py-4 border-b border-border last:border-0"
              >
                <div>
                  <div className="text-sm font-medium">{item.label}</div>
                  <div className="text-[11px] text-muted-foreground">{item.sub}</div>
                </div>
                <button
                  onClick={() => toggleNotif(item.key)}
                  className={`w-10 h-[22px] rounded-full relative transition-colors ${
                    notifications[item.key]
                      ? 'bg-primary'
                      : 'bg-secondary border border-border'
                  }`}
                >
                  <div
                    className="w-4 h-4 rounded-full bg-white absolute top-[2px] transition-transform"
                    style={{
                      left: '2px',
                      transform: notifications[item.key]
                        ? 'translateX(18px)'
                        : 'translateX(0)',
                    }}
                  />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save Toast */}
      {saveToast && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] px-5 py-3 rounded-full text-white text-sm font-semibold shadow-lg flex items-center gap-2 ${
            saveToast.includes('Failed') ? 'bg-destructive' : 'bg-emerald-500'
          }`}
        >
          {!saveToast.includes('Failed') && <Check className="w-4 h-4" />}
          {saveToast}
        </div>
      )}
    </div>
  )
}
