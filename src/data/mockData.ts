import { alatKurikManifestSeed } from './documentSeeds'

export type GemiStatus = 'Lövbərdə' | 'Yolda' | 'Körpüdə'

export const gemiler = [
  { id: 'IMO9345678', ad: 'Bəxtiyar', novu: 'Konteyner gəmisi', bayraq: 'Azərbaycan', yuk: 'Qarışıq yük', tonaj: 12500, status: 'Lövbərdə' as GemiStatus, kanal: 'Kanal 3', girisTarixi: '2026-06-25T14:30', cixisTarixi: '2026-06-26T09:15', menshe: 'Aktau, Qazaxıstan', lat: 39.4823, lng: 49.4056, suret: 0.2 },
  { id: 'IMO9251845', ad: 'Şah İsmayıl', novu: 'Ro-Ro gəmisi', bayraq: 'Azərbaycan', yuk: 'Avtomobillər', tonaj: 9800, status: 'Yolda' as GemiStatus, kanal: 'Kanal 1', girisTarixi: '2026-07-10T12:40', cixisTarixi: '2026-07-11T08:00', menshe: 'Kurık, Qazaxıstan', lat: 40.12, lng: 49.96, suret: 12.4 },
  { id: 'IMO9472102', ad: 'Nizami Gəncəvi', novu: 'Quru yük gəmisi', bayraq: 'Azərbaycan', yuk: 'Taxıl', tonaj: 14200, status: 'Körpüdə' as GemiStatus, kanal: 'Kanal 2', girisTarixi: '2026-07-10T09:15', cixisTarixi: '2026-07-11T14:00', menshe: 'Türkmənbaşı, Türkmənistan', lat: 39.61, lng: 49.57, suret: 3.1 },
  { id: 'IMO9187342', ad: 'Xəzər-1', novu: 'Bərə', bayraq: 'Azərbaycan', yuk: 'TIR və sərnişin', tonaj: 8100, status: 'Yolda' as GemiStatus, kanal: 'Kanal 1', girisTarixi: '2026-07-09T16:00', cixisTarixi: '2026-07-10T07:35', menshe: 'Ələt, Azərbaycan', lat: 40.41, lng: 50.44, suret: 14.8 },
  { id: 'IMO9654201', ad: 'Aktau Star', novu: 'Ro-Ro gəmisi', bayraq: 'Qazaxıstan', yuk: 'Sənaye avadanlığı', tonaj: 11800, status: 'Yolda' as GemiStatus, kanal: 'Gözləmə zonası', girisTarixi: '2026-07-10T18:20', cixisTarixi: '2026-07-11T17:00', menshe: 'Aktau, Qazaxıstan', lat: 41.48, lng: 50.62, suret: 11.2 },
  { id: 'IMO9531188', ad: 'Türkmən Ulduzu', novu: 'Quru yük gəmisi', bayraq: 'Türkmənistan', yuk: 'Tekstil və polimer', tonaj: 10600, status: 'Körpüdə' as GemiStatus, kanal: 'Gözləmə zonası', girisTarixi: '2026-07-11T02:10', cixisTarixi: '2026-07-12T06:00', menshe: 'Türkmənbaşı, Türkmənistan', lat: 40.28, lng: 51.94, suret: 10.6 },
  { id: 'IMO9012844', ad: 'Qarabağ', novu: 'Konteyner gəmisi', bayraq: 'Azərbaycan', yuk: 'Konteyner', tonaj: 15200, status: 'Lövbərdə' as GemiStatus, kanal: 'Kanal 5', girisTarixi: '2026-07-10T06:10', cixisTarixi: '2026-07-10T22:00', menshe: 'Kurık, Qazaxıstan', lat: 39.49, lng: 49.42, suret: 0 },
  { id: 'IMO9725100', ad: 'Caspian Bridge', novu: 'Bərə', bayraq: 'Qazaxıstan', yuk: 'Avtomobillər', tonaj: 8900, status: 'Körpüdə' as GemiStatus, kanal: 'Kanal 4', girisTarixi: '2026-07-10T11:40', cixisTarixi: '2026-07-11T05:00', menshe: 'Aktau, Qazaxıstan', lat: 39.56, lng: 49.49, suret: 2.6 },
  { id: 'IMO9447621', ad: 'Odlar Yurdu', novu: 'Tanker', bayraq: 'Azərbaycan', yuk: 'Maye yük', tonaj: 17600, status: 'Yolda' as GemiStatus, kanal: 'Kanal 2', girisTarixi: '2026-07-08T21:00', cixisTarixi: '2026-07-10T03:20', menshe: 'Ələt, Azərbaycan', lat: 41.1, lng: 51.1, suret: 13.5 },
  { id: 'IMO9633014', ad: 'Kuryk Express', novu: 'Ro-Ro gəmisi', bayraq: 'Qazaxıstan', yuk: 'TIR', tonaj: 10300, status: 'Yolda' as GemiStatus, kanal: 'Gözləmə zonası', girisTarixi: '2026-07-11T07:40', cixisTarixi: '2026-07-12T02:00', menshe: 'Kurık, Qazaxıstan', lat: 42.12, lng: 50.88, suret: 11.9 },
  { id: 'IMO9507732', ad: 'Balkan', novu: 'Quru yük gəmisi', bayraq: 'Türkmənistan', yuk: 'Gübrə', tonaj: 13100, status: 'Körpüdə' as GemiStatus, kanal: 'Kanal 3', girisTarixi: '2026-07-08T13:20', cixisTarixi: '2026-07-09T19:10', menshe: 'Ələt, Azərbaycan', lat: 40.02, lng: 52.2, suret: 12.8 },
  { id: 'IMO9205173', ad: 'Zəfər', novu: 'Konteyner gəmisi', bayraq: 'Azərbaycan', yuk: 'Qarışıq yük', tonaj: 14700, status: 'Lövbərdə' as GemiStatus, kanal: 'Kanal 6', girisTarixi: '2026-07-09T22:10', cixisTarixi: '2026-07-10T19:00', menshe: 'Aktau, Qazaxıstan', lat: 39.47, lng: 49.39, suret: 0 },
]

