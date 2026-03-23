#!/usr/bin/env python3
"""Apply territory clearing bug fixes to settings page."""

FILE = '/Users/scottmolluso/Desktop/AIProjects/AgentReferrals/src/app/dashboard/settings/page.tsx'

with open(FILE, 'r') as f:
    content = f.read()

changes = 0

# 1. Add X to lucide imports
old = "import { CreditCard, ArrowRight, Loader2, Check, User, Bell, FileText, MapPin, Settings as SettingsIcon, Camera, Info, Search, Video, Trash2, Pencil } from 'lucide-react'"
new = "import { CreditCard, ArrowRight, Loader2, Check, User, Bell, FileText, MapPin, Settings as SettingsIcon, Camera, Info, Search, Video, Trash2, Pencil, X } from 'lucide-react'"
if old in content:
    content = content.replace(old, new)
    changes += 1
    print("1. Added X to imports")

# 2. Add zipsBySelectionRef
old = "  const zipBoundariesRef = useRef<Map<string, [number, number][]>>(new Map())\n\n  // Radius state"
new = "  const zipBoundariesRef = useRef<Map<string, [number, number][]>>(new Map())\n  // Track which zips belong to which territory selection (county/city/radius label)\n  const zipsBySelectionRef = useRef<Map<string, string[]>>(new Map())\n\n  // Radius state"
if old in content:
    content = content.replace(old, new)
    changes += 1
    print("2. Added zipsBySelectionRef")

# 3. Add savedViewRef
old = "  const skipFitBoundsRef = useRef(false)\n  const [savingTerritory, setSavingTerritory] = useState(false)"
new = "  const skipFitBoundsRef = useRef(false)\n  const savedViewRef = useRef<{ center: { lat: number; lng: number }; zoom: number } | null>(null)\n  const [savingTerritory, setSavingTerritory] = useState(false)"
if old in content:
    content = content.replace(old, new)
    changes += 1
    print("3. Added savedViewRef")

# 4. Load territory_meta from profile
old = """      // Load existing territory zips
      if (profile.territory_zips && Array.isArray(profile.territory_zips)) {
        setSelectedZips(profile.territory_zips as string[])
      }
    } else if (!isAuthenticated) {"""
new = """      // Load existing territory zips
      if (profile.territory_zips && Array.isArray(profile.territory_zips)) {
        setSelectedZips(profile.territory_zips as string[])
      }
      // Restore territory meta (mode, selections, zip groupings)
      if (profile.territory_meta && typeof profile.territory_meta === 'object') {
        const meta = profile.territory_meta as { mode?: string; selections?: string[]; zipGroups?: Record<string, string[]> }
        if (meta.mode && ['city', 'county', 'zip', 'radius'].includes(meta.mode)) {
          setTerritoryMode(meta.mode as 'city' | 'county' | 'zip' | 'radius')
        }
        if (meta.selections && Array.isArray(meta.selections)) {
          setTerritorySelections(meta.selections)
        }
        if (meta.zipGroups && typeof meta.zipGroups === 'object') {
          for (const [label, zips] of Object.entries(meta.zipGroups)) {
            if (Array.isArray(zips)) {
              zipsBySelectionRef.current.set(label, zips)
            }
          }
        }
      }
    } else if (!isAuthenticated) {"""
if old in content:
    content = content.replace(old, new)
    changes += 1
    print("4. Load territory_meta from profile")

# 5. Fix poly tooltip + click handler + fitBounds
old = """        if (isCountyMode) {
          poly.bindTooltip(`${zip} \\u2715`, { permanent: false, direction: 'center', className: 'zip-label' })
        } else {
          poly.bindTooltip(`${zip} \\u2715`, { permanent: true, direction: 'center', className: 'zip-label' })
        }
        poly.on('click', (e) => {
          L!.DomEvent.stopPropagation(e)
          // Remove zip without triggering fitBounds zoom-out
          skipFitBoundsRef.current = true
          setSelectedZips((prev) => prev.filter((z) => z !== zip))
        })
        poly.addTo(map)
        zipLayersRef.current.push(poly)
        bounds.push(poly.getBounds())
      }

      if (cancelled) return
      if (bounds.length > 0 && !skipFitBoundsRef.current) {
        let combined = bounds[0]
        for (let i = 1; i < bounds.length; i++) combined = combined.extend(bounds[i])
        map.fitBounds(combined, { padding: [40, 40], maxZoom: isCountyMode ? 9 : 12, animate: false })
      }
      skipFitBoundsRef.current = false"""

