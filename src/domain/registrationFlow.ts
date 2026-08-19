import type { Avtomobil, Declaration } from '../data/mockData'
import { alatKurikManifestSeed, type ManifestEntrySeed } from '../data/documentSeeds'

/**
 * Qeydiyyat sənəd zənciri:
 *   Gəmi → Səfər → Tır/Qoşqu (VAİS/İGİS) → CMR → İnvoys → Bəyannamə → EGB
 *
 * Qayda: 1 CMR = 1 bəyannamə. Bir tırda bir neçə CMR ola bilər, ona görə
 * bir tıra düşən bəyannamə sayı həmin tırın CMR sayına bərabərdir.
 */

export type EgbStatus = 'bagli' | 'gozleyir' | 'uygunsuzluq'

export type InvoiceRecord = {
  no: string
  mal: string
  miqdar: string
  mebleg: number
  valyuta: string
  incoterms?: string
}

export type CmrRecord = {
  no: string
  gonderen: string
  alan: string
  yuklemeYeri: string
  boshaltmaYeri: string
  malTesviri: string
  bruttoKq: number
  yerSayi: number
  invoices: InvoiceRecord[]
  /** 1 CMR = 1 bəyannamə; bağlanmayıbsa null. */
  declarationKod: string | null
  declarationStatus: string | null
  egbStatus: EgbStatus
  egbQeyd: string
}

export type TruckDossier = {
  plate: string
  trailerPlate: string
  trailerSource: string
  cmrs: CmrRecord[]
  /** Gözlənilən bəyannamə sayı = CMR sayı */
  expected: number
  matched: number
  mismatched: number
  egbComplete: boolean
}

export type VoyageInfo = {
  id: string
  manifestNo: string
  girisTarixi: string
  marsrut: string
}

export const normalizeId = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '')

/** `gemiler` və `avtomobiller` heterogen literal massivlərdir — sahə hər qeyddə olmaya bilər. */
function readText(source: unknown, key: string): string {
  if (!source || typeof source !== 'object') return ''
  const value = (source as Record<string, unknown>)[key]
  return typeof value === 'string' ? value.trim() : ''
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}

/** Səfər = gəminin bu dəfəki gəlişi. Gəmi sabitdir, səfər və manifest saydadır. */
export function buildVoyage(ship: { id: string; girisTarixi: string; menshe: string; teyinat: string }): VoyageInfo {
  const date = (ship.girisTarixi || '').slice(0, 10)
  const imo = ship.id.replace(/\D/g, '').slice(-4) || '0000'
  return {
    id: `SFR-${date.replace(/-/g, '') || '00000000'}-${imo}`,
    manifestNo: readText(ship, 'manifestNo') || `MNF-${imo}-${date.slice(5).replace('-', '')}`,
    girisTarixi: ship.girisTarixi,
    marsrut: `${(ship.menshe || '').split(',')[0]} → ${(ship.teyinat || '').split(',')[0]}`,
  }
}

/** Manifest sətri: əvvəlcə avtomobilin öz B/L-i və sıra nömrəsi, sonra nişan üzrə axtarış. */
export function findManifestEntry(plate: string, vehicle?: Avtomobil): ManifestEntrySeed | undefined {
  const vehicleBl = normalizeId(readText(vehicle, 'billOfLading'))
  const vehicleOrder = normalizeId(readText(vehicle, 'vehicleOrder'))
  const byDocuments = alatKurikManifestSeed.find(entry =>
    (vehicleBl && normalizeId(entry.billOfLading) === vehicleBl) ||
    (vehicleOrder && normalizeId(entry.vehicleOrder ?? '') === vehicleOrder)
  )
  if (byDocuments) return byDocuments

  const query = normalizeId(plate)
  const digits = query.replace(/\D/g, '')
  return alatKurikManifestSeed.find(entry =>
    [entry.billOfLading, entry.vehicleOrder]
      .filter((identifier): identifier is string => Boolean(identifier))
      .some(identifier => normalizeId(identifier) === query) ||
    entry.vehicleIds.some(identifier => {
      const vehicleId = normalizeId(identifier)
      return vehicleId === query || (query.length >= 5 && query.endsWith(vehicleId))
    }) ||
    (digits.length >= 4 && [entry.billOfLading, entry.vehicleOrder]
      .filter((identifier): identifier is string => Boolean(identifier))
      .some(identifier => identifier.includes(digits)))
  )
}

