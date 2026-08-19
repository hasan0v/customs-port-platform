import { useMemo, useRef, useState, useEffect, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle, ArrowLeft, ArrowRight, Check, CheckCircle2, Database, Dog, FileBadge,
  FileCheck2, Link2, Pencil, Plus, Receipt, RefreshCw, RotateCcw, Scan, ScanSearch, Search,
  ShieldAlert, ShieldCheck, PackageSearch, Ship, Trash2, Truck, X, type LucideIcon,
} from 'lucide-react'
import confetti from 'canvas-confetti'
import { toast } from 'sonner'
import { useSearchParams } from 'react-router-dom'
import { useAppStore, type SavedRegistration } from '../store/useAppStore'
import { Button, Card, Modal, PageHeader } from '../components/UI'
import VehicleDeckSelector from '../components/VehicleDeckSelector'
import ShipDetailModal from '../components/ShipDetailModal'
import {
  EGB_STATUS_LABEL, GOODS_STATUS_LABEL, GOODS_STATUS_TONE, buildGoodsLines, buildTruckDossier,
  buildVoyage, findManifestEntry, goodsControls, makeTrailerCode, normalizeId, summarizeGoods,
  type CmrRecord, type GoodsLine, type GoodsStatus,
} from '../domain/registrationFlow'

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
  const row = ROAD_TAX_TABLE[period] ?? ROAD_TAX_TABLE['1_ay']
  const base = axles === 'upto4' ? row.upto4 : row.over4
  if (period !== '1_il_ustu') {
    return { base, extra: 0, total: base, currency: 'USD' as const, dayRate: 0, days: 0 }
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
  qosquNisani: '',
  avtomobilMarkasi: '',
  qeydiyyatNomresi: '',
  qeydiyyatTarixi: '',
  olkedeQalmaMuddeti: '1_ay' as StayPeriod,
  oxSinifi: 'over4' as AxleClass,
  artiqGunSayi: '0',
  hereketMarsrutu: '',
  xususilik: 'Yüklü',
  teyinatGomrukOrqani: 'Bakı Baş Gömrük İdarəsi',
}

const emptyCmrForm = {
  beyannameKod: '',
  cmrNo: '',
  gonderen: '',
  alan: '',
  malTesviri: '',
  yerSayi: '',
  bruttoKq: '',
  invoysNo: '',
  invoysMebleg: '',
  valyuta: 'USD',
}

const initialPermit = {
  novu: '' as TransportPermitId | '',
  nomre: '',
  verenOrqan: 'AYNA — Azərbaycan Yerüstü Nəqliyyat Agentliyi',
  etibarliliq: '',
  qaytarildi: false,
}

/** VAİS / İGİS bazasından gələn nəqliyyat vasitəsi qeydi. */
type VehicleRecord = {
  dovletNisani: string
  qosquNisani: string
  marka: string
  novu: string
  istehsalIli: string
  oxSayi: string
  texPasport: string
  qeydiyyatOlkesi: string
  dasiyici: string
  surucu: string
  vesiqe: string
  menbe: string
  sorguId: string
}

const emptyVehicleRecord: VehicleRecord = {
  dovletNisani: '', qosquNisani: '', marka: '', novu: 'Yük avtomobili', istehsalIli: '',
  oxSayi: '', texPasport: '', qeydiyyatOlkesi: '', dasiyici: '', surucu: '', vesiqe: '',
  menbe: '', sorguId: '',
}

const CARRIERS = [
  'KAZ TRANS LOGISTIC LLP',
  'Caspian Ro-Ro Logistics MMC',
  'Ələt Trans Servis MMC',
  'Anadolu Uluslararası Nakliyat A.Ş.',
  'Turkmen Ulag Ekspedisiya',
]

function plateHash(plate: string) {
  return [...normalizeId(plate)].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 7)
}

/**
 * VAİS / İGİS bazasında qeydi olan və olmayan nişanlar.
 * Sənəd paketi olan reyslərdə (məs. «Bəxtiyar» səfər 118) nəticə əl ilə seçilir ki,
 * hər iki ssenari — hazır qeyd və əl ilə daxiletmə — nümayiş oluna bilsin.
 * Siyahılarda olmayan nişanlar üçün qayda: hər 4-cü nişanın qeydi tapılmır.
 */
const VAIS_QEYDLI = new Set(['15AA859', '99YM093', '90CY711', '27BD815', 'CC848WW', '2630BV', 'HH255T'])
const VAIS_QEYDSIZ = new Set(['PF275PP'])

function vaisHasRecord(plate: string) {
  const key = normalizeId(plate)
  if (!key) return false
  if (VAIS_QEYDSIZ.has(key)) return false
  if (VAIS_QEYDLI.has(key)) return true
  return plateHash(key) % 4 !== 0
}

/** Nişan formatına görə qeydiyyat ölkəsi. */
function inferRegistryCountry(plate: string) {
  const key = normalizeId(plate)
  if (/^(10|15|77|90|99)/.test(key)) return 'Azərbaycan'
  if (key.includes('KZ') || /^(02|12)/.test(key)) return 'Qazaxıstan'
  if (key.includes('TM')) return 'Türkmənistan'
  if (key.includes('TR') || /^(06|34)/.test(key)) return 'Türkiyə'
  if (key.includes('GE')) return 'Gürcüstan'
  return 'Beynəlxalq qeydiyyat'
}

/** VAİS/İGİS cavabı — nişan üzrə deterministikdir, hər sorğuda eyni qeyd qayıdır. */
function buildVehicleRecord(input: {
  plate: string
  trailerPlate: string
  vehicle?: { marka?: string; surucu?: string; kod?: string; yuk?: string }
}): VehicleRecord {
  const { plate, trailerPlate, vehicle } = input
  const hash = plateHash(plate)
  const novu = inferVehicleType(vehicle?.yuk ?? '', vehicle?.marka)
  return {
    dovletNisani: plate.toUpperCase(),
    qosquNisani: trailerPlate.toUpperCase(),
    marka: vehicle?.marka || 'MAN TGX 18.480',
    novu,
    istehsalIli: String(2012 + (hash % 12)),
    oxSayi: novu === 'Minik avtomobili' ? '2' : String(4 + (hash % 3)),
    texPasport: `TP ${String(100000 + (hash % 900000))}`,
    qeydiyyatOlkesi: inferRegistryCountry(plate),
    dasiyici: CARRIERS[hash % CARRIERS.length],
    surucu: vehicle?.surucu || '—',
    vesiqe: `SV ${String(1000000 + (hash % 8999999))}`,
    menbe: hash % 2 === 0 ? 'VAİS' : 'İGİS',
    sorguId: `${hash % 2 === 0 ? 'VAİS' : 'İGİS'}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${1000 + (hash % 9000)}`,
  }
}