const adlar = ['Elçin Məmmədov', 'Rəşad Əliyev', 'Tural Hüseynov', 'Samir Quliyev', 'Namiq Rzayev', 'Orxan İsmayılov']
const yukler = ['Elektronika', 'Tekstil', 'Avtomobil hissələri', 'Qida məhsulları', 'Sənaye avadanlığı', 'Tikinti materialları']
const markalar = ['Volvo FH16', 'Mercedes Actros', 'DAF XF', 'MAN TGX'] as const

/** Manifest car ID-lərini axtarış üçün oxunaqlı formata gətirir. */
const formatVehicleId = (id: string) => id.replace(/([A-Z]+)(\d+)/gi, (_, a: string, b: string) => `${a.toUpperCase()} ${b}`).replace(/(\d+)([A-Z]+)/gi, (_, a: string, b: string) => `${a} ${b.toUpperCase()}`)

/** DB: Ələt–Kurık manifestindəki BL + vehicle order + car ID-lərdən qurulmuş avtomobillər. */
export const avtomobiller = [
  {
    kod: '1234567890123',
    nomre: '15 AA 859',
    surucu: adlar[0],
    marka: markalar[3],
    gemi: gemiler[0].id,
    yuk: 'Elektrik akkumulyatorları',
    menshe: 'Kurık',
    teyinat: 'Bakı',
    status: 'Qeydiyyatda',
    billOfLading: '245263',
    vehicleOrder: '4472',
  },
  ...alatKurikManifestSeed.flatMap((entry, entryIndex) => {
    const ids = entry.vehicleIds.length > 0 ? entry.vehicleIds : [`BL${entry.billOfLading}`]
    return ids.map((vehicleId, vehicleIndex) => {
      const i = entryIndex * 3 + vehicleIndex
      return {
        kod: `${entry.billOfLading}${vehicleId}`.replace(/\W/g, '').slice(0, 13).padEnd(13, '0'),
        nomre: formatVehicleId(vehicleId),
        surucu: adlar[i % adlar.length],
        marka: markalar[i % markalar.length],
        gemi: gemiler[i % gemiler.length].id,
        yuk: entry.cargo,
        menshe: ['Kurık', 'Aktau', 'Türkmənbaşı'][i % 3],
        teyinat: ['Bakı', 'Gəncə', 'Tbilisi'][i % 3],
        status: i % 5 === 0 ? 'Yoxlanılır' : 'Qeydiyyatda',
        billOfLading: entry.billOfLading,
        vehicleOrder: entry.vehicleOrder ?? '',
      }
    })
  }),
]