/** Qoşqu: əvvəlcə avtomobil qeydindən, sonra manifestin ikinci car ID-sindən. */
export function resolveTrailer(vehicle?: Avtomobil, manifestEntry?: ManifestEntrySeed) {
  const fromVehicle = readText(vehicle, 'qoşqu')
  if (fromVehicle) return { plate: fromVehicle, source: 'Avtomobil qeydi' }

  const plate = readText(vehicle, 'nomre')
  const fromManifest = (manifestEntry?.vehicleIds ?? []).find(id => normalizeId(id) !== normalizeId(plate))
  if (fromManifest) return { plate: fromManifest, source: 'Gəmi sənədi (vehicle marks)' }

  return { plate: '', source: '' }
}

/** Qeydiyyatdan qaytarılan qoşqu kodu — nişan üzrə deterministikdir. */
export function makeTrailerCode(trailerPlate: string, voyageId: string) {
  const clean = normalizeId(trailerPlate)
  if (!clean) return ''
  const letters = (clean.replace(/[0-9]/g, '').slice(0, 3) || 'QSQ').padEnd(3, 'X')
  const digits = (clean.replace(/[^0-9]/g, '').slice(-4) || '0').padStart(4, '0')
  const year = voyageId.slice(4, 8) || '2026'
  return `QK-${year}-${letters}${digits}`
}

function classifyEgb(declaration: Declaration, tokens: string[]): { status: EgbStatus; qeyd: string } {
  const plateKey = normalizeId(declaration.avtomobil ?? '')
  if (plateKey && !tokens.includes(plateKey)) {
    return { status: 'uygunsuzluq', qeyd: `EGB-də nəqliyyat nişanı fərqlidir: ${declaration.avtomobil}` }
  }

  const status = (declaration.status ?? '').toLocaleLowerCase('az')
  if (status.includes('imtina') || status.includes('risk')) {
    return { status: 'uygunsuzluq', qeyd: `Bəyannamə statusu: ${declaration.status}` }
  }
  if (status.includes('təsdiq') || status.includes('buraxıl') || status.includes('qeydiyyat') || status.includes('arxiv')) {
    return { status: 'bagli', qeyd: 'EGB-dən götürülüb və tıra mənimsədilib' }
  }
  return { status: 'gozleyir', qeyd: 'Deklarant yoxlamasındadır — EGB-yə yüklənməyib' }
}

function buildInvoices(declaration: Declaration): InvoiceRecord[] {
  const goods = declaration.mallar ?? []
  const lead = goods[0]
  // Manifest sıra nömrəsi (yalnız rəqəm) invoys nömrəsi deyil — o halda bəyannamə kodundan törədilir.
  const orderRef = declaration.vehicleOrder ?? ''
  const no = orderRef && !/^\d{1,5}$/.test(orderRef)
    ? `İNV ${orderRef}`
    : `İNV ${declaration.kod.slice(-6)}`
  return [{
    no,
    mal: lead?.ad ?? '—',
    miqdar: lead ? `${lead.miqdar.toLocaleString('az-AZ')} ${lead.olcuVahidi}` : '—',
    mebleg: declaration.invoysDeyer ?? declaration.umumiDeyer ?? 0,
    valyuta: declaration.valyuta ?? 'USD',
    incoterms: declaration.incoterms,
  }]
}