new = """        // Tooltip: grouped zips hover-only, individual zips permanent
        let belongsToGroup = false
        for (const [, groupZips] of zipsBySelectionRef.current.entries()) {
          if (groupZips.includes(zip)) { belongsToGroup = true; break }
        }
        if (belongsToGroup || isCountyMode) {
          poly.bindTooltip(`${zip} \\u2715`, { permanent: false, direction: 'center', className: 'zip-label' })
        } else {
          poly.bindTooltip(`${zip} \\u2715`, { permanent: true, direction: 'center', className: 'zip-label' })
        }
        poly.on('click', (e) => {
          L!.DomEvent.stopPropagation(e)
          // Save current view to prevent zoom-out
          skipFitBoundsRef.current = true
          if (mapInstance.current) {
            savedViewRef.current = {
              center: { lat: mapInstance.current.getCenter().lat, lng: mapInstance.current.getCenter().lng },
              zoom: mapInstance.current.getZoom(),
            }
          }
          // Find group this zip belongs to and remove whole group
          let zipsToRemove: Set<string> | null = null
          let groupLabel: string | null = null
          for (const [label, groupZips] of zipsBySelectionRef.current.entries()) {
            if (groupZips.includes(zip)) {
              zipsToRemove = new Set(groupZips)
              groupLabel = label
              break
            }
          }
          if (zipsToRemove && groupLabel) {
            const removeSet = zipsToRemove
            const removeLabel = groupLabel
            zipsBySelectionRef.current.delete(removeLabel)
            setTerritorySelections((prev) => prev.filter((s) => s !== removeLabel))
            setSelectedZips((prev) => prev.filter((z) => !removeSet.has(z)))
          } else {
            setSelectedZips((prev) => prev.filter((z) => z !== zip))
          }
        })
        poly.addTo(map)
        zipLayersRef.current.push(poly)
        bounds.push(poly.getBounds())
      }

      if (cancelled) return
      if (skipFitBoundsRef.current) {
        if (savedViewRef.current) {
          map.setView(
            [savedViewRef.current.center.lat, savedViewRef.current.center.lng],
            savedViewRef.current.zoom,
            { animate: false }
          )
          savedViewRef.current = null
        }
      } else if (bounds.length > 0) {
        let combined = bounds[0]
        for (let i = 1; i < bounds.length; i++) combined = combined.extend(bounds[i])
        map.fitBounds(combined, { padding: [40, 40], maxZoom: isCountyMode ? 9 : 12, animate: false })
      }
      skipFitBoundsRef.current = false"""

if old in content:
    content = content.replace(old, new)
    changes += 1
    print("5. Fixed poly click handler + zoom prevention")

# 6. Track county in handleAddZip text input
old = """          if (data.zips?.length > 0) {
            const newZips = data.zips.filter((z: string) => !zipBoundariesRef.current.has(z))
            for (let i = 0; i < newZips.length; i += 10) {
              const batch = newZips.slice(i, i + 10)
              const results = await Promise.all(batch.map((z: string) => getZipBoundary(z)))
              results.forEach((ring: [number, number][] | null, idx: number) => {
                if (ring) zipBoundariesRef.current.set(batch[idx], ring)
              })
            }
            setSelectedZips((prev) => {
              const combined = new Set([...prev, ...data.zips])
              return Array.from(combined).slice(0, 100)
            })
            const geoRes = await fetch(`/api/geocode?q=${encodeURIComponent(input)}`)
            const geo = await geoRes.json()
            if (geo.lat && geo.lng && mapInstance.current) {
              mapInstance.current.setView([geo.lat, geo.lng], 9, { animate: true })
            }
            setZipInput('')
            setZipLoading(false)
            return
          }
        } catch { /* fall through to generic geocode */ }
      }"""
new = """          if (data.zips?.length > 0) {
            const selectionLabel = `${countyName} County, ${stateCode}`
            const newZips = data.zips.filter((z: string) => !zipBoundariesRef.current.has(z))
            for (let i = 0; i < newZips.length; i += 10) {
              const batch = newZips.slice(i, i + 10)
              const results = await Promise.all(batch.map((z: string) => getZipBoundary(z)))
              results.forEach((ring: [number, number][] | null, idx: number) => {
                if (ring) zipBoundariesRef.current.set(batch[idx], ring)
              })
            }
            zipsBySelectionRef.current.set(selectionLabel, data.zips as string[])
            setTerritorySelections((prev) => [...prev, selectionLabel])
            setSelectedZips((prev) => {
              const combined = new Set([...prev, ...data.zips])
              return Array.from(combined).slice(0, 100)
            })
            const geoRes = await fetch(`/api/geocode?q=${encodeURIComponent(input)}`)
            const geo = await geoRes.json()
            if (geo.lat && geo.lng && mapInstance.current) {
              mapInstance.current.setView([geo.lat, geo.lng], 9, { animate: true })
            }
            setZipInput('')
            setZipLoading(false)
            return
          }
        } catch { /* fall through to generic geocode */ }
      }"""