export type Avtomobil = (typeof avtomobiller)[number]

export type CustomsPayment = {
  kod: string
  hesablamaEsasi: number
  faizVeyaTarif: string
  mebleg: number
  od: string
}

export type DeclarationGood = {
  hsKod: string
  ad: string
  miqdar: number
  olcuVahidi: string
  deyer: number
  netCeki?: number
  bruttoCeki?: number
  menşe?: string
  xifMnKodu?: string
  invoysDeyer?: number
}

/** 09.07.2026 sənəd şəkli + sintetik bəyannamə modeli. */
export type Declaration = {
  kod: string
  senedNovu?: string
  tarix: string
  broker: string
  avtomobil: string
  alici: string
  satici: string
  mallar: DeclarationGood[]
  umumiDeyer: number
  valyuta: string
  status: string
  qeydiyyatTarixi?: string
  brokerVun?: string
  brokerUnvan?: string
  nəqliyyatNovu?: string
  aliciOlke?: string
  saticiOlke?: string
  gonderen?: string
  gonderenOlke?: string
  muqavileTerefi?: string
  muqavileTerefiOlke?: string
  ticaretolke?: string
  ticaretolkeKodu?: string
  menseOlke?: string
  serhedNeqliyyat?: string
  serhedNeqliyyatKodu?: string
  serhedKecmeMentegesi?: string
  gomrukResmilikAparan?: string
  attestatNo?: string
  attestatTarixi?: string
  invoysDeyer?: number
  valyutaMezennesi?: number
  statistikDeyer?: number
  gomrukRejimi?: string
  yukYerleri?: number
  incoterms?: string
  teslimYeri?: string
  source?: string
  teyinatGomrukOrqani?: string
  billOfLading?: string
  vehicleOrder?: string
  gemiId?: string
  odemeler?: CustomsPayment[]
  /** Gözləmə / əlavə yoxlama səbəbləri */
  waitReasons?: string[]
  waitChannel?: 'Fiziki yoxlama' | 'X ray' | 'Kinoloji itin tətbiqi' | string
}

const brokers = [
  { ad: 'REGION BROKER MMC', vun: '3104246411', unvan: 'AZ0123, Abşeron rayonu, Masazır, Yeni Bakı Yaşayış Kompleksi, ev 38, mənzil 56' },
  { ad: 'Kaspian Logistics MMC', vun: '1402893341', unvan: 'AZ1000, Bakı, Nəsimi r., 28 May küç. 15' },
  { ad: 'TransCaspian Broker', vun: '2001457788', unvan: 'AZ1025, Bakı, Xətai r., Heydər Əliyev pr. 92' },
  { ad: 'İpək Yolu Gömrük MMC', vun: '1705562210', unvan: 'AZ5000, Sumqayıt, 17-ci məhəllə, ev 4' },
]

const alicilar = [
  { ad: 'Regional Distribution MMC', olke: 'Azərbaycan' },
  { ad: 'TechShop MMC', olke: 'Azərbaycan' },
  { ad: 'AzTicarət ASC', olke: 'Azərbaycan' },
  { ad: 'Baku Industrial MMC', olke: 'Azərbaycan' },
  { ad: 'OBA MARKET MMC', olke: 'Azərbaycan' },
  { ad: 'Caspian Retail Group', olke: 'Azərbaycan' },
]

const saticilar = [
  { ad: 'Anker Innovations Limited', olke: 'Çin' },
  { ad: 'Kazakh Export LLP', olke: 'Qazaxıstan' },
  { ad: 'Turkmen Trade AS', olke: 'Türkmənistan' },
  { ad: 'Steppe Logistics LLP', olke: 'Qazaxıstan' },
  { ad: 'EURO Plywood LLP', olke: 'Qazaxıstan' },
  { ad: 'Zolotonosha Butter-Making Combine LLC', olke: 'Ukrayna' },
]