/** Bir tırın bütün sənəd zəncirini mövcud manifest/bəyannamə datasından çıxarır. */
export function buildTruckDossier(input: {
  plate: string
  vehicle?: Avtomobil
  manifestEntry?: ManifestEntrySeed
  declarations: Declaration[]
  route?: { menshe?: string; teyinat?: string }
}): TruckDossier {
  const { plate, vehicle, manifestEntry, declarations, route } = input

  // Nəqliyyat nişanları — bəyannamənin bu tıra aid olmasının birinci meyarıdır.
  const plateTokens = unique([
    plate,
    readText(vehicle, 'nomre'),
    readText(vehicle, 'qoşqu'),
    ...(manifestEntry?.vehicleIds ?? []),
  ].map(normalizeId))

  // Sənəd açarları — nişan üzrə uyğunluq tapılmayanda istifadə olunur.
  const documentTokens = unique([
    readText(vehicle, 'kod'),
    readText(vehicle, 'billOfLading'),
    readText(vehicle, 'vehicleOrder'),
    manifestEntry?.billOfLading ?? '',
    manifestEntry?.vehicleOrder ?? '',
  ].map(normalizeId))

  const byPlate = declarations.filter(declaration =>
    declaration.avtomobil && plateTokens.includes(normalizeId(declaration.avtomobil))
  )
  const byDocument = declarations.filter(declaration =>
    [declaration.billOfLading, declaration.vehicleOrder, declaration.kod]
      .filter((value): value is string => Boolean(value))
      .map(normalizeId)
      .some(key => documentTokens.includes(key))
  )

  const linked = (byPlate.length > 0 ? byPlate : byDocument)
    .filter((declaration, index, all) => all.findIndex(item => item.kod === declaration.kod) === index)
    .slice(0, 4)

  const yuklemeYeri = route?.menshe || vehicle?.menshe || 'Kurık, Qazaxıstan'
  const boshaltmaYeri = route?.teyinat || vehicle?.teyinat || 'Ələt Limanı, Bakı'

  const cmrs: CmrRecord[] = linked.map((declaration, index) => {
    const lead = declaration.mallar?.[0]
    const egb = classifyEgb(declaration, plateTokens)
    const cmrNo = declaration.billOfLading
      || readText(vehicle, 'billOfLading')
      || manifestEntry?.billOfLading
      || `${declaration.kod.slice(-7)}`
    return {
      no: `CMR ${cmrNo}${linked.length > 1 ? `/${index + 1}` : ''}`,
      gonderen: declaration.satici || declaration.gonderen || '—',
      alan: declaration.alici || '—',
      yuklemeYeri,
      boshaltmaYeri: declaration.teslimYeri || boshaltmaYeri,
      malTesviri: lead?.ad || vehicle?.yuk || manifestEntry?.cargo || '—',
      bruttoKq: lead?.bruttoCeki ?? Math.round((manifestEntry?.grossTons ?? 0) * 1000),
      yerSayi: declaration.yukYerleri ?? lead?.miqdar ?? 0,
      invoices: buildInvoices(declaration),
      declarationKod: declaration.kod,
      declarationStatus: declaration.status,
      egbStatus: egb.status,
      egbQeyd: egb.qeyd,
    }
  })

  if (cmrs.length === 0) {
    cmrs.push({
      no: `CMR ${manifestEntry?.billOfLading || readText(vehicle, 'billOfLading') || plate}`,
      gonderen: '—',
      alan: '—',
      yuklemeYeri,
      boshaltmaYeri,
      malTesviri: vehicle?.yuk || manifestEntry?.cargo || '—',
      bruttoKq: Math.round((manifestEntry?.grossTons ?? 0) * 1000),
      yerSayi: 0,
      invoices: [],
      declarationKod: null,
      declarationStatus: null,
      egbStatus: 'gozleyir',
      egbQeyd: 'Bu CMR üzrə bəyannamə yazılmayıb',
    })
  }

  const matched = cmrs.filter(cmr => cmr.egbStatus === 'bagli').length
  const mismatched = cmrs.filter(cmr => cmr.egbStatus === 'uygunsuzluq').length
  const trailer = resolveTrailer(vehicle, manifestEntry)

  return {
    plate,
    trailerPlate: trailer.plate,
    trailerSource: trailer.source,
    cmrs,
    expected: cmrs.length,
    matched,
    mismatched,
    egbComplete: matched === cmrs.length && cmrs.length > 0,
  }
}

export const EGB_STATUS_LABEL: Record<EgbStatus, string> = {
  bagli: 'Bağlandı',
  gozleyir: 'Çatışmır',
  uygunsuzluq: 'Uyğunsuzluq',
}

/* ==========================================================================
 * Mal mövqelərinin statusu
 *
 * Bəyannamədə hər mal mövqeyi (44/31-ci xanalar) ayrıca buraxılış statusu
 * daşıyır. Prototip datası bu xananı saxlamır, ona görə status üç mənbədən
 * törədilir: (1) CMR → bəyannamə bağlantısı, (2) bəyannamə statusu,
 * (3) HS/XİF fəslinə görə tələb olunan nəzarət rejimi və hesablanmış ödənişlər.
 * ========================================================================== */

export type GoodsStatus = 'buraxilib' | 'sertli' | 'nezaretde' | 'yoxlamada' | 'gozleyir' | 'saxlanilib'

export type GoodsLine = {
  id: string
  ad: string
  hsKod: string
  miqdar: string
  netCeki?: number
  bruttoCeki?: number
  deyer: number
  valyuta: string
  cmrNo: string
  declarationKod: string | null
  /** HS fəsli üzrə tələb olunan icazə / nəzarət rejimləri */
  controls: string[]
  status: GoodsStatus
  statusQeyd: string
}

