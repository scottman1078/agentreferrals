import { Candidate } from '@/types'

export const candidatesByZone: Record<string, Candidate[]> = {
  'void-houston': [
    { id: 'c1', name: 'Diego Ramirez', brokerage: 'Compass Houston', area: 'Houston Heights / Montrose', tags: ['Investment', 'First-Time Buyers'], dealsPerYear: 52, yearsLicensed: 9, avgSalePrice: 385000, phone: '(713) 555-0123', email: 'dramirez@compass.com', color: '#f97316' },
    { id: 'c2', name: 'Keisha Brown', brokerage: 'HAR Luxury', area: 'Sugar Land / Missouri City', tags: ['Luxury', 'Relocation'], dealsPerYear: 38, yearsLicensed: 11, avgSalePrice: 520000, phone: '(281) 555-0234', email: 'kbrown@harluxury.com', color: '#a855f7' },
    { id: 'c3', name: 'Thanh Nguyen', brokerage: 'Keller Williams Memorial', area: 'Katy / Cinco Ranch', tags: ['New Construction', 'First-Time Buyers'], dealsPerYear: 45, yearsLicensed: 6, avgSalePrice: 340000, phone: '(832) 555-0345', email: 'tnguyen@kwmemorial.com', color: '#14b8a6' },
    { id: 'c4', name: 'Marcus Johnson', brokerage: 'RE/MAX Clear Lake', area: 'Clear Lake / League City', tags: ['Homes for Heroes', 'Investment'], dealsPerYear: 33, yearsLicensed: 8, avgSalePrice: 295000, phone: '(281) 555-0456', email: 'mjohnson@remaxcl.com', color: '#3b82f6' },
  ],
  'void-austin': [
    { id: 'c5', name: 'Emily Watson', brokerage: 'Compass Austin', area: 'Downtown / South Congress', tags: ['Luxury', 'Investment'], dealsPerYear: 61, yearsLicensed: 10, avgSalePrice: 680000, phone: '(512) 555-0567', email: 'ewatson@compass.com', color: '#f0a500' },
    { id: 'c6', name: 'Jake Morrison', brokerage: 'Keller Williams Lake Travis', area: 'Lake Travis / Lakeway', tags: ['Luxury', 'Land & Acreage'], dealsPerYear: 42, yearsLicensed: 12, avgSalePrice: 820000, phone: '(512) 555-0678', email: 'jmorrison@kwlt.com', color: '#d97706' },
    { id: 'c7', name: 'Ana Sofia Reyes', brokerage: 'Realty Austin', area: 'Round Rock / Cedar Park', tags: ['First-Time Buyers', 'New Construction'], dealsPerYear: 55, yearsLicensed: 7, avgSalePrice: 410000, phone: '(512) 555-0789', email: 'areyes@realtyaustin.com', color: '#22c55e' },
  ],
  'void-tampa': [
    { id: 'c8', name: 'Mike Patterson', brokerage: 'Smith & Associates', area: 'South Tampa / Hyde Park', tags: ['Luxury', 'Investment'], dealsPerYear: 48, yearsLicensed: 14, avgSalePrice: 590000, phone: '(813) 555-0890', email: 'mpatterson@smithandassociates.com', color: '#f0a500' },
    { id: 'c9', name: 'Lisa Chen', brokerage: 'Keller Williams St. Pete', area: 'St. Petersburg / Gulfport', tags: ['Relocation', 'First-Time Buyers'], dealsPerYear: 36, yearsLicensed: 8, avgSalePrice: 420000, phone: '(727) 555-0901', email: 'lchen@kwstpete.com', color: '#f97316' },
    { id: 'c10', name: 'Jordan Davis', brokerage: 'Coastal Properties Group', area: 'Clearwater / Dunedin', tags: ['Investment', 'Relocation'], dealsPerYear: 29, yearsLicensed: 5, avgSalePrice: 365000, phone: '(727) 555-0012', email: 'jdavis@coastalproperties.com', color: '#a855f7' },
  ],
  'void-raleigh': [
    { id: 'c11', name: 'Sarah Mitchell', brokerage: 'Compass Raleigh', area: 'Downtown Raleigh / North Hills', tags: ['Relocation', 'Luxury'], dealsPerYear: 57, yearsLicensed: 11, avgSalePrice: 510000, phone: '(919) 555-0123', email: 'smitchell@compass.com', color: '#e879f9' },
    { id: 'c12', name: 'David Park', brokerage: 'Keller Williams Durham', area: 'Durham / Research Triangle', tags: ['First-Time Buyers', 'New Construction'], dealsPerYear: 43, yearsLicensed: 7, avgSalePrice: 380000, phone: '(919) 555-0234', email: 'dpark@kwdurham.com', color: '#14b8a6' },
  ],
  'void-kansascity': [
    { id: 'c13', name: 'Amanda Graves', brokerage: 'ReeceNichols Real Estate', area: 'Overland Park / Leawood', tags: ['Luxury', 'Relocation'], dealsPerYear: 39, yearsLicensed: 9, avgSalePrice: 450000, phone: '(913) 555-0345', email: 'agraves@reecenichols.com', color: '#f472b6' },
    { id: 'c14', name: 'Terrence Williams', brokerage: 'Compass KC', area: 'Brookside / Waldo', tags: ['First-Time Buyers', 'Investment'], dealsPerYear: 31, yearsLicensed: 6, avgSalePrice: 320000, phone: '(816) 555-0456', email: 'twilliams@compass.com', color: '#3b82f6' },
  ],
  'void-saltlake': [
    { id: 'c15', name: 'Tyler Jensen', brokerage: 'Windermere Utah', area: 'Salt Lake City / Cottonwood', tags: ['Relocation', 'New Construction'], dealsPerYear: 46, yearsLicensed: 10, avgSalePrice: 520000, phone: '(801) 555-0567', email: 'tjensen@windermere.com', color: '#06b6d4' },
    { id: 'c16', name: 'Mia Torres', brokerage: 'Engel & Völkers Park City', area: 'Park City / Heber Valley', tags: ['Luxury', 'Land & Acreage'], dealsPerYear: 28, yearsLicensed: 8, avgSalePrice: 1200000, phone: '(435) 555-0678', email: 'mtorres@evrealestate.com', color: '#d97706' },
  ],
}