/** Manifest yüklərinə uyğun sintetik mal şablonları. */
const malSablonlari: Array<{ ad: string; hsKod: string; xifMnKodu: string; menşe: string; olcuVahidi: string }> = [
  { ad: 'Elektrik akkumulyatoru (Anker SOLIX Solarbank 2 E5000 Pro)', hsKod: '8507.60.00.09', xifMnKodu: '8507600009', menşe: 'Çin', olcuVahidi: 'ədəd' },
  { ad: 'Oilwell sement üçün çəki materialı', hsKod: '3824.40.00.00', xifMnKodu: '3824400000', menşe: 'Qazaxıstan', olcuVahidi: 'kq' },
  { ad: 'Dondurulmuş qızılbalıq', hsKod: '0303.13.00.00', xifMnKodu: '0303130000', menşe: 'Norveç', olcuVahidi: 'kq' },
  { ad: 'IBC tanklar', hsKod: '3923.30.10.00', xifMnKodu: '3923301000', menşe: 'Türkiyə', olcuVahidi: 'ədəd' },
  { ad: 'Dərman vasitələri', hsKod: '3004.90.00.00', xifMnKodu: '3004900000', menşe: 'Almaniya', olcuVahidi: 'kq' },
  { ad: 'Yeni avtomobil şinləri', hsKod: '4011.10.00.00', xifMnKodu: '4011100000', menşe: 'Çin', olcuVahidi: 'ədəd' },
  { ad: 'Ehtiyat hissələri', hsKod: '8708.99.00.00', xifMnKodu: '8708990000', menşe: 'Qazaxıstan', olcuVahidi: 'kq' },
  { ad: 'Reklam avadanlığı', hsKod: '9405.60.00.00', xifMnKodu: '9405600000', menşe: 'Türkiyə', olcuVahidi: 'ədəd' },
  { ad: 'Baytarlıq dərmanları', hsKod: '3002.90.00.00', xifMnKodu: '3002900000', menşe: 'Hollandiya', olcuVahidi: 'kq' },
  { ad: 'Sanitariya avadanlığı (Izelia)', hsKod: '6910.10.00.00', xifMnKodu: '6910100000', menşe: 'İtaliya', olcuVahidi: 'ədəd' },
  { ad: 'Kimyəvi Versamul emulqator', hsKod: '3402.90.00.00', xifMnKodu: '3402900000', menşe: 'ABŞ', olcuVahidi: 'kq' },
  { ad: 'Elektrodlar', hsKod: '8311.10.00.00', xifMnKodu: '8311100000', menşe: 'Rusiya', olcuVahidi: 'kq' },
  { ad: 'Ekstruder hissələri', hsKod: '8477.90.00.00', xifMnKodu: '8477900000', menşe: 'Almaniya', olcuVahidi: 'ədəd' },
  { ad: 'Minik avtomobilləri (Range Rover)', hsKod: '8703.23.00.00', xifMnKodu: '8703230000', menşe: 'Böyük Britaniya', olcuVahidi: 'ədəd' },
  { ad: 'Qatıq / süd məhsulları', hsKod: '0403.10.00.00', xifMnKodu: '0403100000', menşe: 'Ukrayna', olcuVahidi: 'kq' },
  { ad: 'Şampun və deterjan', hsKod: '3305.10.00.00', xifMnKodu: '3305100000', menşe: 'Türkiyə', olcuVahidi: 'kq' },
  { ad: 'Protein-yağ məhsulu', hsKod: '2106.90.00.00', xifMnKodu: '2106900000', menşe: 'Ukrayna', olcuVahidi: 'kq' },
  { ad: 'Yanacaq filtri', hsKod: '8421.23.00.00', xifMnKodu: '8421230000', menşe: 'Almaniya', olcuVahidi: 'ədəd' },
  { ad: 'Ət məhsulları', hsKod: '1602.50.00.00', xifMnKodu: '1602500000', menşe: 'Belarus', olcuVahidi: 'kq' },
  { ad: 'Tütün məhsulları üçün material', hsKod: '2401.20.00.00', xifMnKodu: '2401200000', menşe: 'Hindistan', olcuVahidi: 'kq' },
]

const operatorlar = [
  'ŞİRƏLİYEV RƏSUL CƏLAL OĞLU',
  'MƏMMƏDLİ AYSEL NİZAMİ QIZI',
  'HÜSEYNOV NİCAT ELÇİN OĞLU',
  'QULİYEVA LƏMAN RÖVŞƏN QIZI',
]

const mentegeler = [
  '00502 Məzımqara g/p',
  '00501 Ələt g/p',
  '00101 Bakı Baş Gömrük İdarəsi',
  '00510 Səngəçal g/p',
]