export const GOODS_STATUS_LABEL: Record<GoodsStatus, string> = {
  buraxilib: 'Buraxılıb',
  sertli: 'Şərti buraxılış',
  nezaretde: 'Nəzarətdə',
  yoxlamada: 'Yoxlamada',
  gozleyir: 'Bəyannamə gözləyir',
  saxlanilib: 'Saxlanılıb',
}

/** UI tonu — `status-chip` siniflərinə uyğun gəlir. */
export const GOODS_STATUS_TONE: Record<GoodsStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  buraxilib: 'success',
  sertli: 'warning',
  nezaretde: 'danger',
  yoxlamada: 'warning',
  gozleyir: 'neutral',
  saxlanilib: 'danger',
}

/** HS/XİF fəsli → tələb olunan nəzarət rejimi. Bir mal bir neçəsinə düşə bilər. */
const CONTROL_RULES: Array<{ test: RegExp; label: string }> = [
  { test: /^0[1-5]/, label: 'Baytarlıq nəzarəti (AQTA)' },
  { test: /^(0[6-9]|1[0-4])/, label: 'Fitosanitar nəzarət (AQTA)' },
  { test: /^(1[5-9]|2[0-3])/, label: 'Qida təhlükəsizliyi nəzarəti (AQTA)' },
  { test: /^22/, label: 'Aksizli mal — spirtli içki' },
  { test: /^24/, label: 'Aksizli mal — tütün' },
  { test: /^30/, label: 'Dərman vasitəsi — Səhiyyə Nazirliyinin icazəsi' },
  { test: /^(28|29|38)/, label: 'Kimyəvi maddə — ekoloji nəzarət' },
  { test: /^(36|93)/, label: 'Strateji mal — xüsusi icazə' },
  { test: /^8507/, label: 'Akkumulyator — ekoloji nəzarət' },
  { test: /^(87(0[1-5]))/, label: 'Nəqliyyat vasitəsi — DYP qeydiyyatı' },
]

export function goodsControls(hsCode: string): string[] {
  const digits = (hsCode ?? '').replace(/\D/g, '')
  if (!digits) return []
  return CONTROL_RULES.filter(rule => rule.test.test(digits)).map(rule => rule.label)
}

function classifyGoods(input: {
  declaration?: Declaration
  controls: string[]
}): { status: GoodsStatus; qeyd: string } {
  const { declaration, controls } = input
  if (!declaration) {
    return { status: 'gozleyir', qeyd: 'Bu CMR üzrə bəyannamə yazılmayıb' }
  }

  const status = (declaration.status ?? '').toLocaleLowerCase('az')
  if (status.includes('imtina')) {
    return { status: 'saxlanilib', qeyd: 'Bəyannamə üzrə imtina — mal buraxılmır' }
  }
  if (status.includes('risk')) {
    return { status: 'nezaretde', qeyd: 'Risk nəzarəti — əlavə yoxlama tələb olunur' }
  }

  const approved = status.includes('təsdiq') || status.includes('buraxıl') || status.includes('qeydiyyat') || status.includes('arxiv')
  if (!approved) {
    return {
      status: controls.length ? 'nezaretde' : 'yoxlamada',
      qeyd: controls.length
        ? `Deklarant yoxlamasındadır · ${controls[0]}`
        : 'Deklarant yoxlamasındadır',
    }
  }

  const charged = (declaration.odemeler ?? []).some(payment => payment.mebleg > 0)
  if (!charged) {
    return { status: 'sertli', qeyd: 'Rüsum / ƏDV hesablanmayıb — buraxılış şərtidir' }
  }
  if (controls.length) {
    return { status: 'sertli', qeyd: `Buraxılış icazəyə bağlıdır · ${controls.join(' · ')}` }
  }
  return { status: 'buraxilib', qeyd: 'Ödənişlər hesablanıb, əlavə icazə tələb olunmur' }
}

