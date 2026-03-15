'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useTheme } from 'next-themes'
import { useBrokerage } from '@/contexts/brokerage-context'
import { useAppData } from '@/lib/data-provider'
import { TAG_COLORS, TAG_EMOJIS } from '@/lib/constants'
import { formatCurrency } from '@/lib/utils'
import { Eye, EyeOff, ArrowRightLeft } from 'lucide-react'
import AgentPeekCard from '@/components/map/agent-peek-card'
import type { Agent } from '@/types'

let L: typeof import('leaflet') | null = null

const LIGHT_TILES = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
const DARK_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'

export default function AgentMap() {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const tileLayerRef = useRef<L.TileLayer | null>(null)
  const layersRef = useRef<L.Layer[]>([])
  const voidLayersRef = useRef<L.Layer[]>([])
  const searchLayersRef = useRef<L.Layer[]>([])
  const [activeTag, setActiveTag] = useState('all')
  const [showVoids, setShowVoids] = useState(false)
  const [showMigration, setShowMigration] = useState(false)
  const [leafletLoaded, setLeafletLoaded] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const { resolvedTheme } = useTheme()
  const { filteredAgents } = useBrokerage()
  const { voidZones } = useAppData()

  useEffect(() => setMounted(true), [])

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

    const map = L.map(mapRef.current, {
      center: [39.5, -96.5],
      zoom: 4,
      zoomControl: false,
    })

    // Add zoom control to bottom-left
    L.control.zoom({ position: 'bottomleft' }).addTo(map)

    const tileLayer = L.tileLayer(isDark ? DARK_TILES : LIGHT_TILES, {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    }).addTo(map)

    tileLayerRef.current = tileLayer
    mapInstance.current = map
    renderAgents(filteredAgents, map)

    // Clicking the map background dismisses the peek card
    map.on('click', () => {
      setSelectedAgent(null)
    })

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

  // Filter agents by tag AND brokerage scope
  useEffect(() => {
    if (!mapInstance.current || !L) return
    const filtered = activeTag === 'all' ? filteredAgents : filteredAgents.filter((a) => a.tags.includes(activeTag))
    renderAgents(filtered, mapInstance.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTag, filteredAgents])

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

  const renderAgents = useCallback((agentList: Agent[], map: L.Map) => {
    if (!L) return
    layersRef.current.forEach((l) => map.removeLayer(l))
    layersRef.current = []

    agentList.forEach((agent) => {
      const poly = L!.polygon(agent.polygon as L.LatLngExpression[], {
        color: agent.color,
        weight: agent.isPrimary ? 3 : 1.5,
        fillColor: agent.color,
        fillOpacity: agent.isPrimary ? 0.30 : 0.18,
        smoothFactor: 1.5,
      }).addTo(map)

      // Add a center marker with agent initials
      const center = poly.getBounds().getCenter()
      const initials = agent.name.split(' ').map(n => n[0]).join('').slice(0, 2)
      const markerIcon = L!.divIcon({
        className: 'agent-marker',
        html: `<div style="
          width:32px;height:32px;border-radius:50%;
          background:${agent.color};
          border:2px solid white;
          box-shadow:0 2px 8px rgba(0,0,0,0.3);
          display:flex;align-items:center;justify-content:center;
          font-size:11px;font-weight:700;color:white;
          font-family:var(--font-dm-sans),system-ui,sans-serif;
          cursor:pointer;
        ">${initials}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      })

      const marker = L!.marker(center, { icon: markerIcon }).addTo(map)

      // Click handler — show peek card instead of popup
      const handleAgentClick = () => {
        setSelectedAgent(agent)
      }
      poly.on('click', (e) => {
        L!.DomEvent.stopPropagation(e)
        handleAgentClick()
      })
      marker.on('click', (e) => {
        L!.DomEvent.stopPropagation(e)
        handleAgentClick()
      })

      layersRef.current.push(poly, marker)
    })
  }, [])

  // Handle search result — fly to location, add marker, highlight matching polygons
  const handleSearchResult = useCallback((lat: number, lng: number, matchedAgents: Agent[]) => {
    if (!mapInstance.current || !L) return

    // Clear previous search layers
    searchLayersRef.current.forEach((l) => mapInstance.current?.removeLayer(l))
    searchLayersRef.current = []

    // Add a pin marker at the searched location
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

    // Highlight matching agent polygons with a glow effect
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

    // Fly to the searched location
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

  return (
    <div className="relative w-full h-full">
      {/* Floating filter chips — below the floating top bar */}
      <div className="fixed top-[76px] left-4 z-[400] flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 px-1.5 py-1 rounded-full border border-border bg-card/90 backdrop-blur-md shadow-md">
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 text-muted-foreground">Filter</span>
          {tagChips.map((chip) => {
            const isActive = activeTag === chip.key
            return (
              <button
                key={chip.key}
                onClick={() => setActiveTag(chip.key)}
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all"
                style={{
                  background: isActive ? chip.color : 'transparent',
                  color: isActive ? 'white' : undefined,
                }}
              >
                {!isActive && <span className="text-muted-foreground">{chip.label}</span>}
                {isActive && chip.label}
              </button>
            )
          })}
        </div>

        {/* Toggle buttons */}
        <button
          onClick={() => setShowVoids(!showVoids)}
          className={`flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold border transition-all backdrop-blur-md shadow-md ${
            showVoids
              ? 'bg-destructive/10 border-destructive/30 text-destructive'
              : 'bg-card/90 border-border text-muted-foreground hover:text-foreground'
          }`}
        >
          {showVoids ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          Voids
        </button>

        <button
          onClick={() => setShowMigration(!showMigration)}
          className={`flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold border transition-all backdrop-blur-md shadow-md ${
            showMigration
              ? 'bg-primary/10 border-primary/30 text-primary'
              : 'bg-card/90 border-border text-muted-foreground hover:text-foreground'
          }`}
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          Migration
        </button>
      </div>

      {/* Migration legend */}
      {showMigration && (
        <div className="fixed bottom-[88px] left-4 z-[400] p-3 px-4 rounded-xl border border-border bg-card/90 backdrop-blur-md shadow-lg">
          <div className="text-[10px] font-bold uppercase tracking-wider mb-2 text-muted-foreground">Migration Flow</div>
          {[
            { color: '#f97316', label: 'Inflow Market (high demand)' },
            { color: '#3b82f6', label: 'Outflow Market (departures)' },
            { color: '#9ca3af', label: 'Net Neutral' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-xs text-muted-foreground mb-1 last:mb-0">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.color }} />
              {item.label}
            </div>
          ))}
        </div>
      )}

      {/* Agent count badge — above the pill nav */}
      <div className="fixed bottom-[76px] left-1/2 -translate-x-1/2 z-[400] px-3 py-1.5 rounded-full border border-border bg-card/90 backdrop-blur-md shadow-lg text-xs text-muted-foreground">
        <span className="font-bold text-foreground">{activeTag === 'all' ? filteredAgents.length : filteredAgents.filter(a => a.tags.includes(activeTag)).length}</span> agents shown
      </div>

      {/* Map container */}
      <div ref={mapRef} className="w-full h-full" />

      {/* Bottom peek card — shown when an agent is selected */}
      {selectedAgent && (
        <AgentPeekCard
          agent={selectedAgent}
          onClose={() => setSelectedAgent(null)}
        />
      )}
    </div>
  )
}
