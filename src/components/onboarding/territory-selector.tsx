'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { MapPin, Hash, MousePointer2, Pencil, X, Loader2, Search } from 'lucide-react'
import {
  getAllCountyFeatures,
  STATE_FIPS,
} from '@/lib/county-boundaries'
import { getZipBoundary, getCentroid, getZipAtPoint } from '@/lib/zip-boundaries'
import { pointInPolygon } from '@/lib/geo-utils'

type LatLng = [number, number]

export interface TerritoryData {
  mode: 'zip' | 'county' | 'draw'
  /** Selected county FIPS codes (for county mode) */
  selectedCounties: string[]
  /** Selected zip code strings (for zip mode) */
  selectedZips: string[]
  /** Custom drawn polygon coordinates — array of shapes, each shape is [lat, lng][] */
  drawnPolygon: LatLng[][]
  /** Combined polygon(s) for storage — array of rings, each ring is [lat, lng][] */
  polygon: LatLng[][]
}

interface Props {
  value: TerritoryData
  onChange: (data: TerritoryData) => void
  initialCenter?: string // e.g. "Kalamazoo, MI" — used to center the map
}

let L: typeof import('leaflet') | null = null

const LIGHT_TILES = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'

const TABS = [
  { id: 'zip' as const, label: 'By Zip Code', icon: Hash },
  { id: 'county' as const, label: 'By County', icon: MousePointer2 },
  { id: 'draw' as const, label: 'Draw Boundary', icon: Pencil },
]

// Reverse lookup: FIPS prefix → state abbreviation
const FIPS_TO_STATE: Record<string, string> = {}
for (const [abbr, fips] of Object.entries(STATE_FIPS)) {
  FIPS_TO_STATE[fips] = abbr
}

