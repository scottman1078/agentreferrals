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
  // Track data layers in a plain array — removed individually, never touches tiles
  const dataLayersRef = useRef<L.Layer[]>([])
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

  // Clear all tracked data layers from the map (never touches tile layer)
  const clearDataLayers = useCallback(() => {
    const map = mapInstance.current
    if (!map) return
    for (const layer of dataLayersRef.current) {
      try { map.removeLayer(layer) } catch { /* already removed */ }
    }
    dataLayersRef.current = []
  }, [])

  // Add a layer directly to the map and track it
  const addDataLayer = useCallback((layer: L.Layer) => {
    const map = mapInstance.current
    if (!map) return
    layer.addTo(map)
    dataLayersRef.current.push(layer)
  }, [])

  // Initialize map
  useEffect(() => {
    if (!leafletReady || !L || !mapRef.current || mapInstance.current) return

    // Inject Leaflet CSS and wait for it to load
    const ensureCss = (): Promise<void> => {
      return new Promise((resolve) => {
        if (document.querySelector('link[href*="leaflet@1.9.4"]')) {
          resolve()
          return
        }
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        link.onload = () => resolve()
        link.onerror = () => resolve() // proceed even if fails
        document.head.appendChild(link)
      })
    }

    // Inject Leaflet Draw CSS (fire and forget)
    if (!document.querySelector('link[href*="leaflet-draw"]')) {
      const drawLink = document.createElement('link')
      drawLink.rel = 'stylesheet'
      drawLink.href = 'https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.css'
      document.head.appendChild(drawLink)
    }

    let cancelled = false
    let ro: ResizeObserver | null = null

    ensureCss().then(() => {
      if (cancelled || !mapRef.current || mapInstance.current) return

      const map = L!.map(mapRef.current, {
        center: [39.5, -96.5],
        zoom: 4,
        zoomControl: false,
        maxBounds: L!.latLngBounds([15, -175], [75, -45]),
        maxBoundsViscosity: 1.0,
        minZoom: 4,
      })

      L!.control.zoom({ position: 'bottomleft' }).addTo(map)
      L!.tileLayer(LIGHT_TILES, { attribution: '' }).addTo(map)
      map.attributionControl.setPrefix('')
      map.getContainer().style.background = '#f2f2f2'

      map.on('zoomend', () => {
        setMapZoom(map.getZoom())
        updateVisibleStates(map)
      })
      map.on('moveend', () => updateVisibleStates(map))

      mapInstance.current = map

      // ResizeObserver + timed invalidateSize to fix tile rendering
      ro = new ResizeObserver(() => map.invalidateSize())
      ro.observe(mapRef.current!)
      setTimeout(() => map.invalidateSize(), 100)
      setTimeout(() => map.invalidateSize(), 500)
      setTimeout(() => map.invalidateSize(), 1500)

      if (initialCenter) {
        geocodeLocation(initialCenter).then((coords) => {
          if (coords && mapInstance.current) {
            mapInstance.current.setView(coords, 5, { animate: false })
            setTimeout(() => mapInstance.current?.invalidateSize(), 200)
          }
        })
      }
    })

    return () => {
      cancelled = true
      ro?.disconnect()
      if (mapInstance.current) {
        mapInstance.current.remove()
        mapInstance.current = null
        dataLayersRef.current = []
      }
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
    if (!mapInstance.current || !L) return

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
    if (!mapInstance.current || !L || activeTab !== 'county' || allCounties.size === 0) return

    // Clear previous county layers and re-render
    clearDataLayers()

    if (mapZoom < 5) return // counties not visible at low zoom

    const map = mapInstance.current
    const bounds = map.getBounds()
    const selectedSet = new Set(value.selectedCounties)

    allCounties.forEach((feat, fips) => {
      // Extract coordinates manually — L.geoJSON corrupts features
      const rings = geoJsonToRings(feat)
      if (rings.length === 0) return

      // Check if any ring intersects viewport
      let inView = false
      for (const ring of rings) {
        for (const [lat, lng] of ring) {
          if (lat >= bounds.getSouth() && lat <= bounds.getNorth() &&
              lng >= bounds.getWest() && lng <= bounds.getEast()) {
            inView = true
            break
          }
        }
        if (inView) break
      }
      if (!inView) return

      const isSelected = selectedSet.has(fips)
      const layer = L!.polygon(rings as L.LatLngExpression[][], {
        ...(isSelected
          ? { color: '#f59e0b', weight: 2.5, fillColor: '#f59e0b', fillOpacity: 0.25 }
          : { color: '#9ca3af', weight: 1, fillColor: '#f3f4f6', fillOpacity: 0.15, dashArray: '3, 3' }),
      })

      // Just the name (e.g. "Kalamazoo" not "Kalamazoo County, Michigan")
      const fullName = countyNames.get(fips)
      const shortName = fullName ? fullName.replace(/\s*County.*$/i, '').trim() : undefined
      if (shortName) {
        layer.bindTooltip(shortName, {
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

  const handleCountyClick = useCallback(async (fips: string, feat: GeoJSON.Feature) => {
    const cv = valueRef.current
    const isSelected = cv.selectedCounties.includes(fips)
    const newCounties = isSelected
      ? cv.selectedCounties.filter((f) => f !== fips)
      : [...cv.selectedCounties, fips]

    const polygonRings = buildPolygonFromCounties(newCounties, allCounties)

    // Resolve zip codes within the county boundary
    const countyRings = geoJsonToRings(feat)
    if (!isSelected && countyRings.length > 0) {
      // Sample points inside the county to find zip codes
      const ring = countyRings[0]
      const lats = ring.map(([lat]) => lat)
      const lngs = ring.map(([, lng]) => lng)
      const minLat = Math.min(...lats), maxLat = Math.max(...lats)
      const minLng = Math.min(...lngs), maxLng = Math.max(...lngs)

      const step = 0.08 // ~5 mile grid
      const samplePoints: LatLng[] = []
      for (let lat = minLat; lat <= maxLat; lat += step) {
        for (let lng = minLng; lng <= maxLng; lng += step) {
          if (pointInPolygon(lat, lng, ring)) {
            samplePoints.push([lat, lng])
          }
        }
      }

      const uniqueZips = new Set<string>(cv.selectedZips)
      const batchSize = 5
      for (let i = 0; i < Math.min(samplePoints.length, 80); i += batchSize) {
        const batch = samplePoints.slice(i, i + batchSize)
        const results = await Promise.all(batch.map(([lat, lng]) => getZipAtPoint(lat, lng)))
        for (const zip of results) {
          if (zip) uniqueZips.add(zip)
        }
        if (i + batchSize < samplePoints.length) {
          await new Promise((r) => setTimeout(r, 150))
        }
      }

      // Fetch boundaries for new zips
      const allZips = Array.from(uniqueZips)
      const zipPolygons: LatLng[][] = []
      for (const zip of allZips) {
        if (!zipBoundariesRef.current.has(zip)) {
          const ring = await getZipBoundary(zip)
          if (ring) zipBoundariesRef.current.set(zip, ring)
        }
        const r = zipBoundariesRef.current.get(zip)
        if (r) zipPolygons.push(r)
      }

      onChange({
        ...valueRef.current,
        mode: 'county',
        selectedCounties: newCounties,
        selectedZips: allZips,
        polygon: zipPolygons.length > 0 ? zipPolygons : polygonRings,
      })
    } else {
      // Deselecting — just remove the county, keep other zips
      onChange({
        ...cv,
        mode: 'county',
        selectedCounties: newCounties,
        polygon: polygonRings,
      })
    }
  }, [allCounties, onChange])

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

  // Fit map to selected zips — only on initial load or tab switch, NOT on every zip add
  const hasInitialFit = useRef(false)
  useEffect(() => {
    if (!mapInstance.current || !L || activeTab !== 'zip' || value.selectedZips.length === 0) return
    // Only fit bounds once (initial load) or when switching to zip tab
    if (hasInitialFit.current) return
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
      hasInitialFit.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.selectedZips, activeTab, zipLoadTrigger])

  // Reset fit flag when switching away from zip tab
  useEffect(() => {
    if (activeTab !== 'zip') hasInitialFit.current = false
  }, [activeTab])

  // Render zip layers — cluster when zoomed out, individual when zoomed in
  useEffect(() => {
    if (!mapInstance.current || !L) return
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
      // No click handler — don't remove on click. Users remove via X on chips.
      // Stop click from propagating to the map click-to-add handler
      layer.on('click', (e: L.LeafletMouseEvent) => {
        L!.DomEvent.stopPropagation(e)
      })
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
    const fullName = countyNames.get(fips)
    if (fullName) return fullName.replace(/\s*County.*$/i, '').trim()
    return fips
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
            {mapZoom < 5
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
      <div ref={mapRef} className={`w-full h-[340px] rounded-xl border border-border ${activeTab === 'zip' && !mapClickLoading ? 'cursor-crosshair' : ''}`} style={{ background: '#f2f2f2' }} />
      {/* Status messages rendered OUTSIDE the map container */}
      {activeTab === 'zip' && mapClickLoading && (
        <p className="text-xs text-muted-foreground text-center mt-1">
          <Loader2 className="w-3 h-3 inline animate-spin mr-1" />
          Looking up zip code...
        </p>
      )}
      {activeTab === 'zip' && mapClickMessage && !mapClickLoading && (
        <p className="text-xs text-muted-foreground text-center mt-1">{mapClickMessage}</p>
      )}
      {activeTab === 'county' && mapZoom < 5 && (
        <p className="text-xs text-muted-foreground text-center mt-1">Zoom in to see county boundaries</p>
      )}

      {/* Selected zip codes — shown for both zip and county mode */}
      {(activeTab === 'zip' || activeTab === 'county') && value.selectedZips.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {activeTab === 'county' && value.selectedCounties.length > 0
                ? `${value.selectedCounties.map(f => getCountyLabel(f)).join(', ')} — ${value.selectedZips.length} zip codes`
                : `Selected Zip Codes (${value.selectedZips.length})`}
            </div>
            <button
              onClick={() => {
                onChange({
                  ...valueRef.current,
                  selectedZips: [],
                  selectedCounties: [],
                  polygon: [],
                })
              }}
              className="text-[10px] font-semibold text-destructive hover:text-destructive/80 transition-colors"
            >
              Clear All
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto">
            {value.selectedZips.map((zip) => (
              <span
                key={zip}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20"
              >
                {zip}
                <button
                  onClick={() => removeZip(zip)}
                  className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                >
                  <X className="w-2.5 h-2.5" />
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
    // Use our own API proxy to avoid CORS/403 issues with external geocoders
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`)
    if (res.ok) {
      const data = await res.json()
      if (data.lat && data.lng) return [data.lat, data.lng]
    }
  } catch {
    // ignore
  }
  return null
}

/** Convert GeoJSON feature to Leaflet-format [lat, lng] rings */
function geoJsonToRings(feat: GeoJSON.Feature): LatLng[][] {
  const rings: LatLng[][] = []
  const geom = feat.geometry
  if (geom.type === 'Polygon') {
    rings.push(geom.coordinates[0].map(([lng, lat]) => [lat, lng] as LatLng))
  } else if (geom.type === 'MultiPolygon') {
    for (const poly of geom.coordinates) {
      rings.push(poly[0].map(([lng, lat]) => [lat, lng] as LatLng))
    }
  }
  return rings
}
