import { useMemo, useState, useEffect, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Anchor, ArrowRight, Check, CheckCircle2, ChevronDown, ClipboardCheck, Dog, Download, FileBadge, FileCheck2, FileText, PackagePlus, Plus, Receipt, RotateCcw, Scan, ScanSearch, Search, ShieldCheck, Ship, Truck, X, type LucideIcon } from 'lucide-react'
import confetti from 'canvas-confetti'
import { toast } from 'sonner'
import { useSearchParams } from 'react-router-dom'
import { useAppStore, type SavedRegistration } from '../store/useAppStore'
import { Button, Card, Modal, PageHeader, StatusBadge } from '../components/UI'
import { DeclarationDocumentView } from '../components/DeclarationDocumentView'
import VehicleDeckSelector from '../components/VehicleDeckSelector'
import ShipDetailModal from '../components/ShipDetailModal'
import { alatKurikManifestSeed, cargoDeclarationSeed } from '../data/documentSeeds'
import { declarationSortKey } from '../data/mockData'

const emptyManualForm = {
  beyannameId: '',
  alici: '',
  satici: '',
  malAdi: '',
  umumiDeyer: '',
  teyinatGomrukOrqani: '',
  yerSayi: '',
  netto: '',
  brutto: '',
}

/** Qalma müddəti — Vergi Məcəlləsi 211.1.1.3 cədvəli */
type StayPeriod = '1_gun' | '2_hefte' | '1_ay' | '3_ay' | '1_il' | '1_il_ustu'
type AxleClass = 'upto4' | 'over4'

const STAY_PERIOD_OPTIONS: Array<{ id: StayPeriod; label: string }> = [
  { id: '1_gun', label: '1 gün üçün' },
  { id: '2_hefte', label: '2 həftəyədək' },
  { id: '1_ay', label: '1 aya qədər' },
  { id: '3_ay', label: '3 aya qədər' },
  { id: '1_il', label: '1 ilə qədər' },
  { id: '1_il_ustu', label: '1 ildən yuxarı' },
]

/** 211.1.1.3 — yük avtomobilləri / qoşqulu və yarımqoşqulu (ABŞ dolları) */
const ROAD_TAX_TABLE: Record<StayPeriod, { upto4: number; over4: number; extraDayUpto4?: number; extraDayOver4?: number }> = {
  '1_gun': { upto4: 20, over4: 30 },
  '2_hefte': { upto4: 40, over4: 80 },
  '1_ay': { upto4: 140, over4: 280 },
  '3_ay': { upto4: 400, over4: 800 },
  '1_il': { upto4: 1400, over4: 2800 },
  '1_il_ustu': { upto4: 1400, over4: 2800, extraDayUpto4: 15, extraDayOver4: 30 },
}

function calcRoadTax(period: StayPeriod, axles: AxleClass, extraDays = 0) {
  const row = ROAD_TAX_TABLE[period]
  const base = axles === 'upto4' ? row.upto4 : row.over4
  if (period !== '1_il_ustu') {
    return { base, extra: 0, total: base, currency: 'USD' as const }
  }
  const dayRate = axles === 'upto4' ? (row.extraDayUpto4 ?? 15) : (row.extraDayOver4 ?? 30)
  const days = Math.max(0, Math.floor(extraDays))
  const extra = days * dayRate
  return { base, extra, total: base + extra, currency: 'USD' as const, dayRate, days }
}

const initialTransportDetails = {
  kecmeMeqsedi: 'Ölkəyə giriş',
  avtomobilNovu: 'Yük avtomobili',
  dovletNisani: '',
  avtomobilMarkasi: '',
  qeydiyyatNomresi: '',
  qeydiyyatTarixi: '',
  olkedeQalmaMuddeti: '1_ay' as StayPeriod,
  oxSinifi: 'upto4' as AxleClass,
  artiqGunSayi: '0',
  hereketMarsrutu: '',
  xususilik: 'Yüklü',
  teyinatGomrukOrqani: 'Bakı Baş Gömrük İdarəsi',
}

const normalizeManifestIdentifier = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '')

function formatShipDate(value?: string) {
  if (!value) return ''
  // 2026-06-25T14:30 or 2026-06-25 14:30
  const m = value.match(/(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})/)
  if (m) return `${m[3]}.${m[2]}.${m[1]} · ${m[4]}:${m[5]}`
  const d = value.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (d) return `${d[3]}.${d[2]}.${d[1]}`
  return value
}

function inferVehicleType(cargo: string, marka?: string) {
  const text = `${cargo} ${marka ?? ''}`.toLowerCase()
  if (text.includes('bus') || text.includes('avtobus')) return 'Avtobus'
  if (text.includes('car') || text.includes('range rover') || text.includes('minik')) return 'Minik avtomobili'
  return 'Yük avtomobili'
}

function inferCustomsOffice(destination?: string) {
  const d = (destination ?? '').toLocaleLowerCase('az')
  if (d.includes('gəncə') || d.includes('gence')) return 'Gəncə Gömrük İdarəsi'
  if (d.includes('sumqayıt') || d.includes('sumqayit')) return 'Sumqayıt Gömrük İdarəsi'
  if (d.includes('tbilisi')) return 'Bakı Baş Gömrük İdarəsi · tranzit'
  return 'Bakı Baş Gömrük İdarəsi'
}

