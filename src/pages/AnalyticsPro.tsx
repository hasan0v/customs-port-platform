import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import {
  AlertTriangle, Anchor, ArrowDownRight, ArrowUpRight, Bookmark, ChevronLeft,
  ChevronRight, Clock3, Database, Download, Eye, FileCheck2, Filter, Gauge,
  Layers3, RotateCcw, Search, Ship, ShieldAlert, Sparkles, Table2, Truck, X,
} from 'lucide-react'
import { toast } from 'sonner'
import DateRangePicker, { getDefaultRange, type DateRange } from '../components/DateRangePicker'
import { Button, Card, PageHeader } from '../components/UI'
import { getShipDirection } from '../domain/ships'
import { useAppStore } from '../store/useAppStore'
import './Analytics.css'

const COLORS = ['#0A4D8C', '#00B4D8', '#2A9D8F', '#F4A261', '#E76F51', '#7B68EE']
const MONTHS = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn', 'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek']
const SAVED_VIEW_KEY = 'vglp-analytics-view'
const PAGE_SIZE = 8

type Direction = 'Hamısı' | 'Gələn' | 'Gedən'
type RiskFilter = 'Hamısı' | 'Yaşıl' | 'Amber' | 'Qırmızı'
type Source = 'Hamısı' | 'db' | 'synthetic'
type Metric = 'flow' | 'tonnage' | 'vehicles' | 'risk'
type SortKey = 'date' | 'shipName' | 'tonnage' | 'vehicles' | 'declarations' | 'riskScore'
type Risk = 'green' | 'amber' | 'red'

type TrafficEvent = {
  id: string
  direction: Exclude<Direction, 'Hamısı'>
  shipId: string
  shipName: string
  status: string
  vesselType: string
  flag: string
  port: string
  tonnage: number
  vehicles: number
  declarations: number
  risk: Risk
  riskScore: number
  processing: number
  date: string
  source: Exclude<Source, 'Hamısı'>
}

const riskMeta = {
  green: { label: 'Yaşıl', color: '#2A9D8F' },
  amber: { label: 'Amber', color: '#F4A261' },
  red: { label: 'Qırmızı', color: '#E76F51' },
} as const

function portName(value: string) {
  if (value.includes('Aktau')) return 'Aktau'
  if (value.includes('Kurık') || value.includes('Kuryk')) return 'Kurık'
  if (value.includes('Türkmən') || value.includes('Turkmen')) return 'Türkmənbaşı'
  if (value.includes('Ələt') || value.includes('Alat') || value.includes('Bakı')) return 'Ələt'
  return 'Digər'
}

function dateOnly(value: string, fallback = '2026-07-10') {
  return value.match(/\d{4}-\d{2}-\d{2}/)?.[0] || fallback
}

function riskFromScore(score: number): Risk {
  return score >= 65 ? 'red' : score >= 35 ? 'amber' : 'green'
}

function number(value: number) {
  return new Intl.NumberFormat('az-AZ', { maximumFractionDigits: 0 }).format(value)
}