function buildPayments(gomrukDeyeri: number): CustomsPayment[] {
  const rüsum = Math.round(gomrukDeyeri * 0.15 * 100) / 100
  const edvEsas = Math.round((gomrukDeyeri + rüsum) * 100) / 100
  const edv = Math.round(edvEsas * 0.18 * 100) / 100
  return [
    { kod: '01', hesablamaEsasi: 0, faizVeyaTarif: '30,00 AZN', mebleg: 30, od: '01' },
    { kod: '01', hesablamaEsasi: gomrukDeyeri, faizVeyaTarif: '—', mebleg: 600, od: '05' },
    { kod: '20', hesablamaEsasi: gomrukDeyeri, faizVeyaTarif: '15.0%', mebleg: rüsum, od: '05' },
    { kod: '32', hesablamaEsasi: edvEsas, faizVeyaTarif: '18.0%', mebleg: edv, od: '05' },
    { kod: '75', hesablamaEsasi: 1, faizVeyaTarif: '30,00 AZN', mebleg: 30, od: '05' },
    { kod: '85', hesablamaEsasi: 30, faizVeyaTarif: '18.0%', mebleg: 5.4, od: '05' },
  ]
}

/** 09.07.2026 tarixli, təqdim olunan sənəd şəkli əsasında normallaşdırılmış demo qeydi. */
export const ankerBeyanname: Declaration = {
  kod: '01263001286453',
  senedNovu: 'Gömrük bəyannaməsi',
  tarix: '2026-07-09',
  qeydiyyatTarixi: '09.07.2026 17:53',
  broker: 'REGION BROKER MMC',
  brokerVun: '3104246411',
  brokerUnvan: 'AZ0123, Abşeron rayonu, Masazır, Yeni Bakı Yaşayış Kompleksi, ev 38, mənzil 56',
  avtomobil: '15 AA 859',
  billOfLading: '245263',
  vehicleOrder: '4472',
  gemiId: 'IMO9345678',
  nəqliyyatNovu: 'Dəniz nəqliyyatı',
  gonderen: 'Anker Innovations Limited',
  gonderenOlke: 'Çin',
  satici: 'Anker Innovations Limited',
  saticiOlke: 'Çin',
  muqavileTerefi: 'Anker Innovations (Malta) Co., Ltd',
  muqavileTerefiOlke: 'Malta',
  alici: 'Regional Distribution MMC',
  aliciOlke: 'Azərbaycan',
  ticaretolke: 'Çin',
  ticaretolkeKodu: 'CN',
  menseOlke: 'Çin / Malta',
  serhedNeqliyyat: '15 AA 859',
  serhedNeqliyyatKodu: undefined,
  serhedKecmeMentegesi: '00502 Məzımqara g/p',
  gomrukResmilikAparan: 'ŞİRƏLİYEV RƏSUL CƏLAL OĞLU',
  attestatNo: '1068',
  attestatTarixi: '30.01.2025',
  mallar: [{
    hsKod: '8507.60.00.09',
    xifMnKodu: '8507600009',
    ad: 'Elektrik akkumulyatoru (Anker SOLIX Solarbank 2 E5000 Pro)',
    miqdar: 376,
    olcuVahidi: 'ədəd',
    netCeki: 19198.56,
    bruttoCeki: 21573,
    menşe: 'Çin',
    deyer: 524543.34,
    invoysDeyer: 270021.28,
  }],
  umumiDeyer: 524543.34,
  statistikDeyer: 308554.91,
  valyuta: 'AZN',
  invoysDeyer: 270021.28,
  valyutaMezennesi: 1.9426,
  gomrukRejimi: '40 00 00',
  yukYerleri: 376,
  incoterms: 'CIF',
  teslimYeri: 'Bakı, Azərbaycan',
  teyinatGomrukOrqani: 'Bakı Baş Gömrük İdarəsi',
  status: 'Təsdiqlənib',
  source: 'Sənəd şəkli, 09.07.2026 17:53',
  odemeler: [
    { kod: '01', hesablamaEsasi: 0, faizVeyaTarif: '30,00 AZN', mebleg: 30, od: '01' },
    { kod: '01', hesablamaEsasi: 524543.34, faizVeyaTarif: '—', mebleg: 600, od: '05' },
    { kod: '20', hesablamaEsasi: 524543.34, faizVeyaTarif: '15.0%', mebleg: 78681.5, od: '05' },
    { kod: '32', hesablamaEsasi: 603224.84, faizVeyaTarif: '18.0%', mebleg: 108580.47, od: '05' },
    { kod: '75', hesablamaEsasi: 1, faizVeyaTarif: '30,00 AZN', mebleg: 30, od: '05' },
    { kod: '85', hesablamaEsasi: 30, faizVeyaTarif: '18.0%', mebleg: 5.4, od: '05' },
  ],
}