type RiskVerdict = 'green' | 'red'
type ManualRoute = 'Fiziki yoxlama' | 'X ray' | 'Kinoloji itin tətbiqi'
type FlowPhase = 'registration' | 'taxes' | 'permits' | 'review' | 'done'

const MANUAL_ROUTES: Array<{ id: ManualRoute; icon: LucideIcon; hint: string }> = [
  { id: 'Fiziki yoxlama', icon: Search, hint: 'Yükün fiziki yoxlanılması' },
  { id: 'X ray', icon: Scan, hint: 'Skaner / rentgen nəzarəti' },
  { id: 'Kinoloji itin tətbiqi', icon: Dog, hint: 'İt ilə axtarış / kinoloji nəzarət' },
]

/** Nəqliyyat sənədləri — dropdown seçimi */
const TRANSPORT_PERMIT_OPTIONS = [
  { id: 'icaze-blanki', label: 'İcazə Blankı' },
  { id: 'bnf-jurnali', label: 'BNF jurnalı' },
  { id: 'tir-carnet', label: 'TİR Carnet' },
] as const

type TransportPermitId = (typeof TRANSPORT_PERMIT_OPTIONS)[number]['id']

/** Açıq qırmızı siqnallar — yalnız bunlar risk verir */
const RISK_KEYWORDS = [
  'chemical', 'kimyəvi', 'emuls', 'medicament', 'medicaments', 'dərman',
  'veterinary', 'baytar', 'tobacco', 'tütün', 'fuel filter', 'yanacaq filtr',
  'мясн', 'myasn', 'ət məhsul', 'myasnaya', 'akkumulyator', 'solarbank',
  'battery', 'hazard', 'control room', 'boat ',
]

/** Açıq yaşıl siqnallar — etibarlı mal qrupları */
const SAFE_KEYWORDS = [
  'tyre', 'şin', 'spare part', 'ehtiyat', 'advertis', 'reklam', 'yogurt', 'qatıq',
  'salmon', 'qızılbalıq', 'ibc', 'sanitar', 'deterjan', 'sampuan', 'deodorant',
  'cart', 'extruder', 'piping', 'electrode', 'plywood',
]

function assessGoodsRisk(declaration: {
  status?: string
  mallar: Array<{ ad: string; hsKod?: string; xifMnKodu?: string; menşe?: string }>
  umumiDeyer?: number
} | undefined): { verdict: RiskVerdict; reasons: string[] } {
  if (!declaration) return { verdict: 'green', reasons: ['Bəyannamə seçilməyib'] }

  const reasons: string[] = []
  const text = declaration.mallar.map(m => `${m.ad} ${m.hsKod ?? ''} ${m.xifMnKodu ?? ''} ${m.menşe ?? ''}`).join(' ').toLowerCase()
  const hsDigits = (declaration.mallar[0]?.xifMnKodu ?? declaration.mallar[0]?.hsKod ?? '').replace(/\D/g, '')

  // 1) Status
  if (declaration.status === 'Risk nəzarəti') {
    reasons.push('Bəyannamə statusu: Risk nəzarəti')
  }

  // 2) Açıq riskli mal adları
  for (const kw of RISK_KEYWORDS) {
    if (text.includes(kw)) {
      reasons.push(`Riskli mal əlaməti: “${kw}”`)
      break
    }
  }

  // 3) Yalnız həssas HS fəsilləri (dərman 30, partlayıcı 36, tütün 24)
  if (/^(24|30|36)/.test(hsDigits)) {
    reasons.push(`HS/XİF kateqoriyası əlavə nəzarət tələb edir (${declaration.mallar[0]?.hsKod ?? hsDigits})`)
  }

  // 4) Təhlükəsiz mal — risk səbəbi yoxdursa yaşıl
  const isSafeCargo = SAFE_KEYWORDS.some(kw => text.includes(kw))
  if (reasons.length === 0) {
    if (isSafeCargo) reasons.push('Etibarlı mal qrupu — avtomatik yaşıl kanal')
    else reasons.push('Mallar avtomatik risk filtrlərindən keçdi')
    return { verdict: 'green', reasons }
  }

  return { verdict: 'red', reasons }
}