/** Tırın CMR-ləri üzrə bütün mal mövqelərini statusu ilə birlikdə qaytarır. */
export function buildGoodsLines(cmrs: CmrRecord[], declarations: Declaration[]): GoodsLine[] {
  const lines: GoodsLine[] = []

  cmrs.forEach(cmr => {
    const declaration = cmr.declarationKod
      ? declarations.find(item => item.kod === cmr.declarationKod)
      : undefined

    if (!declaration) {
      const controls = goodsControls('')
      const verdict = classifyGoods({ declaration: undefined, controls })
      lines.push({
        id: `${cmr.no}-0`,
        ad: cmr.malTesviri,
        hsKod: '—',
        miqdar: cmr.yerSayi ? `${cmr.yerSayi.toLocaleString('az-AZ')} yer` : '—',
        bruttoCeki: cmr.bruttoKq || undefined,
        deyer: cmr.invoices[0]?.mebleg ?? 0,
        valyuta: cmr.invoices[0]?.valyuta ?? '—',
        cmrNo: cmr.no,
        declarationKod: null,
        controls,
        status: verdict.status,
        statusQeyd: verdict.qeyd,
      })
      return
    }

    declaration.mallar.forEach((mal, index) => {
      const controls = goodsControls(mal.xifMnKodu ?? mal.hsKod)
      const verdict = classifyGoods({ declaration, controls })
      lines.push({
        id: `${cmr.no}-${index}`,
        ad: mal.ad,
        hsKod: mal.hsKod || mal.xifMnKodu || '—',
        miqdar: `${mal.miqdar.toLocaleString('az-AZ')} ${mal.olcuVahidi}`,
        netCeki: mal.netCeki,
        bruttoCeki: mal.bruttoCeki,
        deyer: mal.deyer ?? 0,
        valyuta: declaration.valyuta ?? 'AZN',
        cmrNo: cmr.no,
        declarationKod: declaration.kod,
        controls,
        status: verdict.status,
        statusQeyd: verdict.qeyd,
      })
    })
  })

  return lines
}

export function summarizeGoods(lines: GoodsLine[]) {
  const released = lines.filter(line => line.status === 'buraxilib').length
  const blocked = lines.filter(line => line.status === 'saxlanilib' || line.status === 'nezaretde').length
  return { total: lines.length, released, blocked, pending: lines.length - released - blocked }
}

/* ==========================================================================
 * Tırın qeydiyyat mərhələsi — sağ paneldə status kimi göstərilir
 * ========================================================================== */

export type ProgressState = 'done' | 'active' | 'idle'

export type TruckProgressStep = {
  id: string
  label: string
  detail: string
  state: ProgressState
}

/** `SavedRegistration` ilə struktur olaraq uyğundur — store-dan asılılıq yaratmır. */
export type RegistrationSnapshot = {
  trailerCode?: string
  permitBlank?: { nomre: string; qaytarildi: boolean }
  roadTaxes?: string[]
  status?: string
}

export function buildTruckProgress(input: {
  dossier: TruckDossier
  linkedCount: number
  registration?: RegistrationSnapshot
}): TruckProgressStep[] {
  const { dossier, linkedCount, registration } = input
  const egbDone = dossier.cmrs.length > 0 && linkedCount === dossier.cmrs.length
  const vaisDone = Boolean(registration?.trailerCode)
  const permitDone = Boolean(registration?.permitBlank?.qaytarildi)
  const taxDone = Boolean(registration?.roadTaxes?.length)

  const steps: Array<Omit<TruckProgressStep, 'state'> & { done: boolean }> = [
    {
      id: 'nv',
      label: 'Nəqliyyat vasitəsi',
      detail: `${dossier.plate}${dossier.trailerPlate ? ` · qoşqu ${dossier.trailerPlate}` : ' · qoşqusuz'}`,
      done: true,
    },
    {
      id: 'egb',
      label: 'Bəyannamə · EGB',
      detail: `${linkedCount} / ${dossier.cmrs.length} bağlandı · ${dossier.cmrs.reduce((sum, cmr) => sum + cmr.invoices.length, 0)} invoys${dossier.mismatched ? ` · ${dossier.mismatched} uyğunsuz` : ''}`,
      done: egbDone,
    },
    {
      id: 'vais',
      label: 'Qoşqu qeydiyyatı',
      detail: registration?.trailerCode ? `Qoşqu kodu ${registration.trailerCode}` : 'Qoşqu kodu alınmayıb',
      done: vaisDone,
    },
    {
      id: 'permit',
      label: 'İcazə blankı',
      detail: registration?.permitBlank?.nomre
        ? `№ ${registration.permitBlank.nomre} · sürücüyə qaytarılıb`
        : 'Qeydə alınmayıb',
      done: permitDone,
    },
    {
      id: 'tax',
      label: 'Yol vergisi',
      detail: registration?.roadTaxes?.[0]?.replace(/^Yol vergisi \(211\.1\.1\.3\):\s*/i, '') ?? 'Hesablanmayıb',
      done: taxDone,
    },
  ]

  const firstPending = steps.findIndex(step => !step.done)
  return steps.map((step, index) => ({
    id: step.id,
    label: step.label,
    detail: step.detail,
    state: step.done ? 'done' : index === firstPending ? 'active' : 'idle',
  }))
}