function matchGoodsTemplate(cargo: string, index: number) {
  const c = cargo.toLowerCase()
  const rules: Array<[boolean, (ad: string) => boolean]> = [
    [c.includes('salmon'), ad => ad.includes('qızılbalıq')],
    [c.includes('tyre'), ad => ad.includes('şin')],
    [c.includes('medic') && !c.includes('veterinary'), ad => ad.includes('dərman') && !ad.includes('baytar')],
    [c.includes('veterinary'), ad => ad.includes('baytar')],
    [c.includes('spare'), ad => ad.includes('ehtiyat')],
    [c.includes('advertis'), ad => ad.includes('reklam')],
    [c.includes('sanitar'), ad => ad.includes('sanitar')],
    [c.includes('emuls'), ad => ad.includes('emulqator')],
    [c.includes('electrode'), ad => ad.includes('elektrod')],
    [c.includes('extruder'), ad => ad.includes('ekstruder')],
    [c.includes('range rover') || c === 'cars', ad => ad.includes('range')],
    [c.includes('yogurt'), ad => ad.includes('qatıq')],
    [c.includes('deterjan') || c.includes('sampuan') || c.includes('deodorant') || c.includes('sac kremi') || c.includes('ukhodu'), ad => ad.includes('şampun')],
    [c.includes('protein'), ad => ad.includes('protein')],
    [c.includes('fuel filter'), ad => ad.includes('filtr')],
    [c.includes('мясн') || c.includes('myasn'), ad => ad.includes('ət')],
    [c.includes('tobacco'), ad => ad.includes('tütün')],
    [c.includes('cement') || c.includes('weight material'), ad => ad.includes('sement')],
    [c.includes('ibc'), ad => ad.includes('ibc')],
  ]
  for (const [match, test] of rules) {
    if (!match) continue
    const hit = malSablonlari.find(m => test(m.ad.toLowerCase()))
    if (hit) return hit
  }
  return malSablonlari[index % malSablonlari.length]
}

function declarationSortKey(d: Pick<Declaration, 'tarix' | 'qeydiyyatTarixi'>) {
  if (d.qeydiyyatTarixi) {
    const m = d.qeydiyyatTarixi.match(/(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})/)
    if (m) return `${m[3]}${m[2]}${m[1]}${m[4]}${m[5]}`
  }
  return d.tarix.replace(/-/g, '')
}