export default function TerritorySelector({ value, onChange, initialCenter }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const countyLayersRef = useRef<Map<string, L.Layer>>(new Map())
  const selectedLayersRef = useRef<Map<string, L.Layer>>(new Map())
  const zipLayersRef = useRef<Map<string, L.Layer>>(new Map())
  const drawnLayerRef = useRef<L.Layer | null>(null)
  const drawControlRef = useRef<L.Control.Draw | null>(null)

  // Cache of zip code → boundary polygon coordinates [lat, lng][]
  const zipBoundariesRef = useRef<Map<string, LatLng[]>>(new Map())

  const [leafletReady, setLeafletReady] = useState(false)
  const [activeTab, setActiveTab] = useState<'zip' | 'county' | 'draw'>(value.mode)
  const [zipInput, setZipInput] = useState('')
  const [zipLoading, setZipLoading] = useState(false)
  const [zipLoadTrigger, setZipLoadTrigger] = useState(0)
  const [zipError, setZipError] = useState('')
  const [countyNames, setCountyNames] = useState<Map<string, string>>(new Map())
  const [allCounties, setAllCounties] = useState<Map<string, GeoJSON.Feature>>(new Map())
  const [visibleStateFips, setVisibleStateFips] = useState<string[]>([])
  const [mapZoom, setMapZoom] = useState(4)
  const [polygonZipsLoading, setPolygonZipsLoading] = useState(false)
  const [polygonZipsMessage, setPolygonZipsMessage] = useState('')

  // Load Leaflet
  useEffect(() => {
    import('leaflet').then((leaflet) => {
      L = leaflet
      setLeafletReady(true)
    })
  }, [])

  // Load all county features
  useEffect(() => {
    getAllCountyFeatures().then((map) => {
      setAllCounties(map)
    })
  }, [])

  // Initialize map
  useEffect(() => {
    if (!leafletReady || !L || !mapRef.current || mapInstance.current) return

    // Inject Leaflet CSS
    if (!document.querySelector('link[href*="leaflet@1.9.4"]')) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }

    // Inject Leaflet Draw CSS
    if (!document.querySelector('link[href*="leaflet-draw"]')) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.css'
      document.head.appendChild(link)
    }

    const map = L.map(mapRef.current, {
      center: [39.5, -96.5],
      zoom: 4,
      zoomControl: false,
      maxBounds: L.latLngBounds([15, -175], [75, -45]),
      maxBoundsViscosity: 1.0,
      minZoom: 4,
    })

    L.control.zoom({ position: 'bottomleft' }).addTo(map)
    L.tileLayer(LIGHT_TILES, { attribution: '' }).addTo(map)
    map.attributionControl.setPrefix('')

    map.on('zoomend', () => {
      setMapZoom(map.getZoom())
      updateVisibleStates(map)
    })
    map.on('moveend', () => updateVisibleStates(map))

    mapInstance.current = map

    // Try to center on primaryArea
    if (initialCenter) {
      geocodeLocation(initialCenter).then((coords) => {
        if (coords && mapInstance.current) {
          mapInstance.current.setView(coords, 8, { animate: false })
        }
      })
    }

    return () => {
      map.remove()
      mapInstance.current = null
      countyLayersRef.current.clear()
      selectedLayersRef.current.clear()
      zipLayersRef.current.clear()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leafletReady])

  // Determine which state(s) are visible on the map
  const updateVisibleStates = useCallback((map: L.Map) => {
    const bounds = map.getBounds()
    const centerLat = bounds.getCenter().lat
    const centerLng = bounds.getCenter().lng

    // Find states whose rough center falls within bounds
    // Simple heuristic: use the map center to determine the primary state
    const stateGuesses: string[] = []
    for (const [fips] of Object.entries(FIPS_TO_STATE)) {
      stateGuesses.push(fips)
    }
    setVisibleStateFips(stateGuesses) // we'll render counties lazily based on viewport
  }, [])

  // Render county boundaries when in county mode and zoomed in enough
  useEffect(() => {
    if (!mapInstance.current || !L || activeTab !== 'county' || allCounties.size === 0) return
    if (mapZoom < 6) {
      // Clear county layers at low zoom
      countyLayersRef.current.forEach((layer) => mapInstance.current?.removeLayer(layer))
      countyLayersRef.current.clear()
      return
    }

    const map = mapInstance.current
    const bounds = map.getBounds()

    // Only render counties that intersect the viewport
    allCounties.forEach((feat, fips) => {
      if (countyLayersRef.current.has(fips)) return // already rendered
      if (selectedLayersRef.current.has(fips)) return // selected counties shown separately

      const bbox = getFeatureBbox(feat)
      if (!bbox) return

      // Check if county bbox intersects viewport
      const [minLng, minLat, maxLng, maxLat] = bbox
      if (maxLat < bounds.getSouth() || minLat > bounds.getNorth() ||
          maxLng < bounds.getWest() || minLng > bounds.getEast()) return

      const layer = L!.geoJSON(feat, {
        style: {
          color: '#9ca3af',
          weight: 1,
          fillColor: '#f3f4f6',
          fillOpacity: 0.15,
          dashArray: '3, 3',
        },
      })

      layer.on('click', () => handleCountyClick(fips, feat))
      layer.addTo(map)
      countyLayersRef.current.set(fips, layer)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, mapZoom, allCounties])

  // Re-render selected counties whenever they change
  useEffect(() => {
    if (!mapInstance.current || !L || allCounties.size === 0) return
    const map = mapInstance.current

    // Remove old selected layers
    selectedLayersRef.current.forEach((layer) => map.removeLayer(layer))
    selectedLayersRef.current.clear()

    // Remove matching county outline layers (we'll replace with selected style)
    for (const fips of value.selectedCounties) {
      const countyLayer = countyLayersRef.current.get(fips)
      if (countyLayer) {
        map.removeLayer(countyLayer)
        countyLayersRef.current.delete(fips)
      }
    }

    // Add selected county layers
    for (const fips of value.selectedCounties) {
      const feat = allCounties.get(fips)
      if (!feat) continue

      const layer = L.geoJSON(feat, {
        style: {
          color: '#f59e0b',
          weight: 2.5,
          fillColor: '#f59e0b',
          fillOpacity: 0.25,
        },
      })

      layer.on('click', () => handleCountyClick(fips, feat))
      layer.addTo(map)
      selectedLayersRef.current.set(fips, layer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.selectedCounties, allCounties])

  // Handle draw mode toggle
  useEffect(() => {
    if (!mapInstance.current || !L) return
    const map = mapInstance.current

    // Clean up draw control when switching away
    if (activeTab !== 'draw') {
      if (drawControlRef.current) {
        map.removeControl(drawControlRef.current)
        drawControlRef.current = null
      }
      return
    }

    // Dynamically import leaflet-draw
    import('leaflet-draw').then(() => {
      if (!mapInstance.current || !L || activeTab !== 'draw') return

      // Remove existing draw control
      if (drawControlRef.current) {
        map.removeControl(drawControlRef.current)
      }

      const drawnItems = new L.FeatureGroup()
      map.addLayer(drawnItems)

      // Add existing drawn polygons back
      for (const coords of value.drawnPolygon) {
        if (coords.length >= 3) {
          const poly = L.polygon(coords as L.LatLngExpression[], {
            color: '#f59e0b',
            weight: 2.5,
            fillColor: '#f59e0b',
            fillOpacity: 0.25,
          })
          drawnItems.addLayer(poly)
        }
      }
      drawnLayerRef.current = drawnItems

      const drawControl = new L.Control.Draw({
        position: 'topright',
        draw: {
          polyline: false,
          rectangle: false,
          circle: false,
          circlemarker: false,
          marker: false,
          polygon: {
            allowIntersection: false,
            shapeOptions: {
              color: '#f59e0b',
              weight: 2.5,
              fillColor: '#f59e0b',
              fillOpacity: 0.25,
            },
          },
        },
        edit: {
          featureGroup: drawnItems,
          remove: true,
        },
      })

      map.addControl(drawControl)
      drawControlRef.current = drawControl

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.on('draw:created', (e: any) => {
        const event = e as { layer: L.Polygon }
        const drawnLayer = event.layer
        drawnItems.addLayer(drawnLayer)

        // Extract coordinates and append to existing polygons
        const latLngs = drawnLayer.getLatLngs()[0] as L.LatLng[]
        const coords: LatLng[] = latLngs.map((ll) => [ll.lat, ll.lng])
        const newDrawnPolygons = [...value.drawnPolygon, coords]

        onChange({
          ...value,
          mode: 'draw',
          drawnPolygon: newDrawnPolygons,
          polygon: newDrawnPolygons,
        })

        // Resolve which zip codes intersect the newly drawn polygon
        resolvePolygonToZips(coords)
      })

      map.on('draw:deleted', () => {
        // Read whatever remains in drawnItems after the deletion
        const remainingPolygons: LatLng[][] = []
        drawnItems.getLayers().forEach((layer) => {
          const poly = layer as L.Polygon
          const rings = poly.getLatLngs()
          if (rings.length > 0) {
            const lls = rings[0] as L.LatLng[]
            remainingPolygons.push(lls.map((ll) => [ll.lat, ll.lng]))
          }
        })

        if (remainingPolygons.length === 0) {
          drawnLayerRef.current = null
        }

        onChange({
          ...value,
          mode: 'draw',
          drawnPolygon: remainingPolygons,
          polygon: remainingPolygons,
        })
      })
    })

    return () => {
      if (drawControlRef.current && mapInstance.current) {
        mapInstance.current.removeControl(drawControlRef.current)
        drawControlRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, leafletReady])

  // Clear non-active mode layers when switching tabs
  useEffect(() => {
    if (!mapInstance.current || !L) return
    const map = mapInstance.current

    if (activeTab !== 'county') {
      // Clear county outline layers (keep selected ones)
      countyLayersRef.current.forEach((layer) => map.removeLayer(layer))
      countyLayersRef.current.clear()
    }

    if (activeTab !== 'zip') {
      // Clear zip boundary layers
      zipLayersRef.current.forEach((layer) => map.removeLayer(layer))
      zipLayersRef.current.clear()
    }

    if (activeTab !== 'draw') {
      if (drawnLayerRef.current) {
        map.removeLayer(drawnLayerRef.current)
        drawnLayerRef.current = null
      }
    }

    // Show drawn polygons if switching back to draw mode
    if (activeTab === 'draw' && value.drawnPolygon.length > 0 && !drawnLayerRef.current) {
      const group = L.featureGroup()
      for (const coords of value.drawnPolygon) {
        if (coords.length >= 3) {
          L.polygon(coords as L.LatLngExpression[], {
            color: '#f59e0b',
            weight: 2.5,
            fillColor: '#f59e0b',
            fillOpacity: 0.25,
          }).addTo(group)
        }
      }
      group.addTo(map)
      drawnLayerRef.current = group
    }

    onChange({ ...value, mode: activeTab })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const handleCountyClick = useCallback((fips: string, feat: GeoJSON.Feature) => {
    const isSelected = value.selectedCounties.includes(fips)
    const newCounties = isSelected
      ? value.selectedCounties.filter((f) => f !== fips)
      : [...value.selectedCounties, fips]

    // Build polygon from selected counties
    const polygonRings = buildPolygonFromCounties(newCounties, allCounties)

    onChange({
      ...value,
      mode: 'county',
      selectedCounties: newCounties,
      polygon: polygonRings,
    })
  }, [value, allCounties, onChange])

  const handleZipSubmit = useCallback(async () => {
    const zip = zipInput.trim()
    if (!/^\d{5}$/.test(zip)) {
      setZipError('Enter a valid 5-digit zip code')
      return
    }

    if (value.selectedZips.includes(zip)) {
      setZipError('This zip code is already selected')
      return
    }

    if (value.selectedZips.length >= 30) {
      setZipError('Maximum of 30 zip codes allowed')
      return
    }

    setZipLoading(true)
    setZipError('')

    try {
      const ring = await getZipBoundary(zip)

      if (!ring) {
        setZipError('Zip code not found')
        setZipLoading(false)
        return
      }

      // Cache the boundary for map rendering
      zipBoundariesRef.current.set(zip, ring)

      const newZips = [...value.selectedZips, zip]
      const polygonRings: LatLng[][] = []
      for (const z of newZips) {
        const r = zipBoundariesRef.current.get(z)
        if (r) polygonRings.push(r)
      }

      onChange({
        ...value,
        mode: 'zip',
        selectedZips: newZips,
        polygon: polygonRings,
      })

      // Center map on the new zip
      if (mapInstance.current) {
        const center = getCentroid(ring)
        mapInstance.current.flyTo(center, 12, { duration: 0.8 })
      }

      setZipInput('')
    } catch {
      setZipError('Failed to look up zip code')
    }
    setZipLoading(false)
  }, [zipInput, value, onChange])

  const removeCounty = useCallback((fips: string) => {
    const newCounties = value.selectedCounties.filter((f) => f !== fips)
    const polygonRings = buildPolygonFromCounties(newCounties, allCounties)

    onChange({
      ...value,
      selectedCounties: newCounties,
      polygon: polygonRings,
    })
  }, [value, allCounties, onChange])

  const removeZip = useCallback((zip: string) => {
    const newZips = value.selectedZips.filter((z) => z !== zip)
    // Rebuild polygon from remaining zip boundaries
    const polygonRings: LatLng[][] = []
    for (const z of newZips) {
      const ring = zipBoundariesRef.current.get(z)
      if (ring) polygonRings.push(ring)
    }

    onChange({
      ...value,
      selectedZips: newZips,
      polygon: polygonRings,
    })
  }, [value, onChange])

  /** Given a drawn polygon, sample points inside it and resolve zip codes via Census API */
  const resolvePolygonToZips = useCallback(async (coords: LatLng[]) => {
    if (coords.length < 3) return

    setPolygonZipsLoading(true)
    setPolygonZipsMessage('Identifying zip codes in your drawn area...')

    try {
      // Calculate bounding box
      const lats = coords.map(([lat]) => lat)
      const lngs = coords.map(([, lng]) => lng)
      const minLat = Math.min(...lats)
      const maxLat = Math.max(...lats)
      const minLng = Math.min(...lngs)
      const maxLng = Math.max(...lngs)

      // Generate grid sample points ~0.02 degrees apart
      const step = 0.02
      const samplePoints: LatLng[] = []
      for (let lat = minLat; lat <= maxLat; lat += step) {
        for (let lng = minLng; lng <= maxLng; lng += step) {
          if (pointInPolygon(lat, lng, coords)) {
            samplePoints.push([lat, lng])
          }
        }
      }

      // Cap at 60 sample points to avoid too many API calls
      const capped = samplePoints.slice(0, 60)

      // Batch calls with small delays to avoid hammering the Census API
      const uniqueZips = new Set<string>()
      const batchSize = 5
      for (let i = 0; i < capped.length; i += batchSize) {
        const batch = capped.slice(i, i + batchSize)
        const results = await Promise.all(
          batch.map(([lat, lng]) => getZipAtPoint(lat, lng))
        )
        for (const zip of results) {
          if (zip) uniqueZips.add(zip)
        }
        // Small delay between batches
        if (i + batchSize < capped.length) {
          await new Promise((r) => setTimeout(r, 200))
        }
      }

      const zipsArray = Array.from(uniqueZips).sort()

      if (zipsArray.length === 0) {
        setPolygonZipsMessage('No zip codes found in the drawn area. Try drawing a larger boundary.')
        setPolygonZipsLoading(false)
        return
      }

      setPolygonZipsMessage(`Based on your drawn area, ${zipsArray.length} zip code${zipsArray.length > 1 ? 's' : ''} will be included:`)

      // Merge with existing selected zips (avoid duplicates)
      const mergedZips = Array.from(new Set([...value.selectedZips, ...zipsArray]))

      // Fetch boundaries for new zips and build polygon rings
      const polygonRings: LatLng[][] = []
      for (const zip of mergedZips) {
        if (!zipBoundariesRef.current.has(zip)) {
          const ring = await getZipBoundary(zip)
          if (ring) zipBoundariesRef.current.set(zip, ring)
        }
        const ring = zipBoundariesRef.current.get(zip)
        if (ring) polygonRings.push(ring)
      }

      // Append the newly drawn shape to existing polygons (value is stale but consistent with draw:created)
      const newDrawnPolygons = [...value.drawnPolygon, coords]

      onChange({
        ...value,
        mode: 'draw',
        drawnPolygon: newDrawnPolygons,
        selectedZips: mergedZips,
        polygon: polygonRings.length > 0 ? polygonRings : newDrawnPolygons,
      })

      // Trigger zip layer re-render
      setZipLoadTrigger((c) => c + 1)
    } catch (err) {
      console.error('[polygon-to-zip] Error:', err)
      setPolygonZipsMessage('Failed to identify zip codes. Your drawn boundary has been saved.')
    }

    setPolygonZipsLoading(false)
  }, [value, onChange])

  // Load boundaries for existing selected zips on mount
  useEffect(() => {
    if (!mapInstance.current || !L || activeTab !== 'zip') return
    if (value.selectedZips.length === 0) return

    const loadMissing = async () => {
      let loaded = 0
      for (const zip of value.selectedZips) {
        if (zipBoundariesRef.current.has(zip)) continue
        const ring = await getZipBoundary(zip)
        if (ring) {
          zipBoundariesRef.current.set(zip, ring)
          loaded++
        }
      }
      if (loaded > 0) {
        // Trigger re-render of zip layers
        setZipLoadTrigger((c) => c + 1)
      }
    }
    loadMissing()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leafletReady, activeTab, value.selectedZips.length])

  // Render zip boundary layers on the map
  useEffect(() => {
    if (!mapInstance.current || !L) return
    const map = mapInstance.current

    // Remove old zip layers
    zipLayersRef.current.forEach((layer) => map.removeLayer(layer))
    zipLayersRef.current.clear()

    if (activeTab !== 'zip') return

    // Add zip boundary layers and fit bounds
    const allBounds: L.LatLngBounds[] = []
    for (const zip of value.selectedZips) {
      const ring = zipBoundariesRef.current.get(zip)
      if (!ring) continue

      const layer = L.polygon(ring as L.LatLngExpression[], {
        color: '#f59e0b',
        weight: 2.5,
        fillColor: '#f59e0b',
        fillOpacity: 0.25,
      })

      layer.bindTooltip(zip, { permanent: false, direction: 'center' })
      layer.on('click', () => removeZip(zip))
      layer.addTo(map)
      zipLayersRef.current.set(zip, layer)
      allBounds.push(layer.getBounds())
    }

    // Fit map to show all selected zips
    if (allBounds.length > 0) {
      let combined = allBounds[0]
      for (let i = 1; i < allBounds.length; i++) {
        combined = combined.extend(allBounds[i])
      }
      map.fitBounds(combined, { padding: [40, 40], maxZoom: 10 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.selectedZips, activeTab, zipLoadTrigger])

  const getCountyLabel = (fips: string): string => {
    if (countyNames.has(fips)) return countyNames.get(fips)!
    const stateAbbr = FIPS_TO_STATE[fips.substring(0, 2)] || ''
    return `${stateAbbr} County (${fips})`
  }

  const territoryCount = activeTab === 'draw'
    ? value.drawnPolygon.length
    : activeTab === 'zip'
      ? value.selectedZips.length
      : value.selectedCounties.length

  return (
    <div className="space-y-4">
      {/* Tab Bar */}
      <div className="flex rounded-xl border border-border bg-card overflow-hidden">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-primary/10 text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Input area per tab */}
      {activeTab === 'zip' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Enter zip codes to add them to your territory.
            </p>
            <span className="text-xs text-muted-foreground font-medium">
              Max 30 zip codes
            </span>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={zipInput}
                onChange={(e) => {
                  setZipInput(e.target.value.replace(/\D/g, '').slice(0, 5))
                  setZipError('')
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleZipSubmit()}
                placeholder="Enter zip code (e.g. 49001)"
                maxLength={5}
                className="w-full h-10 pl-9 pr-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <button
              onClick={handleZipSubmit}
              disabled={zipLoading || zipInput.length !== 5 || value.selectedZips.length >= 30}
              className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all disabled:opacity-40"
            >
              {zipLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
            </button>
          </div>
          {zipError && (
            <p className="text-sm text-destructive font-medium">{zipError}</p>
          )}
        </div>
      )}

      {activeTab === 'county' && (
        <div>
          <p className="text-sm text-muted-foreground">
            {mapZoom < 6
              ? 'Zoom in on the map to see county boundaries, then click to select.'
              : 'Click counties on the map to add or remove them from your territory.'}
          </p>
        </div>
      )}

      {activeTab === 'draw' && (
        <div>
          <p className="text-sm text-muted-foreground">
            Use the drawing tool on the map to outline your service area. Click points to create a polygon.
          </p>
        </div>
      )}

      {/* Map */}
      <div className="relative rounded-xl border border-border overflow-hidden">
        <div ref={mapRef} className="w-full h-[400px] bg-muted" />
        {!leafletReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {activeTab === 'county' && mapZoom < 6 && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur-sm border border-border rounded-lg px-4 py-2 text-xs font-medium text-muted-foreground shadow-sm">
            <MapPin className="w-3.5 h-3.5 inline mr-1.5" />
            Zoom in to see county boundaries
          </div>
        )}
      </div>

      {/* Selected territories summary — zip mode */}
      {activeTab === 'zip' && value.selectedZips.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Selected Zip Codes ({value.selectedZips.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {value.selectedZips.map((zip) => (
              <span
                key={zip}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20"
              >
                {zip}
                <button
                  onClick={() => removeZip(zip)}
                  className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Selected territories summary — county mode */}
      {activeTab === 'county' && value.selectedCounties.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Selected Areas ({value.selectedCounties.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {value.selectedCounties.map((fips) => (
              <span
                key={fips}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20"
              >
                {getCountyLabel(fips)}
                <button
                  onClick={() => removeCounty(fips)}
                  className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'draw' && value.drawnPolygon.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-primary font-medium">
            <MapPin className="w-4 h-4" />
            {value.drawnPolygon.length} custom shape{value.drawnPolygon.length !== 1 ? 's' : ''} drawn
          </div>

          {/* Polygon-to-zip loading / results */}
          {polygonZipsLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              {polygonZipsMessage}
            </div>
          )}

          {!polygonZipsLoading && polygonZipsMessage && (
            <p className="text-xs text-muted-foreground">{polygonZipsMessage}</p>
          )}

          {!polygonZipsLoading && value.selectedZips.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Included Zip Codes ({value.selectedZips.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {value.selectedZips.map((zip) => (
                  <span
                    key={zip}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20"
                  >
                    {zip}
                    <button
                      onClick={() => removeZip(zip)}
                      className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {territoryCount === 0 && (
        <div className="text-center py-3 text-sm text-muted-foreground">
          {activeTab === 'zip' && 'Add at least one zip code to define your territory'}
          {activeTab === 'county' && 'Select at least one county on the map'}
          {activeTab === 'draw' && 'Draw your service area boundary on the map'}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function buildPolygonFromCounties(
  fipsCodes: string[],
  allCounties: Map<string, GeoJSON.Feature>
): LatLng[][] {
  const rings: LatLng[][] = []
  for (const fips of fipsCodes) {
    const feat = allCounties.get(fips)
    if (!feat) continue
    const geom = feat.geometry
    if (geom.type === 'Polygon') {
      rings.push(geom.coordinates[0].map(([lng, lat]) => [lat, lng] as LatLng))
    } else if (geom.type === 'MultiPolygon') {
      for (const poly of geom.coordinates) {
        rings.push(poly[0].map(([lng, lat]) => [lat, lng] as LatLng))
      }
    }
  }
  return rings
}

async function geocodeLocation(query: string): Promise<LatLng | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&country=US&format=json&limit=1`
    )
    const results = await res.json()
    if (results && results.length > 0) {
      return [parseFloat(results[0].lat), parseFloat(results[0].lon)]
    }
  } catch {
    // ignore
  }
  return null
}

function getFeatureBbox(feat: GeoJSON.Feature): [number, number, number, number] | null {
  const coords: number[][] = []
  const geom = feat.geometry
  if (geom.type === 'Polygon') {
    geom.coordinates[0].forEach((c) => coords.push(c))
  } else if (geom.type === 'MultiPolygon') {
    geom.coordinates.forEach((p) => p[0].forEach((c) => coords.push(c)))
  }
  if (coords.length === 0) return null
  const lngs = coords.map((c) => c[0])
  const lats = coords.map((c) => c[1])
  return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)]
}