function formatShipDate(value?: string) {
  if (!value) return ''
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
/** Real iş axını: nəqliyyat vasitəsi → EGB bəyannamələri → qeydiyyat + icazə → yol vergisi */
type FlowStage = 'nv' | 'egb' | 'vais' | 'vergi'

const STAGE_ORDER: FlowStage[] = ['nv', 'egb', 'vais', 'vergi']

/** Xarici bazaya (VAİS/İGİS, EGB) sorğunun vəziyyəti. */
type LookupState = 'gozleyir' | 'sorgu' | 'tapildi' | 'tapilmadi' | 'elIle'

/** Qırmızı kanalda əlavə yoxlamanın nəticəsi — qeydiyyatın tamamlanmasını bağlayır. */
type InspectionState = 'yoxdur' | 'gozleyir' | 'kecdi' | 'kecmedi'

const MANUAL_ROUTES: Array<{ id: ManualRoute; icon: LucideIcon; hint: string }> = [
  { id: 'Fiziki yoxlama', icon: Search, hint: 'Yükün fiziki yoxlanılması' },
  { id: 'X ray', icon: Scan, hint: 'Skaner / rentgen nəzarəti' },
  { id: 'Kinoloji itin tətbiqi', icon: Dog, hint: 'İt ilə axtarış / kinoloji nəzarət' },
]

/** İcazə blankının növü — sürücü müvafiq qurumdan kağız blank gətirir */
const TRANSPORT_PERMIT_OPTIONS = [
  { id: 'icaze-blanki', label: 'İcazə Blankı', hint: 'Milli / beynəlxalq daşıma icazə blankı' },
  { id: 'bnf-jurnali', label: 'BNF jurnalı', hint: 'BNF (beynəlxalq yük daşıma) jurnalı' },
  { id: 'tir-carnet', label: 'TİR Carnet', hint: 'TIR Carnet — beynəlxalq tranzit sənədi' },
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

  if (declaration.status === 'Risk nəzarəti') {
    reasons.push('Bəyannamə statusu: Risk nəzarəti')
  }

  for (const kw of RISK_KEYWORDS) {
    if (text.includes(kw)) {
      reasons.push(`Riskli mal əlaməti: “${kw}”`)
      break
    }
  }

  if (/^(24|30|36)/.test(hsDigits)) {
    reasons.push(`HS/XİF kateqoriyası əlavə nəzarət tələb edir (${declaration.mallar[0]?.hsKod ?? hsDigits})`)
  }

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
  const {
    ships, vehicles, declarations, addShip, addPostDecision, addRegistration, registrations, profile,
  } = useAppStore()

  const urlShipId = searchParams.get('shipId')
  const urlShipName = searchParams.get('shipName')
  const urlPlate = searchParams.get('plate')

  const [shipId, setShipId] = useState(urlShipId || '')
  const [plate, setPlate] = useState(urlPlate || '')
  const [vehicleFound, setVehicleFound] = useState(false)
  const [shipModalOpen, setShipModalOpen] = useState(false)

  const [stage, setStage] = useState<FlowStage>('nv')
  const [done, setDone] = useState(false)
  const [lastSaved, setLastSaved] = useState<SavedRegistration | null>(null)

  // 02 — nəqliyyat vasitəsinin qeydiyyatı (VAİS / İGİS sorğusu)
  const [vaisState, setVaisState] = useState<LookupState>('gozleyir')
  const [vaisRecord, setVaisRecord] = useState<VehicleRecord | null>(null)
  const [vaisAttempt, setVaisAttempt] = useState(0)
  const [manualVehicle, setManualVehicle] = useState<VehicleRecord>(emptyVehicleRecord)

  // 03 — EGB bəyannamələri (hər sətir: bəyannamə + CMR + invoys)
  const [extraCmrs, setExtraCmrs] = useState<CmrRecord[]>([])
  const [cmrModalOpen, setCmrModalOpen] = useState(false)
  const [cmrForm, setCmrForm] = useState(emptyCmrForm)
  const [editingCmr, setEditingCmr] = useState<string | null>(null)
  /** Əl ilə düzəlişlər — törədilmiş zəncirin üstünə yazılır. */
  const [cmrEdits, setCmrEdits] = useState<Record<string, Partial<CmrRecord>>>({})
  const [removedCmrs, setRemovedCmrs] = useState<string[]>([])
  const [goodsEdits, setGoodsEdits] = useState<Record<string, Partial<GoodsLine>>>({})
  const [egbState, setEgbState] = useState<LookupState>('gozleyir')
  /** Sorğu anında EGB-dən gələn bəyannamə sayı — sonradan əl ilə əlavə olunanlar buraya daxil deyil. */
  const [egbFoundCount, setEgbFoundCount] = useState(0)
  const [egbAttempt, setEgbAttempt] = useState(0)
  const [egbFetched, setEgbFetched] = useState<string[]>([])
  const [manualRoute, setManualRoute] = useState<ManualRoute | null>(null)
  /** Qırmızı kanalda göndərilən yoxlamanın nəticəsi. */
  const [inspection, setInspection] = useState<InspectionState>('yoxdur')
  /** İnspektor sistem cavabını əl ilə dəyişə bilər. */
  const [riskOverride, setRiskOverride] = useState<RiskVerdict | null>(null)

  // 04 — qeydiyyat + icazə blankı
  const [transportDetails, setTransportDetails] = useState(initialTransportDetails)
  const [trailerCode, setTrailerCode] = useState('')
  const [goodsAssigned, setGoodsAssigned] = useState(false)
  const [permit, setPermit] = useState(initialPermit)

  // 05 — Yol vergisi
  const [taxConfirmed, setTaxConfirmed] = useState(false)
  const [taxOverride, setTaxOverride] = useState('')

  const resetFlowState = () => {
    setStage('nv')
    setDone(false)
    setLastSaved(null)
    setVaisState('gozleyir')
    setVaisRecord(null)
    setVaisAttempt(value => value + 1)
    setManualVehicle(emptyVehicleRecord)
    setExtraCmrs([])
    setCmrModalOpen(false)
    setCmrForm(emptyCmrForm)
    setEditingCmr(null)
    setCmrEdits({})
    setRemovedCmrs([])
    setGoodsEdits({})
    setEgbState('gozleyir')
    setEgbFoundCount(0)
    setEgbAttempt(value => value + 1)
    setEgbFetched([])
    setRiskOverride(null)
    setTaxOverride('')
    setManualRoute(null)
    setInspection('yoxdur')
    setTrailerCode('')
    setGoodsAssigned(false)
    setPermit(initialPermit)
    setTaxConfirmed(false)
  }

  // Gəmi query parametri (Operations səhifəsindən gələn yeni gəmi daxil)
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
          suret: 0.5,
        })
      }
      setShipId(urlShipId)
    }
  }, [urlShipId, urlShipName, ships, addShip])

  useEffect(() => {
    if (urlPlate) {
      setPlate(urlPlate)
      const found = vehicles.find(v => v.nomre === urlPlate || v.kod === urlPlate)
      if (found) setVehicleFound(true)
    }
  }, [urlPlate, vehicles])

  const ship = ships.find(g => g.id === shipId) || null
  const voyage = useMemo(() => (ship ? buildVoyage(ship) : null), [ship])

  // Seçilmiş gəmidəki tırlar
  const shipVehicles = useMemo(() => {
    if (!ship) return []
    const matched = vehicles.filter(v => v.gemi === ship.id || v.gemi === ship.ad)
    if (matched.length > 0) return matched

    const shipIdx = Math.max(0, ships.findIndex(s => s.id === ship.id))
    const offset = (shipIdx * 5) % Math.max(1, vehicles.length - 10)
    const rotated = [...vehicles.slice(offset), ...vehicles.slice(0, offset)]
    return rotated.slice(0, 18).map(v => ({
      ...v,
      gemi: ship.id,
      menshe: ship.menshe.split(',')[0],
      teyinat: ship.teyinat ? ship.teyinat.split(',')[0] : 'Ələt Limanı',
    }))
  }, [vehicles, ship, ships])

  useEffect(() => {
    if (ship && shipVehicles.length > 0) {
      if (!urlPlate || !shipVehicles.some(v => v.nomre === urlPlate || v.kod === urlPlate)) {
        setPlate(shipVehicles[0].nomre)
        setVehicleFound(true)
      }
    } else {
      setPlate('')
      setVehicleFound(false)
    }
  }, [ship, shipVehicles, urlPlate])

  const normalizedManifestQuery = normalizeId(plate)
  const vehicle = shipVehicles.find(v =>
    normalizeId(v.nomre) === normalizedManifestQuery || normalizeId(v.kod) === normalizedManifestQuery
  ) ?? vehicles.find(v =>
    normalizeId(v.nomre) === normalizedManifestQuery || normalizeId(v.kod) === normalizedManifestQuery
  )

  const manifestEntry = useMemo(() => findManifestEntry(plate, vehicle), [plate, vehicle])

  const plateKey = vehicle?.nomre || plate

  /** Tırın sənəd dosyesi: CMR → İnvoys → Bəyannamə → EGB */
  const dossier = useMemo(() => {
    if (!vehicleFound || !ship) return null
    return buildTruckDossier({
      plate: plateKey,
      vehicle,
      manifestEntry,
      declarations,
      route: { menshe: ship.menshe, teyinat: vehicle?.teyinat ?? ship.teyinat },
    })
  }, [vehicleFound, ship, plateKey, vehicle, manifestEntry, declarations])

  const cmrs = useMemo(() => (
    [...(dossier?.cmrs ?? []), ...extraCmrs]
      .filter(cmr => !removedCmrs.includes(cmr.no))
      .map(cmr => ({ ...cmr, ...cmrEdits[cmr.no] }))
  ), [dossier, extraCmrs, removedCmrs, cmrEdits])
  const isLinked = (cmr: CmrRecord) => cmr.egbStatus === 'bagli' || egbFetched.includes(cmr.no)
  const linkedCount = cmrs.filter(isLinked).length
  const egbComplete = cmrs.length > 0 && linkedCount === cmrs.length

  const goodsLines = useMemo(
    () => buildGoodsLines(cmrs, declarations).map(line => ({ ...line, ...goodsEdits[line.id] })),
    [cmrs, declarations, goodsEdits],
  )
  const goodsSummary = useMemo(() => summarizeGoods(goodsLines), [goodsLines])

  const primaryDeclarationKod = cmrs.find(cmr => cmr.declarationKod)?.declarationKod ?? ''
  const primaryDeclaration = declarations.find(d => d.kod === primaryDeclarationKod)

  /** Hər bəyannamə sətri ayrıca risk cavabı alır — bir qırmızı sətir tırı qırmızı kanala salır. */
  const declarationRisks = useMemo(() => {
    const map: Record<string, { verdict: RiskVerdict; reasons: string[] }> = {}
    cmrs.forEach(cmr => {
      if (!cmr.declarationKod) return
      const declaration = declarations.find(item => item.kod === cmr.declarationKod)
      map[cmr.no] = assessGoodsRisk(declaration)
    })
    return map
  }, [cmrs, declarations])

  const autoRisk = useMemo(() => {
    const red = cmrs.filter(cmr => declarationRisks[cmr.no]?.verdict === 'red')
    if (red.length > 0) {
      const reasons = red.flatMap(cmr =>
        (declarationRisks[cmr.no]?.reasons ?? []).map(reason => `${cmr.declarationKod}: ${reason}`)
      )
      return { verdict: 'red' as RiskVerdict, reasons: Array.from(new Set(reasons)) }
    }
    const green = cmrs.find(cmr => declarationRisks[cmr.no])
    return {
      verdict: 'green' as RiskVerdict,
      reasons: green ? declarationRisks[green.no].reasons : ['EGB-dən qırmızı statuslu bəyannamə gəlmədi'],
    }
  }, [cmrs, declarationRisks])

  /** Risk cavabı EGB sorğusu bitəndən sonra göstərilir. */
  const riskChecking = egbState === 'sorgu'
  const riskVerdict: RiskVerdict | null = egbState === 'tapildi' || egbState === 'tapilmadi' ? autoRisk.verdict : null
  const riskReasons = autoRisk.reasons

  const trailerPlate = dossier?.trailerPlate ?? ''
  const permitReady = Boolean(permit.novu && permit.nomre.trim() && permit.qaytarildi)
  const vaisComplete = Boolean(trailerCode && goodsAssigned && permitReady)
  /** VAİS/İGİS cavab verib, yoxsa məlumatlar əl ilə daxil edilib. */
  const vehicleRegistered = vaisState === 'tapildi' || vaisState === 'elIle'

  // Nəqliyyat formunu gəmi sənədi / avtomobil qeydindən doldur
  useEffect(() => {
    if (!vehicleFound || !ship || (!vehicle && !manifestEntry)) return

    const cargo = vehicle?.yuk ?? manifestEntry?.cargo ?? ''
    const destination = vehicle?.teyinat ?? 'Kurık'
    const route = vehicle ? `${vehicle.menshe} → ${vehicle.teyinat}` : (voyage?.marsrut ?? '')
    const hasCargo = Boolean(cargo) || (manifestEntry?.grossTons ?? 0) > 0

    setTransportDetails({
      kecmeMeqsedi: destination.toLocaleLowerCase('az').includes('bakı') || destination.toLocaleLowerCase('az').includes('gəncə')
        ? 'Ölkəyə giriş'
        : 'Tranzit',
      avtomobilNovu: inferVehicleType(cargo, vehicle?.marka),
      dovletNisani: (vehicle?.nomre || plate).toUpperCase(),
      qosquNisani: trailerPlate.toUpperCase(),
      avtomobilMarkasi: vehicle?.marka || 'MAN TGX / Ro-Ro trailer',
      qeydiyyatNomresi: vehicle?.kod || manifestEntry?.vehicleOrder || '',
      qeydiyyatTarixi: formatShipDate(ship.girisTarixi),
      olkedeQalmaMuddeti: hasCargo && (manifestEntry?.grossTons ?? 0) > 30 ? '3_ay' : '1_ay',
      oxSinifi: inferVehicleType(cargo, vehicle?.marka) === 'Minik avtomobili' ? 'upto4' : 'over4',
      artiqGunSayi: '0',
      hereketMarsrutu: route,
      xususilik: hasCargo ? 'Yüklü' : 'Boş',
      teyinatGomrukOrqani: inferCustomsOffice(vehicle?.teyinat ?? destination),
    })
  }, [vehicleFound, vehicle, manifestEntry, plate, ship, voyage, trailerPlate])

  // Tır seçiləndə sistem VAİS/İGİS bazasına sorğu göndərir və cavabı gözləyir.
  useEffect(() => {
    if (!vehicleFound || !plateKey) {
      setVaisState('gozleyir')
      setVaisRecord(null)
      return
    }
    setVaisState('sorgu')
    setVaisRecord(null)
    const timer = window.setTimeout(() => {
      if (vaisHasRecord(plateKey)) {
        setVaisRecord(buildVehicleRecord({ plate: plateKey, trailerPlate, vehicle }))
        setVaisState('tapildi')
      } else {
        setManualVehicle({
          ...emptyVehicleRecord,
          dovletNisani: plateKey.toUpperCase(),
          qosquNisani: trailerPlate.toUpperCase(),
          qeydiyyatOlkesi: inferRegistryCountry(plateKey),
          menbe: 'Əl ilə daxil edilib',
        })
        setVaisState('tapilmadi')
      }
    }, 1100)
    return () => window.clearTimeout(timer)
  }, [vehicleFound, plateKey, trailerPlate, vehicle, vaisAttempt])

  /**
   * EGB sorğusu: tırın dövlət nişanı üzrə bəyannamələr gətirilir. Sorğu anındakı
   * sətir siyahısı ref-dən oxunur ki, sonrakı əl düzəlişləri sorğunu yenidən işə salmasın.
   */
  const cmrsRef = useRef(cmrs)
  cmrsRef.current = cmrs

  useEffect(() => {
    if (stage !== 'egb' || !plateKey) return
    setEgbState('sorgu')
    const timer = window.setTimeout(() => {
      const found = cmrsRef.current.filter(cmr => cmr.declarationKod)
      setEgbFetched(found.map(cmr => cmr.no))
      setEgbFoundCount(found.length)
      setEgbState(found.length > 0 ? 'tapildi' : 'tapilmadi')
    }, 950)
    return () => window.clearTimeout(timer)
  }, [stage, plateKey, egbAttempt])

  useEffect(() => {
    if (!done) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [done])

  const roadTax = useMemo(
    () => calcRoadTax(
      transportDetails.olkedeQalmaMuddeti,
      transportDetails.oxSinifi,
      Number(transportDetails.artiqGunSayi) || 0,
    ),
    [transportDetails.olkedeQalmaMuddeti, transportDetails.oxSinifi, transportDetails.artiqGunSayi],
  )

  const effectiveRisk = riskOverride ?? riskVerdict
  /** Qırmızı kanalda yoxlama uğurla bitməyibsə qeydiyyat tamamlana bilməz. */
  const inspectionBlocking = effectiveRisk === 'red' && inspection !== 'kecdi'
  const manualTaxTotal = taxOverride.trim() === '' ? null : Number(taxOverride)
  const taxTotal = manualTaxTotal != null && Number.isFinite(manualTaxTotal) && manualTaxTotal >= 0
    ? manualTaxTotal
    : roadTax.total

  const roadTaxLabel = useMemo(() => {
    const periodLabel = STAY_PERIOD_OPTIONS.find(o => o.id === transportDetails.olkedeQalmaMuddeti)?.label ?? ''
    const axleLabel = transportDetails.oxSinifi === 'upto4' ? '≤4 ox' : '≥4 ox'
    if (taxTotal !== roadTax.total) {
      return `Yol vergisi (211.1.1.3): ${taxTotal} USD · ${periodLabel} · ${axleLabel} · əl ilə düzəliş (cədvəl: ${roadTax.total} USD)`
    }
    if (transportDetails.olkedeQalmaMuddeti === '1_il_ustu' && roadTax.extra > 0) {
      return `Yol vergisi (211.1.1.3): ${roadTax.base} + ${roadTax.extra} = ${roadTax.total} USD · ${periodLabel} · ${axleLabel}`
    }
    return `Yol vergisi (211.1.1.3): ${roadTax.total} USD · ${periodLabel} · ${axleLabel}`
  }, [roadTax, taxTotal, transportDetails.olkedeQalmaMuddeti, transportDetails.oxSinifi])

  const selectDeckVehicle = (selectedVehicle: typeof vehicles[number]) => {
    setShipId(selectedVehicle.gemi)
    setPlate(selectedVehicle.nomre)
    setVehicleFound(true)
    resetFlowState()
  }


  /** VAİS/İGİS cavab vermədikdə nəqliyyat vasitəsi əl ilə qeydə alınır. */
  const saveManualVehicle = () => {
    if (!manualVehicle.dovletNisani.trim()) return toast.warning('Dövlət qeydiyyat nişanı mütləqdir')
    if (!manualVehicle.marka.trim()) return toast.warning('Nəqliyyat vasitəsinin markası mütləqdir')
    const record: VehicleRecord = {
      ...manualVehicle,
      menbe: 'Əl ilə daxil edilib',
      sorguId: manualVehicle.sorguId || `ƏL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${plateHash(manualVehicle.dovletNisani) % 9000 + 1000}`,
    }
    setVaisRecord(record)
    setVaisState('elIle')
    setTransportDetails(details => ({
      ...details,
      dovletNisani: record.dovletNisani.toUpperCase(),
      qosquNisani: record.qosquNisani.toUpperCase(),
      avtomobilMarkasi: record.marka,
      avtomobilNovu: record.novu || details.avtomobilNovu,
      oxSinifi: Number(record.oxSayi) > 4 ? 'over4' : 'upto4',
    }))
    toast.success(`${record.dovletNisani} əl ilə qeydə alındı`)
  }

  const requeryVais = () => {
    setVaisAttempt(value => value + 1)
    toast.message('VAİS / İGİS bazasına təkrar sorğu göndərildi')
  }

  const requeryEgb = () => {
    setEgbAttempt(value => value + 1)
    toast.message(`EGB-yə təkrar sorğu göndərildi · ${plateKey}`)
  }

  /** Qırmızı kanalda yoxlama kanalı seçilir və nəticə gözlənilir. */
  const sendToInspection = (route: ManualRoute) => {
    setManualRoute(route)
    setInspection('gozleyir')
    toast.message(`${route} kanalına göndərildi — nəticə gözlənilir`)
  }

  const passInspection = () => {
    setInspection('kecdi')
    toast.success(`${manualRoute ?? 'Yoxlama'} uğurla başa çatdı — prosedur davam edir`)
  }

  const failInspection = () => {
    setInspection('kecmedi')
    toast.error(`${manualRoute ?? 'Yoxlama'} uğursuz oldu — nəqliyyat vasitəsi buraxılmır`)
  }

  const editGoods = (id: string, patch: Partial<GoodsLine>) => {
    setGoodsEdits(edits => ({ ...edits, [id]: { ...edits[id], ...patch } }))
  }

  const openCmrEditor = (cmr?: CmrRecord) => {
    if (!cmr) {
      setEditingCmr(null)
      setCmrForm(emptyCmrForm)
      setCmrModalOpen(true)
      return
    }
    setEditingCmr(cmr.no)
    setCmrForm({
      beyannameKod: cmr.declarationKod ?? '',
      cmrNo: cmr.no.replace(/^CMR\s*/i, ''),
      gonderen: cmr.gonderen === '—' ? '' : cmr.gonderen,
      alan: cmr.alan === '—' ? '' : cmr.alan,
      malTesviri: cmr.malTesviri === '—' ? '' : cmr.malTesviri,
      yerSayi: cmr.yerSayi ? String(cmr.yerSayi) : '',
      bruttoKq: cmr.bruttoKq ? String(cmr.bruttoKq) : '',
      invoysNo: cmr.invoices[0]?.no.replace(/^İNV\s*/i, '') ?? '',
      invoysMebleg: cmr.invoices[0]?.mebleg ? String(cmr.invoices[0].mebleg) : '',
      valyuta: cmr.invoices[0]?.valyuta ?? 'USD',
    })
    setCmrModalOpen(true)
  }

  const removeCmr = (cmr: CmrRecord) => {
    setExtraCmrs(list => list.filter(item => item.no !== cmr.no))
    setRemovedCmrs(list => (list.includes(cmr.no) ? list : [...list, cmr.no]))
    setEgbFetched(list => list.filter(no => no !== cmr.no))
    toast.success(`${cmr.no} zəncirdən çıxarıldı`)
  }

  const submitCmr = (e: FormEvent) => {
    e.preventDefault()
    const no = cmrForm.cmrNo.trim()
    if (!no) return

    if (editingCmr) {
      const patch: Partial<CmrRecord> = {
        gonderen: cmrForm.gonderen || '—',
        alan: cmrForm.alan || '—',
        malTesviri: cmrForm.malTesviri || '—',
        bruttoKq: Number(cmrForm.bruttoKq) || 0,
        yerSayi: Number(cmrForm.yerSayi) || 0,
        invoices: cmrForm.invoysNo
          ? [{
              no: `İNV ${cmrForm.invoysNo}`,
              mal: cmrForm.malTesviri || '—',
              miqdar: cmrForm.yerSayi ? `${cmrForm.yerSayi} yer` : '—',
              mebleg: Number(cmrForm.invoysMebleg) || 0,
              valyuta: cmrForm.valyuta || 'USD',
            }]
          : [],
      }
      setExtraCmrs(list => list.map(item => (item.no === editingCmr ? { ...item, ...patch } : item)))
      setCmrEdits(edits => ({ ...edits, [editingCmr]: { ...edits[editingCmr], ...patch } }))
      setEditingCmr(null)
      setCmrForm(emptyCmrForm)
      if (cmrForm.beyannameKod.trim()) {
        const kod = cmrForm.beyannameKod.trim()
        const known = declarations.find(item => item.kod === kod)
        setCmrEdits(edits => ({
          ...edits,
          [editingCmr]: {
            ...edits[editingCmr],
            declarationKod: kod,
            declarationStatus: known?.status ?? 'Əl ilə daxil edilib',
            egbStatus: 'bagli',
            egbQeyd: known ? `Operator əl ilə bağladı · ${known.status}` : 'Operator əl ilə daxil etdi',
          },
        }))
        setEgbFetched(list => (list.includes(editingCmr) ? list : [...list, editingCmr]))
      }
      setCmrModalOpen(false)
      toast.success(`${editingCmr} yeniləndi`)
      return
    }

    const manualKod = cmrForm.beyannameKod.trim()
    const knownDeclaration = manualKod ? declarations.find(item => item.kod === manualKod) : undefined
    const record: CmrRecord = {
      no: no.toUpperCase().startsWith('CMR') ? no.toUpperCase() : `CMR ${no.toUpperCase()}`,
      gonderen: cmrForm.gonderen || '—',
      alan: cmrForm.alan || '—',
      yuklemeYeri: ship?.menshe?.split(',')[0] ?? '—',
      boshaltmaYeri: vehicle?.teyinat ?? ship?.teyinat?.split(',')[0] ?? '—',
      malTesviri: cmrForm.malTesviri || '—',
      bruttoKq: Number(cmrForm.bruttoKq) || 0,
      yerSayi: Number(cmrForm.yerSayi) || 0,
      invoices: cmrForm.invoysNo
        ? [{
            no: `İNV ${cmrForm.invoysNo}`,
            mal: cmrForm.malTesviri || '—',
            miqdar: cmrForm.yerSayi ? `${cmrForm.yerSayi} yer` : '—',
            mebleg: Number(cmrForm.invoysMebleg) || 0,
            valyuta: cmrForm.valyuta || 'USD',
          }]
        : [],
      declarationKod: manualKod || null,
      declarationStatus: manualKod ? (knownDeclaration?.status ?? 'Əl ilə daxil edilib') : null,
      egbStatus: manualKod ? 'bagli' : 'gozleyir',
      egbQeyd: manualKod
        ? (knownDeclaration ? `Operator əl ilə əlavə etdi · ${knownDeclaration.status}` : 'Operator əl ilə əlavə etdi — EGB-də tapılmadı')
        : 'Bəyannamə yazılmayıb — EGB-də qeyd yoxdur',
    }
    setExtraCmrs(list => [...list, record])
    if (manualKod) setEgbFetched(list => (list.includes(record.no) ? list : [...list, record.no]))
    setCmrForm(emptyCmrForm)
    setCmrModalOpen(false)
    toast.success(manualKod
      ? `${manualKod} bəyannaməsi siyahıya əlavə edildi`
      : `${record.no} siyahıya əlavə edildi — bəyannamə gözlənilir`)
  }

  /** Deklarasiyanı əl ilə bu sətrə bağlayır (EGB-də tapılan kod daxil edilir). */
  const bindDeclaration = (cmr: CmrRecord, kod: string) => {
    const trimmed = kod.trim()
    if (!trimmed) return
    const known = declarations.find(item => item.kod === trimmed)
    setCmrEdits(edits => ({
      ...edits,
      [cmr.no]: {
        ...edits[cmr.no],
        declarationKod: trimmed,
        declarationStatus: known?.status ?? 'Əl ilə bağlandı',
        egbStatus: 'bagli',
        egbQeyd: known
          ? `Operator əl ilə bağladı · ${known.status}`
          : 'Operator əl ilə bağladı — bəyannamə bazada tapılmadı',
      },
    }))
    setEgbFetched(list => (list.includes(cmr.no) ? list : [...list, cmr.no]))
    setGoodsAssigned(false)
    toast.success(`${cmr.no} → ${trimmed} bağlandı`)
  }

  const unbindDeclaration = (cmr: CmrRecord) => {
    setCmrEdits(edits => ({
      ...edits,
      [cmr.no]: {
        ...edits[cmr.no],
        declarationKod: null,
        declarationStatus: null,
        egbStatus: 'gozleyir',
        egbQeyd: 'Operator bağlantını ləğv etdi',
      },
    }))
    setEgbFetched(list => list.filter(no => no !== cmr.no))
    setGoodsAssigned(false)
    toast.success(`${cmr.no} bağlantısı ləğv edildi`)
  }

  const registerTrailer = () => {
    const unit = trailerPlate || transportDetails.dovletNisani || plateKey
    if (!unit) return toast.warning('Nəqliyyat nişanı tapılmadı')
    const code = makeTrailerCode(unit, voyage?.id ?? '')
    setTrailerCode(code)
    setGoodsAssigned(false)
    toast.success(
      trailerPlate
        ? `Qoşqu qeydiyyata alındı · kod ${code}`
        : `Tır qoşqusuz qeydiyyata alındı · kod ${code}`,
    )
  }

  const assignGoods = () => {
    if (!trailerCode) return toast.warning('Əvvəlcə qoşqunu qeydiyyata alın')
    setGoodsAssigned(true)
    toast.success(`${linkedCount} bəyannamə üzrə mallar ${plateKey} tırına mənimsədildi`)
  }

  const goNext = () => {
    if (stage === 'nv') {
      if (vaisState === 'sorgu') return toast.warning('VAİS / İGİS cavabı gözlənilir')
      if (!vehicleRegistered) {
        return toast.warning('Nəqliyyat vasitəsi VAİS/İGİS-də tapılmadı — məlumatları əl ilə əlavə edin')
      }
      setStage('egb')
      return
    }
    if (stage === 'egb') {
      if (egbState === 'sorgu') return toast.warning('EGB cavabı gözlənilir')
      if (cmrs.length === 0) return toast.warning('Ən azı bir bəyannamə olmalıdır')
      if (!egbComplete) return toast.warning('Hər sətir EGB bəyannaməsi ilə bağlanmalıdır')
      if (!effectiveRisk) return toast.warning('Risk cavabı gözlənilir')
      if (effectiveRisk === 'red' && !manualRoute) return toast.warning('Qırmızı statusda yoxlama kanalı seçin')
      // Yoxlama nəticəsi gözlənilə bilər — növbəti mərhələlər açıqdır, yalnız yekun təsdiq bağlıdır.
      setStage('vais')
      return
    }
    if (stage === 'vais') {
      if (!trailerCode) return toast.warning('Qoşqunu qeydiyyata alın')
      if (!goodsAssigned) return toast.warning('Malları tıra mənimsədin')
      if (!permitReady) return toast.warning('İcazə blankını qeydə alın və sürücüyə qaytarın')
      setStage('vergi')
    }
  }

  const goBack = () => {
    const index = STAGE_ORDER.indexOf(stage)
    if (index > 0) {
      setStage(STAGE_ORDER[index - 1])
      return
    }
    document.querySelector('.vehicle-deck-selector')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const finalConfirm = () => {
    if (!ship || !voyage) return toast.warning('Əvvəlcə gəmi seçin')
    if (!taxConfirmed) return toast.warning('Yol vergisini təsdiqləyin')
    if (!vehicleRegistered) {
      setStage('nv')
      return toast.warning('Nəqliyyat vasitəsi qeydə alınmalıdır (Addım 2)')
    }
    if (!egbComplete) return toast.warning('Bütün sətirlər bəyannamə ilə bağlanmalıdır (Addım 3)')
    if (!vaisComplete) return toast.warning('Qeydiyyat və icazə blankı tamamlanmalıdır (Addım 4)')
    // Sərbəst keçid mərhələ yoxlamalarını atlaya bilər — məcburi qayda burada da tətbiq olunur.
    if (effectiveRisk === 'red' && !manualRoute) {
      setStage('egb')
      return toast.error('Qırmızı statusda yoxlama kanalı mütləqdir')
    }
    // Qırmızı kanal: yoxlama uğurla bitmədən qeydiyyat tamamlanmır.
    if (inspectionBlocking) {
      setStage('egb')
      return toast.error('Yoxlamanın nəticəsi gözlənilir — “Yoxlamadan uğurla keçdi” təsdiqindən sonra tamamlana bilər')
    }

    const postKod = effectiveRisk === 'red'
      ? (manualRoute === 'X ray' ? '552' : manualRoute === 'Kinoloji itin tətbiqi' ? '553' : '551')
      : '545'
    const now = new Date()
    const mal = primaryDeclaration?.mallar?.[0]
    const cekiParts = [
      mal?.netCeki != null ? `netto ${mal.netCeki.toLocaleString('az-AZ')} kq` : null,
      mal?.bruttoCeki != null ? `brutto ${mal.bruttoCeki.toLocaleString('az-AZ')} kq` : null,
    ].filter(Boolean)
    const buraxilis = now.toLocaleString('az-AZ')
    const permitLabel = TRANSPORT_PERMIT_OPTIONS.find(p => p.id === permit.novu)?.label ?? 'İcazə blankı'
    const egbNotes = cmrs.filter(c => c.egbStatus === 'uygunsuzluq').map(c => `${c.no}: ${c.egbQeyd}`)
    const blockedGoods = goodsLines.filter(line => line.status === 'saxlanilib' || line.status === 'nezaretde')
    const goodsNotes = blockedGoods.map(line => `${line.ad}: ${GOODS_STATUS_LABEL[line.status]} — ${line.statusQeyd}`)
    const inspectionNote = effectiveRisk === 'red' && manualRoute
      ? `Əlavə yoxlama: ${manualRoute} · nəticə: ${inspection === 'kecdi' ? 'uğurla keçdi' : inspection === 'kecmedi' ? 'uğursuz' : 'gözlənilir'}`
      : null
    const holdRequired = effectiveRisk === 'red' && inspection !== 'kecdi'

    const record: SavedRegistration = {
      id: `REG-${now.getTime()}`,
      savedAt: buraxilis,
      shipId: ship.id,
      shipName: ship.ad,
      plate: transportDetails.dovletNisani || plateKey,
      declarationKod: primaryDeclarationKod || cmrs[0]?.no || '—',
      malAdi: mal?.ad || cmrs[0]?.malTesviri || '—',
      ceki: cekiParts.length ? cekiParts.join(' · ') : '—',
      qeydeAlınma: primaryDeclaration?.qeydiyyatTarixi || primaryDeclaration?.tarix || buraxilis,
      buraxilis,
      riskVerdict: effectiveRisk ?? 'green',
      riskReasons: riskOverride ? [...riskReasons, `İnspektor əl ilə dəyişdi: ${riskOverride === 'red' ? 'qırmızı' : 'yaşıl'}`] : riskReasons,
      manualRoute: effectiveRisk === 'red' ? manualRoute : null,
      waitReasons: effectiveRisk === 'red'
        ? [...(inspectionNote ? [inspectionNote] : []), ...riskReasons, ...egbNotes, ...goodsNotes]
        : ([...egbNotes, ...goodsNotes].length ? [...egbNotes, ...goodsNotes] : undefined),
      roadTaxes: [roadTaxLabel],
      permits: [`${permitLabel} № ${permit.nomre} · ${permit.verenOrqan}`],
      transport: {
        ...transportDetails,
        qosquKodu: trailerCode,
        qeydiyyatMenbeyi: vaisRecord?.menbe ?? '—',
        qeydiyyatSorgusu: vaisRecord?.sorguId ?? '—',
        texPasport: vaisRecord?.texPasport ?? '—',
        dasiyici: vaisRecord?.dasiyici ?? '—',
        surucu: vaisRecord?.surucu ?? '—',
      },
      voyageId: voyage.id,
      cmrCount: cmrs.length,
      declarationKods: cmrs.map(c => c.declarationKod).filter((k): k is string => Boolean(k)),
      trailerPlate,
      trailerCode,
      permitBlank: {
        novu: permitLabel,
        nomre: permit.nomre,
        verenOrqan: permit.verenOrqan,
        etibarliliq: permit.etibarliliq,
        qaytarildi: permit.qaytarildi,
      },
      goods: goodsLines.slice(0, 20).map(line => ({
        ad: line.ad,
        hsKod: line.hsKod,
        status: GOODS_STATUS_LABEL[line.status],
        qeyd: line.statusQeyd,
      })),
      // Saxlanılan / nəzarətdə qalan mal varsa tır buraxılmır.
      status: holdRequired || blockedGoods.length > 0 ? 'Gözləmədə' : 'Buraxıldı',
      operator: profile.name,
      postKod,
    }

    addRegistration(record)
    addPostDecision({
      tarix: now.toLocaleDateString('az-AZ', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      kod: postKod,
      gemi: ship.ad,
      novu: 'Giriş',
      status: effectiveRisk === 'red' && manualRoute
        ? `Təsdiqləndi · ${manualRoute}${inspection === 'kecdi' ? ' (keçdi)' : ''}`
        : 'Təsdiqləndi',
      operator: profile.name,
    })
    setLastSaved(record)
    setDone(true)
    confetti({ particleCount: 160, spread: 85, origin: { y: .65 }, colors: ['#0A4D8C', '#00B4D8', '#F4A261', '#2A9D8F'] })
    toast.success('Qeydiyyat təsdiqləndi və DB-yə yazıldı')
  }

  const steps: Array<{ n: string; label: string; ok: boolean; icon: LucideIcon; target?: FlowStage }> = [
    { n: '1', label: 'Gəmi · Səfər', ok: Boolean(ship), icon: Ship },
    { n: '2', label: 'Nəqliyyat vasitəsinin qeydiyyatı', ok: vehicleRegistered, icon: Truck, target: 'nv' },
    { n: '3', label: 'Bəyannamə · EGB', ok: egbComplete && Boolean(effectiveRisk) && !inspectionBlocking, icon: ScanSearch, target: 'egb' },
    { n: '4', label: 'Qeydiyyat · İcazə', ok: vaisComplete, icon: FileBadge, target: 'vais' },
    { n: '5', label: 'Yol vergisi', ok: taxConfirmed, icon: Receipt, target: 'vergi' },
  ]
  const activeStepIndex = done ? 4
    : stage === 'vergi' ? 4
    : stage === 'vais' ? 3
    : stage === 'egb' ? 2
    : vehicleFound ? 1
    : ship ? 1 : 0

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
                setShipId(e.target.value)
                setVehicleFound(false)
                resetFlowState()
              }}
            >
              <option value="">— Gəmi seçin —</option>
              {ships.filter(g => g.status === 'Körpüdə' || g.status === 'Lövbərdə' || g.id === shipId).map(g => (
                <option value={g.id} key={g.id}>{g.ad} ({g.id}) — {g.status}</option>
              ))}
            </select>
          </label>
          <Button
            type="button"
            variant="secondary"
            disabled={!ship}
            onClick={() => { if (ship) setShipModalOpen(true) }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 13px',
              fontSize: 12, fontWeight: 700, opacity: ship ? 1 : 0.45, cursor: ship ? 'pointer' : 'not-allowed',
            }}
            title={ship ? 'Seçilmiş gəminin bütün detallarına bax' : 'Əvvəlcə gəmi seçin'}
          >
            <Ship size={14} /> Gəmi detalları
          </Button>
        </div>
      }
    />

    {!ship ? (
      <Card className="registration-empty-state" hover={false}>
        <div className="registration-empty-content">
          <div className="registration-empty-badge">
            <Ship size={36} />
          </div>
          <h2>Limandakı gəmini seçin</h2>
          <p>
            Qeydiyyat prosesinə başlamaq və gəmidəki tırların göyərtə planını görmək üçün yuxarıdakı menyudan gəmi seçin.
          </p>
          <div className="registration-quick-ships">
            <small>Mövcud aktiv gəmilər:</small>
            <div className="registration-quick-chips">
              {ships.filter(g => g.status === 'Körpüdə' || g.status === 'Lövbərdə').map(g => (
                <button key={g.id} type="button" className="quick-ship-chip" onClick={() => setShipId(g.id)}>
                  <Ship size={13} />
                  <span>{g.ad}</span>
                  <span className={`chip-status ${g.status === 'Körpüdə' ? 'green' : 'amber'}`}>{g.status}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>
    ) : (
      <>
        <VehicleDeckSelector
          ship={ship}
          vehicles={shipVehicles}
          selectedPlate={vehicleFound ? plateKey : (shipVehicles[0]?.nomre ?? '')}
          registeredPlates={registrations.map(registration => registration.plate)}
          onSelect={selectDeckVehicle}
          declarations={declarations}
          registrations={registrations}
          onOpenShipDetails={() => setShipModalOpen(true)}
        />

        {vehicleFound && dossier && (
          <div id="reg-flow">
            <nav className="registration-stepper registration-stepper-5 is-navigable" aria-label="Qeydiyyat mərhələləri">
              {steps.map((step, i) => {
                const Icon = step.icon
                return (
                  <div
                    key={step.n}
                    role={step.target ? 'button' : undefined}
                    tabIndex={step.target ? 0 : undefined}
                    className={`${step.ok ? 'complete' : i === activeStepIndex ? 'active' : ''}${step.target ? ' clickable' : ''}`}
                    title={step.target ? `${step.label} mərhələsinə keç` : undefined}
                    onClick={() => step.target && setStage(step.target)}
                    onKeyDown={e => {
                      if (step.target && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault()
                        setStage(step.target)
                      }
                    }}
                  >
                    <span>{step.ok ? <Check /> : <Icon />}</span>
                    <div><small>ADDIM {step.n}</small><strong>{step.label}</strong></div>
                    {i < steps.length - 1 && <i />}
                  </div>
                )
              })}
            </nav>

            <Card className="registration-form" hover={false}>
              {stage === 'nv' && (
                <section className="registration-step">
                  <header>
                    <span className="step-number">02</span>
                    <div>
                      <h2>Nəqliyyat vasitəsinin qeydiyyatı</h2>
                      <p>Tır seçiləndə sistem VAİS / İGİS bazasına sorğu göndərir və nəqliyyat vasitəsinin qeydiyyat məlumatlarını gətirir.</p>
                    </div>
                    {vehicleRegistered && <CheckCircle2 className="step-check" />}
                  </header>

                  <div className={`lookup-banner ${vaisState === 'sorgu' ? 'busy' : vaisState === 'tapilmadi' ? 'warn' : vehicleRegistered ? 'ok' : ''}`}>
                    <span className="lookup-icon">
                      {vaisState === 'sorgu'
                        ? <ScanSearch className="spin" />
                        : vaisState === 'tapilmadi' ? <AlertTriangle /> : <Database />}
                    </span>
                    <div>
                      <strong>
                        {vaisState === 'sorgu' ? 'VAİS / İGİS bazasına sorğu göndərilir…'
                          : vaisState === 'tapildi' ? `VAİS / İGİS: qeyd tapıldı · sorğu ${vaisRecord?.sorguId ?? ''}`
                          : vaisState === 'elIle' ? `Əl ilə qeydə alındı · ${vaisRecord?.sorguId ?? ''}`
                          : vaisState === 'tapilmadi' ? 'VAİS / İGİS-də bu nişan üzrə qeyd tapılmadı'
                          : 'Göyərtə planından tır seçin'}
                      </strong>
                      <small>
                        {vaisState === 'sorgu' ? `Dövlət nişanı ${plateKey} üzrə axtarış aparılır…`
                          : vaisState === 'tapilmadi' ? 'Nəqliyyat vasitəsinin məlumatlarını aşağıdakı formada əl ilə daxil edin'
                          : vehicleRegistered ? 'Məlumatlar bazadan gəldi — yoxlayın və “Növbəti mərhələ” ilə davam edin'
                          : 'Sorğu üçün nəqliyyat vasitəsi seçilməlidir'}
                      </small>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={requeryVais}
                      disabled={vaisState === 'sorgu' || !vehicleFound}
                    >
                      <RefreshCw size={13} /> Təkrar sorğu
                    </Button>
                  </div>

                  {vaisState === 'sorgu' && (
                    <div className="lookup-skeleton">
                      {[0, 1, 2, 3, 4, 5].map(row => <span key={row} className="skeleton" />)}
                    </div>
                  )}

                  {vehicleRegistered && vaisRecord && (
                    <>
                      <div className="review-summary-grid vais-record-grid">
                        <Data label="Dövlət qeydiyyat nişanı" value={vaisRecord.dovletNisani || '—'} />
                        <Data label="Qoşqu nişanı" value={vaisRecord.qosquNisani || 'Qoşqusuz'} />
                        <Data label="Marka / model" value={vaisRecord.marka || '—'} />
                        <Data label="Nəqliyyat vasitəsinin növü" value={vaisRecord.novu || '—'} />
                        <Data label="Buraxılış ili" value={vaisRecord.istehsalIli || '—'} />
                        <Data label="Ox sayı" value={vaisRecord.oxSayi || '—'} />
                        <Data label="Texniki pasport" value={vaisRecord.texPasport || '—'} />
                        <Data label="Qeydiyyat ölkəsi" value={vaisRecord.qeydiyyatOlkesi || '—'} />
                        <Data label="Daşıyıcı" value={vaisRecord.dasiyici || '—'} />
                        <Data label="Sürücü" value={vaisRecord.surucu || '—'} />
                        <Data label="Sürücülük vəsiqəsi" value={vaisRecord.vesiqe || '—'} />
                        <Data label="Məlumat mənbəyi" value={vaisRecord.menbe || '—'} />
                      </div>
                      <p className="egb-summary">
                        Qeyd mənbəyi <b>{vaisRecord.menbe}</b> · sorğu nömrəsi <b>{vaisRecord.sorguId}</b>
                        {' · '}növbəti mərhələdə bəyannamələr <b>{plateKey}</b> nişanı üzrə EGB-dən gətiriləcək.
                      </p>
                    </>
                  )}

                  {vaisState === 'tapilmadi' && (
                    <div className="manual-vehicle-card">
                      <header>
                        <span><Plus size={14} /></span>
                        <div>
                          <b>Nəqliyyat vasitəsini əl ilə əlavə et</b>
                          <small>Baza cavab vermədikdə operator məlumatları özü daxil edir və qeydiyyat davam edir.</small>
                        </div>
                      </header>
                      <div className="tax-params-grid">
                        <label>Dövlət qeydiyyat nişanı
                          <input
                            value={manualVehicle.dovletNisani}
                            onChange={e => setManualVehicle(v => ({ ...v, dovletNisani: e.target.value.toUpperCase() }))}
                            placeholder="Məsələn: 52 AEJ 596"
                          />
                        </label>
                        <label>Qoşqu nişanı
                          <input
                            value={manualVehicle.qosquNisani}
                            onChange={e => setManualVehicle(v => ({ ...v, qosquNisani: e.target.value.toUpperCase() }))}
                            placeholder="Məsələn: 52 ACY 559"
                          />
                        </label>
                        <label>Marka / model
                          <input
                            value={manualVehicle.marka}
                            onChange={e => setManualVehicle(v => ({ ...v, marka: e.target.value }))}
                            placeholder="Məsələn: Mercedes Actros"
                          />
                        </label>
                        <label>Nəqliyyat vasitəsinin növü
                          <select value={manualVehicle.novu} onChange={e => setManualVehicle(v => ({ ...v, novu: e.target.value }))}>
                            <option>Yük avtomobili</option>
                            <option>Minik avtomobili</option>
                            <option>Avtobus</option>
                          </select>
                        </label>
                        <label>Buraxılış ili
                          <input
                            value={manualVehicle.istehsalIli}
                            onChange={e => setManualVehicle(v => ({ ...v, istehsalIli: e.target.value }))}
                            placeholder="Məsələn: 2019"
                          />
                        </label>
                        <label>Ox sayı
                          <input
                            value={manualVehicle.oxSayi}
                            onChange={e => setManualVehicle(v => ({ ...v, oxSayi: e.target.value }))}
                            placeholder="Məsələn: 5"
                          />
                        </label>
                        <label>Texniki pasport
                          <input
                            value={manualVehicle.texPasport}
                            onChange={e => setManualVehicle(v => ({ ...v, texPasport: e.target.value.toUpperCase() }))}
                            placeholder="Məsələn: TP 481203"
                          />
                        </label>
                        <label>Qeydiyyat ölkəsi
                          <input
                            value={manualVehicle.qeydiyyatOlkesi}
                            onChange={e => setManualVehicle(v => ({ ...v, qeydiyyatOlkesi: e.target.value }))}
                            placeholder="Məsələn: Qazaxıstan"
                          />
                        </label>
                        <label>Daşıyıcı
                          <input
                            value={manualVehicle.dasiyici}
                            onChange={e => setManualVehicle(v => ({ ...v, dasiyici: e.target.value }))}
                            placeholder="Məsələn: KAZ TRANS LOGISTIC LLP"
                          />
                        </label>
                        <label>Sürücü
                          <input
                            value={manualVehicle.surucu}
                            onChange={e => setManualVehicle(v => ({ ...v, surucu: e.target.value }))}
                            placeholder="Ad, soyad"
                          />
                        </label>
                        <label>Sürücülük vəsiqəsi
                          <input
                            value={manualVehicle.vesiqe}
                            onChange={e => setManualVehicle(v => ({ ...v, vesiqe: e.target.value.toUpperCase() }))}
                            placeholder="Məsələn: SV 4820193"
                          />
                        </label>
                      </div>
                      <div className="manual-vehicle-actions">
                        <span className="chain-rule">
                          <FileCheck2 size={13} /> Əl ilə daxil edilən qeyd sorğu jurnalında “Əl ilə” mənbəyi ilə saxlanılır.
                        </span>
                        <Button type="button" onClick={saveManualVehicle}>
                          <Plus /> Nəqliyyat vasitəsini qeydə al
                        </Button>
                      </div>
                    </div>
                  )}

                  <details className="manual-fields" open>
                    <summary>Nəqliyyat vasitəsi haqqında məlumatlar — əl ilə düzəliş</summary>
                    <div className="tax-params-grid">
                      <label>Keçmə məqsədi
                        <select value={transportDetails.kecmeMeqsedi} onChange={e => setTransportDetails(d => ({ ...d, kecmeMeqsedi: e.target.value }))}>
                          <option>Ölkəyə giriş</option>
                          <option>Ölkədən çıxış</option>
                          <option>Tranzit</option>
                        </select>
                      </label>
                      <label>Avtomobilin növü
                        <select value={transportDetails.avtomobilNovu} onChange={e => setTransportDetails(d => ({ ...d, avtomobilNovu: e.target.value }))}>
                          <option>Yük avtomobili</option>
                          <option>Minik avtomobili</option>
                          <option>Avtobus</option>
                        </select>
                      </label>
                      <label>Dövlət qeydiyyat nişanı
                        <input value={transportDetails.dovletNisani} onChange={e => setTransportDetails(d => ({ ...d, dovletNisani: e.target.value.toUpperCase() }))} />
                      </label>
                      <label>Qoşqu nişanı
                        <input value={transportDetails.qosquNisani} onChange={e => setTransportDetails(d => ({ ...d, qosquNisani: e.target.value.toUpperCase() }))} />
                      </label>
                      <label>Avtomobil markası
                        <input value={transportDetails.avtomobilMarkasi} onChange={e => setTransportDetails(d => ({ ...d, avtomobilMarkasi: e.target.value }))} />
                      </label>
                      <label>Qeydiyyat nömrəsi
                        <input value={transportDetails.qeydiyyatNomresi} onChange={e => setTransportDetails(d => ({ ...d, qeydiyyatNomresi: e.target.value }))} />
                      </label>
                      <label>Qeydiyyat tarixi
                        <input value={transportDetails.qeydiyyatTarixi} onChange={e => setTransportDetails(d => ({ ...d, qeydiyyatTarixi: e.target.value }))} />
                      </label>
                      <label>Hərəkət marşrutu
                        <input value={transportDetails.hereketMarsrutu} onChange={e => setTransportDetails(d => ({ ...d, hereketMarsrutu: e.target.value }))} />
                      </label>
                      <label>Xüsusilik
                        <select value={transportDetails.xususilik} onChange={e => setTransportDetails(d => ({ ...d, xususilik: e.target.value }))}>
                          <option>Yüklü</option>
                          <option>Boş</option>
                        </select>
                      </label>
                      <label>Təyinat gömrük orqanı
                        <input value={transportDetails.teyinatGomrukOrqani} onChange={e => setTransportDetails(d => ({ ...d, teyinatGomrukOrqani: e.target.value }))} />
                      </label>
                    </div>
                  </details>
                </section>
              )}

              {stage === 'egb' && (
                <section className="registration-step">
                  <header>
                    <span className="step-number">03</span>
                    <div>
                      <h2>Bəyannamə · EGB</h2>
                      <p>Sistem tırın dövlət nişanı üzrə EGB-yə sorğu göndərir və bu nəqliyyat vasitəsinə yazılmış bəyannamələri CMR/invoys məlumatı ilə birlikdə siyahı kimi gətirir.</p>
                    </div>
                    {egbComplete && !inspectionBlocking && <CheckCircle2 className="step-check" />}
                  </header>

                  <div className={`lookup-banner ${egbState === 'sorgu' ? 'busy' : egbState === 'tapilmadi' ? 'warn' : egbComplete ? 'ok' : ''}`}>
                    <span className="lookup-icon">
                      {egbState === 'sorgu' ? <ScanSearch className="spin" /> : egbState === 'tapilmadi' ? <AlertTriangle /> : <Database />}
                    </span>
                    <div>
                      <strong>
                        {egbState === 'sorgu' ? 'EGB-yə sorğu göndərilir…'
                          : egbState === 'tapilmadi' ? 'EGB-də bu nişan üzrə bəyannamə tapılmadı'
                          : `EGB: ${egbFoundCount} bəyannamə gətirildi`}
                      </strong>
                      <small>
                        {egbState === 'sorgu' ? `Dövlət nişanı ${plateKey} üzrə bəyannamələr axtarılır…`
                          : egbState === 'tapilmadi' ? 'Bəyannaməni əl ilə əlavə edin və ya təkrar sorğu göndərin'
                          : `${plateKey} · siyahıda ${cmrs.length} sətir${cmrs.length > egbFoundCount ? ` (${cmrs.length - egbFoundCount} əl ilə)` : ''} · ${cmrs.reduce((sum, cmr) => sum + cmr.invoices.length, 0)} invoys`}
                      </small>
                    </div>
                    <Button type="button" variant="secondary" onClick={requeryEgb} disabled={egbState === 'sorgu'}>
                      <RefreshCw size={13} /> Təkrar sorğu
                    </Button>
                  </div>

                  {egbState === 'sorgu' ? (
                    <div className="lookup-skeleton rows">
                      {[0, 1, 2].map(row => <span key={row} className="skeleton" />)}
                    </div>
                  ) : (
                    <div className="egb-reconcile">
                      {cmrs.map(cmr => {
                        const linked = isLinked(cmr)
                        const tone = linked ? 'success' : cmr.egbStatus === 'uygunsuzluq' ? 'danger' : 'warning'
                        const risk = declarationRisks[cmr.no]
                        return (
                          <article key={cmr.no} className={`egb-row ${tone}`}>
                            <div className="egb-cell">
                              <small>BƏYANNAMƏ</small>
                              <strong>{cmr.declarationKod ?? 'Yazılmayıb'}</strong>
                              <span>{cmr.declarationStatus ?? 'EGB-də qeyd yoxdur'}</span>
                            </div>
                            <Link2 size={14} className="egb-link-icon" />
                            <div className="egb-cell">
                              <small>CMR · İNVOYS</small>
                              <strong>{cmr.no}</strong>
                              <span>
                                {cmr.invoices[0]
                                  ? `${cmr.invoices[0].no}${cmr.invoices[0].mebleg ? ` · ${cmr.invoices[0].mebleg.toLocaleString('az-AZ')} ${cmr.invoices[0].valyuta}` : ''}`
                                  : 'invoys yoxdur'}
                              </span>
                            </div>
                            <div className="egb-cell grow">
                              <small>MAL · GÖNDƏRƏN → ALAN</small>
                              <strong>{cmr.malTesviri}</strong>
                              <span>
                                {cmr.gonderen} → {cmr.alan}
                                {cmr.bruttoKq ? ` · ${cmr.bruttoKq.toLocaleString('az-AZ')} kq` : ''}
                              </span>
                            </div>
                            {risk && (
                              <span
                                className={`status-chip ${risk.verdict === 'red' ? 'danger' : 'success'}`}
                                title={risk.reasons.join(' · ')}
                              >
                                {risk.verdict === 'red' ? 'Qırmızı status' : 'Yaşıl status'}
                              </span>
                            )}
                            <span className={`status-chip ${tone}`}>
                              {linked ? EGB_STATUS_LABEL.bagli : EGB_STATUS_LABEL[cmr.egbStatus]}
                            </span>
                            <div className="egb-actions">
                              <input
                                list="egb-declaration-codes"
                                className="egb-bind-input"
                                placeholder="Bəyannamə kodu…"
                                defaultValue={cmr.declarationKod ?? ''}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    bindDeclaration(cmr, (e.target as HTMLInputElement).value)
                                  }
                                }}
                                onBlur={e => {
                                  const value = e.target.value.trim()
                                  if (value && value !== (cmr.declarationKod ?? '')) bindDeclaration(cmr, value)
                                }}
                              />
                              <button type="button" onClick={() => openCmrEditor(cmr)} title="Sətri redaktə et" className="egb-icon-btn">
                                <Pencil size={13} />
                              </button>
                              {cmr.declarationKod && (
                                <button type="button" className="egb-unbind" onClick={() => unbindDeclaration(cmr)} title="Bağlantını ləğv et">
                                  <X size={13} />
                                </button>
                              )}
                              <button type="button" className="egb-icon-btn danger" onClick={() => removeCmr(cmr)} title="Siyahıdan çıxar">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </article>
                        )
                      })}
                      {cmrs.length === 0 && (
                        <p className="egb-empty">EGB-dən bəyannamə gəlmədi — sətri əl ilə əlavə edin.</p>
                      )}
                    </div>
                  )}

                  <datalist id="egb-declaration-codes">
                    {declarations.slice(0, 200).map(item => (
                      <option key={item.kod} value={item.kod}>{item.avtomobil} · {item.status}</option>
                    ))}
                  </datalist>

                  <div className="chain-footer">
                    <span className="chain-rule">
                      <FileCheck2 size={13} /> 1 CMR = 1 bəyannamə · {cmrs.length} sətir → {linkedCount} bağlandı
                      {' · '}mal mövqeyi: {goodsSummary.total} ({goodsSummary.released} buraxılıb)
                    </span>
                    <Button type="button" variant="ghost" onClick={() => openCmrEditor()}>
                      <Plus /> Bəyannamə əlavə et
                    </Button>
                  </div>

                  <p className="egb-summary">
                    Gözlənilən <b>{cmrs.length}</b> · Bağlanmış <b>{linkedCount}</b> · Çatışmır <b>{cmrs.length - linkedCount}</b>
                    {' · '}EGB axtarışı nişan üzrə: <b>{plateKey}</b>
                  </p>

                  <div className="risk-override">
                    <small>SİSTEM CAVABINI ƏL İLƏ DƏYİŞ</small>
                    <div>
                      <button type="button" className={effectiveRisk === 'green' ? 'selected green' : ''} onClick={() => setRiskOverride('green')}>Yaşıl</button>
                      <button type="button" className={effectiveRisk === 'red' ? 'selected red' : ''} onClick={() => setRiskOverride('red')}>Qırmızı</button>
                      <button type="button" onClick={() => setRiskOverride(null)} disabled={!riskOverride}>Avtomatik</button>
                    </div>
                  </div>

                  {riskChecking && !riskOverride && (
                    <div className="risk-result pending">
                      <ScanSearch className="spin" />
                      <div><strong>Bəyannamə statusları yoxlanılır…</strong></div>
                    </div>
                  )}
                  {(!riskChecking || riskOverride) && effectiveRisk === 'green' && (
                    <div className="risk-result green">
                      <ShieldCheck />
                      <div>
                        <strong>Sistem cavabı: YAŞIL</strong>
                        <p>{riskOverride ? 'İnspektor əl ilə yaşıl kanal seçdi' : riskReasons[0]}</p>
                      </div>
                    </div>
                  )}
                  {(!riskChecking || riskOverride) && effectiveRisk === 'red' && (
                    <>
                      <div className="risk-result red">
                        <AlertTriangle />
                        <div>
                          <strong>Sistem cavabı: QIRMIZI</strong>
                          <p>EGB-dən qırmızı statuslu bəyannamə gəldi — yoxlama kanalı seçilməlidir.</p>
                          <ul>{riskReasons.map(reason => <li key={reason}>{reason}</li>)}</ul>
                        </div>
                      </div>
                      <div className="manual-route-grid">
                        {MANUAL_ROUTES.map(route => {
                          const Icon = route.icon
                          return (
                            <button
                              type="button"
                              key={route.id}
                              className={manualRoute === route.id ? 'selected' : ''}
                              onClick={() => sendToInspection(route.id)}
                            >
                              <Icon />
                              <span><b>{route.id}</b><small>{route.hint}</small></span>
                              {manualRoute === route.id && <Check />}
                            </button>
                          )
                        })}
                      </div>

                      {manualRoute && (
                        <div className={`inspection-panel ${inspection}`}>
                          <header>
                            <span>
                              {inspection === 'kecdi' ? <CheckCircle2 /> : inspection === 'kecmedi' ? <AlertTriangle /> : <ShieldAlert />}
                            </span>
                            <div>
                              <b>
                                {inspection === 'kecdi' ? `${manualRoute} — uğurla keçdi`
                                  : inspection === 'kecmedi' ? `${manualRoute} — uğursuz`
                                  : `${manualRoute} — nəticə gözlənilir`}
                              </b>
                              <small>
                                {inspection === 'kecdi'
                                  ? 'Normal prosedur davam edir — qeydiyyat tamamlana bilər.'
                                  : inspection === 'kecmedi'
                                    ? 'Nəqliyyat vasitəsi buraxılmır. Təkrar yoxlamaya göndərilə bilər.'
                                    : 'Növbəti mərhələlərə keçmək olar, lakin yoxlama təsdiqlənmədən qeydiyyat tamamlanmır.'}
                              </small>
                            </div>
                          </header>
                          <div className="inspection-actions">
                            {inspection !== 'kecdi' && (
                              <Button type="button" variant="success" onClick={passInspection}>
                                <ShieldCheck /> Yoxlamadan uğurla keçdi — davam et
                              </Button>
                            )}
                            {inspection === 'gozleyir' && (
                              <Button type="button" variant="danger" onClick={failInspection}>
                                <AlertTriangle /> Yoxlama uğursuz oldu
                              </Button>
                            )}
                            {inspection !== 'gozleyir' && (
                              <Button type="button" variant="ghost" onClick={() => setInspection('gozleyir')}>
                                <RotateCcw /> Təkrar yoxlamaya göndər
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </section>
              )}

              {stage === 'vais' && (
                <section className="registration-step">
                  <header>
                    <span className="step-number">04</span>
                    <div>
                      <h2>Qeydiyyat və icazə blankı</h2>
                      <p>Gəmi qeydiyyatdan sonra avtomobil bölməsində tır və qoşqu qeydə alınır, qoşqu kodu götürülür.</p>
                    </div>
                    {vaisComplete && <CheckCircle2 className="step-check" />}
                  </header>

                  <div className="vais-track">
                    <article className="vais-step done">
                      <span><Check size={13} /></span>
                      <div>
                        <b>Gəmi qeydiyyatı</b>
                        <small>{ship.ad} · {voyage?.id}</small>
                      </div>
                    </article>
                    <article className={`vais-step ${trailerCode ? 'done' : 'active'}`}>
                      <span>{trailerCode ? <Check size={13} /> : '2'}</span>
                      <div>
                        <b>Tır və qoşqu qeydiyyatı</b>
                        <small>
                          Tır {transportDetails.dovletNisani || plateKey}
                          {trailerPlate ? ` · Qoşqu ${trailerPlate}` : ' · qoşqusuz (qeyd yoxdur)'}
                        </small>
                      </div>
                      {trailerCode
                        ? <input
                            className="vais-code-input"
                            value={trailerCode}
                            onChange={e => setTrailerCode(e.target.value.toUpperCase())}
                            title="Qoşqu kodunu əl ilə düzəlt"
                          />
                        : <Button type="button" onClick={registerTrailer}>
                            {trailerPlate ? 'Qoşqunu qeydiyyata al' : 'Tırı qeydiyyata al'}
                          </Button>}
                    </article>
                    <article className={`vais-step ${goodsAssigned ? 'done' : trailerCode ? 'active' : ''}`}>
                      <span>{goodsAssigned ? <Check size={13} /> : '3'}</span>
                      <div>
                        <b>Malların tıra mənimsədilməsi</b>
                        <small>{linkedCount} bəyannamə · {cmrs.length} CMR</small>
                      </div>
                      {!goodsAssigned && (
                        <Button type="button" variant="secondary" disabled={!trailerCode} onClick={assignGoods}>
                          Malları mənimsət
                        </Button>
                      )}
                    </article>
                  </div>

                  <div className="tax-params-grid">
                    <label>İcazə blankının növü
                      <select
                        value={permit.novu}
                        onChange={e => setPermit(p => ({ ...p, novu: e.target.value as TransportPermitId | '', qaytarildi: false }))}
                      >
                        <option value="">Seçin…</option>
                        {TRANSPORT_PERMIT_OPTIONS.map(option => (
                          <option key={option.id} value={option.id}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                    <label>Blank nömrəsi
                      <input
                        value={permit.nomre}
                        onChange={e => setPermit(p => ({ ...p, nomre: e.target.value.toUpperCase(), qaytarildi: false }))}
                        placeholder="Məsələn: AZ 0 148 552"
                      />
                    </label>
                    <label>Verən orqan
                      <input value={permit.verenOrqan} onChange={e => setPermit(p => ({ ...p, verenOrqan: e.target.value }))} />
                    </label>
                    <label>Etibarlılıq müddəti
                      <input type="date" value={permit.etibarliliq} onChange={e => setPermit(p => ({ ...p, etibarliliq: e.target.value }))} />
                    </label>
                  </div>

                  <label className={`checklist-item${permit.qaytarildi ? ' selected' : ''}`} style={{ marginTop: 12 }}>
                    <input
                      type="checkbox"
                      checked={permit.qaytarildi}
                      disabled={!permit.novu || !permit.nomre.trim()}
                      onChange={e => setPermit(p => ({ ...p, qaytarildi: e.target.checked }))}
                    />
                    <span>
                      <b>Kağız blank qeydə alındı və sürücüyə qaytarıldı</b>
                      <small>Blankın orijinalı sürücüdə qalır, sistemdə yalnız qeyd saxlanılır.</small>
                    </span>
                  </label>
                </section>
              )}

              {stage === 'vergi' && (
                <section className="registration-step">
                  <header>
                    <span className="step-number">05</span>
                    <div>
                      <h2>Yol vergisi</h2>
                      <p>Vergi Məcəlləsi 211.1.1.3 — yük avtomobilləri, qoşqulu və yarımqoşqulu nəqliyyat</p>
                    </div>
                    {taxConfirmed && <CheckCircle2 className="step-check" />}
                  </header>

                  {inspectionBlocking && (
                    <div className="stage-blocked-note">
                      <ShieldAlert />
                      <div>
                        <b>Qırmızı kanal — yoxlama nəticəsi gözlənilir</b>
                        <small>
                          {manualRoute
                            ? `${manualRoute} nəticəsi daxil edilmədən qeydiyyat tamamlanmır. 3-cü addımda “Yoxlamadan uğurla keçdi” düyməsini basın.`
                            : '3-cü addımda yoxlama kanalını seçin və nəticəni təsdiqləyin.'}
                        </small>
                      </div>
                      <Button type="button" variant="secondary" onClick={() => setStage('egb')}>
                        3-cü addıma keç
                      </Button>
                    </div>
                  )}

                  <div className="tax-params-grid">
                    <label>Ölkədə qalma müddəti
                      <select
                        value={transportDetails.olkedeQalmaMuddeti}
                        onChange={e => {
                          setTaxConfirmed(false)
                          setTransportDetails(d => ({ ...d, olkedeQalmaMuddeti: e.target.value as StayPeriod }))
                        }}
                      >
                        {STAY_PERIOD_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                      </select>
                    </label>
                    <label>Ox sayı
                      <select
                        value={transportDetails.oxSinifi}
                        onChange={e => {
                          setTaxConfirmed(false)
                          setTransportDetails(d => ({ ...d, oxSinifi: e.target.value as AxleClass }))
                        }}
                      >
                        <option value="upto4">4 (dörd) oxa qədər</option>
                        <option value="over4">4 (dörd) ox və çox</option>
                      </select>
                    </label>
                    <label>Məbləği əl ilə düzəlt (USD)
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={taxOverride}
                        placeholder={String(roadTax.total)}
                        onChange={e => {
                          setTaxConfirmed(false)
                          setTaxOverride(e.target.value)
                        }}
                      />
                    </label>
                    {transportDetails.olkedeQalmaMuddeti === '1_il_ustu' && (
                      <label>1 ildən artıq gün sayı
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={transportDetails.artiqGunSayi}
                          onChange={e => {
                            setTaxConfirmed(false)
                            setTransportDetails(d => ({ ...d, artiqGunSayi: e.target.value }))
                          }}
                        />
                      </label>
                    )}
                  </div>

                  <div className="table-scroll">
                    <table className="payments-table road-tax-law-table">
                      <thead>
                        <tr>
                          <th>Ölkə ərazisində qaldığı müddət</th>
                          <th>4 oxa qədər</th>
                          <th>4 ox və çox</th>
                        </tr>
                      </thead>
                      <tbody>
                        {STAY_PERIOD_OPTIONS.map(period => {
                          const row = ROAD_TAX_TABLE[period.id]
                          const active = transportDetails.olkedeQalmaMuddeti === period.id
                          return (
                            <tr key={period.id} className={active ? 'active-tax-row' : ''}>
                              <td><strong>{period.label}</strong></td>
                              <td>{row.upto4} USD{period.id === '1_il_ustu' ? ' + 15 USD/gün' : ''}</td>
                              <td>{row.over4} USD{period.id === '1_il_ustu' ? ' + 30 USD/gün' : ''}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className={`road-tax-result${taxConfirmed ? ' confirmed' : ''}`}>
                    <div>
                      <small>HESABLANMIŞ YOL VERGİSİ · 211.1.1.3{taxTotal !== roadTax.total ? ' · ƏL İLƏ' : ''}</small>
                      <strong>{taxTotal.toLocaleString('az-AZ')} USD</strong>
                      <p>
                        {STAY_PERIOD_OPTIONS.find(o => o.id === transportDetails.olkedeQalmaMuddeti)?.label}
                        {' · '}
                        {transportDetails.oxSinifi === 'upto4' ? '4 oxa qədər' : '4 ox və çox'}
                        {transportDetails.olkedeQalmaMuddeti === '1_il_ustu' && roadTax.days > 0
                          ? ` · baza ${roadTax.base} + ${roadTax.days} gün × ${roadTax.dayRate} USD`
                          : ''}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant={taxConfirmed ? 'success' : 'primary'}
                      onClick={() => {
                        setTaxConfirmed(true)
                        toast.success(`Yol vergisi təsdiqləndi: ${taxTotal} USD`)
                      }}
                    >
                      {taxConfirmed ? <><Check /> Təsdiqləndi</> : 'Vergini təsdiqlə'}
                    </Button>
                  </div>

                  <div className="review-summary-grid" style={{ marginTop: 14 }}>
                    <Data label="Səfər" value={voyage?.id ?? '—'} />
                    <Data label="Nəqliyyat vasitəsi / Qoşqu" value={`${transportDetails.dovletNisani || plateKey}${trailerPlate ? ` · ${trailerPlate}` : ''}`} />
                    <Data label="Qeydiyyat mənbəyi" value={vaisRecord ? `${vaisRecord.menbe} · ${vaisRecord.sorguId}` : '—'} />
                    <Data label="Qoşqu kodu" value={trailerCode || '—'} />
                    <Data label="Bəyannamə" value={`${cmrs.length} sətir → ${linkedCount} bağlandı`} />
                    <Data label="Mal mövqeləri" value={`${goodsSummary.released}/${goodsSummary.total} buraxılıb · ${goodsSummary.blocked} nəzarətdə`} />
                    <Data
                      label="Risk / Yoxlama"
                      value={`${effectiveRisk === 'red'
                        ? `Qırmızı · ${manualRoute ?? '—'} · ${inspection === 'kecdi' ? 'keçdi' : inspection === 'kecmedi' ? 'uğursuz' : 'nəticə gözlənilir'}`
                        : 'Yaşıl'}${riskOverride ? ' (əl ilə)' : ''}`}
                    />
                    <Data label="İcazə blankı" value={permit.nomre ? `${TRANSPORT_PERMIT_OPTIONS.find(p => p.id === permit.novu)?.label} № ${permit.nomre}` : '—'} />
                  </div>
                </section>
              )}

              <footer className="registration-actions">
                <Button variant="ghost" onClick={goBack}>
                  <ArrowLeft /> {stage === 'nv' ? 'Tır seçiminə qayıt' : 'Geri'}
                </Button>
                {stage === 'vergi' ? (
                  <Button
                    variant="success"
                    onClick={finalConfirm}
                    disabled={!taxConfirmed || inspectionBlocking}
                    title={inspectionBlocking
                      ? 'Qırmızı kanal: yoxlama nəticəsi təsdiqlənmədən qeydiyyat tamamlanmır'
                      : !taxConfirmed ? 'Əvvəlcə yol vergisini təsdiqləyin' : 'Qeydiyyatı tamamla'}
                  >
                    <ShieldCheck /> Qeydiyyatı təsdiqlə
                  </Button>
                ) : (
                  <Button onClick={goNext}>Növbəti mərhələ <ArrowRight /></Button>
                )}
              </footer>
            </Card>
          </div>
        )}

        {vehicleFound && dossier && (
          <Card className="goods-detail-card" hover={false}>
            <header className="goods-detail-head">
              <div>
                <h2><PackageSearch size={16} /> Mal mövqeləri — detallı</h2>
                <p>
                  {plateKey} tırı üzrə {goodsLines.length} mövqe · bütün sahələr əl ilə düzəldilə bilər.
                  Status HS/XİF fəslinin nəzarət rejimindən və bəyannamənin ödənişlərindən törədilir.
                </p>
              </div>
              <div className="goods-detail-summary">
                <span className="status-chip success">{goodsSummary.released} buraxılıb</span>
                <span className="status-chip warning">{goodsSummary.pending} gözləyir</span>
                <span className="status-chip danger">{goodsSummary.blocked} nəzarətdə</span>
              </div>
            </header>

            <div className="table-scroll">
              <table className="payments-table goods-detail-table">
                <colgroup>
                  <col className="c-no" /><col className="c-name" /><col className="c-hs" />
                  <col className="c-qty" /><col className="c-net" /><col className="c-gross" />
                  <col className="c-value" /><col className="c-doc" /><col className="c-control" />
                  <col className="c-status" />
                </colgroup>
                <thead>
                  <tr>
                    <th>№</th>
                    <th>Mal adı</th>
                    <th>HS / XİF kodu</th>
                    <th>Miqdar</th>
                    <th>Netto, kq</th>
                    <th>Brutto, kq</th>
                    <th>Dəyər</th>
                    <th>CMR / Bəyannamə</th>
                    <th>Nəzarət rejimi</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {goodsLines.map((line, index) => (
                    <tr key={line.id} className={`goods-row ${GOODS_STATUS_TONE[line.status]}`}>
                      <td>{index + 1}</td>
                      <td>
                        <input
                          className="cell-input wide"
                          value={line.ad}
                          onChange={e => editGoods(line.id, { ad: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          className="cell-input"
                          value={line.hsKod}
                          onChange={e => editGoods(line.id, { hsKod: e.target.value, controls: goodsControls(e.target.value) })}
                        />
                      </td>
                      <td>
                        <input
                          className="cell-input"
                          value={line.miqdar}
                          onChange={e => editGoods(line.id, { miqdar: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          className="cell-input num"
                          type="number"
                          value={line.netCeki ?? ''}
                          onChange={e => editGoods(line.id, { netCeki: e.target.value === '' ? undefined : Number(e.target.value) })}
                        />
                      </td>
                      <td>
                        <input
                          className="cell-input num"
                          type="number"
                          value={line.bruttoCeki ?? ''}
                          onChange={e => editGoods(line.id, { bruttoCeki: e.target.value === '' ? undefined : Number(e.target.value) })}
                        />
                      </td>
                      <td>
                        <input
                          className="cell-input num"
                          type="number"
                          value={line.deyer}
                          onChange={e => editGoods(line.id, { deyer: Number(e.target.value) || 0 })}
                        />
                        <small className="chain-sub">{line.valyuta}</small>
                      </td>
                      <td>
                        <strong>{line.cmrNo}</strong>
                        <small className="chain-sub">{line.declarationKod ?? 'bəyannamə yoxdur'}</small>
                      </td>
                      <td>
                        {line.controls.length === 0
                          ? <small className="chain-sub">Əlavə nəzarət yoxdur</small>
                          : line.controls.map(control => (
                              <small key={control} className="chain-sub">{control}</small>
                            ))}
                      </td>
                      <td>
                        <select
                          className={`cell-select status-${GOODS_STATUS_TONE[line.status]}`}
                          value={line.status}
                          onChange={e => editGoods(line.id, {
                            status: e.target.value as GoodsStatus,
                            statusQeyd: 'İnspektor əl ilə təyin etdi',
                          })}
                        >
                          {(Object.keys(GOODS_STATUS_LABEL) as GoodsStatus[]).map(key => (
                            <option key={key} value={key}>{GOODS_STATUS_LABEL[key]}</option>
                          ))}
                        </select>
                        <small className="chain-sub">{line.statusQeyd}</small>
                      </td>
                    </tr>
                  ))}
                  {goodsLines.length === 0 && (
                    <tr><td colSpan={10} className="empty-table-message">Bu tır üzrə mal mövqeyi yoxdur.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <ShipDetailModal ship={ship} open={shipModalOpen} onClose={() => setShipModalOpen(false)} />
      </>
    )}

    <Modal
      open={cmrModalOpen}
      onClose={() => { setCmrModalOpen(false); setEditingCmr(null) }}
      title={editingCmr ? `${editingCmr} — redaktə` : 'Bəyannamə əlavə et'}
    >
      <form onSubmit={submitCmr} className="manual-declaration-form">
        <div className="manual-form-row">
          <label>Bəyannamə kodu (EGB)
            <input
              list="egb-declaration-codes"
              value={cmrForm.beyannameKod}
              onChange={e => setCmrForm(f => ({ ...f, beyannameKod: e.target.value }))}
              placeholder="Məsələn: 01263000224935"
            />
          </label>
          <label>CMR nömrəsi<input required disabled={Boolean(editingCmr)} value={cmrForm.cmrNo} onChange={e => setCmrForm(f => ({ ...f, cmrNo: e.target.value }))} placeholder="Məsələn: DA 1604513" /></label>
        </div>
        <div className="manual-form-row">
          <label>Göndərən<input value={cmrForm.gonderen} onChange={e => setCmrForm(f => ({ ...f, gonderen: e.target.value }))} placeholder="Məsələn: EURO Plywood LLP" /></label>
          <label>Alan<input value={cmrForm.alan} onChange={e => setCmrForm(f => ({ ...f, alan: e.target.value }))} placeholder="Məsələn: OBA MARKET MMC" /></label>
        </div>
        <label>Mal təsviri<input value={cmrForm.malTesviri} onChange={e => setCmrForm(f => ({ ...f, malTesviri: e.target.value }))} placeholder="Məsələn: Yeni avtomobil şinləri" /></label>
        <div className="manual-form-row">
          <label>Yer sayı<input type="number" min="0" step="1" value={cmrForm.yerSayi} onChange={e => setCmrForm(f => ({ ...f, yerSayi: e.target.value }))} placeholder="Məsələn: 33" /></label>
          <label>Brutto (kq)<input type="number" min="0" step="0.01" value={cmrForm.bruttoKq} onChange={e => setCmrForm(f => ({ ...f, bruttoKq: e.target.value }))} placeholder="Məsələn: 19833" /></label>
        </div>
        <div className="manual-form-row">
          <label>İnvoys nömrəsi<input value={cmrForm.invoysNo} onChange={e => setCmrForm(f => ({ ...f, invoysNo: e.target.value }))} placeholder="Məsələn: 139/1" /></label>
          <label>İnvoys məbləği<input type="number" min="0" step="0.01" value={cmrForm.invoysMebleg} onChange={e => setCmrForm(f => ({ ...f, invoysMebleg: e.target.value }))} placeholder="Məsələn: 16462.05" /></label>
        </div>
        <label>Valyuta
          <select value={cmrForm.valyuta} onChange={e => setCmrForm(f => ({ ...f, valyuta: e.target.value }))}>
            <option>USD</option>
            <option>EUR</option>
            <option>AZN</option>
          </select>
        </label>
        <p className="chain-rule" style={{ margin: 0 }}>
          <FileCheck2 size={13} /> Bəyannamə kodu doldurulsa sətir dərhal bağlanır; boş qalsa deklarant yazana qədər “Çatışmır” statusunda saxlanılır.
        </p>
        <div className="manual-form-actions">
          <Button type="button" variant="ghost" onClick={() => { setCmrModalOpen(false); setEditingCmr(null) }}><X /> Ləğv et</Button>
          <Button type="submit">{editingCmr ? <><Check /> Yadda saxla</> : <><Plus /> Əlavə et</>}</Button>
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
          <motion.div className="success-card" initial={{ scale: .7 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
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
              <div><small>Qoşqu kodu</small><strong>{lastSaved.trailerCode || '—'}</strong></div>
            </div>
            <div className="success-facts">
              <div>
                <small>CMR → Bəyannamə</small>
                <b>
                  {lastSaved.cmrCount ?? 0} → {lastSaved.declarationKods?.length ?? 0}
                  {lastSaved.goods?.length ? ` · ${lastSaved.goods.length} mal mövqeyi` : ''}
                </b>
              </div>
              <div>
                <small>Risk</small>
                <b className={lastSaved.riskVerdict === 'green' ? 'ok' : 'warn'}>
                  {lastSaved.riskVerdict === 'green' ? 'Yaşıl' : 'Qırmızı'}
                  {lastSaved.manualRoute ? ` · ${lastSaved.manualRoute}` : ''}
                  {lastSaved.manualRoute ? ` · ${lastSaved.status === 'Gözləmədə' ? 'gözləmədə' : 'yoxlamadan keçdi'}` : ''}
                </b>
              </div>
              <div>
                <small>İcazə blankı</small>
                <b>{lastSaved.permits[0] ?? '—'}</b>
              </div>
              <div>
                <small>Yol vergisi</small>
                <b>{lastSaved.roadTaxes[0]?.replace(/^Yol vergisi \(211\.1\.1\.3\):\s*/i, '') ?? '—'}</b>
              </div>
            </div>
            <Button onClick={resetFlowState}>Yeni qeydiyyat başlat <RotateCcw /></Button>
          </motion.div>
        </motion.section>
      )}
    </AnimatePresence>
  </>
}

function Data({ label, value }: { label: string; value: string }) {
  return <div><small>{label}</small><strong>{value}</strong></div>
}
