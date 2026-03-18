'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useTheme } from 'next-themes'
import { useBrokerage } from '@/contexts/brokerage-context'
import { useAppData } from '@/lib/data-provider'
import { TAG_COLORS, TAG_EMOJIS } from '@/lib/constants'
import { formatCurrency } from '@/lib/utils'
import { Eye, EyeOff, ArrowRightLeft, SlidersHorizontal, Sparkles, MapPin, Search, X, Loader2, Send, Lock } from 'lucide-react'
import { AppMark } from '@/components/ui/app-logo'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { useFeatureGate } from '@/hooks/use-feature-gate'
import AgentHoverCard from '@/components/map/agent-hover-card'
import AgentPeekCard from '@/components/map/agent-peek-card'
import CreateReferralModal from '@/components/referral/create-referral-modal'
import { preloadAgentCounties } from '@/lib/county-boundaries'
import { getZipBoundary, getCentroid, getZipAtPoint, ZCTA_WMS_URL, ZCTA_WMS_LAYERS, ZCTA_WMS_LABELS } from '@/lib/zip-boundaries'
import type { Agent } from '@/types'

let L: typeof import('leaflet') | null = null

const LIGHT_TILES = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
const DARK_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'

export default function AgentMap() {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const tileLayerRef = useRef<L.TileLayer | null>(null)
  const markerLayersRef = useRef<L.Layer[]>([])
  const polygonLayersRef = useRef<L.Layer[]>([])
  const voidLayersRef = useRef<L.Layer[]>([])
  const searchLayersRef = useRef<L.Layer[]>([])
  const POLYGON_ZOOM_THRESHOLD = 7
  const [activeTag, setActiveTag] = useState('all')
  const [scopeLoading, setScopeLoading] = useState(false)
  const [showVoids, setShowVoids] = useState(false)
  const [showMigration, setShowMigration] = useState(false)
  const [leafletLoaded, setLeafletLoaded] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [agentsReady, setAgentsReady] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [hoveredAgent, setHoveredAgent] = useState<{ agent: Agent; position: { x: number; y: number } } | null>(null)
  const [referralAgent, setReferralAgent] = useState<Agent | null>(null)
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const { filteredAgents, scope, partnerIds, oneDegreeIds, twoDegreeIds, scopeLocked } = useBrokerage()
  const { voidZones } = useAppData()
  const countyPolygonsRef = useRef<Map<string, [number, number][][]>>(new Map())
  const agentZipPolygonsRef = useRef<Map<string, [number, number][]>>(new Map())
  const [countyLoadCount, setCountyLoadCount] = useState(0)
  const [zipLoadCount, setZipLoadCount] = useState(0)
  const [showMyZips, setShowMyZips] = useState(false)
  const myZipLayersRef = useRef<L.Layer[]>([])
  const myZipClusterRef = useRef<L.Layer | null>(null)
  const renderMyZipLayersRef = useRef<() => void>(() => {})
  const zipBoundaryCache = useRef<Map<string, [number, number][]>>(new Map())
  const { hasFeature } = useFeatureGate()
  const { profile, refreshProfile } = useAuth()
  const [myZips, setMyZips] = useState<string[]>([])
  const [zipInput, setZipInput] = useState('')
  const [zipLoading, setZipLoading] = useState(false)
  const [zipSaving, setZipSaving] = useState(false)
  const [zipAgentCount, setZipAgentCount] = useState<{ zip: string; count: number } | null>(null)
  const [zipSaveToast, setZipSaveToast] = useState(false)
  const wmsLayerRef = useRef<L.TileLayer.WMS | null>(null)
  const wmsLabelsRef = useRef<L.TileLayer.WMS | null>(null)
  const showMyZipsRef = useRef(false)

  useEffect(() => setMounted(true), [])

  // Poll for map tiles AND agent markers to appear, then hide the loader
  useEffect(() => {
    if (agentsReady) return
    const interval = setInterval(() => {
      // Need both tiles and marker images loaded
      const tiles = document.querySelectorAll('.leaflet-tile-loaded')
      const imgs = document.querySelectorAll('.agent-marker img')
      if (tiles.length >= 10 && imgs.length >= 3) {
        let loadedCount = 0
        imgs.forEach((img) => { if ((img as HTMLImageElement).complete) loadedCount++ })
        if (loadedCount >= 3) {
          setAgentsReady(true)
          clearInterval(interval)
        }
      }
    }, 200)
    // Fallback: always show after 8s
    const fallback = setTimeout(() => { setAgentsReady(true); clearInterval(interval) }, 8000)
    return () => { clearInterval(interval); clearTimeout(fallback) }
  }, [agentsReady])

  // Preload real county boundaries for all agents
  useEffect(() => {
    preloadAgentCounties(filteredAgents).then((map) => {
      countyPolygonsRef.current = map
      console.log(`[CountyBoundaries] Loaded ${map.size}/${filteredAgents.length} agent counties`)
      setCountyLoadCount((c) => c + 1)
    })
  }, [filteredAgents])

  // Preload zip code boundaries for agents that have zip-based areas
  useEffect(() => {
    const loadZipBoundaries = async () => {
      let loaded = 0
      for (const agent of filteredAgents) {
        if (agent.polygon && agent.polygon.length >= 3) continue
        if (agentZipPolygonsRef.current.has(agent.id)) continue
        const firstZip = agent.area?.match(/\b(\d{5})\b/)?.[1]
        if (!firstZip) continue
        const ring = await getZipBoundary(firstZip)
        if (ring) {
          agentZipPolygonsRef.current.set(agent.id, ring)
          loaded++
        }
      }
      if (loaded > 0) {
        console.log(`[ZipBoundaries] Loaded ${loaded} agent zip boundaries`)
        setZipLoadCount((c) => c + 1)
      }
    }
    loadZipBoundaries()
  }, [filteredAgents])

  useEffect(() => {
    import('leaflet').then((leaflet) => {
      L = leaflet
      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })
      setLeafletLoaded(true)
    })
  }, [])

  // Initialize map
  useEffect(() => {
    if (!leafletLoaded || !L || !mapRef.current || mapInstance.current) return

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)

    const isDark = resolvedTheme === 'dark'

    // Bounds: US + Canada with padding
    const usBounds = L.latLngBounds([15, -175], [75, -45])

    const map = L.map(mapRef.current, {
      center: [39.5, -96.5],
      zoom: 4,
      zoomControl: false,
      maxBounds: usBounds,
      maxBoundsViscosity: 1.0,
      minZoom: 4,
    })

    // Add zoom control to bottom-left
    L.control.zoom({ position: 'bottomleft' }).addTo(map)

    // Add custom "reset view" button above zoom controls
    const ResetControl = L.Control.extend({
      options: { position: 'bottomleft' as const },
      onAdd: () => {
        const btn = L!.DomUtil.create('div', 'leaflet-bar')
        btn.innerHTML = '<a href="#" title="Fit all agents" style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;font-size:16px;text-decoration:none;color:inherit;">⊡</a>'
        btn.onclick = (e) => {
          e.preventDefault()
          e.stopPropagation()
          map.setView([39.5, -96.5], 4, { animate: true })
        }
        L!.DomEvent.disableClickPropagation(btn)
        return btn
      },
    })
    new ResetControl().addTo(map)

    const tileLayer = L.tileLayer(isDark ? DARK_TILES : LIGHT_TILES, {
      attribution: '',
    }).addTo(map)

    // Hide Leaflet attribution control
    map.attributionControl.setPrefix('')

    tileLayerRef.current = tileLayer
    mapInstance.current = map

    renderAgents(filteredAgents, map, true)

    // Click empty area → zoom in 2 levels (skip when in My Zips mode)
    map.on('click', (e) => {
      if (showMyZipsRef.current) return
      setSelectedAgent(null)
      setHoveredAgent(null)
      const currentZoom = map.getZoom()
      if (currentZoom < 12) {
        map.flyTo(e.latlng, currentZoom + 2, { duration: 0.8 })
      }
    })

    // Show/hide polygons based on zoom level
    map.on('zoomend', () => {
      const zoom = map.getZoom()
      polygonLayersRef.current.forEach((layer) => {
        if (zoom >= POLYGON_ZOOM_THRESHOLD) {
          if (!map.hasLayer(layer)) map.addLayer(layer)
        } else {
          if (map.hasLayer(layer)) map.removeLayer(layer)
        }
      })
    })

    // Clear hover on zoom/move
    map.on('zoomstart', () => setHoveredAgent(null))
    map.on('movestart', () => setHoveredAgent(null))

    return () => {
      map.remove()
      mapInstance.current = null
      tileLayerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leafletLoaded])

  // Switch tiles on theme change
  useEffect(() => {
    if (!mapInstance.current || !L || !tileLayerRef.current || !mounted) return
    const isDark = resolvedTheme === 'dark'
    tileLayerRef.current.setUrl(isDark ? DARK_TILES : LIGHT_TILES)
  }, [resolvedTheme, mounted])

  // Filter agents by tag AND brokerage scope — always refit bounds
  useEffect(() => {
    if (!mapInstance.current || !L) return
    setScopeLoading(true)
    const filtered = activeTag === 'all' ? filteredAgents : filteredAgents.filter((a) => a.tags.includes(activeTag))
    renderAgents(filtered, mapInstance.current, true)
    setSelectedAgent(null)
    setHoveredAgent(null)
    // Brief delay to let Leaflet render markers before hiding loader
    setTimeout(() => setScopeLoading(false), 400)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTag, filteredAgents, scope, countyLoadCount, zipLoadCount])

  // Toggle void zones
  useEffect(() => {
    if (!mapInstance.current || !L) return
    voidLayersRef.current.forEach((l) => mapInstance.current?.removeLayer(l))
    voidLayersRef.current = []

    if (showVoids) {
      voidZones.forEach((vz) => {
        const poly = L!.polygon(vz.polygon as L.LatLngExpression[], {
          color: '#ef4444',
          weight: 2,
          dashArray: '8, 6',
          fillColor: '#ef4444',
          fillOpacity: 0.08,
        }).addTo(mapInstance.current!)

        poly.bindTooltip(vz.label, { permanent: false, direction: 'center' })
        voidLayersRef.current.push(poly)
      })
    }
  }, [showVoids])

  // Keep ref in sync with state
  useEffect(() => { showMyZipsRef.current = showMyZips }, [showMyZips])

  // Initialize myZips from profile
  useEffect(() => {
    if (profile?.territory_zips && Array.isArray(profile.territory_zips)) {
      const profileZips = profile.territory_zips as string[]
      setMyZips((prev) => {
        // Only update if actually different to avoid triggering auto-save loop
        if (prev.length === profileZips.length && prev.every((z, i) => z === profileZips[i])) return prev
        return profileZips
      })
    }
  }, [profile])

  // Toggle "My Zips" mode — hide/show agents, add WMS overlay, enable click-to-select
  useEffect(() => {
    if (!mapInstance.current || !L) return
    const map = mapInstance.current

    // Clear old zip layers
    myZipLayersRef.current.forEach((l) => map.removeLayer(l))
    myZipLayersRef.current = []

    if (showMyZips) {
      // Hide agent markers and polygons
      markerLayersRef.current.forEach((l) => map.removeLayer(l))
      polygonLayersRef.current.forEach((l) => map.removeLayer(l))

      // Add WMS zip boundary overlay
      if (!wmsLayerRef.current) {
        wmsLayerRef.current = L.tileLayer.wms(ZCTA_WMS_URL, {
          layers: ZCTA_WMS_LAYERS,
          format: 'image/png',
          transparent: true,
          opacity: 0.35,
        })
      }
      wmsLayerRef.current.addTo(map)

      if (!wmsLabelsRef.current) {
        wmsLabelsRef.current = L.tileLayer.wms(ZCTA_WMS_URL, {
          layers: ZCTA_WMS_LABELS,
          format: 'image/png',
          transparent: true,
          opacity: 0.6,
        })
      }
      wmsLabelsRef.current.addTo(map)

      // Click-to-select handler
      const handleMapClick = async (e: L.LeafletEvent) => {
        const { lat, lng } = (e as L.LeafletMouseEvent).latlng
        const zip = await getZipAtPoint(lat, lng)
        if (!zip) return

        // Check agent count
        try {
          const res = await fetch(`/api/zip-agents?zip=${zip}`)
          const data = await res.json()
          setZipAgentCount({ zip, count: data.count ?? 0 })
          setTimeout(() => setZipAgentCount(null), 4000)
        } catch { /* ignore */ }

        // Toggle zip selection
        setMyZips((prev) =>
          prev.includes(zip)
            ? prev.filter((z) => z !== zip)
            : [...prev, zip]
        )
      }
      map.on('click', handleMapClick)

      // Store handler for cleanup
      ;(map as unknown as Record<string, unknown>)._zipClickHandler = handleMapClick

      // Re-render cluster vs individual on zoom
      const handleZoomEnd = () => renderMyZipLayersRef.current()
      map.on('zoomend', handleZoomEnd)
      ;(map as unknown as Record<string, unknown>)._zipZoomHandler = handleZoomEnd
    } else {
      // Remove WMS layers
      if (wmsLayerRef.current && map.hasLayer(wmsLayerRef.current)) {
        map.removeLayer(wmsLayerRef.current)
      }
      if (wmsLabelsRef.current && map.hasLayer(wmsLabelsRef.current)) {
        map.removeLayer(wmsLabelsRef.current)
      }

      // Remove click handler
      const handler = (map as unknown as Record<string, unknown>)._zipClickHandler
      if (handler) {
        map.off('click', handler as L.LeafletEventHandlerFn)
        delete (map as unknown as Record<string, unknown>)._zipClickHandler
      }

      // Remove zoom handler
      const zoomHandler = (map as unknown as Record<string, unknown>)._zipZoomHandler
      if (zoomHandler) {
        map.off('zoomend', zoomHandler as L.LeafletEventHandlerFn)
        delete (map as unknown as Record<string, unknown>)._zipZoomHandler
      }

      setZipAgentCount(null)

      // Re-render agents when leaving zip mode
      if (filteredAgents.length > 0) {
        renderAgents(filteredAgents, map, false)
      }
      return
    }

    // Render saved zip boundaries
    renderMyZipLayers()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showMyZips])

  // Re-render zip layers when myZips changes
  useEffect(() => {
    if (!showMyZips || !mapInstance.current || !L) return
    renderMyZipLayers()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myZips])

  const ZIP_CLUSTER_ZOOM = 10

  const renderMyZipLayers = useCallback(async () => {
    if (!mapInstance.current || !L) return
    const map = mapInstance.current
    const zoom = map.getZoom()

    // Clear existing layers and cluster
    myZipLayersRef.current.forEach((l) => map.removeLayer(l))
    myZipLayersRef.current = []
    if (myZipClusterRef.current) {
      map.removeLayer(myZipClusterRef.current)
      myZipClusterRef.current = null
    }

    if (myZips.length === 0) return

    // Collect boundaries
    const rings: Array<{ zip: string; ring: [number, number][] }> = []
    for (const zip of myZips) {
      const ring = await getZipBoundary(zip)
      if (ring && ring.length >= 3) rings.push({ zip, ring })
    }

    // Below threshold with multiple zips: show a cluster marker
    if (zoom < ZIP_CLUSTER_ZOOM && myZips.length > 1) {
      let totalLat = 0, totalLng = 0, count = 0
      for (const { ring } of rings) {
        const c = getCentroid(ring)
        totalLat += c[0]; totalLng += c[1]; count++
      }
      if (count > 0) {
        const icon = L!.divIcon({
          className: '',
          html: `<div style="background:#f59e0b;color:#fff;border-radius:50%;width:76px;height:76px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-weight:700;font-size:17px;box-shadow:0 2px 10px rgba(0,0,0,0.3);border:3px solid #fff;cursor:pointer;line-height:1.1"><span>${myZips.length}</span><span style="font-size:9px;font-weight:600;letter-spacing:0.05em;opacity:0.9">ZIP CODES</span></div>`,
          iconSize: [76, 76],
          iconAnchor: [38, 38],
        })
        const marker = L!.marker([totalLat / count, totalLng / count], { icon })
        marker.bindTooltip(`${myZips.length} zip codes — zoom in to see boundaries`, { direction: 'top' })
        marker.on('click', () => map.setZoom(ZIP_CLUSTER_ZOOM + 1))
        marker.addTo(map)
        myZipClusterRef.current = marker
      }

      // Ensure WMS stays visible
      if (wmsLayerRef.current && !map.hasLayer(wmsLayerRef.current)) wmsLayerRef.current.addTo(map)
      if (wmsLabelsRef.current && !map.hasLayer(wmsLabelsRef.current)) wmsLabelsRef.current.addTo(map)
      return
    }

    // At or above threshold: show individual zip polygons with agent counts
    for (const { zip, ring } of rings) {
      const poly = L!.polygon(ring as L.LatLngExpression[], {
        color: '#f59e0b',
        weight: 3,
        fillColor: '#f59e0b',
        fillOpacity: 0.3,
      }).addTo(map)

      poly.bindTooltip(`<div style="text-align:center;font-weight:700;font-size:13px">${zip}</div><div style="text-align:center;font-size:10px;opacity:0.5">loading...</div>`, { permanent: true, direction: 'center', className: 'zip-label' })
      fetch(`/api/zip-agents?zip=${zip}`)
        .then((r) => r.json())
        .then((data) => {
          const count = data.count ?? 0
          poly.unbindTooltip()
          poly.bindTooltip(
            `<div style="text-align:center;font-weight:700;font-size:13px">${zip}</div><div style="text-align:center;font-size:10px;opacity:0.6">${count} agent${count !== 1 ? 's' : ''}</div>`,
            { permanent: true, direction: 'center', className: 'zip-label' }
          )
        })
        .catch(() => {})

      poly.on('click', () => handleRemoveZip(zip))
      myZipLayersRef.current.push(poly)
    }

    // Ensure WMS layers stay visible
    if (wmsLayerRef.current && !map.hasLayer(wmsLayerRef.current)) wmsLayerRef.current.addTo(map)
    if (wmsLabelsRef.current && !map.hasLayer(wmsLabelsRef.current)) wmsLabelsRef.current.addTo(map)
  }, [myZips])

  // Keep ref in sync with latest renderMyZipLayers (must be after useCallback above)
  useEffect(() => {
    renderMyZipLayersRef.current = renderMyZipLayers
  }, [renderMyZipLayers])

  const handleAddZip = useCallback(async () => {
    const zip = zipInput.trim()
    if (!/^\d{5}$/.test(zip) || myZips.includes(zip)) return

    setZipLoading(true)
    try {
      const ring = await getZipBoundary(zip)
      if (!ring) {
        setZipLoading(false)
        return
      }

      setMyZips((prev) => [...prev, zip])
      setZipInput('')

      // Fly to the new zip — zoom to 13 so WMS boundaries are clearly visible
      if (mapInstance.current && ring) {
        const center = getCentroid(ring)
        mapInstance.current.flyTo(center, 13, { duration: 0.8 })
      }
    } catch { /* ignore */ }
    setZipLoading(false)
  }, [zipInput, myZips])

  const handleRemoveZip = useCallback((zip: string) => {
    setMyZips((prev) => prev.filter((z) => z !== zip))
  }, [])

  // Auto-save is removed — user clicks Save button explicitly
  // (was causing infinite loop: save → refreshProfile → setMyZips → save)

  const renderAgents = useCallback((agentList: Agent[], map: L.Map, fitBounds = false) => {
    if (!L) return
    markerLayersRef.current.forEach((l) => map.removeLayer(l))
    polygonLayersRef.current.forEach((l) => map.removeLayer(l))
    markerLayersRef.current = []
    polygonLayersRef.current = []

    const currentZoom = map.getZoom()
    const showPolygonsNow = currentZoom >= POLYGON_ZOOM_THRESHOLD

    const allBounds: L.LatLngBounds[] = []

    agentList.forEach((agent) => {
      const isPartner = partnerIds.includes(agent.id) || agent.isPrimary
      const isDegreeAgent = oneDegreeIds.includes(agent.id) || twoDegreeIds.includes(agent.id)
      const showPolygon = scope === 'my-network' || scope === '1-degree' || scope === '2-degree' || isPartner

      // Resolve polygon: county boundary > zip boundary > agent.polygon
      const realPolygons = countyPolygonsRef.current.get(agent.id)
      const zipRing = agentZipPolygonsRef.current.get(agent.id)
      let polygonCoords: [number, number][][] | null = null

      if (realPolygons) {
        polygonCoords = realPolygons
      } else if (zipRing && zipRing.length >= 3) {
        polygonCoords = [zipRing]
      } else if (agent.polygon && agent.polygon.length >= 3) {
        polygonCoords = [agent.polygon as [number, number][]]
      }

      // Skip agents with no resolvable location
      if (!polygonCoords) return

      // Partners get polygon territory (visible only when zoomed in)
      if (showPolygon) {
        const poly = L!.polygon(polygonCoords as L.LatLngExpression[][], {
          color: agent.color,
          weight: isPartner ? 2.5 : isDegreeAgent ? 2 : 1.5,
          fillColor: agent.color,
          fillOpacity: isPartner ? 0.25 : isDegreeAgent ? 0.12 : 0.08,
          dashArray: isDegreeAgent ? '6, 4' : undefined,
          smoothFactor: 1.5,
        })

        // Only add to map if zoomed in enough
        if (showPolygonsNow) poly.addTo(map)
        polygonLayersRef.current.push(poly)

        allBounds.push(poly.getBounds())

        // Hover + click on polygon
        const showHoverPoly = (e: L.LeafletMouseEvent) => {
          if (selectedAgent) return
          const containerPoint = map.latLngToContainerPoint(e.latlng)
          const mapEl = map.getContainer().getBoundingClientRect()
          setHoveredAgent({
            agent,
            position: { x: mapEl.left + containerPoint.x, y: mapEl.top + containerPoint.y },
          })
        }
        poly.on('mouseover', showHoverPoly)
        poly.on('mouseout', () => setHoveredAgent((prev) => (prev?.agent.id === agent.id ? null : prev)))
        poly.on('click', (e: L.LeafletMouseEvent) => {
          L!.DomEvent.stopPropagation(e)
          setHoveredAgent(null)
          setSelectedAgent(agent)
          map.flyToBounds(poly.getBounds(), { padding: [80, 80], maxZoom: 8, duration: 0.8 })
        })

      }

      // Center point for the marker — use real county polygon if available
      const polyTemp = L!.polygon(polygonCoords as L.LatLngExpression[][])
      const center = polyTemp.getBounds().getCenter()
      if (!showPolygon) {
        allBounds.push(L!.latLngBounds(center, center))
      }

      const initials = agent.name.split(' ').map(n => n[0]).join('').slice(0, 2)
      const markerSize = 32
      // Partners: show photo if available, colored background with white text
      // Non-partners: always show initials with colored background
      const markerHtml = isPartner
        ? `<div style="
            width:${markerSize}px;height:${markerSize}px;border-radius:50%;
            background:${agent.color};
            border:2px solid white;
            box-shadow:0 2px 8px rgba(0,0,0,0.3);
            display:flex;align-items:center;justify-content:center;
            font-size:11px;font-weight:700;color:white;
            font-family:var(--font-dm-sans),system-ui,sans-serif;
            cursor:pointer;overflow:hidden;
          ">${agent.photoUrl && !scopeLocked ? `<img src="${agent.photoUrl}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />` : initials}</div>`
        : isDegreeAgent
          ? `<div style="
              width:${markerSize}px;height:${markerSize}px;border-radius:50%;
              background:${agent.color};
              border:2.5px dashed white;
              box-shadow:0 2px 8px rgba(0,0,0,0.15);
              display:flex;align-items:center;justify-content:center;
              font-size:10px;font-weight:700;color:white;
              opacity:0.85;
              font-family:var(--font-dm-sans),system-ui,sans-serif;
              cursor:pointer;
            ">${initials}</div>`
          : `<div style="
              width:${markerSize}px;height:${markerSize}px;border-radius:50%;
              background:${agent.color};
              border:2.5px solid white;
              box-shadow:0 2px 8px rgba(0,0,0,0.15);
              display:flex;align-items:center;justify-content:center;
              font-size:10px;font-weight:700;color:white;
              font-family:var(--font-dm-sans),system-ui,sans-serif;
              cursor:pointer;
            ">${initials}</div>`
      const markerIcon = L!.divIcon({
        className: 'agent-marker',
        html: markerHtml,
        iconSize: [markerSize, markerSize],
        iconAnchor: [markerSize / 2, markerSize / 2],
      })

      const marker = L!.marker(center, { icon: markerIcon }).addTo(map)

      // ── Marker hover → show lightweight preview ──
      marker.on('mouseover', (e: L.LeafletMouseEvent) => {
        if (selectedAgent) return
        const containerPoint = map.latLngToContainerPoint(e.latlng)
        const mapEl = map.getContainer().getBoundingClientRect()
        setHoveredAgent({
          agent,
          position: { x: mapEl.left + containerPoint.x, y: mapEl.top + containerPoint.y },
        })
      })
      marker.on('mouseout', () => {
        setHoveredAgent((prev) => (prev?.agent.id === agent.id ? null : prev))
      })

      // ── Marker click → fly to territory + show full card ──
      marker.on('click', (e: L.LeafletMouseEvent) => {
        L!.DomEvent.stopPropagation(e)
        setHoveredAgent(null)
        setSelectedAgent(agent)
        const agentBounds = L!.polygon(polygonCoords as L.LatLngExpression[][]).getBounds()
        map.flyToBounds(agentBounds, { padding: [80, 80], maxZoom: 8, duration: 0.8 })
      })

      // ── Double-click → zoom all the way into service area ──
      marker.on('dblclick', (e: L.LeafletMouseEvent) => {
        L!.DomEvent.stopPropagation(e)
        setHoveredAgent(null)
        setSelectedAgent(agent)
        const agentBounds = L!.polygon(polygonCoords as L.LatLngExpression[][]).getBounds()
        map.flyToBounds(agentBounds, { padding: [60, 60], maxZoom: 14, duration: 1.2 })
      })

      markerLayersRef.current.push(marker)
    })

    // Fit map to actual agent locations on initial load
    if (fitBounds && allBounds.length > 0) {
      let combined = allBounds[0]
      for (let i = 1; i < allBounds.length; i++) {
        combined = combined.extend(allBounds[i])
      }
      map.fitBounds(combined, { padding: [60, 60], maxZoom: 8 })
    }
    // agentsReady is handled by polling useEffect above
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAgent, partnerIds, scope, countyLoadCount, zipLoadCount])

  // Handle search result
  const handleSearchResult = useCallback((lat: number, lng: number, matchedAgents: Agent[]) => {
    if (!mapInstance.current || !L) return

    searchLayersRef.current.forEach((l) => mapInstance.current?.removeLayer(l))
    searchLayersRef.current = []

    const pinIcon = L.divIcon({
      className: 'search-pin',
      html: `<div style="
        width:28px;height:28px;border-radius:50%;
        background:#ef4444;
        border:3px solid white;
        box-shadow:0 2px 12px rgba(239,68,68,0.5);
        display:flex;align-items:center;justify-content:center;
      "><div style="width:8px;height:8px;border-radius:50%;background:white;"></div></div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    })

    const searchMarker = L.marker([lat, lng], { icon: pinIcon }).addTo(mapInstance.current)
    searchLayersRef.current.push(searchMarker)

    matchedAgents.forEach((agent) => {
      if (!agent.polygon || agent.polygon.length < 3) return
      const glowPoly = L!.polygon(agent.polygon as L.LatLngExpression[], {
        color: agent.color,
        weight: 4,
        fillColor: agent.color,
        fillOpacity: 0.35,
        smoothFactor: 1.5,
      }).addTo(mapInstance.current!)
      searchLayersRef.current.push(glowPoly)
    })

    const zoom = matchedAgents.length > 0 ? 9 : 10
    mapInstance.current.flyTo([lat, lng], zoom, { duration: 1.2 })
  }, [])

  const tagChips = [
    { key: 'all', label: 'All', color: 'hsl(43 96% 50%)' },
    { key: 'Homes for Heroes', label: 'Homes for Heroes', color: TAG_COLORS['Homes for Heroes'] },
    { key: 'Luxury', label: 'Luxury', color: TAG_COLORS['Luxury'] },
    { key: 'First-Time Buyers', label: 'First-Time Buyers', color: TAG_COLORS['First-Time Buyers'] },
    { key: 'Investment', label: 'Investment', color: TAG_COLORS['Investment'] },
    { key: 'Relocation', label: 'Relocation', color: TAG_COLORS['Relocation'] },
    { key: 'Land & Acreage', label: 'Land & Acreage', color: TAG_COLORS['Land & Acreage'] },
    { key: 'New Construction', label: 'New Construction', color: TAG_COLORS['New Construction'] },
  ]

  const [showFilters, setShowFilters] = useState(false)

  return (
    <div className="relative w-full h-full">
      {/* Collapsible filter panel — vertical, stays open */}
      {showFilters && (
        <div
          style={{ position: 'fixed', top: 112, left: 16, zIndex: 9001 }}
          className="animate-in fade-in slide-in-from-top-2 duration-200"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col gap-1 p-2 w-[190px] rounded-xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl">
            <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1">Specialization</div>
            {tagChips.map((chip) => {
              const isActive = activeTag === chip.key
              return (
                <button
                  key={chip.key}
                  onClick={() => setActiveTag(isActive && chip.key !== 'all' ? 'all' : chip.key)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all text-left"
                  style={{
                    background: isActive ? `${chip.color}15` : 'transparent',
                    color: isActive ? chip.color : undefined,
                  }}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: chip.color, opacity: isActive ? 1 : 0.4 }}
                  />
                  {chip.label}
                </button>
              )
            })}
            <div className="h-px bg-border my-1" />
            <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1">Overlays</div>
            <button
              onClick={() => setShowVoids(!showVoids)}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all text-left ${
                showVoids ? 'bg-destructive/10 text-destructive' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {showVoids ? <EyeOff className="w-3 h-3 shrink-0" /> : <Eye className="w-3 h-3 shrink-0" />}
              Voids
            </button>
            <button
              onClick={() => setShowMigration(!showMigration)}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all text-left ${
                showMigration ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ArrowRightLeft className="w-3 h-3 shrink-0" />
              Migration
            </button>
          </div>
        </div>
      )}

      {/* Compact action bar — top left, below floating nav */}
      <div
        style={{ position: 'fixed', top: 76, left: 16, zIndex: 9000 }}
        className="flex items-center gap-1.5"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Filters button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold border backdrop-blur-md shadow-md transition-all ${
            showFilters || activeTag !== 'all'
              ? 'bg-primary/10 border-primary/30 text-primary'
              : 'bg-card/90 border-border text-muted-foreground hover:text-foreground'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filters
          {activeTag !== 'all' && (
            <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold">1</span>
          )}
        </button>

        {/* Referrals / My Zips toggle */}
        <div className="flex items-center h-8 rounded-full border border-border bg-card/90 backdrop-blur-md shadow-md overflow-hidden">
          <button
            onClick={() => setShowMyZips(false)}
            className={`flex items-center gap-1.5 h-full px-3 text-xs font-semibold transition-all ${
              !showMyZips
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Referrals
          </button>
          <div className="w-px h-4 bg-border" />
          <button
            onClick={() => setShowMyZips(true)}
            className={`flex items-center gap-1.5 h-full px-3 text-xs font-semibold transition-all ${
              showMyZips
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <MapPin className="w-3 h-3" />
            My Zips
          </button>
        </div>

        {/* NORA Insights — triggers AI briefing */}
        <button
          onClick={() => {
            window.dispatchEvent(new CustomEvent('nora-briefing'))
          }}
          className="flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold border border-border bg-card/90 text-primary backdrop-blur-md shadow-md hover:bg-accent transition-all"
        >
          <Sparkles className="w-3.5 h-3.5" />
          NORA Insights
        </button>
      </div>

      {/* My Zips editing panel */}
      {showMyZips && (
        <div
          style={{ position: 'fixed', top: 112, left: 16, zIndex: 9000 }}
          className="w-[280px]"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-card/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm">My Zip Codes</h3>
              {zipSaving && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
              <button onClick={() => setShowMyZips(false)} className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-accent">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Search input */}
            <div className="flex gap-1.5">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={zipInput}
                  onChange={(e) => setZipInput(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddZip()}
                  placeholder="Add zip code..."
                  maxLength={5}
                  className="w-full h-8 pl-8 pr-3 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <button
                onClick={handleAddZip}
                disabled={zipLoading || zipInput.length !== 5}
                className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 disabled:opacity-40"
              >
                {zipLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Add'}
              </button>
            </div>

            {/* Selected zips */}
            {myZips.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 max-h-[200px] overflow-y-auto">
                {myZips.map((zip) => (
                  <span
                    key={zip}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20"
                  >
                    {zip}
                    <button
                      onClick={() => handleRemoveZip(zip)}
                      className="hover:bg-primary/20 rounded-full p-0.5"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground text-center py-1">
                Search or click the map to add zips
              </p>
            )}

            {/* Agent count toast */}
            {zipAgentCount && (
              <div className="p-2 rounded-lg bg-secondary/80 text-xs">
                <span className="font-bold">{zipAgentCount.zip}</span>
                {' — '}
                {zipAgentCount.count === 0
                  ? 'No agents in this area yet'
                  : `${zipAgentCount.count} agent${zipAgentCount.count !== 1 ? 's' : ''} in this area`}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Map container */}
      <div ref={mapRef} className="w-full h-full" />

      {/* Map loading state — show until agents are rendered (must be AFTER map div to paint on top) */}
      {!agentsReady && (
        <div className="absolute inset-0 z-[10000] flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-pulse">
              <AppMark size="lg" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground">Loading your referral network...</p>
          </div>
        </div>
      )}

      {/* Scope change loading overlay */}
      {agentsReady && scopeLoading && (
        <div className="absolute inset-0 z-[9999] flex items-center justify-center bg-background/60 backdrop-blur-[2px]">
          <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-5 py-3 shadow-lg">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-sm font-semibold text-muted-foreground">Updating map...</span>
          </div>
        </div>
      )}

      {/* Blur overlay for locked degree tabs */}
      {((scope === '1-degree' && !hasFeature('networkDegree1')) ||
        (scope === '2-degree' && !hasFeature('networkDegree2'))) && (
        <div className="absolute inset-0 z-[100] backdrop-blur-md bg-background/30 flex items-center justify-center">
          <div className="max-w-sm text-center p-6 bg-card rounded-2xl border border-border shadow-2xl">
            <Lock className="w-8 h-8 text-primary mx-auto mb-3" />
            <h3 className="font-bold text-lg mb-2">
              {scope === '1-degree' ? oneDegreeIds.length : twoDegreeIds.length} agents are{' '}
              {scope === '1-degree' ? '1 degree' : '2 degrees'} away from your network
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Upgrade to see who&apos;s connected to your referral partners and request introductions.
            </p>
            <a
              href="/dashboard/billing"
              className="inline-flex items-center gap-2 h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity"
            >
              <Sparkles className="w-4 h-4" />
              Upgrade to Unlock
            </a>
          </div>
        </div>
      )}

      {/* Hover preview card */}
      {hoveredAgent && !selectedAgent && (
        <AgentHoverCard agent={hoveredAgent.agent} position={hoveredAgent.position} />
      )}

      {/* Full peek card on click */}
      {selectedAgent && (
        <AgentPeekCard
          agent={selectedAgent}
          onClose={() => setSelectedAgent(null)}
          onSendReferral={(agent) => {
            setReferralAgent(agent)
            setSelectedAgent(null)
          }}
          onMessage={() => {
            router.push('/dashboard/messages')
          }}
        />
      )}

      {/* Create Referral Modal */}
      {referralAgent && (
        <CreateReferralModal
          onClose={() => setReferralAgent(null)}
          preselectedAgentId={referralAgent.id}
          onCreated={() => setReferralAgent(null)}
        />
      )}

      {/* Zip save toast */}
      {zipSaveToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] px-5 py-3 rounded-full bg-emerald-500 text-white text-sm font-semibold shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
          Zip codes saved
        </div>
      )}
    </div>
  )
}
