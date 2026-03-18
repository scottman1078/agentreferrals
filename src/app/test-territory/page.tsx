'use client'

import { useState } from 'react'
import TerritorySelector, { type TerritoryData } from '@/components/onboarding/territory-selector'

export default function TestTerritoryPage() {
  const [territory, setTerritory] = useState<TerritoryData>({
    mode: 'zip',
    selectedCounties: [],
    selectedZips: [],
    drawnPolygon: [],
    polygon: [],
  })

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-bold mb-2">Territory Selector Test</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Test all three modes. No auth required. Data shown below in real time.
        </p>
        <TerritorySelector
          value={territory}
          onChange={setTerritory}
          initialCenter="Kalamazoo, MI"
        />
        <details className="mt-6">
          <summary className="text-sm font-semibold cursor-pointer text-muted-foreground">
            Debug Data
          </summary>
          <pre className="mt-2 p-4 bg-muted rounded text-xs overflow-auto max-h-[300px]">
            {JSON.stringify({
              mode: territory.mode,
              zips: territory.selectedZips,
              counties: territory.selectedCounties,
              drawnShapes: territory.drawnPolygon.length,
              polygonRings: territory.polygon.length,
            }, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  )
}