function compact(value: number) {
  return new Intl.NumberFormat('az-AZ', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

function displayDate(value: string) {
  const [year, month, day] = value.split('-')
  return `${day}.${month}.${year}`
}

function addDays(value: string, amount: number) {
  const date = new Date(`${value}T12:00:00`)
  date.setDate(date.getDate() + amount)
  return date.toISOString().slice(0, 10)
}

function periodDays(start: string, end: string) {
  return Math.max(1, Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1)
}

function change(current: number, previous: number) {
  return previous ? Math.round((current - previous) / previous * 1000) / 10 : current ? 100 : 0
}

function createEvents(
  ships: ReturnType<typeof useAppStore.getState>['ships'],
  vehicles: ReturnType<typeof useAppStore.getState>['vehicles'],
  declarations: ReturnType<typeof useAppStore.getState>['declarations'],
  decisions: ReturnType<typeof useAppStore.getState>['postDecisions'],
  registrations: ReturnType<typeof useAppStore.getState>['registrations'],
) {
  if (!ships.length) return []
  const rows: TrafficEvent[] = []
  ships.forEach((ship, index) => {
    const linkedVehicles = vehicles.filter(item => item.gemi === ship.id).length
    const linkedDeclarations = declarations.filter(item => item.gemiId === ship.id).length
    const score = ship.riskDerecesi === 'Yüksək' ? 76 : ship.status === 'Lövbərdə' ? 43 : 18 + index % 4 * 4
    rows.push({
      id: `ship-${ship.id}`, direction: getShipDirection(ship), shipId: ship.id, shipName: ship.ad,
      status: ship.status, vesselType: ship.novu, flag: ship.bayraq, port: portName(ship.menshe),
      tonnage: ship.tonaj, vehicles: linkedVehicles || ship.avtomobilSayi || Math.round(ship.tonaj / 550),
      declarations: linkedDeclarations || ship.beyannameSayi || 1, risk: riskFromScore(score), riskScore: score,
      processing: 76 + score * 2 + index * 7, date: dateOnly(ship.girisTarixi), source: 'db',
    })
  })
  decisions.forEach((decision, index) => {
    const ship = ships.find(item => item.ad === decision.gemi) || ships[index % ships.length]
    const score = decision.status.includes('Gözlə') ? 58 : decision.kod.startsWith('55') ? 72 : 24 + index * 3
    rows.push({
      id: `post-${decision.kod}-${index}`, direction: decision.novu === 'Çıxış' ? 'Gedən' : 'Gələn',
      shipId: ship.id, shipName: decision.gemi, status: decision.status.includes('Təsdiq') ? 'Körpüdə' : ship.status,
      vesselType: ship.novu, flag: ship.bayraq, port: portName(ship.menshe),
      tonnage: Math.round(ship.tonaj * (.35 + index % 5 * .07)), vehicles: 12 + index % 20,
      declarations: 8 + index % 15, risk: riskFromScore(score), riskScore: score, processing: 90 + score * 2,
      date: decision.tarix.includes('.') ? `2026-07-${decision.tarix.slice(0, 2)}` : dateOnly(decision.tarix), source: 'db',
    })
  })
  registrations.forEach((registration, index) => {
    const ship = ships.find(item => item.id === registration.shipId) || ships[index % ships.length]
    const score = registration.riskVerdict === 'red' ? 82 : 16
    rows.push({
      id: `reg-${registration.id}`, direction: getShipDirection(ship), shipId: ship.id, shipName: registration.shipName,
      status: 'Körpüdə', vesselType: ship.novu, flag: ship.bayraq, port: portName(ship.menshe),
      tonnage: Math.round(ship.tonaj * .12), vehicles: 1, declarations: 1, risk: riskFromScore(score),
      riskScore: score, processing: score > 65 ? 310 : 64, date: dateOnly(registration.savedAt, '2026-07-14'), source: 'db',
    })
  })
  for (let index = 0; rows.length < 96; index++) {
    const ship = ships[index % ships.length]
    const score = index % 13 === 0 ? 78 : index % 6 === 0 ? 47 : 12 + index * 5 % 21
    rows.push({
      id: `model-${index}`, direction: index % 3 === 0 ? 'Gedən' : 'Gələn', shipId: ship.id, shipName: ship.ad,
      status: ['Lövbərdə', 'Yolda', 'Körpüdə'][index % 3], vesselType: ship.novu, flag: ship.bayraq,
      port: portName(ship.menshe), tonnage: Math.round(ship.tonaj * (.18 + index % 6 * .08)),
      vehicles: 6 + index * 3 % 42, declarations: 4 + index * 2 % 34, risk: riskFromScore(score),
      riskScore: score, processing: 58 + score * 2 + index % 4 * 11,
      date: `2026-${String(index % 8 + 1).padStart(2, '0')}-${String(1 + index * 7 % 27).padStart(2, '0')}`,
      source: 'synthetic',
    })
  }
  return rows
}

type TooltipDatum = { name?: string; value?: number; color?: string }
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipDatum[]; label?: string }) {
  if (!active || !payload?.length) return null
  return <div className="analytics-pro-tooltip"><strong>{label}</strong>{payload.map(item => <span key={item.name}><i style={{ background: item.color }} />{item.name}<b>{number(item.value || 0)}</b></span>)}</div>
}

