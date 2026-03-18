'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { MapPin, Hash, MousePointer2, Pencil, X, Loader2, Search } from 'lucide-react'
import {
  getAllCountyFeatures,
  getAllCountyNames,
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
  // All data layers go into this group — tile layer stays untouched on the map
  const dataGroupRef = useRef<L.LayerGroup | null>(null)
  const drawControlRef = useRef<L.Control.Draw | null>(null)
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null)

  // Cache of zip code → boundary polygon coordinates [lat, lng][]
  const zipBoundariesRef = useRef<Map<string, LatLng[]>>(new Map())

  // Always-current value ref to avoid stale closures in effects
  const valueRef = useRef(value)
  valueRef.current = value

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
  const [mapClickLoading, setMapClickLoading] = useState(false)
  const [mapClickMessage, setMapClickMessage] = useState('')

  // Load Leaflet
  useEffect(() => {
    import('leaflet').then((leaflet) => {
      L = leaflet
      setLeafletReady(true)
    })
  }, [])

  // Load all county features and names
  useEffect(() => {
    getAllCountyFeatures().then((map) => {
      setAllCounties(map)
    })
    getAllCountyNames().then((names) => {
      setCountyNames(names)
    })
  }, [])

  // Clear all data layers (keeps tile layer untouched)
  const clearDataLayers = useCallback(() => {
    if (dataGroupRef.current) dataGroupRef.current.clearLayers()
  }, [])

  // Add a layer to the data group (never directly to map)
  const addDataLayer = useCallback((layer: L.Layer) => {
    if (dataGroupRef.current) dataGroupRef.current.addLayer(layer)
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

    // Data layer group — all polygons/markers go here, tile layer stays untouched
    dataGroupRef.current = L.layerGroup().addTo(map)

    // Force light background on the Leaflet container itself
    map.getContainer().style.background = '#f2f2f2'

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
      dataGroupRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leafletReady])

  // Determine which state(s) are visible on the map
  const updateVisibleStates = useCallback((map: L.Map) => {
    const stateGuesses: string[] = []
    for (const [fips] of Object.entries(FIPS_TO_STATE)) {
      stateGuesses.push(fips)
    }
    setVisibleStateFips(stateGuesses)
  }, [])

  // ═══════════════════════════════════════
  // CLEAR ALL DATA LAYERS on tab switch
  // ═══════════════════════════════════════
  useEffect(() => {
    if (!mapInstance.current || !L || !dataGroupRef.current) return

    // Clear ALL data layers — tile layer is never in this group
    clearDataLayers()

    // Remove draw control if switching away from draw
    if (activeTab !== 'draw' && drawControlRef.current) {
      mapInstance.current.removeControl(drawControlRef.current)
      drawControlRef.current = null
      drawnItemsRef.current = null
    }

    // Show drawn polygons if switching to draw mode
    const currentValue = valueRef.current
    if (activeTab === 'draw' && currentValue.drawnPolygon.length > 0) {
      for (const coords of currentValue.drawnPolygon) {
        if (coords.length >= 3) {
          addDataLayer(L.polygon(coords as L.LatLngExpression[], {
            color: '#f59e0b',
            weight: 2.5,
            fillColor: '#f59e0b',
            fillOpacity: 0.25,
          }))
        }
      }
    }

    onChange({ ...currentValue, mode: activeTab })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // ═══════════════════════════════════════
  // COUNTY MODE
  // ═══════════════════════════════════════

  // Render ALL county layers (selected + unselected) in one effect
  useEffect(() => {
    if (!mapInstance.current || !L || !dataGroupRef.current || activeTab !== 'county' || allCounties.size === 0) return

    // Clear previous county layers and re-render
    clearDataLayers()

    if (mapZoom < 6) return // counties not visible at low zoom

    const map = mapInstance.current
    const bounds = map.getBounds()
    const selectedSet = new Set(value.selectedCounties)

    allCounties.forEach((feat, fips) => {
      const bbox = getFeatureBbox(feat)
      if (!bbox) return

      const [minLng, minLat, maxLng, maxLat] = bbox
      if (maxLat < bounds.getSouth() || minLat > bounds.getNorth() ||
          maxLng < bounds.getWest() || minLng > bounds.getEast()) return

      const isSelected = selectedSet.has(fips)
      const cloned = JSON.parse(JSON.stringify(feat)) as GeoJSON.Feature
      const layer = L!.geoJSON(cloned, {
        style: isSelected
          ? { color: '#f59e0b', weight: 2.5, fillColor: '#f59e0b', fillOpacity: 0.25 }
          : { color: '#9ca3af', weight: 1, fillColor: '#f3f4f6', fillOpacity: 0.15, dashArray: '3, 3' },
      })

      const name = countyNames.get(fips)
      if (name) {
        layer.bindTooltip(name, {
          permanent: isSelected,
          direction: 'center',
          className: 'territory-tooltip',
        })
      }

      layer.on('click', () => handleCountyClick(fips, feat))
      addDataLayer(layer)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, mapZoom, allCounties, countyNames, value.selectedCounties])

  // ═══════════════════════════════════════
  // DRAW MODE
  // ═══════════════════════════════════════

  useEffect(() => {
    if (!mapInstance.current || !L || activeTab !== 'draw') return
    const map = mapInstance.current

    import('leaflet-draw').then(() => {
      if (!mapInstance.current || !L || activeTab !== 'draw') return

      if (drawControlRef.current) {
        map.removeControl(drawControlRef.current)
        drawControlRef.current = null
      }

      // drawnItems must be added directly to the map (not data group) for Leaflet Draw to work
      const drawnItems = new L.FeatureGroup()
      map.addLayer(drawnItems)
      drawnItemsRef.current = drawnItems

      const currentVal = valueRef.current
      for (const coords of currentVal.drawnPolygon) {
        if (coords.length >= 3) {
          L.polygon(coords as L.LatLngExpression[], {
            color: '#f59e0b',
            weight: 2.5,
            fillColor: '#f59e0b',
            fillOpacity: 0.25,
          }).addTo(drawnItems)
        }
      }

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

        const latLngs = drawnLayer.getLatLngs()[0] as L.LatLng[]
        const coords: LatLng[] = latLngs.map((ll) => [ll.lat, ll.lng])
        const cv = valueRef.current
        const newDrawnPolygons = [...cv.drawnPolygon, coords]

        onChange({
          ...cv,
          mode: 'draw',
          drawnPolygon: newDrawnPolygons,
          polygon: newDrawnPolygons,
        })

        resolvePolygonToZips(coords)
      })

      map.on('draw:deleted', () => {
        const remainingPolygons: LatLng[][] = []
        drawnItems.getLayers().forEach((layer) => {
          const poly = layer as L.Polygon
          const rings = poly.getLatLngs()
          if (rings.length > 0) {
            const lls = rings[0] as L.LatLng[]
            remainingPolygons.push(lls.map((ll) => [ll.lat, ll.lng]))
          }
        })

        const cv = valueRef.current
        onChange({
          ...cv,
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
      if (drawnItemsRef.current && mapInstance.current) {
        mapInstance.current.removeLayer(drawnItemsRef.current)
        drawnItemsRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, leafletReady])

  // ═══════════════════════════════════════
  // ZIP MODE
  // ═══════════════════════════════════════

  const handleCountyClick = useCallback((fips: string, feat: GeoJSON.Feature) => {
    const isSelected = value.selectedCounties.includes(fips)
    const newCounties = isSelected
      ? value.selectedCounties.filter((f) => f !== fips)
      : [...value.selectedCounties, fips]

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

      if (mapInstance.current) {
        const center = getCentroid(ring)
        mapInstance.current.setView(center, 11, { animate: false })
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

  const resolvePolygonToZips = useCallback(async (coords: LatLng[]) => {
    if (coords.length < 3) return

    setPolygonZipsLoading(true)
    setPolygonZipsMessage('Identifying zip codes in your drawn area...')

    try {
      const lats = coords.map(([lat]) => lat)
      const lngs = coords.map(([, lng]) => lng)
      const minLat = Math.min(...lats)
      const maxLat = Math.max(...lats)
      const minLng = Math.min(...lngs)
      const maxLng = Math.max(...lngs)

      const step = 0.02
      const samplePoints: LatLng[] = []
      for (let lat = minLat; lat <= maxLat; lat += step) {
        for (let lng = minLng; lng <= maxLng; lng += step) {
          if (pointInPolygon(lat, lng, coords)) {
            samplePoints.push([lat, lng])
          }
        }
      }

      const capped = samplePoints.slice(0, 60)

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

      const mergedZips = Array.from(new Set([...value.selectedZips, ...zipsArray]))

      const polygonRings: LatLng[][] = []
      for (const zip of mergedZips) {
        if (!zipBoundariesRef.current.has(zip)) {
          const ring = await getZipBoundary(zip)
          if (ring) zipBoundariesRef.current.set(zip, ring)
        }
        const ring = zipBoundariesRef.current.get(zip)
        if (ring) polygonRings.push(ring)
      }

      const newDrawnPolygons = [...value.drawnPolygon, coords]

      onChange({
        ...value,
        mode: 'draw',
        drawnPolygon: newDrawnPolygons,
        selectedZips: mergedZips,
        polygon: polygonRings.length > 0 ? polygonRings : newDrawnPolygons,
      })

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
        setZipLoadTrigger((c) => c + 1)
      }
    }
    loadMissing()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leafletReady, activeTab, value.selectedZips.length])

  const ZIP_CLUSTER_ZOOM = 9

  // Fit map to selected zips
  useEffect(() => {
    if (!mapInstance.current || !L || activeTab !== 'zip' || value.selectedZips.length === 0) return
    const map = mapInstance.current
    const allBounds: L.LatLngBounds[] = []
    for (const zip of value.selectedZips) {
      const ring = zipBoundariesRef.current.get(zip)
      if (!ring) continue
      allBounds.push(L.polygon(ring as L.LatLngExpression[]).getBounds())
    }
    if (allBounds.length > 0) {
      let combined = allBounds[0]
      for (let i = 1; i < allBounds.length; i++) combined = combined.extend(allBounds[i])
      map.fitBounds(combined, { padding: [30, 30], maxZoom: 11, animate: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.selectedZips, activeTab, zipLoadTrigger])

  // Render zip layers — cluster when zoomed out, individual when zoomed in
  useEffect(() => {
    if (!mapInstance.current || !L || !dataGroupRef.current) return
    if (activeTab !== 'zip') return

    // Clear and re-render all zip data layers
    clearDataLayers()

    if (value.selectedZips.length === 0) return

    const map = mapInstance.current

    if (mapZoom < ZIP_CLUSTER_ZOOM && value.selectedZips.length > 1) {
      let totalLat = 0, totalLng = 0, count = 0
      for (const zip of value.selectedZips) {
        const ring = zipBoundariesRef.current.get(zip)
        if (!ring) continue
        const c = getCentroid(ring)
        totalLat += c[0]; totalLng += c[1]; count++
      }
      if (count > 0) {
        const clusterIcon = L!.divIcon({
          className: '',
          html: `<div style="background:#f59e0b;color:#fff;border-radius:50%;width:76px;height:76px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-weight:700;font-size:17px;box-shadow:0 2px 10px rgba(0,0,0,0.3);border:3px solid #fff;cursor:pointer;line-height:1.1"><span>${value.selectedZips.length}</span><span style="font-size:9px;font-weight:600;letter-spacing:0.05em;opacity:0.9">ZIP CODES</span></div>`,
          iconSize: [76, 76],
          iconAnchor: [38, 38],
        })
        const marker = L!.marker([totalLat / count, totalLng / count], { icon: clusterIcon })
        marker.bindTooltip(`${value.selectedZips.length} zip codes — zoom in to see boundaries`, { direction: 'top' })
        marker.on('click', () => map.setZoom(ZIP_CLUSTER_ZOOM + 1))
        addDataLayer(marker)
      }
      return
    }

    for (const zip of value.selectedZips) {
      const ring = zipBoundariesRef.current.get(zip)
      if (!ring) continue
      const layer = L!.polygon(ring as L.LatLngExpression[], {
        color: '#f59e0b',
        weight: 2.5,
        fillColor: '#f59e0b',
        fillOpacity: 0.25,
      })
      layer.bindTooltip(zip, { permanent: true, direction: 'center', className: 'territory-tooltip' })
      layer.on('click', () => removeZip(zip))
      addDataLayer(layer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.selectedZips, activeTab, zipLoadTrigger, mapZoom])

  // Click-to-add zip codes
  useEffect(() => {
    if (!mapInstance.current || !L || activeTab !== 'zip') return
    const map = mapInstance.current

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleMapClick = async (e: any) => {
      const { lat, lng } = e.latlng
      if (mapClickLoading) return

      setMapClickMessage('')
      setMapClickLoading(true)

      try {
        const zip = await getZipAtPoint(lat, lng)
        if (!zip) {
          setMapClickMessage('No zip code found at that location.')
          setTimeout(() => setMapClickMessage(''), 3000)
          return
        }
        if (value.selectedZips.includes(zip)) {
          return
        }
        if (value.selectedZips.length >= 30) {
          setMapClickMessage('Maximum of 30 zip codes reached.')
          setTimeout(() => setMapClickMessage(''), 3000)
          return
        }

        const ring = await getZipBoundary(zip)
        if (!ring) return

        zipBoundariesRef.current.set(zip, ring)

        const newZips = [...value.selectedZips, zip]
        const polygonRings: LatLng[][] = []
        for (const z of newZips) {
          const r = zipBoundariesRef.current.get(z)
          if (r) polygonRings.push(r)
        }

        onChange({ ...value, mode: 'zip', selectedZips: newZips, polygon: polygonRings })
      } catch {
        setMapClickMessage('Failed to look up zip code.')
        setTimeout(() => setMapClickMessage(''), 3000)
      } finally {
        setMapClickLoading(false)
      }
    }

    map.on('click', handleMapClick)
    return () => { map.off('click', handleMapClick) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, leafletReady, mapClickLoading, value, onChange])

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
              Enter zip codes or click the map to add them.
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
        <div ref={mapRef} className={`w-full h-[340px] ${activeTab === 'zip' && !mapClickLoading ? 'cursor-crosshair' : ''}`} style={{ background: '#f2f2f2' }} />
        {!leafletReady && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: '#f2f2f2' }}>
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        )}
        {activeTab === 'zip' && mapClickLoading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ background: 'rgba(255,255,255,0.4)' }}>
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm font-medium shadow-sm text-gray-700">
              <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
              Looking up zip code...
            </div>
          </div>
        )}
        {activeTab === 'zip' && mapClickMessage && !mapClickLoading && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-white border border-gray-200 rounded-lg px-4 py-2 text-xs font-medium text-gray-500 shadow-sm z-[1000]">
            {mapClickMessage}
          </div>
        )}
        {activeTab === 'zip' && !mapClickLoading && !mapClickMessage && leafletReady && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-white border border-gray-200 rounded-lg px-4 py-2 text-xs font-medium text-gray-500 shadow-sm pointer-events-none z-[1000]">
            <MapPin className="w-3 h-3 inline mr-1.5" />
            Click the map to add a zip code
          </div>
        )}
        {activeTab === 'county' && mapZoom < 6 && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-white border border-gray-200 rounded-lg px-4 py-2 text-xs font-medium text-gray-500 shadow-sm z-[1000]">
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
