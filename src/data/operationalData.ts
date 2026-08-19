export type AgencyCode = 'DGK' | 'DSX' | 'FHN' | 'DDA' | 'AQTA'
export type ClearanceState = 'approved' | 'pending' | 'review'

export type PortCall = {
  id: number
  registrationNo: string
  vessel: string
  callSign: string
  imo: string
  mmsi: string
  flag: string
  type: string
  status: 'Gözləmədə' | 'Yoxlamada' | 'Təsdiqlənib'
  location: string
  locationCode: string
  previousPort: string
  nextPort: string
  eta: string
  etd: string
  crew: number
  passengers: number
  cargoTons: number
  vehicles: number
  declarations: number
  riskScore: number
  clearances: Record<AgencyCode, ClearanceState>
}

export type CargoDocument = {
  id: string
  type: 'Gömrük bəyannaməsi' | 'Yük manifesti' | 'İnvoys' | 'CMR'
  reference: string
  consignor: string
  consignee: string
  origin: string
  destination: string
  hsCode: string
  packages: number
  grossKg: number
  netKg: number
  currency: string
  value: number
  state: 'Doğrulanıb' | 'OCR yoxlaması' | 'Risk analizi'
}

export const agencies: Record<AgencyCode, { short: string; name: string }> = {
  DGK: { short: 'DGK', name: 'Dövlət Gömrük Komitəsi' },
  DSX: { short: 'DSX', name: 'Dövlət Sərhəd Xidməti' },
  FHN: { short: 'FHN', name: 'Fövqəladə Hallar Nazirliyi' },
  DDA: { short: 'DDA', name: 'Dövlət Dəniz Agentliyi' },
  AQTA: { short: 'AQTA', name: 'Qida Təhlükəsizliyi Agentliyi' },
}

export const portCalls: PortCall[] = [
  { id: 6056, registrationNo: '413005260700048', vessel: 'SHAHDAG RORO', callSign: '4JOL', imo: '9368462', mmsi: '423001137', flag: 'Azərbaycan', type: 'Ro-Ro', status: 'Gözləmədə', location: 'Bakı Beynəlxalq Dəniz Ticarət Limanı', locationCode: 'AZBAK', previousPort: 'Kurık', nextPort: 'Türkmənbaşı', eta: '10.07.2026 12:10', etd: '10.07.2026 17:40', crew: 25, passengers: 0, cargoTons: 1187.38, vehicles: 40, declarations: 36, riskScore: 18, clearances: { DGK: 'approved', DSX: 'approved', FHN: 'pending', DDA: 'approved', AQTA: 'review' } },
  { id: 6055, registrationNo: '413005260700044', vessel: 'TURKMENISTAN', callSign: 'EZAT', imo: '8891924', mmsi: '434111000', flag: 'Azərbaycan', type: 'Yük', status: 'Yoxlamada', location: 'Bakı Beynəlxalq Dəniz Ticarət Limanı', locationCode: 'AZBAK', previousPort: 'Bakı', nextPort: 'Türkmənbaşı', eta: '10.07.2026 02:29', etd: '10.07.2026 18:20', crew: 16, passengers: 0, cargoTons: 842.5, vehicles: 28, declarations: 24, riskScore: 32, clearances: { DGK: 'review', DSX: 'approved', FHN: 'approved', DDA: 'approved', AQTA: 'pending' } },
  { id: 6053, registrationNo: '413005260700050', vessel: 'PETROTRANS 5905', callSign: 'UBRU7', imo: '9644714', mmsi: '273357210', flag: 'Rusiya', type: 'Tanker', status: 'Gözləmədə', location: 'Bakı Beynəlxalq Dəniz Ticarət Limanı', locationCode: 'AZBAK', previousPort: 'Aktau', nextPort: 'Mahaçqala', eta: '10.07.2026 02:24', etd: '13.07.2026 02:24', crew: 21, passengers: 0, cargoTons: 4210, vehicles: 0, declarations: 8, riskScore: 46, clearances: { DGK: 'pending', DSX: 'approved', FHN: 'review', DDA: 'approved', AQTA: 'approved' } },
  { id: 6052, registrationNo: '413005260700025', vessel: 'HUSEYN JAVID', callSign: '4JRJ', imo: '9361799', mmsi: '423098100', flag: 'Azərbaycan', type: 'Quru yük', status: 'Təsdiqlənib', location: 'Bakı Beynəlxalq Dəniz Ticarət Limanı', locationCode: 'AZBAK', previousPort: 'Türkmənbaşı', nextPort: 'Kurık', eta: '10.07.2026 17:00', etd: '11.07.2026 06:30', crew: 19, passengers: 0, cargoTons: 725.2, vehicles: 18, declarations: 18, riskScore: 9, clearances: { DGK: 'approved', DSX: 'approved', FHN: 'approved', DDA: 'approved', AQTA: 'approved' } },
  { id: 6051, registrationNo: '413005260700031', vessel: 'MINGACHEVIR', callSign: '4JNN', imo: '9361804', mmsi: '423098200', flag: 'Azərbaycan', type: 'Ro-Ro', status: 'Gözləmədə', location: 'Bakı Beynəlxalq Dəniz Ticarət Limanı', locationCode: 'AZBAK', previousPort: 'Aktau', nextPort: 'Kurık', eta: '10.07.2026 19:00', etd: '11.07.2026 08:00', crew: 22, passengers: 4, cargoTons: 968.4, vehicles: 34, declarations: 29, riskScore: 22, clearances: { DGK: 'approved', DSX: 'approved', FHN: 'approved', DDA: 'pending', AQTA: 'review' } },
  { id: 6037, registrationNo: '413005260700019', vessel: 'SUMBAR', callSign: 'EZCV', imo: '8728414', mmsi: '434009000', flag: 'Türkmənistan', type: 'Bərə', status: 'Yoxlamada', location: 'Səngəçal Dəniz Limanı', locationCode: 'AZSNG', previousPort: 'Türkmənbaşı', nextPort: 'Bakı', eta: '10.07.2026 22:00', etd: '11.07.2026 13:20', crew: 18, passengers: 12, cargoTons: 630, vehicles: 22, declarations: 17, riskScore: 39, clearances: { DGK: 'review', DSX: 'approved', FHN: 'pending', DDA: 'approved', AQTA: 'review' } },
  { id: 6032, registrationNo: '413005260700012', vessel: 'SUNKAR', callSign: 'UNIO', imo: '9106932', mmsi: '436000415', flag: 'Qazaxıstan', type: 'Yük', status: 'Təsdiqlənib', location: 'Bakı Beynəlxalq Dəniz Ticarət Limanı', locationCode: 'AZBAK', previousPort: 'Kurık', nextPort: 'Aktau', eta: '10.07.2026 22:00', etd: '11.07.2026 15:00', crew: 20, passengers: 0, cargoTons: 1105, vehicles: 31, declarations: 31, riskScore: 12, clearances: { DGK: 'approved', DSX: 'approved', FHN: 'approved', DDA: 'approved', AQTA: 'approved' } },
]