export default function Registration() {
  const [searchParams] = useSearchParams()
  const { ships, vehicles, declarations, addShip, addDeclaration, addPostDecision, addRegistration, registrations, profile } = useAppStore()

  const [shipId, setShipId] = useState('IMO9345678')
  const [plate, setPlate] = useState('15 AA 859')
  const [vehicleFound, setVehicleFound] = useState(false)
  const [declaration, setDeclaration] = useState('')
  const [done, setDone] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [manualForm, setManualForm] = useState(emptyManualForm)
  const [transportDetails, setTransportDetails] = useState(initialTransportDetails)
  const [transportOpen, setTransportOpen] = useState(true)
  const [riskVerdict, setRiskVerdict] = useState<RiskVerdict | null>(null)
  const [riskReasons, setRiskReasons] = useState<string[]>([])
  const [riskChecking, setRiskChecking] = useState(false)
  const [manualRoute, setManualRoute] = useState<ManualRoute | null>(null)
  const [completionMode, setCompletionMode] = useState<'tesdiq' | ManualRoute | null>(null)
  const [flowPhase, setFlowPhase] = useState<FlowPhase>('registration')
  const [transportPermit, setTransportPermit] = useState<TransportPermitId | ''>('')
  const [lastSaved, setLastSaved] = useState<SavedRegistration | null>(null)
  const [taxConfirmed, setTaxConfirmed] = useState(false)
  const [shipModalOpen, setShipModalOpen] = useState(false)

  // Parse URL query parameters
  const urlShipId = searchParams.get('shipId')
  const urlShipName = searchParams.get('shipName')
  const urlPlate = searchParams.get('plate')

  // Handle ship query param (including dynamic addition of new ships from Operations details)
  useEffect(() => {
    if (urlShipId) {
      const exists = ships.some(g => g.id === urlShipId)
      if (!exists && urlShipName) {
        addShip({
          id: urlShipId,
          ad: decodeURIComponent(urlShipName),
          novu: 'Ro-Ro gəmisi',
          bayraq: 'Azərbaycan',
          yuk: 'Avtomobillər',
          tonaj: 11800,
          status: 'Lövbərdə',
          istiqamet: 'Gələn',
          kanal: 'Kanal 1',
          girisTarixi: new Date().toISOString().slice(0, 16).replace('T', ' '),
          cixisTarixi: '',
          menshe: 'Kurık, Qazaxıstan',
          teyinat: 'Ələt Limanı, Bakı',
          lat: 39.48,
          lng: 49.40,
          suret: 0.5
        })
      }
      setShipId(urlShipId)
    }
  }, [urlShipId, urlShipName, ships, addShip])

  // Handle plate query param
  useEffect(() => {
    if (urlPlate) {
      setPlate(urlPlate)
      const found = vehicles.find(v => v.nomre === urlPlate || v.kod === urlPlate)
      if (found) {
        setVehicleFound(true)
      }
    }
  }, [urlPlate, vehicles])

  const ship = ships.find(g => g.id === shipId) || ships[0]

  // Filter vehicles belonging to the selected ship (Limandakı gəmi filtri)
  const shipVehicles = useMemo(() => {
    const matched = vehicles.filter(v => v.gemi === ship.id || v.gemi === ship.ad)
    if (matched.length > 0) return matched

    // Deterministic per-ship vehicle subset if ship has no direct assignments
    const shipIdx = Math.max(0, ships.findIndex(s => s.id === ship.id))
    const offset = (shipIdx * 5) % Math.max(1, vehicles.length - 10)
    const rotated = [...vehicles.slice(offset), ...vehicles.slice(0, offset)]
    return rotated.slice(0, 18).map(v => ({
      ...v,
      gemi: ship.id,
      menshe: ship.menshe.split(',')[0],
      teyinat: ship.teyinat ? ship.teyinat.split(',')[0] : 'Ələt Limanı',
    }))
  }, [vehicles, ship.id, ship.ad, ships])

  // Sync selected plate when ship changes
  useEffect(() => {
    if (shipVehicles.length > 0) {
      const first = shipVehicles[0]
      setPlate(first.nomre)
      setVehicleFound(true)
    } else {
      setPlate('')
      setVehicleFound(false)
    }
  }, [shipId, shipVehicles])

  const normalizedManifestQuery = normalizeManifestIdentifier(plate)
  const vehicle = shipVehicles.find(v =>
    normalizeManifestIdentifier(v.nomre) === normalizedManifestQuery ||
    normalizeManifestIdentifier(v.kod) === normalizedManifestQuery
  ) ?? vehicles.find(v =>
    normalizeManifestIdentifier(v.nomre) === normalizedManifestQuery ||
    normalizeManifestIdentifier(v.kod) === normalizedManifestQuery
  )
  const manifestEntry = useMemo(() => {
    const query = normalizeManifestIdentifier(plate)
    const digits = query.replace(/\D/g, '')
    return alatKurikManifestSeed.find(entry =>
      [entry.billOfLading, entry.vehicleOrder]
        .filter((identifier): identifier is string => Boolean(identifier))
        .some(identifier => normalizeManifestIdentifier(identifier) === query) ||
      entry.vehicleIds.some(identifier => {
        const vehicleId = normalizeManifestIdentifier(identifier)
        return vehicleId === query || (query.length >= 5 && query.endsWith(vehicleId))
      }) ||
      (digits.length >= 4 && [entry.billOfLading, entry.vehicleOrder]
        .filter((identifier): identifier is string => Boolean(identifier))
        .some(identifier => identifier.includes(digits)))
    )
  }, [plate])
  const matchedManifestVehicleId = useMemo(() => {
    if (!manifestEntry) return ''
    const query = normalizeManifestIdentifier(plate)
    return manifestEntry.vehicleIds.find(id => {
      const vehicleId = normalizeManifestIdentifier(id)
      return vehicleId === query || (query.length >= 5 && query.endsWith(vehicleId))
    }) ?? manifestEntry.vehicleIds[0] ?? ''
  }, [manifestEntry, plate])

  const manifestItemLabel = vehicle?.nomre ?? (matchedManifestVehicleId || (manifestEntry ? `B/L ${manifestEntry.billOfLading}` : ''))
  const manifestReference = vehicle?.billOfLading ?? manifestEntry?.billOfLading ?? vehicle?.kod ?? ''
  const plateKey = vehicle?.nomre || matchedManifestVehicleId || plate

  // Nəqliyyat formunu manifest / avtomobil qeydindən doldur
  useEffect(() => {
    if (!vehicleFound || (!vehicle && !manifestEntry)) return

    const cargo = vehicle?.yuk ?? manifestEntry?.cargo ?? ''
    const destination = vehicle?.teyinat ?? 'Kurık'
    const route = vehicle
      ? `${vehicle.menshe} → ${vehicle.teyinat}`
      : cargoDeclarationSeed.route
    const plateNumber = vehicle?.nomre
      || matchedManifestVehicleId
      || plate
    const registrationNo = vehicle?.kod
      || (manifestEntry?.vehicleOrder ? `VO-${manifestEntry.vehicleOrder}` : '')
      || (manifestEntry ? `BL-${manifestEntry.billOfLading}` : plate)
    const entryDate = formatShipDate(ship.girisTarixi)
      || formatShipDate(cargoDeclarationSeed.date)
      || initialTransportDetails.qeydiyyatTarixi
    const hasCargo = Boolean(cargo) || (manifestEntry?.grossTons ?? 0) > 0

    setTransportDetails({
      kecmeMeqsedi: destination.toLocaleLowerCase('az').includes('bakı') || destination.toLocaleLowerCase('az').includes('baki') || destination.toLocaleLowerCase('az').includes('gəncə')
        ? 'Ölkəyə giriş'
        : cargoDeclarationSeed.route.includes('Kurık')
          ? 'Ölkədən çıxış'
          : 'Tranzit',
      avtomobilNovu: inferVehicleType(cargo, vehicle?.marka),
      dovletNisani: plateNumber.toUpperCase(),
      avtomobilMarkasi: vehicle?.marka || (inferVehicleType(cargo) === 'Minik avtomobili' ? 'Range Rover' : 'MAN TGX / Ro-Ro trailer'),
      qeydiyyatNomresi: registrationNo,
      qeydiyyatTarixi: entryDate,
      // Default qalma müddəti / ox — istifadəçi manual dəyişə bilər
      olkedeQalmaMuddeti: hasCargo && (manifestEntry?.grossTons ?? 0) > 30 ? '3_ay' : '1_ay',
      oxSinifi: inferVehicleType(cargo, vehicle?.marka) === 'Minik avtomobili' ? 'upto4' : 'over4',
      artiqGunSayi: '0',
      hereketMarsrutu: route,
      xususilik: hasCargo ? 'Yüklü' : 'Boş',
      teyinatGomrukOrqani: inferCustomsOffice(vehicle?.teyinat ?? destination),
    })
  }, [vehicleFound, vehicle, manifestEntry, matchedManifestVehicleId, plate, ship.girisTarixi, ship.id])

  const activeDeclarations = useMemo(() => {
    if (!vehicleFound) return [] as typeof declarations

    const matchTokens = [
      plateKey,
      plate,
      vehicle?.nomre,
      vehicle?.kod,
      vehicle?.billOfLading,
      vehicle?.vehicleOrder,
      manifestEntry?.billOfLading,
      manifestEntry?.vehicleOrder,
      ...(manifestEntry?.vehicleIds ?? []),
    ]
      .filter((value): value is string => Boolean(value))
      .map(normalizeManifestIdentifier)

    const related = declarations.filter(b => {
      const keys = [b.avtomobil, b.billOfLading, b.vehicleOrder]
        .filter((value): value is string => Boolean(value))
        .map(normalizeManifestIdentifier)
      return keys.some(key => matchTokens.includes(key)) ||
        (manifestEntry?.vehicleIds ?? []).some(id => keys.includes(normalizeManifestIdentifier(id)))
    })

    const open = related.filter(b =>
      b.status !== 'Təsdiqlənib' &&
      b.status !== 'Arxivləşdirilib' &&
      !b.status.toLowerCase().includes('arxiv')
    )

    const latest = [...open].sort((a, b) => declarationSortKey(b).localeCompare(declarationSortKey(a)))[0]
    if (!latest) return declaration ? related.filter(b => b.kod === declaration) : []
    if (declaration && declaration !== latest.kod) {
      const selected = related.find(b => b.kod === declaration)
      return selected ? [latest, selected].filter((b, i, arr) => arr.findIndex(x => x.kod === b.kod) === i) : [latest]
    }
    return [latest]
  }, [vehicleFound, vehicle, plateKey, plate, declaration, declarations, manifestEntry])
  const selectedDeclaration = declarations.find(b => b.kod === declaration)

  const autoDeclarationKod = activeDeclarations[0]?.kod ?? ''

  // Bəyannamə avtomatik seçilir (manual seçim yoxdur)
  useEffect(() => {
    if (!vehicleFound) {
      setDeclaration('')
      clearRiskState()
      return
    }
    if (autoDeclarationKod && declaration !== autoDeclarationKod) {
      setDeclaration(autoDeclarationKod)
      setManualRoute(null)
      setRiskVerdict(null)
      setRiskReasons([])
    }
    if (!autoDeclarationKod) {
      setDeclaration('')
      clearRiskState()
    }
  }, [vehicleFound, autoDeclarationKod])

  // Risk cavabı avtomatik
  useEffect(() => {
    if (!vehicleFound || !declaration || flowPhase !== 'registration') return
    const decl = declarations.find(b => b.kod === declaration)
    if (!decl) return
    setRiskChecking(true)
    const timer = window.setTimeout(() => {
      const result = assessGoodsRisk(decl)
      setRiskVerdict(result.verdict)
      setRiskReasons(result.reasons)
      setRiskChecking(false)
    }, 650)
    return () => window.clearTimeout(timer)
  }, [vehicleFound, declaration, flowPhase, declarations])

  const search = () => {
    if (vehicle || manifestEntry) {
      setVehicleFound(true)
      toast.success('Manifest qeydi tapıldı')
    } else {
      toast.error('Manifest qeydi tapılmadı — aşağıdakı nümunələrdən birini seçin və ya Bill of Lading / vehicle order nömrəsini yoxlayın')
    }
  }

  const selectDeckVehicle = (selectedVehicle: typeof vehicles[number]) => {
    const linkedDeclaration = declarations
      .filter(item =>
        item.avtomobil === selectedVehicle.nomre ||
        item.billOfLading === selectedVehicle.billOfLading ||
        (Boolean(selectedVehicle.vehicleOrder) && item.vehicleOrder === selectedVehicle.vehicleOrder),
      )
      .filter(item => item.status !== 'Arxivləşdirilib' && !item.status.toLocaleLowerCase('az').includes('arxiv'))
      .sort((a, b) => declarationSortKey(b).localeCompare(declarationSortKey(a)))[0]

    setShipId(selectedVehicle.gemi)
    setPlate(selectedVehicle.nomre)
    setVehicleFound(true)
    setDeclaration(linkedDeclaration?.kod ?? '')
    setDone(false)
    setManualOpen(false)
    setTransportDetails(initialTransportDetails)
    setTransportOpen(true)
    setFlowPhase('registration')
    setTaxConfirmed(false)
    setTransportPermit('')
    setLastSaved(null)
    clearRiskState()
    toast.success(`${selectedVehicle.nomre} qeydiyyat üçün seçildi`)
  }

  const exportManifest = () => {
    if (!vehicle && !manifestEntry) return
    const rows = [
      ['Sahə', 'Dəyər'],
      ['Gəmi', ship.ad],
      ['IMO kodu', ship.id.replace('IMO', '')],
      ['Manifest / Bill of Lading', manifestReference],
      ['Vehicle order', manifestEntry?.vehicleOrder ?? vehicle?.kod ?? '—'],
      ['Car ID-lər', manifestEntry?.vehicleIds.join(', ') || vehicle?.nomre || '—'],
      ['Nəqliyyat vasitəsi', vehicle?.marka ?? '—'],
      ['Yük tipi', vehicle?.yuk ?? manifestEntry?.cargo ?? '—'],
      ['Brutto çəki', manifestEntry ? `${manifestEntry.grossTons.toLocaleString('az-AZ')} ton` : '—'],
      ['Netto çəki', manifestEntry ? `${manifestEntry.netTons.toLocaleString('az-AZ')} ton` : '—'],
      ['Marşrut', vehicle ? `${vehicle.menshe} → ${vehicle.teyinat}` : cargoDeclarationSeed.route],
      ['Keçmə məqsədi', transportDetails.kecmeMeqsedi],
      ['Avtomobilin növü', transportDetails.avtomobilNovu],
      ['Dövlət qeydiyyat nişanı', transportDetails.dovletNisani],
      ['Avtomobil markası', transportDetails.avtomobilMarkasi],
      ['Qeydiyyat nömrəsi', transportDetails.qeydiyyatNomresi],
      ['Qeydiyyat tarixi', transportDetails.qeydiyyatTarixi],
      ['Ölkədə qalma müddəti', STAY_PERIOD_OPTIONS.find(o => o.id === transportDetails.olkedeQalmaMuddeti)?.label ?? transportDetails.olkedeQalmaMuddeti],
      ['Ox sayı sinifi', transportDetails.oxSinifi === 'upto4' ? '4 oxa qədər' : '4 ox və çox'],
      ['Hərəkət marşrutu', transportDetails.hereketMarsrutu],
      ['Xüsusilik', transportDetails.xususilik],
      ['Təyinat gömrük orqanı', transportDetails.teyinatGomrukOrqani],
      ['Əlaqəli bəyannamə', selectedDeclaration?.kod ?? activeDeclarations[0]?.kod ?? 'Tapılmadı'],
    ]
    const csv = rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(';')).join('\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `manifest-${manifestReference.replace(/[^a-zA-Z0-9_-]/g, '_') || 'export'}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Manifest məlumatları CSV faylı kimi ixrac edildi')
  }

  const clearRiskState = () => {
    setRiskVerdict(null)
    setRiskReasons([])
    setRiskChecking(false)
    setManualRoute(null)
    setCompletionMode(null)
  }

  const goToTaxes = () => {
    if (!riskVerdict) return toast.warning('Risk cavabı gözlənilir')
    if (riskVerdict === 'red' && !manualRoute) return toast.warning('Qırmızı riskdə yönləndirmə seçin')
    if (riskVerdict === 'red' && manualRoute) {
      setCompletionMode(manualRoute)
      toast.success(`Yönləndirmə qeydə alındı: ${manualRoute}`)
    } else {
      setCompletionMode('tesdiq')
    }
    setFlowPhase('taxes')
  }

  const roadTax = useMemo(
    () => calcRoadTax(
      transportDetails.olkedeQalmaMuddeti,
      transportDetails.oxSinifi,
      Number(transportDetails.artiqGunSayi) || 0,
    ),
    [transportDetails.olkedeQalmaMuddeti, transportDetails.oxSinifi, transportDetails.artiqGunSayi],
  )

  const roadTaxLabel = useMemo(() => {
    const periodLabel = STAY_PERIOD_OPTIONS.find(o => o.id === transportDetails.olkedeQalmaMuddeti)?.label ?? ''
    const axleLabel = transportDetails.oxSinifi === 'upto4' ? '≤4 ox' : '≥4 ox'
    if (transportDetails.olkedeQalmaMuddeti === '1_il_ustu' && roadTax.extra > 0) {
      return `Yol vergisi (211.1.1.3): ${roadTax.base} + ${roadTax.extra} = ${roadTax.total} USD · ${periodLabel} · ${axleLabel}`
    }
    return `Yol vergisi (211.1.1.3): ${roadTax.total} USD · ${periodLabel} · ${axleLabel}`
  }, [roadTax, transportDetails.olkedeQalmaMuddeti, transportDetails.oxSinifi])

  const goToPermits = () => {
    if (!taxConfirmed) return toast.warning('Yol vergisini təsdiqləyin (qanun cədvəlinə uyğun hesablama)')
    if (roadTax.total <= 0) return toast.warning('Yol vergisi hesablanmadı')
    setFlowPhase('permits')
  }

  const goToReview = () => {
    if (!transportPermit) return toast.warning('Nəqliyyat sənədini seçin (İcazə Blankı / BNF jurnalı / TİR Carnet)')
    setFlowPhase('review')
  }

  const finalConfirm = () => {
    if (flowPhase !== 'review') return toast.warning('Bütün mərhələləri tamamlayın')
    if (!vehicleFound || !declaration || !riskVerdict) return toast.warning('Qeydiyyat məlumatları natamamdır')
    if (riskVerdict === 'red' && !manualRoute) return toast.error('Qırmızı riskdə yönləndirmə mütləqdir')
    if (!taxConfirmed || !transportPermit) {
      return toast.warning('Yol vergisi və nəqliyyat sənədi tamamlanmalıdır')
    }

    const postKod = riskVerdict === 'red'
      ? (manualRoute === 'X ray' ? '552' : manualRoute === 'Kinoloji itin tətbiqi' ? '553' : '551')
      : '545'
    const now = new Date()
    const mal = selectedDeclaration?.mallar?.[0]
    const cekiParts = [
      mal?.netCeki != null ? `netto ${mal.netCeki.toLocaleString('az-AZ')} kq` : null,
      mal?.bruttoCeki != null ? `brutto ${mal.bruttoCeki.toLocaleString('az-AZ')} kq` : null,
    ].filter(Boolean)
    const qeydeAlınma = selectedDeclaration?.qeydiyyatTarixi
      || selectedDeclaration?.tarix
      || now.toLocaleString('az-AZ')
    const buraxilis = now.toLocaleString('az-AZ')
    const record: SavedRegistration = {
      id: `REG-${now.getTime()}`,
      savedAt: buraxilis,
      shipId: ship.id,
      shipName: ship.ad,
      plate: transportDetails.dovletNisani || plateKey,
      declarationKod: declaration,
      malAdi: mal?.ad || '—',
      ceki: cekiParts.length ? cekiParts.join(' · ') : '—',
      qeydeAlınma,
      buraxilis,
      riskVerdict,
      riskReasons,
      manualRoute: riskVerdict === 'red' ? manualRoute : (manualRoute || null),
      waitReasons: riskVerdict === 'red'
        ? [
            ...(manualRoute ? [`Əlavə yoxlama kanalı: ${manualRoute}`] : []),
            ...riskReasons,
          ]
        : undefined,
      roadTaxes: [roadTaxLabel],
      permits: [TRANSPORT_PERMIT_OPTIONS.find(p => p.id === transportPermit)?.label ?? transportPermit],
      transport: { ...transportDetails },
      // Qırmızı risk + yönləndirmə → gözləmədə (inspektor səbəbi görə bilər)
      status: riskVerdict === 'red' && manualRoute ? 'Gözləmədə' : 'Buraxıldı',
      operator: profile.name,
      postKod,
    }

    addRegistration(record)
    addPostDecision({
      tarix: now.toLocaleDateString('az-AZ', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      kod: postKod,
      gemi: ship.ad,
      novu: 'Giriş',
      status: riskVerdict === 'red' && manualRoute ? `Təsdiqləndi · ${manualRoute}` : 'Təsdiqləndi',
      operator: profile.name,
    })
    setLastSaved(record)
    setCompletionMode(riskVerdict === 'red' && manualRoute ? manualRoute : 'tesdiq')
    setDone(true)
    setFlowPhase('done')
    confetti({ particleCount: 160, spread: 85, origin: { y: .65 }, colors: ['#0A4D8C', '#00B4D8', '#F4A261', '#2A9D8F'] })
    toast.success('Qeydiyyat təsdiqləndi və DB-yə yazıldı')
  }

  const reset = () => {
    setVehicleFound(false)
    setDeclaration('')
    setDone(false)
    setPlate('15 AA 859')
    setManualOpen(false)
    setManualForm(emptyManualForm)
    setTransportDetails(initialTransportDetails)
    setTransportOpen(true)
    setFlowPhase('registration')
    setTaxConfirmed(false)
    setTransportPermit('')
    setLastSaved(null)
    clearRiskState()
  }

  // Success overlay: body scroll lock
  useEffect(() => {
    if (!done) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [done])

  const openManualModal = () => {
    if (!vehicleFound) return toast.warning('Əvvəlcə avtomobil məlumatlarını tapın')
    setManualForm({
      ...emptyManualForm,
      beyannameId: `3-33-MAN/${String(Date.now()).slice(-6)}`,
      teyinatGomrukOrqani: transportDetails.teyinatGomrukOrqani || '',
      netto: manifestEntry ? String(manifestEntry.netTons) : '',
      brutto: manifestEntry ? String(manifestEntry.grossTons) : '',
    })
    setManualOpen(true)
  }

  const submitManual = (e: FormEvent) => {
    e.preventDefault()
    const alici = manualForm.alici.trim()
    const satici = manualForm.satici.trim()
    const kod = manualForm.beyannameId.trim()
    const malAdi = manualForm.malAdi.trim()
    const teyinatGomrukOrqani = manualForm.teyinatGomrukOrqani.trim()
    const yerSayi = Number(manualForm.yerSayi)
    const umumiDeyer = Number(manualForm.umumiDeyer)
    const netto = Number(manualForm.netto)
    const brutto = Number(manualForm.brutto)
    if (!alici || !satici || !kod || !malAdi || !teyinatGomrukOrqani || !yerSayi || !umumiDeyer || !netto || !brutto) {
      return toast.warning('Bütün məcburi sahələri doldurun')
    }
    if (declarations.some(b => b.kod === kod)) {
      return toast.error('Bu bəyannamə ID artıq mövcuddur')
    }
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const qeydiyyatTarixi = `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`
    const tarix = now.toISOString().slice(0, 10)
    addDeclaration({
      kod,
      tarix,
      qeydiyyatTarixi,
      broker: '—',
      avtomobil: plateKey || transportDetails.dovletNisani || '—',
      alici,
      satici,
      mallar: [{
        hsKod: '—',
        ad: malAdi,
        miqdar: yerSayi,
        olcuVahidi: 'yer',
        deyer: umumiDeyer,
        netCeki: netto,
        bruttoCeki: brutto,
      }],
      umumiDeyer,
      valyuta: 'USD',
      yukYerleri: yerSayi,
      teslimYeri: vehicle?.teyinat || '—',
      teyinatGomrukOrqani,
      status: 'Yoxlamada',
      source: 'Əl ilə daxil edilib',
    })
    setDeclaration(kod)
    clearRiskState()
    setManualOpen(false)
    setManualForm(emptyManualForm)
    toast.success('Mal və bəyannamə əl ilə əlavə edildi')
  }

  const handleQuickConfirm = (v: typeof vehicles[number]) => {
    const matchedDecl = declarations.find(d =>
      d.avtomobil === v.nomre || (Boolean(v.billOfLading) && d.billOfLading === v.billOfLading)
    )
    const now = new Date()
    const buraxilis = now.toLocaleString('az-AZ')
    const postKod = '13005'
    const record: SavedRegistration = {
      id: `REG-${now.getTime()}`,
      savedAt: buraxilis,
      shipId: ship.id,
      shipName: ship.ad,
      plate: v.nomre,
      declarationKod: matchedDecl?.kod || '01263000224935',
      malAdi: v.yuk || '—',
      ceki: `${(v as any).tonaj || 22} ton`,
      qeydeAlınma: now.toLocaleString('az-AZ'),
      buraxilis,
      riskVerdict: 'green',
      riskReasons: ['Vahid Pəncərə avtomatik yaşıl dəhliz'],
      roadTaxes: ['Yol vergisi: 100 USD · 1 ay · ≤4 ox'],
      permits: ['İcazə Blankı / TIR Carnet'],
      transport: { ...initialTransportDetails, dovletNisani: v.nomre, avtomobilMarkasi: v.marka, hereketMarsrutu: `${v.menshe} → ${v.teyinat}` },
      status: 'Buraxıldı',
      operator: profile.name,
      postKod,
    }

    addRegistration(record)
    addPostDecision({
      tarix: now.toLocaleDateString('az-AZ', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      kod: postKod,
      gemi: ship.ad,
      novu: 'Giriş',
      status: 'Təsdiqləndi',
      operator: profile.name,
    })
    setLastSaved(record)
    setDone(true)
    confetti({ particleCount: 160, spread: 85, origin: { y: .65 }, colors: ['#0A4D8C', '#00B4D8', '#F4A261', '#2A9D8F'] })
    toast.success(`${v.nomre} nəqliyyatı üçün vahid qeydiyyat təsdiqləndi!`)
  }

  return <>
    <PageHeader
      title="Vahid Qeydiyyat"
      action={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>
            <Ship size={16} /> Limandakı gəmi:
            <select
              value={shipId}
              className="ship-selector-select"
              onChange={e => {
                const next = e.target.value
                setShipId(next)
                setVehicleFound(false)
                setDeclaration('')
                setDone(false)
                setManualOpen(false)
                setTransportDetails(initialTransportDetails)
                setTransportOpen(true)
                setFlowPhase('registration')
                setTaxConfirmed(false)
                setTransportPermit('')
                setLastSaved(null)
                clearRiskState()
              }}
            >
              {ships.filter(g => g.status === 'Körpüdə' || g.status === 'Lövbərdə' || g.id === shipId).map(g => (
                <option value={g.id} key={g.id}>{g.ad} ({g.id}) — {g.status}</option>
              ))}
            </select>
          </label>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setShipModalOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 13px', fontSize: 12, fontWeight: 700 }}
            title="Seçilmiş gəminin bütün detallarına bax"
          >
            <Ship size={14} /> Gəmi detalları
          </Button>
        </div>
      }
    />

    <VehicleDeckSelector
      ship={ship}
      vehicles={shipVehicles}
      selectedPlate={vehicleFound ? plateKey : (shipVehicles[0]?.nomre ?? '')}
      registeredPlates={registrations.map(registration => registration.plate)}
      onSelect={selectDeckVehicle}
      declarations={declarations}
      onConfirmRegistration={handleQuickConfirm}
      onOpenShipDetails={() => setShipModalOpen(true)}
    />

    <ShipDetailModal
      ship={ship}
      open={shipModalOpen}
      onClose={() => setShipModalOpen(false)}
    />

    <Modal open={manualOpen} onClose={() => setManualOpen(false)} title="Mal və bəyannamə əlavə et">
      <form onSubmit={submitManual} className="manual-declaration-form">
        <label>Bəyannamə ID<input required value={manualForm.beyannameId} onChange={e => setManualForm(f => ({ ...f, beyannameId: e.target.value }))} placeholder="Məsələn: 3-33-3900/2-001100" /></label>
        <label>Alıcı<input required value={manualForm.alici} onChange={e => setManualForm(f => ({ ...f, alici: e.target.value }))} placeholder="Məsələn: TechShop MMC" /></label>
        <label>Satıcı<input required value={manualForm.satici} onChange={e => setManualForm(f => ({ ...f, satici: e.target.value }))} placeholder="Məsələn: Kazakh Export LLP" /></label>
        <label>Adı<input required value={manualForm.malAdi} onChange={e => setManualForm(f => ({ ...f, malAdi: e.target.value }))} placeholder="Məsələn: Elektrik avadanlıqları" /></label>
        <label>Ümumi gömrük dəyəri<input required type="number" min="0.01" step="0.01" value={manualForm.umumiDeyer} onChange={e => setManualForm(f => ({ ...f, umumiDeyer: e.target.value }))} placeholder="Məsələn: 45000" /></label>
        <label>Təyinat gömrük orqanı<input required value={manualForm.teyinatGomrukOrqani} onChange={e => setManualForm(f => ({ ...f, teyinatGomrukOrqani: e.target.value }))} placeholder="Məsələn: Bakı Baş Gömrük İdarəsi" /></label>
        <label>Yer sayı<input required type="number" min="1" step="1" value={manualForm.yerSayi} onChange={e => setManualForm(f => ({ ...f, yerSayi: e.target.value }))} placeholder="Məsələn: 12" /></label>
        <div className="manual-form-row">
          <label>Netto<input required type="number" min="0.01" step="0.01" value={manualForm.netto} onChange={e => setManualForm(f => ({ ...f, netto: e.target.value }))} placeholder="Məsələn: 980.5" /></label>
          <label>Brutto<input required type="number" min="0.01" step="0.01" value={manualForm.brutto} onChange={e => setManualForm(f => ({ ...f, brutto: e.target.value }))} placeholder="Məsələn: 1250.5" /></label>
        </div>
        <div className="manual-form-actions">
          <Button type="button" variant="ghost" onClick={() => setManualOpen(false)}>Ləğv et</Button>
          <Button type="submit"><Plus /> Əlavə et</Button>
        </div>
      </form>
    </Modal>
    <AnimatePresence>
      {done && lastSaved && (
        <motion.section
          className="success-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label="Qeydiyyat təsdiqləndi"
        >
          <motion.div
            className="success-card"
            initial={{ scale: .7 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring' }}
          >
            <span className="success-icon"><Check /></span>
            <h2>Qeydiyyat təsdiqləndi<br />və saxlanıldı</h2>
            <p className="success-meta">
              <span>{lastSaved.shipName}</span>
              <i />
              <span>{lastSaved.plate}</span>
              <i />
              <span>{lastSaved.declarationKod}</span>
            </p>
            <div className="success-codes">
              <div><small>Post kodu</small><strong>{lastSaved.postKod}</strong></div>
              <div><small>Qeyd ID</small><strong>{lastSaved.id}</strong></div>
            </div>
            <div className="success-facts">
              <div>
                <small>Risk</small>
                <b className={lastSaved.riskVerdict === 'green' ? 'ok' : 'warn'}>
                  {lastSaved.riskVerdict === 'green' ? 'Yaşıl' : 'Qırmızı'}
                  {lastSaved.manualRoute ? ` · ${lastSaved.manualRoute}` : ''}
                </b>
              </div>
              <div>
                <small>Yol vergisi</small>
                <b>{lastSaved.roadTaxes[0]?.replace(/^Yol vergisi \(211\.1\.1\.3\):\s*/i, '') ?? '—'}</b>
              </div>
              <div>
                <small>Nəqliyyat sənədi</small>
                <b>{lastSaved.permits[0] ?? '—'}</b>
              </div>
            </div>
            <Button onClick={reset}>Yeni qeydiyyat başlat <RotateCcw /></Button>
          </motion.div>
        </motion.section>
      )}
    </AnimatePresence>
  </>
}
function Data({ label, value }: {label:string; value:string}) { return <div><small>{label}</small><strong>{value}</strong></div> }