if old in content:
    content = content.replace(old, new, 1)
    changes += 1
    print("6. Track county in handleAddZip text input")

# 7. Track city/location in generic geocode path
old = """      setSelectedZips((prev) => {
        const combined = new Set([...prev, ...nearbyZips])
        return Array.from(combined).slice(0, 100)
      })

      setZipInput('')
      if (mapInstance.current) {
        mapInstance.current.setView([geo.lat, geo.lng], isCounty ? 9 : 10, { animate: true })
      }
    } catch {
      setZipError('Failed to look up location.')
    }
    setZipLoading(false)
  }, [zipInput, selectedZips])"""
new = """      // Track the city/location as a named group
      const selectionLabel = input.trim()
      zipsBySelectionRef.current.set(selectionLabel, Array.from(nearbyZips))
      setTerritorySelections((prev) => [...prev, selectionLabel])

      setSelectedZips((prev) => {
        const combined = new Set([...prev, ...nearbyZips])
        return Array.from(combined).slice(0, 100)
      })

      setZipInput('')
      if (mapInstance.current) {
        mapInstance.current.setView([geo.lat, geo.lng], isCounty ? 9 : 10, { animate: true })
      }
    } catch {
      setZipError('Failed to look up location.')
    }
    setZipLoading(false)
  }, [zipInput, selectedZips])"""
if old in content:
    content = content.replace(old, new)
    changes += 1
    print("7. Track city/location in generic geocode path")

# 8. Track radius
old = """    setSelectedZips(Array.from(uniqueZips).slice(0, 100))
    setRadiusLoading(false)
  }, [])"""
new = """    const radiusLabel = `${miles}mi radius`
    zipsBySelectionRef.current.set(radiusLabel, Array.from(uniqueZips))
    setTerritorySelections([radiusLabel])
    setSelectedZips(Array.from(uniqueZips).slice(0, 100))
    setRadiusLoading(false)
  }, [])"""
if old in content:
    content = content.replace(old, new)
    changes += 1
    print("8. Track radius selection")

# 9. Save zipGroups in territory_meta
old = """          territory_meta: {
            mode: territoryMode,
            selections: territorySelections,
          },"""
new = """          territory_meta: {
            mode: territoryMode,
            selections: territorySelections,
            zipGroups: Object.fromEntries(zipsBySelectionRef.current),
          },"""
if old in content:
    content = content.replace(old, new)
    changes += 1
    print("9. Save zipGroups in territory_meta")

# 10. Track in autocomplete county dropdown
old = """                                    setSelectedZips((prev) => {
                                      const combined = new Set([...prev, ...data.zips])
                                      return Array.from(combined).slice(0, 100)
                                    })
                                    if (mapInstance.current) {
                                      mapInstance.current.setView([s.lat, s.lng], 9, { animate: true })
                                    }
                                    setTerritorySelections((prev) => [...prev, s.label])"""
new = """                                    zipsBySelectionRef.current.set(s.label, data.zips as string[])
                                    setSelectedZips((prev) => {
                                      const combined = new Set([...prev, ...data.zips])
                                      return Array.from(combined).slice(0, 100)
                                    })
                                    if (mapInstance.current) {
                                      mapInstance.current.setView([s.lat, s.lng], 9, { animate: true })
                                    }
                                    setTerritorySelections((prev) => [...prev, s.label])"""
if old in content:
    content = content.replace(old, new)
    changes += 1
    print("10. Track in autocomplete county dropdown")

