'use client'

import { useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'

const LIGHT_TILES = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
const DARK_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'

let L: typeof import('leaflet') | null = null

interface AgentProfileMapProps {
  polygon: [number, number][]
  color: string
  name: string
  area: string
}

export function AgentProfileMap({ polygon, color, name, area }: AgentProfileMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const [leafletLoaded, setLeafletLoaded] = useState(false)
  const { resolvedTheme } = useTheme()
  const tileLayerRef = useRef<L.TileLayer | null>(null)

  // Load leaflet dynamically
  useEffect(() => {
    import('leaflet').then((leaflet) => {
      L = leaflet
      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
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
      zoomControl: false,
      scrollWheelZoom: false,
      dragging: true,
      attributionControl: false,
    })

    L.control.zoom({ position: 'bottomright' }).addTo(map)

    const tileLayer = L.tileLayer(isDark ? DARK_TILES : LIGHT_TILES, {
      attribution: '&copy; OSM &copy; CARTO',
    }).addTo(map)

    tileLayerRef.current = tileLayer

    // Draw polygon
    const poly = L.polygon(polygon as L.LatLngExpression[], {
      color: color,
      weight: 2.5,
      fillColor: color,
      fillOpacity: 0.2,
      smoothFactor: 1.5,
    }).addTo(map)

    poly.bindTooltip(`${name} — ${area}`, { permanent: false, direction: 'center' })

    // Fit map to polygon bounds with some padding
    map.fitBounds(poly.getBounds(), { padding: [40, 40] })

    mapInstance.current = map

    return () => {
      map.remove()
      mapInstance.current = null
      tileLayerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leafletLoaded])

  // Switch tiles on theme change
  useEffect(() => {
    if (!tileLayerRef.current || !L) return
    const isDark = resolvedTheme === 'dark'
    tileLayerRef.current.setUrl(isDark ? DARK_TILES : LIGHT_TILES)
  }, [resolvedTheme])

  return (
    <div ref={mapRef} className="w-full h-[300px] sm:h-[360px]" />
  )
}
