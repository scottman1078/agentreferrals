import { CoverageGap, VoidZone } from '@/types'

export const coverageGaps: CoverageGap[] = [
  { id: 'gap1', area: 'Houston Metro, TX', priority: 'High', migration: 'High Inflow', checked: false },
  { id: 'gap2', area: 'Austin / Travis County, TX', priority: 'High', migration: 'High Inflow', checked: false },
  { id: 'gap3', area: 'Tampa / St. Pete, FL', priority: 'High', migration: 'High Inflow', checked: false },
  { id: 'gap4', area: 'Raleigh / Durham, NC', priority: 'High', migration: 'High Inflow', checked: false },
  { id: 'gap5', area: 'Salt Lake City, UT', priority: 'High', migration: 'High Inflow', checked: false },
  { id: 'gap6', area: 'San Diego, CA', priority: 'Medium', migration: null, checked: false },
  { id: 'gap7', area: 'Kansas City, MO/KS', priority: 'Medium', migration: null, checked: false },
  { id: 'gap8', area: 'Columbus / Cleveland, OH', priority: 'Medium', migration: null, checked: false },
  { id: 'gap9', area: 'St. Louis, MO', priority: 'Medium', migration: null, checked: false },
  { id: 'gap10', area: 'Baltimore, MD', priority: 'Medium', migration: null, checked: false },
  { id: 'gap11', area: 'Confirm Priscilla Hunt — NYC', priority: 'Low', migration: null, checked: false },
  { id: 'gap12', area: 'Confirm Rick Santos — Miami', priority: 'Low', migration: null, checked: false },
  { id: 'gap13', area: 'Confirm Anthony Moore — DC', priority: 'Low', migration: null, checked: false },
  { id: 'gap14', area: 'Confirm Laura Chen — SF Bay Area', priority: 'Low', migration: null, checked: false },
]

export const voidZones: VoidZone[] = [
  { id: 'void-houston', label: 'Houston Metro, TX', polygon: [[30.50, -96.20], [30.50, -94.50], [28.80, -94.50], [28.80, -96.20]] },
  { id: 'void-austin', label: 'Austin / Travis County, TX', polygon: [[30.80, -98.50], [30.80, -97.20], [29.60, -97.20], [29.60, -98.50]] },
  { id: 'void-tampa', label: 'Tampa / St. Pete, FL', polygon: [[28.70, -83.00], [28.70, -81.80], [27.50, -81.80], [27.50, -83.00]] },
  { id: 'void-raleigh', label: 'Raleigh / Durham, NC', polygon: [[36.50, -79.20], [36.50, -77.80], [35.40, -77.80], [35.40, -79.20]] },
  { id: 'void-kansascity', label: 'Kansas City, MO/KS', polygon: [[39.50, -95.20], [39.50, -94.00], [38.50, -94.00], [38.50, -95.20]] },
  { id: 'void-saltlake', label: 'Salt Lake City, UT', polygon: [[41.20, -112.20], [41.20, -111.40], [40.40, -111.40], [40.40, -112.20]] },
]
