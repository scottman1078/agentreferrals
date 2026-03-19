'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { MapPin, Users, Check, ChevronRight, ChevronLeft, Plus, X, Mail, Sparkles, Loader2, Search } from 'lucide-react'
import { getZipBoundary, getCentroid, getZipAtPoint, ZCTA_WMS_URL, ZCTA_WMS_LAYERS, ZCTA_WMS_LABELS } from '@/lib/zip-boundaries'

let L: typeof import('leaflet') | null = null
const LIGHT_TILES = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'

const STEPS = ['Service Area', 'Invites', 'Done'] as const

export default function SetupPage() {
  const router = useRouter()
  const { profile, isLoading, isAuthenticated, refreshProfile } = useAuth()
  const [currentStep, setCurrentStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

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
  const [leafletReady, setLeafletReady] = useState(false)

  // Step 2: Invites
  const [emails, setEmails] = useState<string[]>([''])
  const [invitesSent, setInvitesSent] = useState(0)
  const [sendingInvites, setSendingInvites] = useState(false)
  const [inviteError, setInviteError] = useState('')

  // Load existing zips from profile
  useEffect(() => {
    if (profile?.territory_zips && Array.isArray(profile.territory_zips)) {
      setSelectedZips(profile.territory_zips as string[])
    }
  }, [profile])

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/')
    }
  }, [isLoading, isAuthenticated, router])

  // Load Leaflet
  useEffect(() => {
    import('leaflet').then((leaflet) => {
      L = leaflet
      setLeafletReady(true)
    })
  }, [])

  // Initialize map — full page so container has stable dimensions
  useEffect(() => {
    if (!leafletReady || !L || !mapRef.current || mapInstance.current) return

    if (!document.querySelector('link[href*="leaflet@1.9.4"]')) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }

    // Wait a tick for CSS to apply
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

      // Add WMS zip code boundary overlay so users can see where to click
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

      // Center on user's area if available
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

      // Click to add zip
      map.on('click', async (e) => {
        const zip = await getZipAtPoint(e.latlng.lat, e.latlng.lng)
        if (!zip) return
        setSelectedZips((prev) => {
          if (prev.includes(zip)) return prev
          if (prev.length >= 30) return prev
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
  }, [leafletReady])

  // Render zip layers on map when selectedZips changes
  useEffect(() => {
    if (!mapInstance.current || !L) return
    const map = mapInstance.current

    // Clear old layers
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
        poly.on('click', (e) => {
          L!.DomEvent.stopPropagation(e)
        })
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
    if (selectedZips.length >= 30) {
      setZipError('Maximum 30 zip codes')
      return
    }

    setZipLoading(true)
    setZipError('')

    // If it's a 5-digit zip code, add directly
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

    // Otherwise treat as county/city name — geocode and find nearby zip codes
    try {
      const geoRes = await fetch(`/api/geocode?q=${encodeURIComponent(input)}`)
      const geo = await geoRes.json()
      if (!geo.lat || !geo.lng) {
        setZipError('Location not found. Try a zip code instead.')
        setZipLoading(false)
        return
      }

      // Get zip at the geocoded point
      const centerZip = await getZipAtPoint(geo.lat, geo.lng)
      if (centerZip && !selectedZips.includes(centerZip)) {
        const ring = await getZipBoundary(centerZip)
        if (ring) {
          zipBoundariesRef.current.set(centerZip, ring)
          setSelectedZips((prev) => [...prev, centerZip])
        }
      }

      // Sample nearby points to find more zip codes in the area
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

      // Add all found zips
      for (const zip of nearbyZips) {
        if (selectedZips.length + nearbyZips.size > 30) break
        if (!zipBoundariesRef.current.has(zip)) {
          const ring = await getZipBoundary(zip)
          if (ring) zipBoundariesRef.current.set(zip, ring)
        }
      }
      setSelectedZips((prev) => {
        const combined = new Set([...prev, ...nearbyZips])
        return Array.from(combined).slice(0, 30)
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

      await refreshProfile()
      setCurrentStep(1)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }, [profile?.id, selectedZips, refreshProfile])

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
      setCurrentStep(2)
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to send invites.')
    } finally {
      setSendingInvites(false)
    }
  }, [emails, profile?.id, profile?.full_name])

  const handleComplete = useCallback(() => {
    localStorage.setItem('ar_setup_wizard_completed', 'true')
    router.push('/dashboard')
  }, [router])

  const firstName = profile?.full_name?.split(' ')[0] || 'there'

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground"><path d="M16 3l4 4-4 4" /><path d="M20 7H4" /><path d="M8 21l-4-4 4-4" /><path d="M4 17h16" /></svg>
            </div>
            <span className="font-extrabold text-lg">Agent<span className="text-primary">Referrals</span></span>
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
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8 pb-32">
        {/* Step 1: Service Area */}
        {currentStep === 0 && (
          <div>
            <div className="mb-6">
              <h1 className="text-2xl font-bold">Define Your Service Area</h1>
              <p className="text-muted-foreground mt-1">
                Add zip codes or county names where you work. This helps other agents find you for referrals.
              </p>
            </div>

            {/* Input — accepts zip codes or county/city names */}
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
                {selectedZips.length}/30
              </span>
            </div>

            {zipError && <p className="text-sm text-destructive mb-3">{zipError}</p>}

            {/* Hint + selected zips — ABOVE the map */}
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

            {/* Map — full width, stable container */}
            <div
              ref={mapRef}
              className="w-full h-[400px] rounded-xl border border-border mb-4 cursor-crosshair"
              style={{ background: '#f2f2f2' }}
            />

            {saveError && <p className="text-sm text-destructive mb-3">{saveError}</p>}

            {/* Free tier callout */}
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-6">
              <p className="text-xs text-amber-700 dark:text-amber-400">
                <Sparkles className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                You&apos;re on the free plan — only agents in your direct network will see your service area.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <button
                onClick={handleComplete}
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
        )}

        {/* Step 2: Invites */}
        {currentStep === 1 && (
          <div>
            <div className="mb-6">
              <h1 className="text-2xl font-bold">Invite Your Referral Partners</h1>
              <p className="text-muted-foreground mt-1">
                The more agents in your network, the more valuable AgentReferrals becomes for everyone.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 text-center mb-6">
              <p className="text-xs text-primary font-medium">
                Agents who invite 5+ partners see 3x more referral opportunities
              </p>
            </div>

            <div className="space-y-2 mb-4">
              <label className="text-sm font-medium">Email addresses</label>
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
              <button
                onClick={() => setEmails((prev) => [...prev, ''])}
                className="flex items-center gap-1.5 text-sm text-primary font-medium hover:text-primary/80"
              >
                <Plus className="w-4 h-4" /> Add another email
              </button>
            </div>

            {inviteError && <p className="text-sm text-destructive mb-3">{inviteError}</p>}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={() => setCurrentStep(0)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={() => { setInvitesSent(0); setCurrentStep(2) }}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Skip for now
                </button>
              </div>
              <button
                onClick={handleSendInvites}
                disabled={sendingInvites}
                className="flex items-center gap-2 h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 disabled:opacity-50"
              >
                {sendingInvites ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Send Invites <ChevronRight className="w-4 h-4" /></>}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Done */}
        {currentStep === 2 && (
          <div className="text-center py-12">
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
              Your profile is live and your service area is set. Start exploring your network.
            </p>

            <div className="inline-flex flex-col gap-2 text-left bg-muted/50 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-green-600" />
                </div>
                <span>Service area: <strong>{selectedZips.length} zip code{selectedZips.length !== 1 ? 's' : ''}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-green-600" />
                </div>
                <span>Invites sent: <strong>{invitesSent} agent{invitesSent !== 1 ? 's' : ''}</strong></span>
              </div>
            </div>

            <div>
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
    </div>
  )
}