# 11. Update zip count badge with removable group chips
old = """              {/* Zip count badge + clear */}
              <div className="flex items-center justify-between mb-2">
                {selectedZips.length > 0 ? (
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
                      <MapPin className="w-3.5 h-3.5 text-primary" />
                      <span className="text-sm font-semibold text-primary">
                        {territorySelections.length > 0
                          ? territorySelections.join(', ')
                          : `${selectedZips.length} zip code${selectedZips.length !== 1 ? 's' : ''}`
                        }
                      </span>
                      {territorySelections.length > 0 && (
                        <span className="text-xs text-primary/60">({selectedZips.length} zips)</span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setSelectedZips([])
                        setTerritorySelections([])
                        radiusCenterRef.current = null
                        if (mapInstance.current) {
                          zipLayersRef.current.forEach((l) => {
                            try { mapInstance.current!.removeLayer(l) } catch { /* */ }
                          })
                          zipLayersRef.current = []
                          if (radiusCircleRef.current) {
                            mapInstance.current.removeLayer(radiusCircleRef.current)
                            radiusCircleRef.current = null
                          }
                          mapInstance.current.eachLayer((l) => {
                            if (l instanceof L!.Polygon || l instanceof L!.Circle) {
                              mapInstance.current!.removeLayer(l)
                            }
                          })
                        }
                      }}
                      className="text-xs text-destructive hover:text-destructive/80 font-medium"
                    >
                      Clear all
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">{selectedZips.length}/100 zip codes</span>
                )}
              </div>"""

new = """              {/* Zip count badge + removable group chips + clear all */}
              <div className="flex items-center justify-between mb-2">
                {selectedZips.length > 0 ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    {territorySelections.length > 0 ? (
                      <>
                        {territorySelections.map((label) => {
                          const groupZips = zipsBySelectionRef.current.get(label)
                          const count = groupZips ? groupZips.filter(z => selectedZips.includes(z)).length : 0
                          return (
                            <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
                              <MapPin className="w-3.5 h-3.5 text-primary" />
                              <span className="text-sm font-semibold text-primary">{label}</span>
                              {count > 0 && <span className="text-xs text-primary/60">({count} zips)</span>}
                              <button
                                onClick={() => {
                                  skipFitBoundsRef.current = true
                                  if (mapInstance.current) {
                                    savedViewRef.current = {
                                      center: { lat: mapInstance.current.getCenter().lat, lng: mapInstance.current.getCenter().lng },
                                      zoom: mapInstance.current.getZoom(),
                                    }
                                  }
                                  const removeSet = new Set(groupZips || [])
                                  zipsBySelectionRef.current.delete(label)
                                  setTerritorySelections((prev) => prev.filter((s) => s !== label))
                                  setSelectedZips((prev) => prev.filter((z) => !removeSet.has(z)))
                                }}
                                className="ml-1 text-primary/50 hover:text-destructive transition-colors"
                                title={`Remove ${label}`}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )
                        })}
                        {(() => {
                          const groupedZips = new Set<string>()
                          for (const gzips of zipsBySelectionRef.current.values()) {
                            gzips.forEach(z => groupedZips.add(z))
                          }
                          const ungrouped = selectedZips.filter(z => !groupedZips.has(z))
                          if (ungrouped.length > 0) {
                            return (
                              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
                                <MapPin className="w-3.5 h-3.5 text-primary" />
                                <span className="text-sm font-semibold text-primary">
                                  +{ungrouped.length} individual zip{ungrouped.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                            )
                          }
                          return null
                        })()}
                      </>
                    ) : (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
                        <MapPin className="w-3.5 h-3.5 text-primary" />
                        <span className="text-sm font-semibold text-primary">
                          {selectedZips.length} zip code{selectedZips.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                    <button
                      onClick={() => {
                        setSelectedZips([])
                        setTerritorySelections([])
                        zipsBySelectionRef.current.clear()
                        radiusCenterRef.current = null
                        if (mapInstance.current) {
                          zipLayersRef.current.forEach((l) => {
                            try { mapInstance.current!.removeLayer(l) } catch { /* */ }
                          })
                          zipLayersRef.current = []
                          if (radiusCircleRef.current) {
                            mapInstance.current.removeLayer(radiusCircleRef.current)
                            radiusCircleRef.current = null
                          }
                          mapInstance.current.eachLayer((l) => {
                            if (l instanceof L!.Polygon || l instanceof L!.Circle) {
                              mapInstance.current!.removeLayer(l)
                            }
                          })
                        }
                      }}
                      className="text-xs text-destructive hover:text-destructive/80 font-medium"
                    >
                      Clear all
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">{selectedZips.length}/100 zip codes</span>
                )}
              </div>"""

if old in content:
    content = content.replace(old, new)
    changes += 1
    print("11. Updated badge with removable group chips")

with open(FILE, 'w') as f:
    f.write(content)

print(f"\nDone! Applied {changes}/11 changes.")
print(f"File now has {len(content.splitlines())} lines.")
