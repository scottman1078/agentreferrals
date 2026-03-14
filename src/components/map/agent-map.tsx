'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useTheme } from 'next-themes'
import { useBrokerage } from '@/contexts/brokerage-context'
import { voidZones } from '@/data/coverage-gaps'
import { TAG_COLORS, TAG_EMOJIS } from '@/lib/constants'
import { formatCurrency } from '@/lib/utils'
import { Eye, EyeOff, ArrowRightLeft } from 'lucide-react'
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
  const [activeTag, setActiveTag] = useState('all')
  const [showVoids, setShowVoids] = useState(false)
  const [showMigration, setShowMigration] = useState(false)
  const [leafletLoaded, setLeafletLoaded] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { resolvedTheme } = useTheme()
  const { filteredAgents } = useBrokerage()

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
      // Filled polygon with rounded corners feel
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
        ">${initials}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      })

      const marker = L!.marker(center, { icon: markerIcon }).addTo(map)

      const popupContent = `
        <div style="min-width:220px;font-family:var(--font-dm-sans),system-ui,sans-serif;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
            <div style="width:40px;height:40px;border-radius:50%;background:${agent.color};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;color:white;flex-shrink:0;">${initials}</div>
            <div>
              <div style="font-weight:700;font-size:14px;line-height:1.3;">${agent.name}</div>
              <div style="font-size:11px;opacity:0.6;">${agent.brokerage}</div>
            </div>
          </div>
          <div style="font-size:12px;margin-bottom:8px;opacity:0.8;">${agent.area}</div>
          <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px;">
            ${agent.tags.map((t) => `<span style="padding:2px 8px;border-radius:99px;font-size:9px;font-weight:600;background:${TAG_COLORS[t]};color:white;">${TAG_EMOJIS[t] || ''} ${t}</span>`).join('')}
          </div>
          <div style="display:flex;gap:12px;font-size:11px;opacity:0.7;padding-top:8px;border-top:1px solid rgba(128,128,128,0.2);">
            <span><b>${agent.dealsPerYear}</b> deals/yr</span>
            <span><b>${formatCurrency(agent.avgSalePrice)}</b> avg</span>
            ${agent.referNetScore ? `<span style="color:${agent.referNetScore >= 90 ? '#22c55e' : '#f59e0b'};font-weight:600;">Score: ${agent.referNetScore}</span>` : ''}
          </div>
        </div>
      `
      poly.bindPopup(popupContent)
      marker.bindPopup(popupContent)
      layersRef.current.push(poly, marker)
    })
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
      {/* Controls bar */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex items-center gap-2 flex-wrap">
        {/* Tag filter pills */}
        <div className="flex items-center gap-1 px-1.5 py-1 rounded-xl border border-border bg-card/90 backdrop-blur-md shadow-lg">
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 text-muted-foreground">Filter</span>
          {tagChips.map((chip) => {
            const isActive = activeTag === chip.key
            return (
              <button
                key={chip.key}
                onClick={() => setActiveTag(chip.key)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all"
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
          className={`flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-semibold border transition-all backdrop-blur-md shadow-lg ${
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
          className={`flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-semibold border transition-all backdrop-blur-md shadow-lg ${
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
        <div className="absolute bottom-8 left-3 z-[1000] p-3 px-4 rounded-xl border border-border bg-card/90 backdrop-blur-md shadow-lg">
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

      {/* Agent count badge */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[1000] px-3 py-1.5 rounded-full border border-border bg-card/90 backdrop-blur-md shadow-lg text-xs text-muted-foreground">
        <span className="font-bold text-foreground">{activeTag === 'all' ? filteredAgents.length : filteredAgents.filter(a => a.tags.includes(activeTag)).length}</span> agents shown
      </div>

      <div ref={mapRef} className="w-full h-full" />
    </div>
  )
}