export default function AnalyticsPro() {
  const navigate = useNavigate()
  const { ships, vehicles, declarations, postDecisions, registrations } = useAppStore()
  const [range, setRange] = useState<DateRange>(() => getDefaultRange('last30'))
  const [direction, setDirection] = useState<Direction>('Hamısı')
  const [status, setStatus] = useState('Hamısı')
  const [port, setPort] = useState('Hamısı')
  const [risk, setRisk] = useState<RiskFilter>('Hamısı')
  const [shipId, setShipId] = useState('Hamısı')
  const [source, setSource] = useState<Source>('Hamısı')
  const [minRisk, setMinRisk] = useState(0)
  const [query, setQuery] = useState('')
  const [advanced, setAdvanced] = useState(false)
  const [metric, setMetric] = useState<Metric>('flow')
  const [compare, setCompare] = useState(true)
  const [sort, setSort] = useState<SortKey>('date')
  const [ascending, setAscending] = useState(false)
  const [page, setPage] = useState(1)
  const [hasView, setHasView] = useState(() => Boolean(localStorage.getItem(SAVED_VIEW_KEY)))

  const events = useMemo(() => createEvents(ships, vehicles, declarations, postDecisions, registrations), [ships, vehicles, declarations, postDecisions, registrations])
  const ports = useMemo(() => [...new Set(events.map(item => item.port))].sort(), [events])

  const matches = (item: TrafficEvent) => (
    (direction === 'Hamısı' || item.direction === direction)
    && (status === 'Hamısı' || item.status === status)
    && (port === 'Hamısı' || item.port === port)
    && (shipId === 'Hamısı' || item.shipId === shipId)
    && (source === 'Hamısı' || item.source === source)
    && (risk === 'Hamısı' || riskMeta[item.risk].label === risk)
    && item.riskScore >= minRisk
  )
  const filtered = useMemo(() => events.filter(item => matches(item) && item.date >= range.startDate && item.date <= range.endDate), [events, range, direction, status, port, shipId, source, risk, minRisk])
  const previousRange = useMemo(() => {
    const end = addDays(range.startDate, -1)
    return { start: addDays(end, -(periodDays(range.startDate, range.endDate) - 1)), end }
  }, [range])
  const previous = useMemo(() => events.filter(item => matches(item) && item.date >= previousRange.start && item.date <= previousRange.end), [events, previousRange, direction, status, port, shipId, source, risk, minRisk])

  const totals = useMemo(() => {
    const get = (list: TrafficEvent[]) => ({
      events: list.length,
      tonnage: list.reduce((sum, item) => sum + item.tonnage, 0),
      vehicles: list.reduce((sum, item) => sum + item.vehicles, 0),
      declarations: list.reduce((sum, item) => sum + item.declarations, 0),
      processing: list.length ? Math.round(list.reduce((sum, item) => sum + item.processing, 0) / list.length) : 0,
      red: list.filter(item => item.risk === 'red').length,
    })
    return { current: get(filtered), previous: get(previous) }
  }, [filtered, previous])

  const trend = useMemo(() => {
    const monthly = periodDays(range.startDate, range.endDate) > 45
    const map = new Map<string, { key: string; label: string; incoming: number; outgoing: number; tonnage: number; vehicles: number; riskSum: number; count: number }>()
    filtered.forEach(item => {
      const key = monthly ? item.date.slice(0, 7) : item.date
      const month = Number(key.slice(5, 7)) - 1
      const row = map.get(key) || { key, label: monthly ? `${MONTHS[month]} ${key.slice(2, 4)}` : `${key.slice(8)} ${MONTHS[month]}`, incoming: 0, outgoing: 0, tonnage: 0, vehicles: 0, riskSum: 0, count: 0 }
      item.direction === 'Gələn' ? row.incoming++ : row.outgoing++
      row.tonnage += item.tonnage; row.vehicles += item.vehicles; row.riskSum += item.riskScore; row.count++
      map.set(key, row)
    })
    return [...map.values()].sort((a, b) => a.key.localeCompare(b.key)).map(item => ({ ...item, risk: Math.round(item.riskSum / item.count) }))
  }, [filtered, range])

  const portData = useMemo(() => {
    const map = new Map<string, { name: string; events: number; tonnage: number }>()
    filtered.forEach(item => {
      const row = map.get(item.port) || { name: item.port, events: 0, tonnage: 0 }
      row.events++; row.tonnage += item.tonnage; map.set(item.port, row)
    })
    return [...map.values()].sort((a, b) => b.events - a.events)
  }, [filtered])

  const riskData = useMemo(() => (['green', 'amber', 'red'] as const).map(key => ({ name: riskMeta[key].label, value: filtered.filter(item => item.risk === key).length, color: riskMeta[key].color })).filter(item => item.value), [filtered])
  const topShips = useMemo(() => {
    const map = new Map<string, { id: string; name: string; events: number; tonnage: number; risk: number }>()
    filtered.forEach(item => {
      const row = map.get(item.shipId) || { id: item.shipId, name: item.shipName, events: 0, tonnage: 0, risk: 0 }
      row.events++; row.tonnage += item.tonnage; row.risk += item.riskScore; map.set(item.shipId, row)
    })
    return [...map.values()].map(item => ({ ...item, risk: Math.round(item.risk / item.events) })).sort((a, b) => b.tonnage - a.tonnage).slice(0, 5)
  }, [filtered])

  const table = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('az')
    const rows = needle ? filtered.filter(item => `${item.shipName} ${item.shipId} ${item.port} ${item.vesselType} ${item.flag}`.toLocaleLowerCase('az').includes(needle)) : filtered
    return [...rows].sort((a, b) => {
      const left = a[sort]; const right = b[sort]
      const result = typeof left === 'number' && typeof right === 'number' ? left - right : String(left).localeCompare(String(right), 'az')
      return ascending ? result : -result
    })
  }, [filtered, query, sort, ascending])

  useEffect(() => setPage(1), [range, direction, status, port, risk, shipId, source, minRisk, query])
  const pages = Math.max(1, Math.ceil(table.length / PAGE_SIZE))
  const visible = table.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const activeFilters = [direction, status, port, risk, shipId, source].filter(value => value !== 'Hamısı').length + Number(minRisk > 0)
  const dbShare = filtered.length ? Math.round(filtered.filter(item => item.source === 'db').length / filtered.length * 100) : 0

  const reset = () => {
    setRange(getDefaultRange('last30')); setDirection('Hamısı'); setStatus('Hamısı'); setPort('Hamısı')
    setRisk('Hamısı'); setShipId('Hamısı'); setSource('Hamısı'); setMinRisk(0); setQuery('')
    toast.success('Analitika filtrləri sıfırlandı')
  }
  const saveView = () => {
    localStorage.setItem(SAVED_VIEW_KEY, JSON.stringify({ range, direction, status, port, risk, shipId, source, minRisk }))
    setHasView(true); toast.success('Cari görünüş yadda saxlanıldı')
  }
  const loadView = () => {
    try {
      const view = JSON.parse(localStorage.getItem(SAVED_VIEW_KEY) || '')
      setRange(view.range); setDirection(view.direction); setStatus(view.status); setPort(view.port)
      setRisk(view.risk); setShipId(view.shipId); setSource(view.source); setMinRisk(view.minRisk)
      toast.success('Yadda saxlanmış görünüş tətbiq edildi')
    } catch { toast.error('Yadda saxlanmış görünüş tapılmadı') }
  }
  const exportCsv = () => {
    const head = ['ID', 'Tarix', 'İstiqamət', 'Gəmi', 'IMO', 'Status', 'Liman', 'Tonaj', 'Avtomobil', 'Bəyannamə', 'Risk', 'Risk balı', 'Emal dəq.', 'Mənbə']
    const data = filtered.map(item => [item.id, item.date, item.direction, item.shipName, item.shipId, item.status, item.port, item.tonnage, item.vehicles, item.declarations, riskMeta[item.risk].label, item.riskScore, item.processing, item.source])
    const csv = [head, ...data].map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a'); link.href = url; link.download = `analitika-${range.startDate}-${range.endDate}.csv`; link.click(); URL.revokeObjectURL(url)
    toast.success(`${filtered.length} qeyd ixrac edildi`)
  }
  const sortBy = (key: SortKey) => {
    if (sort === key) setAscending(value => !value)
    else { setSort(key); setAscending(false) }
  }

  const metricInfo = {
    flow: ['Gələn / gedən axını', 'Seçilmiş dövrdə əməliyyat hadisələrinin dinamikası'],
    tonnage: ['Yük dövriyyəsi', 'Daşınan yükün tonla zaman sırası'],
    vehicles: ['Avtomobil axını', 'Ro-Ro və qeydiyyat vahidlərinin dinamikası'],
    risk: ['Orta risk indeksi', '0–100 şkalasında risk balının dəyişməsi'],
  }[metric]
  const redRate = totals.current.events ? Math.round(totals.current.red / totals.current.events * 100) : 0
  const anomalyCount = filtered.filter(item => item.riskScore >= 70 || item.tonnage > totals.current.tonnage / Math.max(1, filtered.length) * 2).length
  const slowCount = filtered.filter(item => item.processing > 240).length

  return <main className="analytics-pro">
    <PageHeader title="Analitika mərkəzi" action={<div className="analytics-pro-header-actions"><DateRangePicker value={range} onChange={setRange} /><Button onClick={exportCsv}><Download /> İxrac et</Button></div>} />

    <Card className="analytics-pro-filter-card" hover={false}>
      <div className="analytics-pro-filter-top">
        <label className="analytics-pro-search"><Search /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Gəmi, IMO, liman və ya növ axtar..." />{query && <button type="button" onClick={() => setQuery('')} aria-label="Axtarışı təmizlə"><X /></button>}</label>
        <div className="analytics-pro-segments">{(['Hamısı', 'Gələn', 'Gedən'] as const).map(value => <button type="button" key={value} className={direction === value ? 'active' : ''} onClick={() => setDirection(value)}>{value}</button>)}</div>
        <Select label="Liman" value={port} onChange={setPort} options={ports} />
        <Select label="Risk kanalı" value={risk} onChange={value => setRisk(value as RiskFilter)} options={['Yaşıl', 'Amber', 'Qırmızı']} />
        <button type="button" className={`analytics-pro-advanced-trigger ${advanced ? 'active' : ''}`} onClick={() => setAdvanced(value => !value)}><Filter /> Ətraflı {activeFilters > 0 && <b>{activeFilters}</b>}</button>
      </div>
      {advanced && <div className="analytics-pro-advanced">
        <Select label="Gəmi statusu" value={status} onChange={setStatus} options={['Lövbərdə', 'Yolda', 'Körpüdə']} advanced />
        <label><span>Konkret gəmi</span><select value={shipId} onChange={event => setShipId(event.target.value)}><option>Hamısı</option>{ships.map(ship => <option key={ship.id} value={ship.id}>{ship.ad}</option>)}</select></label>
        <label><span>Data mənbəyi</span><select value={source} onChange={event => setSource(event.target.value as Source)}><option value="Hamısı">Hamısı</option><option value="db">Əməliyyat DB</option><option value="synthetic">Demo model</option></select></label>
        <label className="analytics-pro-range"><span>Minimum risk balı <b>{minRisk}</b></span><input type="range" min="0" max="90" step="5" value={minRisk} onChange={event => setMinRisk(Number(event.target.value))} /></label>
        <div className="analytics-pro-view-actions"><button type="button" onClick={saveView}><Bookmark /> Görünüşü saxla</button>{hasView && <button type="button" onClick={loadView}><Layers3 /> Tətbiq et</button>}<button type="button" onClick={reset}><RotateCcw /> Sıfırla</button></div>
      </div>}
      <div className="analytics-pro-filter-foot"><span><Database /> {filtered.length} / {events.length} qeyd</span><span className="analytics-pro-quality"><i /> Data keyfiyyəti: {dbShare}% əməliyyat DB</span>{activeFilters > 0 && <button type="button" onClick={reset}>Bütün filtrləri təmizlə <X /></button>}</div>
    </Card>

    <section className="analytics-pro-kpis" aria-label="Əsas analitika göstəriciləri">
      <Card className="analytics-pro-kpi-group" hover={false}>
        <header><div className="analytics-pro-kpi-icon blue"><Ship /></div><div><small>Hərəkət göstəriciləri</small><h2>Əməliyyat axını</h2></div></header>
        <div className="analytics-pro-kpi-metrics">
          <KpiMetric label="Əməliyyat hadisəsi" value={number(totals.current.events)} detail={`${filtered.filter(item => item.direction === 'Gələn').length} gələn · ${filtered.filter(item => item.direction === 'Gedən').length} gedən`} trend={change(totals.current.events, totals.previous.events)} />
          <KpiMetric label="Yük dövriyyəsi" value={`${compact(totals.current.tonnage)} t`} detail={`${number(totals.current.tonnage)} ton ümumi yük`} trend={change(totals.current.tonnage, totals.previous.tonnage)} />
        </div>
      </Card>
      <Card className="analytics-pro-kpi-group" hover={false}>
        <header><div className="analytics-pro-kpi-icon violet"><Truck /></div><div><small>Əməliyyat həcmi</small><h2>Sənəd və nəqliyyat</h2></div></header>
        <div className="analytics-pro-kpi-metrics">
          <KpiMetric label="Avtomobil" value={number(totals.current.vehicles)} detail={`${totals.current.events ? (totals.current.vehicles / totals.current.events).toFixed(1) : 0} vahid / hadisə`} trend={change(totals.current.vehicles, totals.previous.vehicles)} />
          <KpiMetric label="Bəyannamə" value={number(totals.current.declarations)} detail={`${totals.current.events ? (totals.current.declarations / totals.current.events).toFixed(1) : 0} sənəd / hadisə`} trend={change(totals.current.declarations, totals.previous.declarations)} />
        </div>
      </Card>
      <Card className="analytics-pro-kpi-group" hover={false}>
        <header><div className="analytics-pro-kpi-icon amber"><Gauge /></div><div><small>Nəzarət keyfiyyəti</small><h2>Emal və risk</h2></div></header>
        <div className="analytics-pro-kpi-metrics">
          <KpiMetric label="Orta emal müddəti" value={`${totals.current.processing} dəq`} detail="Hədəf SLA: 240 dəqiqə" trend={-change(totals.current.processing, totals.previous.processing)} />
          <KpiMetric label="Yüksək risk" value={number(totals.current.red)} detail={`${redRate}% qırmızı kanal payı`} trend={-change(totals.current.red, totals.previous.red)} />
        </div>
      </Card>
    </section>

    <section className="analytics-pro-main-grid">
      <Card className="analytics-pro-chart analytics-pro-trend-card" hover={false}>
        <header><div><span className="analytics-pro-eyebrow">ZAMAN SIRASI</span><h2>{metricInfo[0]}</h2><p>{metricInfo[1]}</p></div><div className="analytics-pro-chart-tools"><select value={metric} onChange={event => setMetric(event.target.value as Metric)}><option value="flow">Gəmi axını</option><option value="tonnage">Yük tonajı</option><option value="vehicles">Avtomobillər</option><option value="risk">Risk indeksi</option></select><button type="button" className={compare ? 'active' : ''} onClick={() => setCompare(value => !value)}>Müqayisə</button></div></header>
        <div className="analytics-pro-chart-body">{trend.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={trend} margin={{ top: 8, right: 8, left: -16 }}><defs><linearGradient id="apPrimary" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0A4D8C" stopOpacity=".3"/><stop offset="1" stopColor="#0A4D8C" stopOpacity="0"/></linearGradient><linearGradient id="apSecondary" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#00B4D8" stopOpacity=".22"/><stop offset="1" stopColor="#00B4D8" stopOpacity="0"/></linearGradient></defs><CartesianGrid vertical={false} strokeDasharray="4 4" opacity={.18}/><XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10 }}/><YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10 }}/><Tooltip content={<ChartTooltip />}/>{metric === 'flow' ? <><Area type="monotone" dataKey="incoming" name="Gələn" stroke="#0A4D8C" strokeWidth={2.5} fill="url(#apPrimary)"/><Area hide={!compare} type="monotone" dataKey="outgoing" name="Gedən" stroke="#00B4D8" strokeWidth={2.5} fill="url(#apSecondary)"/></> : <Area type="monotone" dataKey={metric} name={metricInfo[0]} stroke="#0A4D8C" strokeWidth={2.5} fill="url(#apPrimary)"/>}</AreaChart></ResponsiveContainer> : <Empty />}</div>
      </Card>

      <Card className="analytics-pro-insights" hover={false}><header><div><span className="analytics-pro-eyebrow">AVTOMATİK ANALİZ</span><h2>Əməliyyat insight-ları</h2></div><Sparkles /></header><div>{filtered.length ? <>
        <Insight tone={redRate >= 15 ? 'danger' : 'success'} icon={ShieldAlert} title={`Yüksək risk payı ${redRate}%`} text={redRate >= 15 ? 'Risk payı nəzarət həddinə yaxındır. Qırmızı kanal qeydlərinə baxın.' : 'Risk payı normal əməliyyat diapazonundadır.'}/>
        <Insight tone="info" icon={Anchor} title={`${portData[0]?.name || '—'} aparıcı marşrutdur`} text={`${portData[0]?.events || 0} hadisə və ${compact(portData[0]?.tonnage || 0)} ton yük qeydə alınıb.`}/>
        <Insight tone={anomalyCount ? 'warning' : 'success'} icon={Sparkles} title={`${anomalyCount} anomaliya siqnalı`} text="Yüksək risk və orta göstəricidən 2× böyük tonaj yoxlanılıb."/>
        <Insight tone={slowCount ? 'warning' : 'success'} icon={Clock3} title={`${slowCount} SLA gecikməsi`} text="240 dəqiqədən uzun emal olunan əməliyyatların sayı."/>
      </> : <Empty compact />}</div></Card>

      <Card className="analytics-pro-chart" hover={false}><header><div><span className="analytics-pro-eyebrow">SEGMENTASİYA</span><h2>Liman yükü</h2><p>Hadisə sayına görə marşrut payı</p></div></header><div className="analytics-pro-bar-body">{portData.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={portData} layout="vertical" margin={{ left: 4, right: 18 }}><CartesianGrid horizontal={false} strokeDasharray="4 4" opacity={.15}/><XAxis type="number" hide/><YAxis type="category" dataKey="name" width={82} tickLine={false} axisLine={false} tick={{ fontSize: 10 }}/><Tooltip content={<ChartTooltip />}/><Bar dataKey="events" name="Hadisə" radius={[0, 7, 7, 0]} barSize={16}>{portData.map((item, index) => <Cell key={item.name} fill={COLORS[index % COLORS.length]}/>)}</Bar></BarChart></ResponsiveContainer> : <Empty />}</div></Card>

      <Card className="analytics-pro-chart analytics-pro-risk-card" hover={false}><header><div><span className="analytics-pro-eyebrow">RİSK PROFİLİ</span><h2>Kanal bölgüsü</h2><p>Risk qərarlarının payı</p></div></header><div className="analytics-pro-donut-wrap">{riskData.length ? <><ResponsiveContainer width="100%" height={190}><PieChart><Pie data={riskData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={78} paddingAngle={4}>{riskData.map(item => <Cell key={item.name} fill={item.color}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer><div className="analytics-pro-donut-center"><strong>{filtered.length}</strong><span>qeyd</span></div></> : <Empty />}</div><div className="analytics-pro-legend">{riskData.map(item => <span key={item.name}><i style={{ background: item.color }}/>{item.name}<b>{item.value}</b></span>)}</div></Card>

      <Card className="analytics-pro-ranking" hover={false}><header><div><span className="analytics-pro-eyebrow">REYTİNQ</span><h2>Top gəmilər</h2><p>Yük dövriyyəsinə görə</p></div><Gauge /></header><div>{topShips.length ? topShips.map((item, index) => <button type="button" key={item.id} onClick={() => navigate(`/gemiler?id=${item.id}`)}><span className="analytics-pro-rank">{index + 1}</span><div><strong>{item.name}</strong><small>{item.events} hadisə · risk {item.risk}</small><i><b style={{ width: `${item.tonnage / (topShips[0]?.tonnage || 1) * 100}%` }}/></i></div><em>{compact(item.tonnage)} t</em></button>) : <Empty compact />}</div></Card>
    </section>

    <Card className="analytics-pro-table-card" hover={false}>
      <header><div><span className="analytics-pro-eyebrow">DRILL-DOWN</span><h2>Əməliyyat detalları</h2><p>Filterlənmiş dataset üzrə {table.length} nəticə</p></div><div className="analytics-pro-table-meta"><Table2 /> Səhifə {page} / {pages}</div></header>
      <div className="analytics-pro-table-scroll"><table><thead><tr><SortHead label="Tarix" field="date" current={sort} ascending={ascending} onSort={sortBy}/><SortHead label="Gəmi / IMO" field="shipName" current={sort} ascending={ascending} onSort={sortBy}/><th>Marşrut / status</th><th>İstiqamət</th><SortHead label="Tonaj" field="tonnage" current={sort} ascending={ascending} onSort={sortBy}/><SortHead label="Avto" field="vehicles" current={sort} ascending={ascending} onSort={sortBy}/><SortHead label="Sənəd" field="declarations" current={sort} ascending={ascending} onSort={sortBy}/><SortHead label="Risk" field="riskScore" current={sort} ascending={ascending} onSort={sortBy}/><th>Mənbə</th><th/></tr></thead><tbody>{visible.map(item => <tr key={item.id}><td><strong>{displayDate(item.date)}</strong><small>{item.processing} dəq emal</small></td><td><div className="analytics-pro-ship-cell"><span><Ship /></span><div><strong>{item.shipName}</strong><small>{item.shipId} · {item.vesselType}</small></div></div></td><td><strong>{item.port}</strong><small>{item.status} · {item.flag}</small></td><td><span className={`analytics-pro-direction ${item.direction === 'Gələn' ? 'incoming' : 'outgoing'}`}>{item.direction}</span></td><td><strong>{number(item.tonnage)} t</strong></td><td>{number(item.vehicles)}</td><td>{number(item.declarations)}</td><td><span className={`analytics-pro-risk ${item.risk}`}><i/>{riskMeta[item.risk].label}<b>{item.riskScore}</b></span></td><td><span className={`analytics-pro-source ${item.source}`}>{item.source === 'db' ? 'DB' : 'MODEL'}</span></td><td><button type="button" className="analytics-pro-row-action" onClick={() => navigate(`/gemiler?id=${item.shipId}`)} aria-label={`${item.shipName} gəmisinə bax`}><Eye /></button></td></tr>)}</tbody></table>{!visible.length && <Empty />}</div>
      <footer><span>{table.length ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, table.length)}` : '0'} / {table.length} nəticə</span><div><button type="button" disabled={page === 1} onClick={() => setPage(value => value - 1)}><ChevronLeft /></button>{Array.from({ length: Math.min(pages, 5) }, (_, index) => index + Math.max(1, Math.min(page - 2, pages - 4))).filter(value => value <= pages).map(value => <button type="button" key={value} className={page === value ? 'active' : ''} onClick={() => setPage(value)}>{value}</button>)}<button type="button" disabled={page === pages} onClick={() => setPage(value => value + 1)}><ChevronRight /></button></div></footer>
    </Card>
  </main>
}

function Select({ label, value, onChange, options, advanced = false }: { label: string; value: string; onChange: (value: string) => void; options: string[]; advanced?: boolean }) {
  return <label className={advanced ? '' : 'analytics-pro-select'}><span>{label}</span><select value={value} onChange={event => onChange(event.target.value)}><option>Hamısı</option>{options.map(option => <option key={option}>{option}</option>)}</select></label>
}

function KpiMetric({ label, value, detail, trend }: { label: string; value: string; detail: string; trend: number }) {
  return <article><div><span>{label}</span><b className={trend >= 0 ? 'positive' : 'negative'}>{trend >= 0 ? <ArrowUpRight/> : <ArrowDownRight/>}{Math.abs(trend)}%</b></div><strong>{value}</strong><small>{detail}</small></article>
}

function Insight({ icon: Icon, tone, title, text }: { icon: typeof Ship; tone: string; title: string; text: string }) {
  return <article className={tone}><span><Icon /></span><div><strong>{title}</strong><p>{text}</p></div></article>
}

function SortHead({ label, field, current, ascending, onSort }: { label: string; field: SortKey; current: SortKey; ascending: boolean; onSort: (field: SortKey) => void }) {
  return <th><button type="button" className={current === field ? 'active' : ''} onClick={() => onSort(field)}>{label}{current === field && (ascending ? <ArrowUpRight/> : <ArrowDownRight/>)}</button></th>
}

function Empty({ compact: isCompact = false }: { compact?: boolean }) {
  return <div className={`analytics-pro-empty ${isCompact ? 'compact' : ''}`}><AlertTriangle/><strong>Nəticə tapılmadı</strong><span>Filter şərtlərini dəyişərək yenidən yoxlayın.</span></div>
}