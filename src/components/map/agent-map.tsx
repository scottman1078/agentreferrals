'use client'

import { useEffect, useRef, useState } from 'react'
import { agents } from '@/data/agents'
import { voidZones } from '@/data/coverage-gaps'
import { TAG_COLORS, ALL_TAGS, TAG_EMOJIS } from '@/lib/constants'
import { getInitials, formatCurrency } from '@/lib/utils'
import type { Agent } from '@/types'

// We import leaflet dynamically since it requires window
let L: typeof import('leaflet') | null = null

export default function AgentMap() {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const layersRef = useRef<L.Layer[]>([])
  const voidLayersRef = useRef<L.Layer[]>([])
  const [activeTag, setActiveTag] = useState('all')
  const [showVoids, setShowVoids] = useState(false)
  const [showMigration, setShowMigration] = useState(false)
  const [leafletLoaded, setLeafletLoaded] = useState(false)

  useEffect(() => {
    import('leaflet').then((leaflet) => {
      L = leaflet
      // Fix default marker icon
      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })
      setLeafletLoaded(true)
    })
  }, [])

  useEffect(() => {
    if (!leafletLoaded || !L || !mapRef.current || mapInstance.current) return

    // Import CSS
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)

    const map = L.map(mapRef.current, {
      center: [39.5, -98.35],
      zoom: 4,
      zoomControl: true,
    })

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map)

    mapInstance.current = map
    renderAgents(agents, map)

    return () => {
      map.remove()
      mapInstance.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leafletLoaded])

  useEffect(() => {
    if (!mapInstance.current || !L) return
    const filtered = activeTag === 'all' ? agents : agents.filter((a) => a.tags.includes(activeTag))
    renderAgents(filtered, mapInstance.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTag])

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

        poly.bindTooltip(vz.label, {
          permanent: false,
          direction: 'center',
          className: 'void-tooltip',
        })

        voidLayersRef.current.push(poly)
      })
    }
  }, [showVoids])

  function renderAgents(agentList: Agent[], map: L.Map) {
    if (!L) return
    layersRef.current.forEach((l) => map.removeLayer(l))
    layersRef.current = []

    agentList.forEach((agent) => {
      const poly = L!.polygon(agent.polygon as L.LatLngExpression[], {
        color: agent.color,
        weight: agent.isPrimary ? 3 : 2,
        fillColor: agent.color,
        fillOpacity: agent.isPrimary ? 0.25 : 0.15,
      }).addTo(map)

      const popupContent = `
        <div style="min-width:200px">
          <div style="font-family:var(--font-d);font-weight:700;font-size:15px;margin-bottom:2px">${agent.name}</div>
          <div style="font-size:11px;color:var(--text-dim);margin-bottom:8px">${agent.brokerage}</div>
          <div style="font-size:12px;margin-bottom:8px">${agent.area}</div>
          <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px">
            ${agent.tags.map((t) => `<span style="padding:2px 8px;border-radius:99px;font-size:10px;font-weight:600;background:${TAG_COLORS[t]};color:#0f1117">${TAG_EMOJIS[t] || ''} ${t}</span>`).join('')}
          </div>
          <div style="font-size:12px;color:var(--text-dim)">${agent.dealsPerYear} deals/yr · ${formatCurrency(agent.avgSalePrice)} avg</div>
        </div>
      `
      poly.bindPopup(popupContent)
      layersRef.current.push(poly)
    })
  }

  const tagChips = [
    { key: 'all', label: 'All' },
    { key: 'Homes for Heroes', label: '🦸 HFH' },
    { key: 'Luxury', label: '💎 Luxury' },
    { key: 'First-Time Buyers', label: '🏡 FTB' },
    { key: 'Investment', label: '📈 Invest' },
    { key: 'Relocation', label: '📦 Relo' },
    { key: 'Land & Acreage', label: '🌾 Land' },
    { key: 'New Construction', label: '🏗 New Con' },
  ]

  return (
    <div className="relative w-full h-full">
      {/* Controls bar */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex items-center gap-2 flex-wrap">
        <div
          className="flex items-center gap-1.5 px-2 py-1"
          style={{
            background: 'rgba(15,17,23,0.88)',
            border: '1px solid var(--border2)',
            borderRadius: '99px',
            backdropFilter: 'blur(8px)',
          }}
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider px-1" style={{ color: 'var(--text-muted)' }}>Filter</span>
          {tagChips.map((chip) => (
            <button
              key={chip.key}
              onClick={() => setActiveTag(chip.key)}
              className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all"
              style={{
                background: activeTag === chip.key ? (chip.key === 'all' ? 'var(--accent)' : TAG_COLORS[chip.key] || 'var(--accent)') : 'transparent',
                color: activeTag === chip.key ? '#0f1117' : 'var(--text-dim)',
                border: '1px solid transparent',
              }}
            >
              {chip.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowVoids(!showVoids)}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all"
          style={{
            background: showVoids ? 'rgba(239,68,68,0.1)' : 'rgba(15,17,23,0.88)',
            border: showVoids ? '1px solid var(--red)' : '1px solid var(--border2)',
            color: showVoids ? 'var(--red)' : 'var(--text-dim)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: showVoids ? 'var(--red)' : 'var(--text-muted)' }} />
          Show Voids
        </button>

        <button
          onClick={() => setShowMigration(!showMigration)}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all"
          style={{
            background: showMigration ? 'rgba(240,165,0,0.1)' : 'rgba(15,17,23,0.88)',
            border: showMigration ? '1px solid var(--accent)' : '1px solid var(--border2)',
            color: showMigration ? 'var(--accent)' : 'var(--text-dim)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: showMigration ? 'var(--accent)' : 'var(--text-muted)' }} />
          Migration Flow
        </button>
      </div>

      {/* Migration legend */}
      {showMigration && (
        <div
          className="absolute bottom-8 left-3 z-[1000] p-3 px-4 rounded-lg"
          style={{
            background: 'rgba(15,17,23,0.9)',
            border: '1px solid var(--border2)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div className="font-bold text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>
            Migration Flow
          </div>
          {[
            { color: '#f97316', label: 'Inflow Market (high demand)' },
            { color: '#3b82f6', label: 'Outflow Market (departures)' },
            { color: '#8892a4', label: 'Net Neutral' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-xs mb-1" style={{ color: 'var(--text-dim)' }}>
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.color }} />
              {item.label}
            </div>
          ))}
        </div>
      )}

      <div ref={mapRef} className="w-full h-full" />
    </div>
  )
}