function makeDeclarationForVehicle(
  vehicle: (typeof avtomobiller)[number],
  index: number,
  status: string,
  day: number,
  hour: number,
  kodSuffix: number,
): Declaration {
  const entry = alatKurikManifestSeed.find(e => e.billOfLading === vehicle.billOfLading)
  const mal = matchGoodsTemplate(vehicle.yuk, index)
  const broker = brokers[index % brokers.length]
  const alici = alicilar[index % alicilar.length]
  const satici = saticilar[index % saticilar.length]
  const operator = operatorlar[index % operatorlar.length]
  const yerSayi = Math.max(1, Math.round((entry?.netTons ?? 10) * 12 + (index % 7)))
  const netto = Math.round((entry?.netTons ?? 1) * 1000 * 100) / 100
  const brutto = Math.round((entry?.grossTons ?? 1) * 1000 * 100) / 100
  const invoys = Math.round((netto * (18 + (index % 5)) + 1200) * 100) / 100
  const mezenne = Math.round((1.7 + (index % 7) * 0.03) * 10000) / 10000
  const umumiDeyer = Math.round(invoys * mezenne * 100) / 100
  const statistik = Math.round(umumiDeyer * 0.588 * 100) / 100
  const dd = String(day).padStart(2, '0')
  const hh = String(hour).padStart(2, '0')
  const mm = String((index * 7) % 60).padStart(2, '0')

  return {
    kod: `3-33-${3900 + index}/2-${String(kodSuffix).padStart(6, '0')}`,
    senedNovu: 'Gömrük bəyannaməsi',
    tarix: `2026-07-${dd}`,
    qeydiyyatTarixi: `${dd}.07.2026 ${hh}:${mm}`,
    broker: broker.ad,
    brokerVun: broker.vun,
    brokerUnvan: broker.unvan,
    avtomobil: vehicle.nomre,
    billOfLading: vehicle.billOfLading,
    vehicleOrder: vehicle.vehicleOrder || undefined,
    gemiId: vehicle.gemi,
    nəqliyyatNovu: 'Avtomobil / Ro-Ro',
    gonderen: satici.ad,
    gonderenOlke: satici.olke,
    satici: satici.ad,
    saticiOlke: satici.olke,
    muqavileTerefi: satici.ad,
    muqavileTerefiOlke: satici.olke,
    alici: alici.ad,
    aliciOlke: alici.olke,
    ticaretolke: satici.olke,
    ticaretolkeKodu: satici.olke === 'Çin' ? 'CN' : satici.olke === 'Qazaxıstan' ? 'KZ' : satici.olke === 'Türkmənistan' ? 'TM' : satici.olke === 'Ukrayna' ? 'UA' : 'XX',
    menseOlke: mal.menşe,
    serhedNeqliyyat: vehicle.nomre,
    serhedNeqliyyatKodu: undefined,
    serhedKecmeMentegesi: mentegeler[index % mentegeler.length],
    gomrukResmilikAparan: operator,
    attestatNo: String(1000 + (index % 80)),
    attestatTarixi: `15.0${1 + (index % 9)}.2025`,
    mallar: [{
      hsKod: mal.hsKod,
      xifMnKodu: mal.xifMnKodu,
      ad: vehicle.yuk || mal.ad,
      miqdar: yerSayi,
      olcuVahidi: mal.olcuVahidi,
      netCeki: netto,
      bruttoCeki: brutto,
      menşe: mal.menşe,
      deyer: umumiDeyer,
      invoysDeyer: invoys,
    }],
    umumiDeyer,
    statistikDeyer: statistik,
    valyuta: 'AZN',
    invoysDeyer: invoys,
    valyutaMezennesi: mezenne,
    gomrukRejimi: '40 00 00',
    yukYerleri: yerSayi,
    incoterms: index % 2 ? 'CIF' : 'FOB',
    teslimYeri: `${vehicle.teyinat}, Azərbaycan`,
    teyinatGomrukOrqani: index % 3 === 0 ? 'Bakı Baş Gömrük İdarəsi' : index % 3 === 1 ? 'Sumqayıt Gömrük İdarəsi' : 'Gəncə Gömrük İdarəsi',
    status,
    source: `Manifest B/L ${vehicle.billOfLading}${vehicle.vehicleOrder ? ` · order ${vehicle.vehicleOrder}` : ''}`,
    odemeler: buildPayments(umumiDeyer),
  }
}

/**
 * Hər maşın/BL üçün:
 * - köhnə arxiv / təsdiqlənmiş bəyannamə
 * - ən son açıq (təsdiqlənməmiş) bəyannamə
 * Anker sənədi istinad kimi saxlanılır.
 */