export const cargoDocuments: CargoDocument[] = [
  { id: 'DOC-260710-01', type: 'Gömrük bəyannaməsi', reference: '01263001286453', consignor: 'Anker Innovations Limited', consignee: 'Regional Distribution MMC', origin: 'Çin', destination: 'Azərbaycan', hsCode: '8507.60.00.09', packages: 376, grossKg: 21573, netKg: 19198.56, currency: 'AZN', value: 524543.34, state: 'Doğrulanıb' },
  { id: 'DOC-260710-02', type: 'Yük manifesti', reference: '245263–245346', consignor: '40 göndərici', consignee: 'Mərkəzi Asiya alıcıları', origin: 'Ələt', destination: 'Kurık', hsCode: 'MULTI', packages: 1187, grossKg: 1187378, netKg: 984320, currency: 'USD', value: 1854000, state: 'OCR yoxlaması' },
  { id: 'DOC-260710-03', type: 'İnvoys', reference: '139/1', consignor: 'EURO Plywood LLP', consignee: 'IBG LTD', origin: 'Qazaxıstan', destination: 'Ukrayna', hsCode: '4412.33', packages: 33, grossKg: 19833, netKg: 18777, currency: 'EUR', value: 16462.05, state: 'Doğrulanıb' },
  { id: 'DOC-260710-04', type: 'CMR', reference: 'DA 1401307', consignor: 'Annageldiyev Charyyar', consignee: 'OBA MARKET MMC', origin: 'Türkmənistan', destination: 'Azərbaycan', hsCode: '2202.10', packages: 4448, grossKg: 21689.6, netKg: 21209.5, currency: 'USD', value: 9373.44, state: 'Risk analizi' },
]

export const dataSources = [
  { name: 'Open-Meteo', description: 'Ələt üzrə hava və külək', kind: 'API' },
  { name: 'ExchangeRate API', description: 'USD əsaslı valyuta məzənnələri', kind: 'API' },
  { name: 'UN/LOCODE 2025-1', description: 'Liman və məkan kodları', kind: 'Açıq data' },
  { name: 'MSW sxemi', description: 'Şəkillərdən normallaşdırılmış əməliyyat modeli', kind: 'Demo model' },
]
