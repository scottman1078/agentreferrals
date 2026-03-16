'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useTheme } from 'next-themes'
import { useBrokerage } from '@/contexts/brokerage-context'
import { useAppData } from '@/lib/data-provider'
import { TAG_COLORS, TAG_EMOJIS } from '@/lib/constants'
import { formatCurrency } from '@/lib/utils'
import { Eye, EyeOff, ArrowRightLeft, SlidersHorizontal, Flame } from 'lucide-react'
import AgentHoverCard from '@/components/map/agent-hover-card'
import AgentPeekCard from '@/components/map/agent-peek-card'
import { preloadAgentCounties } from '@/lib/county-boundaries'
import { nudges, getActiveNudges } from '@/data/nudges'
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
  const [showVoids, setShowVoids] = useState(false)
  const [showMigration, setShowMigration] = useState(false)
  const [leafletLoaded, setLeafletLoaded] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [hoveredAgent, setHoveredAgent] = useState<{ agent: Agent; position: { x: number; y: number } } | null>(null)
  const { resolvedTheme } = useTheme()
  const { filteredAgents, scope, partnerIds } = useBrokerage()
  const { voidZones } = useAppData()
  const countyPolygonsRef = useRef<Map<string, [number, number][][]>>(new Map())
  const [countyLoadCount, setCountyLoadCount] = useState(0)

  useEffect(() => setMounted(true), [])

  // Preload real county boundaries for all agents
  useEffect(() => {
    preloadAgentCounties(filteredAgents).then((map) => {
      countyPolygonsRef.current = map
      console.log(`[CountyBoundaries] Loaded ${map.size}/${filteredAgents.length} agent counties`)
      setCountyLoadCount((c) => c + 1) // increment to force re-render
    })
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

    const tileLayer = L.tileLayer(isDark ? DARK_TILES : LIGHT_TILES, {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    }).addTo(map)

    tileLayerRef.current = tileLayer
    mapInstance.current = map
    renderAgents(filteredAgents, map, true)

    // Click empty area → zoom in 2 levels
    map.on('click', (e) => {
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
    const filtered = activeTag === 'all' ? filteredAgents : filteredAgents.filter((a) => a.tags.includes(activeTag))
    renderAgents(filtered, mapInstance.current, true)
    setSelectedAgent(null)
    setHoveredAgent(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTag, filteredAgents, scope, countyLoadCount])

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
      if (!agent.polygon || !Array.isArray(agent.polygon) || agent.polygon.length < 3) return

      const isPartner = partnerIds.includes(agent.id) || agent.isPrimary
      const showPolygon = scope === 'my-network' || isPartner

      // Use real county polygon if available, fall back to demo rectangle
      const realPolygons = countyPolygonsRef.current.get(agent.id)
      const polygonCoords = realPolygons || [agent.polygon as [number, number][]]

      // Partners get polygon territory (visible only when zoomed in)
      if (showPolygon) {
        const poly = L!.polygon(polygonCoords as L.LatLngExpression[][], {
          color: agent.color,
          weight: isPartner ? 2.5 : 1.5,
          fillColor: agent.color,
          fillOpacity: isPartner ? 0.25 : 0.08,
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
          map.flyToBounds(poly.getBounds(), { padding: [80, 80], maxZoom: 10, duration: 0.8 })
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
      const markerIcon = L!.divIcon({
        className: 'agent-marker',
        html: isPartner
          ? `<div style="
              width:${markerSize}px;height:${markerSize}px;border-radius:50%;
              background:${agent.color};
              border:2px solid white;
              box-shadow:0 2px 8px rgba(0,0,0,0.3);
              display:flex;align-items:center;justify-content:center;
              font-size:11px;font-weight:700;color:white;
              font-family:var(--font-dm-sans),system-ui,sans-serif;
              cursor:pointer;
            ">${initials}</div>`
          : `<div style="
              width:${markerSize}px;height:${markerSize}px;border-radius:50%;
              background:white;
              border:2.5px solid ${agent.color};
              box-shadow:0 2px 8px rgba(0,0,0,0.15);
              display:flex;align-items:center;justify-content:center;
              font-size:11px;font-weight:700;color:${agent.color};
              font-family:var(--font-dm-sans),system-ui,sans-serif;
              cursor:pointer;
            ">${initials}</div>`,
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
        map.flyToBounds(agentBounds, { padding: [80, 80], maxZoom: 10, duration: 0.8 })
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAgent, partnerIds, scope, countyLoadCount])

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
    { key: 'Homes for Heroes', label: 'HFH', color: TAG_COLORS['Homes for Heroes'] },
    { key: 'Luxury', label: 'Luxury', color: TAG_COLORS['Luxury'] },
    { key: 'First-Time Buyers', label: 'FTB', color: TAG_COLORS['First-Time Buyers'] },
    { key: 'Investment', label: 'Invest', color: TAG_COLORS['Investment'] },
    { key: 'Relocation', label: 'Relo', color: TAG_COLORS['Relocation'] },
    { key: 'Land & Acreage', label: 'Land', color: TAG_COLORS['Land & Acreage'] },
    { key: 'New Construction', label: 'New Con', color: TAG_COLORS['New Construction'] },
  ]

  const [showFilters, setShowFilters] = useState(false)

  return (
    <div className="relative w-full h-full">
      {/* Collapsible filter panel — slides down from top */}
      {showFilters && (
        <>
          <div className="fixed inset-0 z-[499]" onClick={() => setShowFilters(false)} />
          <div className="fixed top-[112px] left-4 z-[500] animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="inline-flex flex-wrap items-center gap-2 p-2 rounded-xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl">
              {tagChips.map((chip) => {
                const isActive = activeTag === chip.key
                return (
                  <button
                    key={chip.key}
                    onClick={() => { setActiveTag(chip.key); setShowFilters(false) }}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                    style={{
                      background: isActive ? chip.color : 'transparent',
                      color: isActive ? 'white' : undefined,
                      border: isActive ? 'none' : '1px solid var(--border)',
                    }}
                  >
                    {chip.label}
                  </button>
                )
              })}
              <div className="w-px h-5 bg-border mx-1" />
              <button
                onClick={() => setShowVoids(!showVoids)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  showVoids
                    ? 'bg-destructive/10 text-destructive border border-destructive/30'
                    : 'border border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {showVoids ? <EyeOff className="w-3 h-3 inline mr-1" /> : <Eye className="w-3 h-3 inline mr-1" />}
                Voids
              </button>
              <button
                onClick={() => setShowMigration(!showMigration)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  showMigration
                    ? 'bg-primary/10 text-primary border border-primary/30'
                    : 'border border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <ArrowRightLeft className="w-3 h-3 inline mr-1" />
                Migration
              </button>
            </div>
          </div>
        </>
      )}

      {/* Compact action bar — top left, below floating nav */}
      <div style={{ position: 'fixed', top: 76, left: 16, zIndex: 9000 }} className="flex items-center gap-1.5">
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

        {/* Check-ins badge — opens NORA */}
        {(() => {
          const checkInCount = getActiveNudges(nudges).filter((n) => n.type === 'inactive_partner').length
          if (checkInCount === 0) return null
          return (
            <button
              onClick={() => {
                // Dispatch event to open NORA
                window.dispatchEvent(new CustomEvent('toggle-nora', { detail: { context: 'checkins' } }))
              }}
              className="flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold border border-amber-500/30 bg-amber-500/10 text-amber-600 backdrop-blur-md shadow-md hover:bg-amber-500/20 transition-all"
            >
              <Flame className="w-3.5 h-3.5" />
              {checkInCount} Check-ins
            </button>
          )
        })()}
      </div>

      {/* Map container */}
      <div ref={mapRef} className="w-full h-full" />

      {/* Hover preview card */}
      {hoveredAgent && !selectedAgent && (
        <AgentHoverCard agent={hoveredAgent.agent} position={hoveredAgent.position} />
      )}

      {/* Full peek card on click */}
      {selectedAgent && (
        <AgentPeekCard
          agent={selectedAgent}
          onClose={() => setSelectedAgent(null)}
        />
      )}
    </div>
  )
}