export const beyannameler: Declaration[] = [
  ankerBeyanname,
  // 15 AA 859 üçün açıq bəyannamə — Anker sənəd template-i (təsdiqlənməmiş nüsxə)
  (() => {
    const demo = avtomobiller[0]
    return {
      ...ankerBeyanname,
      kod: '3-33-3900/2-001059',
      status: 'Yoxlamada',
      qeydiyyatTarixi: '10.07.2026 16:20',
      tarix: '2026-07-10',
      avtomobil: demo.nomre,
      serhedNeqliyyat: demo.nomre,
      billOfLading: '245263',
      vehicleOrder: '4472',
      gemiId: demo.gemi,
      source: 'Anker sənəd template · açıq bəyannamə nüsxəsi',
      waitChannel: 'X ray',
      waitReasons: [
        'Əlavə yoxlama kanalı: X ray',
        'Riskli mal əlaməti: akkumulyator / enerji avadanlığı',
        'Yüksək gömrük dəyəri — skaner yoxlaması tələb olunur',
      ],
    } satisfies Declaration
  })(),
  ...avtomobiller.slice(1).flatMap((vehicle, index) => {
    const i = index + 1
    const cargo = vehicle.yuk.toLowerCase()
    const isRiskyCargo = /chemical|medic|veterinary|tobacco|fuel filter|мясн|myasn|protein|emuls|control room|boat|cement/.test(cargo)
    const archived = makeDeclarationForVehicle(vehicle, i, i % 5 === 0 ? 'Arxivləşdirilib' : 'Təsdiqlənib', 1 + (i % 5), 9, 1000 + i)
    // Riskli yüklərin bir hissəsi "Risk nəzarəti"; digərləri "Yoxlamada"
    const openStatus = isRiskyCargo && i % 3 === 0 ? 'Risk nəzarəti' : 'Yoxlamada'
    const open = makeDeclarationForVehicle(vehicle, i, openStatus, 8 + (i % 3), 14 + (i % 6), 2000 + i)
    const channels = ['Fiziki yoxlama', 'X ray', 'Kinoloji itin tətbiqi'] as const
    const channel = channels[i % 3]
    const waitReasons: string[] = []
    if (openStatus === 'Yoxlamada' || openStatus === 'Risk nəzarəti') {
      waitReasons.push(`Əlavə yoxlama kanalı: ${channel}`)
      if (isRiskyCargo) waitReasons.push(`Riskli yük tipi: ${vehicle.yuk}`)
      if (openStatus === 'Risk nəzarəti') waitReasons.push('Bəyannamə statusu: Risk nəzarəti — əlavə operator yoxlaması')
      if (i % 4 === 0) waitReasons.push('Sənəd uyğunsuzluğu / əlavə sənəd gözlənilir')
      if (i % 5 === 0) waitReasons.push('Çəki fərqi — brutto/netto yoxlanılır')
    }
    return [
      archived,
      {
        ...open,
        waitChannel: channel,
        waitReasons: waitReasons.length ? waitReasons : undefined,
      } satisfies Declaration,
    ]
  }),
]

export { declarationSortKey }

export const postQerarlar = Array.from({ length: 18 }, (_, i) => ({
  tarix: `2026-07-${String(10 - (i % 10)).padStart(2, '0')}`, kod: i % 3 === 0 ? '545' : String(540 + (i % 9)), gemi: gemiler[i % gemiler.length].ad, novu: i % 2 ? 'Çıxış' : 'Giriş', status: i % 5 === 0 ? 'Gözləmədə' : 'Təsdiqləndi', operator: ['A. Məmmədli', 'N. Hüseynov', 'Sistem'][i % 3],
}))

export const limanlar = [
  { ad: 'Ələt', olke: 'Azərbaycan', lat: 39.4823, lng: 49.4056, esas: true },
  { ad: 'Kurık', olke: 'Qazaxıstan', lat: 43.1958, lng: 51.6633 },
  { ad: 'Aktau', olke: 'Qazaxıstan', lat: 43.652, lng: 51.1972 },
  { ad: 'Türkmənbaşı', olke: 'Türkmənistan', lat: 40.01, lng: 52.97 },
]

export const ayliqStatistika = [
  { ay: 'Yan', gemi: 81, yuk: 88, avtomobil: 1420 }, { ay: 'Fev', gemi: 75, yuk: 76, avtomobil: 1310 },
  { ay: 'Mar', gemi: 94, yuk: 101, avtomobil: 1680 }, { ay: 'Apr', gemi: 108, yuk: 112, avtomobil: 1920 },
  { ay: 'May', gemi: 116, yuk: 126, avtomobil: 2110 }, { ay: 'İyn', gemi: 128, yuk: 139, avtomobil: 2340 },
  { ay: 'İyl', gemi: 72, yuk: 81, avtomobil: 1280 },
]

export const activities = [
  { text: '“Şah İsmayıl” gəmisi Ələt limanına yaxınlaşır', time: 'İndi', type: 'gemi' },
  { text: '15 AA 859 nömrəli avtomobil avtomatik tanındı', time: '2 dəq əvvəl', type: 'avtomobil' },
  { text: 'GİB 3-33-3900/2-001059 sistemə inteqrasiya edildi', time: '5 dəq əvvəl', type: 'beyanname' },
  { text: '“Qarabağ” gəmisi Kanal 5-ə yanaşdı', time: '9 dəq əvvəl', type: 'gemi' },
  { text: '545 nömrəli giriş post qərarı təsdiqləndi', time: '13 dəq əvvəl', type: 'qerar' },
]
