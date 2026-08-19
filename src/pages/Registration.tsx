import { useMemo, useState, useEffect, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle, ArrowLeft, ArrowRight, Check, CheckCircle2, Dog, FileBadge, FileCheck2,
  FileText, Link2, Pencil, Plus, Receipt, RotateCcw, Scan, ScanSearch, Search, ShieldCheck,
  FileUp, PackageSearch, Ship, Trash2, Truck, Upload, X, type LucideIcon,
} from 'lucide-react'
import confetti from 'canvas-confetti'
import { toast } from 'sonner'
import { useSearchParams } from 'react-router-dom'
import { useAppStore, type SavedRegistration } from '../store/useAppStore'
import { Button, Card, Modal, PageHeader } from '../components/UI'
import VehicleDeckSelector from '../components/VehicleDeckSelector'
import ShipDetailModal from '../components/ShipDetailModal'
import {
  emptyManifestHeader, formatFileSize, inspectManifestFile,
  type ManifestDocument, type ManifestHeader,
} from '../domain/manifestDocument'
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
/** Real iş axını: sənədlər → EGB uzlaşdırması → VAİS qeydiyyatı + icazə → yol vergisi */
type FlowStage = 'senedler' | 'egb' | 'vais' | 'vergi'

const STAGE_ORDER: FlowStage[] = ['senedler', 'egb', 'vais', 'vergi']

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
    manifests, addManifest, updateManifestHeader, removeManifest,
  } = useAppStore()

  const urlShipId = searchParams.get('shipId')
  const urlShipName = searchParams.get('shipName')
  const urlPlate = searchParams.get('plate')

  const [shipId, setShipId] = useState(urlShipId || '')
  const [plate, setPlate] = useState(urlPlate || '')
  const [vehicleFound, setVehicleFound] = useState(false)
  const [shipModalOpen, setShipModalOpen] = useState(false)
  const [manifestViewerOpen, setManifestViewerOpen] = useState(false)
  const [manifestBusy, setManifestBusy] = useState(false)
  const [manifestDragging, setManifestDragging] = useState(false)

  const [stage, setStage] = useState<FlowStage>('senedler')
  const [done, setDone] = useState(false)
  const [lastSaved, setLastSaved] = useState<SavedRegistration | null>(null)

  // 03 — CMR / İnvoys
  const [extraCmrs, setExtraCmrs] = useState<CmrRecord[]>([])
  const [cmrModalOpen, setCmrModalOpen] = useState(false)
  const [cmrForm, setCmrForm] = useState(emptyCmrForm)
  const [editingCmr, setEditingCmr] = useState<string | null>(null)
  const [docsConfirmed, setDocsConfirmed] = useState(false)
  /** Əl ilə düzəlişlər — törədilmiş zəncirin üstünə yazılır. */
  const [cmrEdits, setCmrEdits] = useState<Record<string, Partial<CmrRecord>>>({})
  const [removedCmrs, setRemovedCmrs] = useState<string[]>([])
  const [goodsEdits, setGoodsEdits] = useState<Record<string, Partial<GoodsLine>>>({})

  // 04 — Bəyannamə / EGB
  const [egbFetched, setEgbFetched] = useState<string[]>([])
  const [riskVerdict, setRiskVerdict] = useState<RiskVerdict | null>(null)
  const [riskReasons, setRiskReasons] = useState<string[]>([])
  const [riskChecking, setRiskChecking] = useState(false)
  const [manualRoute, setManualRoute] = useState<ManualRoute | null>(null)
  /** İnspektor sistem cavabını əl ilə dəyişə bilər. */
  const [riskOverride, setRiskOverride] = useState<RiskVerdict | null>(null)

  // 05 — VAİS qeydiyyatı + icazə blankı
  const [transportDetails, setTransportDetails] = useState(initialTransportDetails)
  const [trailerCode, setTrailerCode] = useState('')
  const [goodsAssigned, setGoodsAssigned] = useState(false)
  const [permit, setPermit] = useState(initialPermit)

  // 06 — Yol vergisi
  const [taxConfirmed, setTaxConfirmed] = useState(false)
  const [taxOverride, setTaxOverride] = useState('')

  const resetFlowState = () => {
    setStage('senedler')
    setDone(false)
    setLastSaved(null)
    setExtraCmrs([])
    setCmrModalOpen(false)
    setCmrForm(emptyCmrForm)
    setEditingCmr(null)
    setDocsConfirmed(false)
    setCmrEdits({})
    setRemovedCmrs([])
    setGoodsEdits({})
    setEgbFetched([])
    setRiskOverride(null)
    setTaxOverride('')
    setRiskVerdict(null)
    setRiskReasons([])
    setRiskChecking(false)
    setManualRoute(null)
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

  const manifestDoc = useMemo(
    () => (ship ? manifests.find(item => item.shipId === ship.id) ?? null : null),
    [manifests, ship],
  )

  const uploadManifest = async (file?: File | null) => {
    if (!file || !ship) return
    setManifestBusy(true)
    const result = await inspectManifestFile(file)
    setManifestBusy(false)
    if (!result.ok) {
      toast.error(result.error)
      return
    }

    const now = new Date()
    const header: ManifestHeader = {
      ...emptyManifestHeader,
      portLoading: ship.menshe.split(',')[0] ?? '',
      portDischarge: (ship.teyinat ?? '').split(',')[0] ?? '',
      arrivalDate: formatShipDate(ship.girisTarixi),
    }
    const document: ManifestDocument = {
      id: `MNF-${now.getTime()}`,
      shipId: ship.id,
      fileName: file.name,
      size: file.size,
      uploadedAt: now.toLocaleString('az-AZ'),
      url: URL.createObjectURL(file),
      pageCount: result.pageCount,
      header,
    }
    addManifest(document)
    toast.success(`${file.name} manifest sənədi kimi qeydə alındı`)
  }

  // Seçilmiş gəminin manifestindəki tırlar
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

  const trailerPlate = dossier?.trailerPlate ?? ''
  const permitReady = Boolean(permit.novu && permit.nomre.trim() && permit.qaytarildi)
  const vaisComplete = Boolean(trailerCode && goodsAssigned && permitReady)

  // Nəqliyyat formunu manifest / avtomobil qeydindən doldur
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

  // Risk cavabı EGB mərhələsində avtomatik gəlir
  useEffect(() => {
    if (stage !== 'egb' || !primaryDeclaration) return
    setRiskChecking(true)
    const timer = window.setTimeout(() => {
      const result = assessGoodsRisk(primaryDeclaration)
      setRiskVerdict(result.verdict)
      setRiskReasons(result.reasons)
      setRiskChecking(false)
    }, 550)
    return () => window.clearTimeout(timer)
  }, [stage, primaryDeclaration])

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
    setDocsConfirmed(false)
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
      setCmrModalOpen(false)
      setDocsConfirmed(false)
      toast.success(`${editingCmr} yeniləndi`)
      return
    }

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
      declarationKod: null,
      declarationStatus: null,
      egbStatus: 'gozleyir',
      egbQeyd: 'Deklarant hələ bəyannamə yazmayıb',
    }
    setExtraCmrs(list => [...list, record])
    setCmrForm(emptyCmrForm)
    setCmrModalOpen(false)
    setDocsConfirmed(false)
    toast.success(`${record.no} sənəd zəncirinə əlavə edildi`)
  }

  /** EGB-də tırın nömrəsi axtarılır və deklarasiya həmin tıra mənimsədilir. */
  const fetchFromEgb = (cmr: CmrRecord) => {
    setEgbFetched(list => (list.includes(cmr.no) ? list : [...list, cmr.no]))
    setGoodsAssigned(false)
    toast.success(
      cmr.declarationKod
        ? `EGB: ${cmr.declarationKod} bəyannaməsi ${plateKey} tırına mənimsədildi`
        : `EGB: ${cmr.no} üzrə axtarış qeydə alındı — bəyannamə gözlənilir`,
    )
  }

  /** Qoşqu varsa onun, yoxdursa tırın nişanı üzrə VAİS kodu alınır. */
  /** Deklarasiyanı əl ilə bu CMR-ə bağlayır (EGB-də tapılan kod daxil edilir). */
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
        ? `Qoşqu VAİS-də qeydiyyata alındı · kod ${code}`
        : `Tır qoşqusuz qeydiyyata alındı · kod ${code}`,
    )
  }

  const assignGoods = () => {
    if (!trailerCode) return toast.warning('Əvvəlcə qoşqunu qeydiyyata alın')
    setGoodsAssigned(true)
    toast.success(`${linkedCount} bəyannamə üzrə mallar ${plateKey} tırına mənimsədildi`)
  }

  const goNext = () => {
    if (stage === 'senedler') {
      if (cmrs.length === 0) return toast.warning('Ən azı bir CMR olmalıdır')
      setDocsConfirmed(true)
      setStage('egb')
      return
    }
    if (stage === 'egb') {
      if (!egbComplete) return toast.warning('Bütün CMR-lər EGB-də bəyannamə ilə bağlanmalıdır')
      if (!effectiveRisk) return toast.warning('Risk cavabı gözlənilir')
      if (effectiveRisk === 'red' && !manualRoute) return toast.warning('Qırmızı riskdə yönləndirmə kanalı seçin')
      setStage('vais')
      return
    }
    if (stage === 'vais') {
      if (!trailerCode) return toast.warning('Qoşqunu VAİS-də qeydiyyata alın')
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
    if (!egbComplete) return toast.warning('Bütün CMR-lər bəyannamə ilə bağlanmalıdır (Addım 4)')
    if (!vaisComplete) return toast.warning('VAİS qeydiyyatı və icazə blankı tamamlanmalıdır (Addım 5)')
    // Sərbəst keçid mərhələ yoxlamalarını atlaya bilər — məcburi qayda burada da tətbiq olunur.
    if (effectiveRisk === 'red' && !manualRoute) {
      setStage('egb')
      return toast.error('Qırmızı riskdə yönləndirmə kanalı mütləqdir')
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
    const holdRequired = effectiveRisk === 'red' && Boolean(manualRoute)

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
        ? [...(manualRoute ? [`Əlavə yoxlama kanalı: ${manualRoute}`] : []), ...riskReasons, ...egbNotes, ...goodsNotes]
        : ([...egbNotes, ...goodsNotes].length ? [...egbNotes, ...goodsNotes] : undefined),
      roadTaxes: [roadTaxLabel],
      permits: [`${permitLabel} № ${permit.nomre} · ${permit.verenOrqan}`],
      transport: { ...transportDetails, qosquKodu: trailerCode },
      voyageId: manifestDoc?.header.voyageNo ? `SFR-${manifestDoc.header.voyageNo}` : voyage.id,
      manifestNo: voyage.manifestNo,
      manifestFile: manifestDoc?.fileName,
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
      status: holdRequired ? `Təsdiqləndi · ${manualRoute}` : 'Təsdiqləndi',
      operator: profile.name,
    })
    setLastSaved(record)
    setDone(true)
    confetti({ particleCount: 160, spread: 85, origin: { y: .65 }, colors: ['#0A4D8C', '#00B4D8', '#F4A261', '#2A9D8F'] })
    toast.success('Qeydiyyat təsdiqləndi və DB-yə yazıldı')
  }

  const steps: Array<{ n: string; label: string; ok: boolean; icon: LucideIcon; target?: FlowStage }> = [
    { n: '1', label: 'Gəmi · Səfər', ok: Boolean(ship), icon: Ship },
    { n: '2', label: 'Manifest · Tır', ok: vehicleFound, icon: Truck },
    { n: '3', label: 'CMR · İnvoys', ok: docsConfirmed, icon: FileText, target: 'senedler' },
    { n: '4', label: 'Bəyannamə · EGB', ok: egbComplete && Boolean(effectiveRisk), icon: ScanSearch, target: 'egb' },
    { n: '5', label: 'VAİS · İcazə', ok: vaisComplete, icon: FileBadge, target: 'vais' },
    { n: '6', label: 'Yol vergisi', ok: taxConfirmed, icon: Receipt, target: 'vergi' },
  ]
  const activeStepIndex = done ? 5
    : stage === 'vergi' ? 5
    : stage === 'vais' ? 4
    : stage === 'egb' ? 3
    : vehicleFound ? 2
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
            Qeydiyyat prosesinə başlamaq, tırların göyərtə planını və manifest məlumatlarını görmək üçün yuxarıdakı menyudan gəmi seçin.
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
        {voyage && (
          <div className="voyage-strip">
            <div>
              <small>SƏFƏR</small>
              <strong>{manifestDoc?.header.voyageNo ? `№ ${manifestDoc.header.voyageNo}` : voyage.id}</strong>
            </div>
            <div>
              <small>MANİFEST</small>
              <strong>{manifestDoc ? manifestDoc.fileName : voyage.manifestNo}</strong>
            </div>
            <div>
              <small>MANİFESTDƏ TIR</small>
              <strong>
                {manifestDoc?.header.vehicleCount
                  ? `${manifestDoc.header.vehicleCount} + ${manifestDoc.header.trailerCount || 0} qoşqu`
                  : shipVehicles.length}
              </strong>
            </div>
            <div>
              <small>MARŞRUT · GİRİŞ</small>
              <strong>{voyage.marsrut} · {formatShipDate(voyage.girisTarixi) || '—'}</strong>
            </div>
            <div>
              <small>QEYDİYYATDAN KEÇƏN</small>
              <strong>{registrations.filter(r => r.shipId === ship.id).length} / {shipVehicles.length}</strong>
            </div>
          </div>
        )}

        <Card className="manifest-upload-card" hover={false}>
          {!manifestDoc ? (
            <label
              className={`manifest-dropzone${manifestDragging ? ' dragging' : ''}${manifestBusy ? ' busy' : ''}`}
              onDragOver={e => { e.preventDefault(); setManifestDragging(true) }}
              onDragLeave={() => setManifestDragging(false)}
              onDrop={e => {
                e.preventDefault()
                setManifestDragging(false)
                void uploadManifest(e.dataTransfer.files?.[0])
              }}
            >
              <input
                type="file"
                accept="application/pdf,.pdf"
                hidden
                onChange={e => {
                  void uploadManifest(e.target.files?.[0])
                  e.target.value = ''
                }}
              />
              <Upload size={20} />
              <div>
                <strong>{manifestBusy ? 'Fayl yoxlanılır…' : 'Gəmi manifestini yüklə (PDF)'}</strong>
                <small>
                  Faylı bura atın və ya seçmək üçün klikləyin · IMO FAL paketi:
                  General Declaration, Cargo Declaration, ekipaj/sərnişin siyahısı və tır cədvəli
                </small>
              </div>
            </label>
          ) : (
            <div className="manifest-loaded">
              <div className="manifest-file">
                <span className="manifest-file-icon"><FileUp size={18} /></span>
                <div>
                  <strong>{manifestDoc.fileName}</strong>
                  <small>
                    {formatFileSize(manifestDoc.size)}
                    {manifestDoc.pageCount ? ` · ${manifestDoc.pageCount} səhifə` : ''}
                    {' · '}{manifestDoc.uploadedAt}
                  </small>
                </div>
                <div className="manifest-file-actions">
                  <Button type="button" variant="secondary" onClick={() => setManifestViewerOpen(true)}>
                    <FileText size={14} /> Bax
                  </Button>
                  <label className="btn btn-ghost manifest-replace">
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      hidden
                      onChange={e => {
                        void uploadManifest(e.target.files?.[0])
                        e.target.value = ''
                      }}
                    />
                    <Upload size={14} /> Əvəz et
                  </label>
                  <Button type="button" variant="ghost" onClick={() => removeManifest(manifestDoc.id)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>

              <details className="manifest-fields">
                <summary>Manifest başlığı — General Declaration üzrə əl ilə doldurulur</summary>
                <div className="tax-params-grid">
                  <label>Səfər №
                    <input value={manifestDoc.header.voyageNo} onChange={e => updateManifestHeader(manifestDoc.id, { voyageNo: e.target.value })} placeholder="125" />
                  </label>
                  <label>Kapitan
                    <input value={manifestDoc.header.master} onChange={e => updateManifestHeader(manifestDoc.id, { master: e.target.value })} placeholder="Annamyradov M." />
                  </label>
                  <label>Gəmi agenti
                    <input value={manifestDoc.header.agent} onChange={e => updateManifestHeader(manifestDoc.id, { agent: e.target.value })} placeholder="Baku International Sea Trade Port CJSC" />
                  </label>
                  <label>Yükləmə limanı
                    <input value={manifestDoc.header.portLoading} onChange={e => updateManifestHeader(manifestDoc.id, { portLoading: e.target.value })} />
                  </label>
                  <label>Boşaltma limanı
                    <input value={manifestDoc.header.portDischarge} onChange={e => updateManifestHeader(manifestDoc.id, { portDischarge: e.target.value })} />
                  </label>
                  <label>Gəliş tarixi
                    <input value={manifestDoc.header.arrivalDate} onChange={e => updateManifestHeader(manifestDoc.id, { arrivalDate: e.target.value })} />
                  </label>
                  <label>Qoşqulu avtomaşın, əd.
                    <input type="number" min="0" value={manifestDoc.header.vehicleCount} onChange={e => updateManifestHeader(manifestDoc.id, { vehicleCount: e.target.value })} placeholder="42" />
                  </label>
                  <label>Ayrıca qoşqu, əd.
                    <input type="number" min="0" value={manifestDoc.header.trailerCount} onChange={e => updateManifestHeader(manifestDoc.id, { trailerCount: e.target.value })} placeholder="9" />
                  </label>
                  <label>Boş gələn, əd.
                    <input type="number" min="0" value={manifestDoc.header.emptyCount} onChange={e => updateManifestHeader(manifestDoc.id, { emptyCount: e.target.value })} placeholder="9" />
                  </label>
                  <label>Ümumi brutto, kq
                    <input type="number" min="0" value={manifestDoc.header.totalGrossKg} onChange={e => updateManifestHeader(manifestDoc.id, { totalGrossKg: e.target.value })} placeholder="1569014" />
                  </label>
                </div>
                <p className="manifest-note">
                  <AlertTriangle size={13} /> Skan edilmiş PDF-in mətn qatı olmadığına görə 51 tır sətri avtomatik oxunmur —
                  sənəd qeyd kimi saxlanılır, sətirlər manifest siyahısından və ya «CMR / İnvoys əlavə et» ilə daxil edilir.
                </p>
              </details>
            </div>
          )}
        </Card>

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
            <nav className="registration-stepper registration-stepper-6 is-navigable" aria-label="Qeydiyyat mərhələləri">
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
              {stage === 'senedler' && (
                <section className="registration-step">
                  <header>
                    <span className="step-number">03</span>
                    <div>
                      <h2>CMR və İnvoys</h2>
                      <p>Xaricdən göndərilən hər malın CMR-i və invoysu olur. Bir tırda bir neçə CMR ola bilər.</p>
                    </div>
                    {docsConfirmed && <CheckCircle2 className="step-check" />}
                  </header>

                  <div className="table-scroll">
                    <table className="payments-table chain-table">
                      <thead>
                        <tr>
                          <th>CMR</th>
                          <th>Göndərən → Alan</th>
                          <th>Mal təsviri</th>
                          <th>Yer / Brutto</th>
                          <th>İnvoys</th>
                          <th>Əməliyyat</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cmrs.map(cmr => (
                          <tr key={cmr.no}>
                            <td>
                              <strong>{cmr.no}</strong>
                              <small className="chain-sub">{cmr.yuklemeYeri} → {cmr.boshaltmaYeri}</small>
                            </td>
                            <td>{cmr.gonderen}<small className="chain-sub">→ {cmr.alan}</small></td>
                            <td>
                              {cmr.malTesviri}
                              {goodsLines
                                .filter(line => line.cmrNo === cmr.no)
                                .slice(0, 2)
                                .map(line => (
                                  <span
                                    key={line.id}
                                    className={`status-chip ${GOODS_STATUS_TONE[line.status]} goods-status-chip`}
                                    title={line.statusQeyd}
                                  >
                                    {GOODS_STATUS_LABEL[line.status]}
                                  </span>
                                ))}
                            </td>
                            <td>
                              {cmr.yerSayi ? `${cmr.yerSayi.toLocaleString('az-AZ')} yer` : '—'}
                              <small className="chain-sub">{cmr.bruttoKq ? `${cmr.bruttoKq.toLocaleString('az-AZ')} kq` : '—'}</small>
                            </td>
                            <td>
                              {cmr.invoices.length === 0 ? <span className="status-chip neutral">İnvoys yoxdur</span> : cmr.invoices.map(inv => (
                                <div key={inv.no}>
                                  <strong>{inv.no}</strong>
                                  <small className="chain-sub">
                                    {inv.mebleg ? `${inv.mebleg.toLocaleString('az-AZ')} ${inv.valyuta}` : '—'}
                                    {inv.incoterms ? ` · ${inv.incoterms}` : ''}
                                  </small>
                                </div>
                              ))}
                            </td>
                            <td>
                              <div className="row-actions">
                                <button type="button" onClick={() => openCmrEditor(cmr)} title="CMR və invoysu redaktə et">
                                  <Pencil size={13} />
                                </button>
                                <button type="button" className="danger" onClick={() => removeCmr(cmr)} title="Zəncirdən çıxar">
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="chain-footer">
                    <span className="chain-rule">
                      <FileCheck2 size={13} /> 1 CMR = 1 bəyannamə · {cmrs.length} CMR → {cmrs.length} bəyannamə
                      {' · '}mal mövqeyi: {goodsSummary.total} ({goodsSummary.released} buraxılıb)
                    </span>
                    <Button type="button" variant="ghost" onClick={() => openCmrEditor()}>
                      <Plus /> CMR / İnvoys əlavə et
                    </Button>
                  </div>
                </section>
              )}

              {stage === 'egb' && (
                <section className="registration-step">
                  <header>
                    <span className="step-number">04</span>
                    <div>
                      <h2>Bəyannamə və EGB uzlaşdırması</h2>
                      <p>Deklarant hər CMR üzrə bəyannamə yazır və EGB-yə yükləyir. Burada həmin bəyannamələr tıra mənimsədilir.</p>
                    </div>
                    {egbComplete && <CheckCircle2 className="step-check" />}
                  </header>

                  <div className="egb-reconcile">
                    {cmrs.map(cmr => {
                      const linked = isLinked(cmr)
                      const tone = linked ? 'success' : cmr.egbStatus === 'uygunsuzluq' ? 'danger' : 'warning'
                      return (
                        <article key={cmr.no} className={`egb-row ${tone}`}>
                          <div className="egb-cell">
                            <small>CMR</small>
                            <strong>{cmr.no}</strong>
                          </div>
                          <Link2 size={14} className="egb-link-icon" />
                          <div className="egb-cell">
                            <small>BƏYANNAMƏ</small>
                            <strong>{cmr.declarationKod ?? 'Yazılmayıb'}</strong>
                          </div>
                          <div className="egb-cell grow">
                            <small>EGB QEYDİ</small>
                            <span>{linked && cmr.egbStatus !== 'bagli' ? 'Operator EGB-dən götürdü və tıra mənimsətdi' : cmr.egbQeyd}</span>
                          </div>
                          <span className={`status-chip ${tone}`}>
                            {linked ? EGB_STATUS_LABEL.bagli : EGB_STATUS_LABEL[cmr.egbStatus]}
                          </span>
                          <div className="egb-actions">
                            {!linked && (
                              <Button type="button" variant="secondary" onClick={() => fetchFromEgb(cmr)}>
                                <ScanSearch size={14} /> EGB-dən götür
                              </Button>
                            )}
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
                            {cmr.declarationKod && (
                              <button type="button" className="egb-unbind" onClick={() => unbindDeclaration(cmr)} title="Bağlantını ləğv et">
                                <X size={13} />
                              </button>
                            )}
                          </div>
                        </article>
                      )
                    })}
                  </div>

                  <datalist id="egb-declaration-codes">
                    {declarations.slice(0, 200).map(item => (
                      <option key={item.kod} value={item.kod}>{item.avtomobil} · {item.status}</option>
                    ))}
                  </datalist>

                  <p className="egb-summary">
                    Gözlənilən <b>{cmrs.length}</b> · Bağlanmış <b>{linkedCount}</b> · Çatışmır <b>{cmrs.length - linkedCount}</b>
                    {' · '}EGB axtarışı tır nömrəsi üzrə: <b>{plateKey}</b>
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
                      <div><strong>Risk yoxlanılır…</strong></div>
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
                          <p>Yönləndirmə kanalı seçilmədən növbəti mərhələ açılmır.</p>
                          <ul>{riskReasons.map(r => <li key={r}>{r}</li>)}</ul>
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
                              onClick={() => setManualRoute(route.id)}
                            >
                              <Icon />
                              <span><b>{route.id}</b><small>{route.hint}</small></span>
                              {manualRoute === route.id && <Check />}
                            </button>
                          )
                        })}
                      </div>
                    </>
                  )}
                </section>
              )}

              {stage === 'vais' && (
                <section className="registration-step">
                  <header>
                    <span className="step-number">05</span>
                    <div>
                      <h2>VAİS qeydiyyatı və icazə blankı</h2>
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
                          {trailerPlate ? ` · Qoşqu ${trailerPlate}` : ' · qoşqusuz (manifestdə qeyd yoxdur)'}
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
                    <span className="step-number">06</span>
                    <div>
                      <h2>Yol vergisi</h2>
                      <p>Vergi Məcəlləsi 211.1.1.3 — yük avtomobilləri, qoşqulu və yarımqoşqulu nəqliyyat</p>
                    </div>
                    {taxConfirmed && <CheckCircle2 className="step-check" />}
                  </header>

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
                    <Data label="Səfər / Manifest" value={`${voyage?.id ?? '—'} · ${voyage?.manifestNo ?? '—'}`} />
                    <Data label="Tır / Qoşqu" value={`${transportDetails.dovletNisani || plateKey}${trailerPlate ? ` · ${trailerPlate}` : ''}`} />
                    <Data label="Qoşqu kodu (VAİS)" value={trailerCode || '—'} />
                    <Data label="CMR → Bəyannamə" value={`${cmrs.length} → ${linkedCount}`} />
                    <Data label="Mal mövqeləri" value={`${goodsSummary.released}/${goodsSummary.total} buraxılıb · ${goodsSummary.blocked} nəzarətdə`} />
                    <Data label="Risk" value={`${effectiveRisk === 'red' ? `Qırmızı · ${manualRoute ?? '—'}` : 'Yaşıl'}${riskOverride ? ' (əl ilə)' : ''}`} />
                    <Data label="İcazə blankı" value={permit.nomre ? `${TRANSPORT_PERMIT_OPTIONS.find(p => p.id === permit.novu)?.label} № ${permit.nomre}` : '—'} />
                  </div>
                </section>
              )}

              <footer className="registration-actions">
                <Button variant="ghost" onClick={goBack}>
                  <ArrowLeft /> {stage === 'senedler' ? 'Manifestə qayıt' : 'Geri'}
                </Button>
                {stage === 'vergi' ? (
                  <Button variant="success" onClick={finalConfirm} disabled={!taxConfirmed}>
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

        {manifestDoc && (
          <Modal
            open={manifestViewerOpen}
            onClose={() => setManifestViewerOpen(false)}
            title={`Manifest sənədi · ${manifestDoc.fileName}`}
            wide
          >
            <div className="manifest-viewer">
              <iframe src={manifestDoc.url} title={manifestDoc.fileName} />
              <div className="manifest-viewer-actions">
                <small>
                  {formatFileSize(manifestDoc.size)}
                  {manifestDoc.pageCount ? ` · ${manifestDoc.pageCount} səhifə` : ''}
                  {' · '}yükləndi {manifestDoc.uploadedAt}
                </small>
                <a className="btn btn-secondary" href={manifestDoc.url} target="_blank" rel="noreferrer">
                  Yeni pəncərədə aç
                </a>
              </div>
              <small className="manifest-viewer-hint">
                Önizləmə açılmırsa (brauzerin PDF görüntüləyicisi söndürülüb), sənədi yeni pəncərədə açın.
              </small>
            </div>
          </Modal>
        )}

        <ShipDetailModal ship={ship} open={shipModalOpen} onClose={() => setShipModalOpen(false)} />
      </>
    )}

    <Modal
      open={cmrModalOpen}
      onClose={() => { setCmrModalOpen(false); setEditingCmr(null) }}
      title={editingCmr ? `${editingCmr} — redaktə` : 'CMR və İnvoys əlavə et'}
    >
      <form onSubmit={submitCmr} className="manual-declaration-form">
        <label>CMR nömrəsi<input required disabled={Boolean(editingCmr)} value={cmrForm.cmrNo} onChange={e => setCmrForm(f => ({ ...f, cmrNo: e.target.value }))} placeholder="Məsələn: DA 1604513" /></label>
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
          <FileCheck2 size={13} /> Yeni CMR bəyannaməsiz əlavə olunur — deklarant yazandan sonra EGB mərhələsində bağlanacaq.
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
