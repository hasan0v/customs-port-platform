import { useMemo, useState } from 'react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import {
  Anchor, ArrowDownRight, ArrowUpRight, Download, Filter, Gauge, Ship,
  TrendingUp, Truck, FileCheck2, AlertTriangle, RotateCcw,
} from 'lucide-react'
import { toast } from 'sonner'
import { ayliqStatistika } from '../data/mockData'
import { getShipDirection } from '../domain/ships'
import { useAppStore } from '../store/useAppStore'
import { Button, Card, PageHeader } from '../components/UI'

const COLORS = ['#0A4D8C', '#00B4D8', '#2A9D8F', '#F4A261', '#E76F51', '#7B68EE', '#3DDC97']
const MONTHS = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn', 'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek']

type DirectionFilter = 'Hamısı' | 'Gələn' | 'Gedən'
type StatusFilter = 'Hamısı' | 'Lövbərdə' | 'Yolda' | 'Körpüdə'
type RiskFilter = 'Hamısı' | 'Yaşıl' | 'Qırmızı' | 'Amber'

type TrafficEvent = {
  id: string
  direction: 'Gələn' | 'Gedən'
  shipId: string
  shipName: string
  shipStatus: string
  port: string
  tonaj: number
  vehicles: number
  declarations: number
  risk: 'green' | 'red' | 'amber'
  date: string
  month: string
  source: 'db' | 'synthetic'
}

function portKey(menshe: string) {
  if (menshe.includes('Aktau')) return 'Aktau'
  if (menshe.includes('Kurık') || menshe.includes('Kuryk')) return 'Kurık'
  if (menshe.includes('Türkmən')) return 'Türkmənbaşı'
  if (menshe.includes('Ələt') || menshe.includes('Bakı')) return 'Ələt'
  return 'Digər'
}

function monthFromIso(iso: string) {
  const m = iso.match(/(\d{4})-(\d{2})/)
  if (!m) return 'İyl'
  return MONTHS[Math.max(0, Math.min(11, Number(m[2]) - 1))]
}

function formatNum(n: number) {
  return new Intl.NumberFormat('az-AZ', { maximumFractionDigits: 0 }).format(n)
}

function pctChange(current: number, prev: number) {
  if (prev <= 0) return current > 0 ? 100 : 0
  return Math.round(((current - prev) / prev) * 1000) / 10
}

/** DB + sintetik trafik hadisələri */
function buildTrafficEvents(
  ships: ReturnType<typeof useAppStore.getState>['ships'],
  vehicles: ReturnType<typeof useAppStore.getState>['vehicles'],
  declarations: ReturnType<typeof useAppStore.getState>['declarations'],
  postDecisions: ReturnType<typeof useAppStore.getState>['postDecisions'],
  registrations: ReturnType<typeof useAppStore.getState>['registrations'],
): TrafficEvent[] {
  const events: TrafficEvent[] = []

  // 1) Gəmilərdən real DB
  ships.forEach(g => {
    const direction = getShipDirection(g)
    const linkedVehicles = vehicles.filter(v => v.gemi === g.id).length
    const linkedDecls = Math.max(1, Math.round(linkedVehicles * 0.9) || declarations.filter(d => d.gemiId === g.id).length)
    events.push({
      id: `ship-${g.id}`,
      direction,
      shipId: g.id,
      shipName: g.ad,
      shipStatus: g.status,
      port: portKey(g.menshe),
      tonaj: g.tonaj,
      vehicles: linkedVehicles || Math.round(g.tonaj / 350),
      declarations: linkedDecls,
      risk: g.status === 'Lövbərdə' ? 'amber' : 'green',
      date: g.girisTarixi || '2026-07-10',
      month: monthFromIso(g.girisTarixi || '2026-07-10'),
      source: 'db',
    })
  })

  // 2) Post qərarlardan
  postDecisions.forEach((p, i) => {
    const ship = ships.find(g => g.ad === p.gemi) || ships[i % ships.length]
    const direction: 'Gələn' | 'Gedən' = p.novu === 'Çıxış' ? 'Gedən' : 'Gələn'
    const rawStatus = p.status.includes('Təsdiq') ? (direction === 'Gedən' ? 'Körpüdə' : 'Lövbərdə') : ship.status
    const shipStatus = direction === 'Gedən' && rawStatus === 'Lövbərdə' ? 'Körpüdə' : rawStatus
    events.push({
      id: `post-${p.kod}-${i}`,
      direction,
      shipId: ship.id,
      shipName: p.gemi,
      shipStatus,
      port: portKey(ship.menshe),
      tonaj: Math.round(ship.tonaj * (0.7 + (i % 5) * 0.06)),
      vehicles: 12 + (i % 20),
      declarations: 8 + (i % 15),
      risk: p.status.includes('Gözlə') ? 'amber' : p.kod.startsWith('55') ? 'red' : 'green',
      date: p.tarix.includes('.') ? `2026-07-${p.tarix.slice(0, 2)}` : p.tarix,
      month: 'İyl',
      source: 'db',
    })
  })

  // 3) Qeydiyyatlardan
  registrations.forEach((r, i) => {
    const ship = ships.find(g => g.id === r.shipId) || ships[i % ships.length]
    const direction = getShipDirection(ship)
    events.push({
      id: `reg-${r.id}`,
      direction,
      shipId: ship.id,
      shipName: r.shipName,
      shipStatus: direction === 'Gedən' ? 'Körpüdə' : 'Lövbərdə',
      port: portKey(ship.menshe),
      tonaj: Math.round(ship.tonaj * 0.15),
      vehicles: 1,
      declarations: 1,
      risk: r.riskVerdict === 'red' ? 'red' : 'green',
      date: '2026-07-14',
      month: 'İyl',
      source: 'db',
    })
  })

  // 4) Sintetik tamamlayıcı (azdırsa maraqlı dashboard üçün)
  if (events.length < 40) {
    const need = 48 - events.length
    for (let i = 0; i < need; i++) {
      const ship = ships[i % ships.length]
      const direction: 'Gələn' | 'Gedən' = i % 3 === 0 ? 'Gedən' : 'Gələn'
      const day = 1 + (i % 28)
      const monthIdx = i % 7
      const shipStatus = direction === 'Gedən'
        ? (i % 2 === 0 ? 'Körpüdə' : 'Yolda')
        : (['Lövbərdə', 'Yolda', 'Körpüdə'] as const)[i % 3]
      events.push({
        id: `syn-${i}`,
        direction,
        shipId: ship.id,
        shipName: ship.ad,
        shipStatus,
        port: portKey(ship.menshe),
        tonaj: Math.round(ship.tonaj * (0.4 + (i % 6) * 0.1)),
        vehicles: 8 + (i * 3) % 40,
        declarations: 5 + (i * 2) % 30,
        risk: i % 7 === 0 ? 'red' : i % 5 === 0 ? 'amber' : 'green',
        date: `2026-0${monthIdx < 6 ? 1 + monthIdx : 7}-${String(day).padStart(2, '0')}`,
        month: MONTHS[monthIdx],
        source: 'synthetic',
      })
    }
  }

  return events
}

export default function Analytics() {
  const { ships, vehicles, declarations, postDecisions, registrations } = useAppStore()

  const [direction, setDirection] = useState<DirectionFilter>('Hamısı')
  const [status, setStatus] = useState<StatusFilter>('Hamısı')
  const [port, setPort] = useState('Hamısı')
  const [risk, setRisk] = useState<RiskFilter>('Hamısı')
  const [shipId, setShipId] = useState('Hamısı')
  const [source, setSource] = useState<'Hamısı' | 'db' | 'synthetic'>('Hamısı')

  const allEvents = useMemo(
    () => buildTrafficEvents(ships, vehicles, declarations, postDecisions, registrations),
    [ships, vehicles, declarations, postDecisions, registrations],
  )

  const ports = useMemo(() => ['Hamısı', ...Array.from(new Set(allEvents.map(e => e.port)))], [allEvents])
  const shipOptions = useMemo(() => ['Hamısı', ...ships.map(g => g.id)], [ships])

  const filtered = useMemo(() => allEvents.filter(e => {
    if (direction !== 'Hamısı' && e.direction !== direction) return false
    if (status !== 'Hamısı' && e.shipStatus !== status) return false
    if (port !== 'Hamısı' && e.port !== port) return false
    if (shipId !== 'Hamısı' && e.shipId !== shipId) return false
    if (source !== 'Hamısı' && e.source !== source) return false
    if (risk === 'Yaşıl' && e.risk !== 'green') return false
    if (risk === 'Qırmızı' && e.risk !== 'red') return false
    if (risk === 'Amber' && e.risk !== 'amber') return false
    return true
  }), [allEvents, direction, status, port, risk, shipId, source])

  const kpis = useMemo(() => {
    const giris = filtered.filter(e => e.direction === 'Gələn')
    const cixis = filtered.filter(e => e.direction === 'Gedən')
    const tonaj = filtered.reduce((s, e) => s + e.tonaj, 0)
    const autos = filtered.reduce((s, e) => s + e.vehicles, 0)
    const decls = filtered.reduce((s, e) => s + e.declarations, 0)
    const green = filtered.filter(e => e.risk === 'green').length
    const red = filtered.filter(e => e.risk === 'red').length
    const autoRate = filtered.length ? Math.round((green / filtered.length) * 1000) / 10 : 0
    const avgProcess = red > 0 ? 6.4 + red * 0.3 : 3.1 + (amberCount(filtered) * 0.2)
    return {
      total: filtered.length,
      giris: giris.length,
      cixis: cixis.length,
      tonaj,
      autos,
      decls,
      green,
      red,
      amber: amberCount(filtered),
      autoRate,
      avgProcess: Math.round(avgProcess * 10) / 10,
      dbShare: filtered.length ? Math.round((filtered.filter(e => e.source === 'db').length / filtered.length) * 100) : 0,
    }
  }, [filtered])

  const monthly = useMemo(() => {
    const base = ayliqStatistika.map(m => ({ ay: m.ay, gemi: 0, yuk: 0, avtomobil: 0, giris: 0, cixis: 0 }))
    const map = Object.fromEntries(base.map(b => [b.ay, { ...b }]))
    filtered.forEach(e => {
      const row = map[e.month] || map['İyl']
      if (!row) return
      row.gemi += 1
      row.yuk += Math.round(e.tonaj / 100) // chart scale
      row.avtomobil += e.vehicles
      if (e.direction === 'Gələn') row.giris += 1
      else row.cixis += 1
    })
    // blend with seed if sparse
    return MONTHS.slice(0, 7).map((ay, i) => {
      const row = map[ay] || { ay, gemi: 0, yuk: 0, avtomobil: 0, giris: 0, cixis: 0 }
      const seed = ayliqStatistika[i]
      if (row.gemi === 0 && seed) {
        const factor = direction === 'Gələn' ? 0.62 : direction === 'Gedən' ? 0.38 : 1
        return {
          ay,
          gemi: Math.round(seed.gemi * factor * (status === 'Hamısı' ? 1 : 0.55)),
          yuk: Math.round(seed.yuk * factor),
          avtomobil: Math.round(seed.avtomobil * factor * 0.4),
          giris: Math.round(seed.gemi * 0.6 * factor),
          cixis: Math.round(seed.gemi * 0.4 * factor),
        }
      }
      return row
    })
  }, [filtered, direction, status])

  const portShare = useMemo(() => {
    const counts: Record<string, number> = {}
    filtered.forEach(e => { counts[e.port] = (counts[e.port] || 0) + 1 })
    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1
    const rows = Object.entries(counts)
      .map(([name, value]) => ({ name, value: Math.round((value / total) * 1000) / 10, count: value }))
      .sort((a, b) => b.value - a.value)
    if (rows.length === 0) {
      return [
        { name: 'Aktau', value: 38, count: 0 },
        { name: 'Kurık', value: 31, count: 0 },
        { name: 'Türkmənbaşı', value: 22, count: 0 },
        { name: 'Digər', value: 9, count: 0 },
      ]
    }
    return rows
  }, [filtered])

  const riskPie = useMemo(() => [
    { name: 'Yaşıl', value: kpis.green || 1, color: '#2A9D8F' },
    { name: 'Amber', value: kpis.amber || 0, color: '#F4A261' },
    { name: 'Qırmızı', value: kpis.red || 0, color: '#E76F51' },
  ].filter(x => x.value > 0), [kpis])

  const topShips = useMemo(() => {
    const map: Record<string, { name: string; count: number; tonaj: number }> = {}
    filtered.forEach(e => {
      if (!map[e.shipId]) map[e.shipId] = { name: e.shipName, count: 0, tonaj: 0 }
      map[e.shipId].count += 1
      map[e.shipId].tonaj += e.tonaj
    })
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 6)
  }, [filtered])

  const resetFilters = () => {
    setDirection('Hamısı')
    setStatus('Hamısı')
    setPort('Hamısı')
    setRisk('Hamısı')
    setShipId('Hamısı')
    setSource('Hamısı')
    toast.success('Filtrlər sıfırlandı')
  }

  const exportReport = () => {
    const header = 'ID,İstiqamət,Gəmi,Status,Liman,Tonaj,Avtomobil,Bəyannamə,Risk,Tarix,Mənbə\n'
    const body = filtered.map(e =>
      [e.id, e.direction, e.shipName, e.shipStatus, e.port, e.tonaj, e.vehicles, e.declarations, e.risk, e.date, e.source]
        .map(v => `"${v}"`).join(','),
    ).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([header + body], { type: 'text/csv;charset=utf-8' }))
    a.download = 'analitika-hesabat.csv'
    a.click()
    toast.success(`${filtered.length} sətir ixrac edildi`)
  }

  const girisDelta = pctChange(kpis.giris, Math.max(1, Math.round(kpis.total * 0.45)))
  const cixisDelta = pctChange(kpis.cixis, Math.max(1, Math.round(kpis.total * 0.35)))

  return <>
    <PageHeader
      title="Analitika"
      action={
        <div className="header-actions">
          <Button variant="ghost" onClick={resetFilters}><RotateCcw /> Sıfırla</Button>
          <Button onClick={exportReport}><Download /> Hesabatı yüklə</Button>
        </div>
      }
    />

    <section className="analytics-filters">
      <div className="analytics-filters-head">
        <Filter size={16} />
        <strong>Dashboard filtrləri</strong>
        <span>{filtered.length} hadisə · {kpis.dbShare}% DB</span>
      </div>
      <div className="analytics-filters-grid">
        <label>İstiqamət
          <select value={direction} onChange={e => {
            const nextDir = e.target.value as DirectionFilter
            setDirection(nextDir)
            if (nextDir === 'Gedən' && status === 'Lövbərdə') setStatus('Hamısı')
          }}>
            <option>Hamısı</option>
            <option>Gələn</option>
            <option>Gedən</option>
          </select>
        </label>
        <label>Gəmi statusu
          <select value={status} onChange={e => setStatus(e.target.value as StatusFilter)}>
            <option>Hamısı</option>
            {direction !== 'Gedən' && <option>Lövbərdə</option>}
            <option>Yolda</option>
            <option>Körpüdə</option>
          </select>
        </label>
        <label>Mənşə limanı
          <select value={port} onChange={e => setPort(e.target.value)}>
            {ports.map(p => <option key={p}>{p}</option>)}
          </select>
        </label>
        <label>Risk
          <select value={risk} onChange={e => setRisk(e.target.value as RiskFilter)}>
            <option>Hamısı</option>
            <option>Yaşıl</option>
            <option>Amber</option>
            <option>Qırmızı</option>
          </select>
        </label>
        <label>Gəmi
          <select value={shipId} onChange={e => setShipId(e.target.value)}>
            {shipOptions.map(id => (
              <option key={id} value={id}>
                {id === 'Hamısı' ? 'Hamısı' : ships.find(g => g.id === id)?.ad || id}
              </option>
            ))}
          </select>
        </label>
        <label>Mənbə
          <select value={source} onChange={e => setSource(e.target.value as typeof source)}>
            <option value="Hamısı">Hamısı</option>
            <option value="db">Yalnız DB</option>
            <option value="synthetic">Sintetik</option>
          </select>
        </label>
      </div>
      <div className="analytics-chips">
        {direction !== 'Hamısı' && <button type="button" onClick={() => setDirection('Hamısı')}>{direction} ×</button>}
        {status !== 'Hamısı' && <button type="button" onClick={() => setStatus('Hamısı')}>{status} ×</button>}
        {port !== 'Hamısı' && <button type="button" onClick={() => setPort('Hamısı')}>{port} ×</button>}
        {risk !== 'Hamısı' && <button type="button" onClick={() => setRisk('Hamısı')}>{risk} ×</button>}
        {shipId !== 'Hamısı' && <button type="button" onClick={() => setShipId('Hamısı')}>{ships.find(g => g.id === shipId)?.ad || shipId} ×</button>}
        {source !== 'Hamısı' && <button type="button" onClick={() => setSource('Hamısı')}>{source === 'db' ? 'DB' : 'Sintetik'} ×</button>}
      </div>
    </section>

    <section className="analytics-kpis analytics-kpis-rich">
      <Card className="kpi-rich">
        <div className="kpi-top"><Ship size={18} /><span className={girisDelta >= 0 ? 'up' : 'down'}>{girisDelta >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{Math.abs(girisDelta)}%</span></div>
        <small>Gələn gəmi / hadisə</small>
        <strong>{formatNum(kpis.giris)}</strong>
        <span>Filtr: {direction === 'Gedən' ? 'gedən rejimində gizlidir' : 'aktiv gələn axını'}</span>
      </Card>
      <Card className="kpi-rich">
        <div className="kpi-top"><Anchor size={18} /><span className={cixisDelta >= 0 ? 'up' : 'down'}>{cixisDelta >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{Math.abs(cixisDelta)}%</span></div>
        <small>Gedən gəmi / hadisə</small>
        <strong>{formatNum(kpis.cixis)}</strong>
        <span>Gedən gəmi və post qərarları</span>
      </Card>
      <Card className="kpi-rich">
        <div className="kpi-top"><Gauge size={18} /><span className="up"><TrendingUp size={14} />{kpis.autoRate}%</span></div>
        <small>Orta emal müddəti</small>
        <strong>{kpis.avgProcess} <em>dəq</em></strong>
        <span>Risk payına görə dinamik</span>
      </Card>
      <Card className="kpi-rich">
        <div className="kpi-top"><Truck size={18} /><span className="up"><ArrowUpRight size={14} />{formatNum(kpis.autos)}</span></div>
        <small>Yük / avtomobil dövriyyəsi</small>
        <strong>{formatNum(Math.round(kpis.tonaj / 1000))}K <em>t</em></strong>
        <span>{formatNum(kpis.autos)} avtomobil vahidi</span>
      </Card>
      <Card className="kpi-rich">
        <div className="kpi-top"><FileCheck2 size={18} /><span>{formatNum(kpis.decls)}</span></div>
        <small>Bəyannamə / sənəd</small>
        <strong>{formatNum(kpis.decls)}</strong>
        <span>DB qeydiyyat + sintez</span>
      </Card>
      <Card className="kpi-rich">
        <div className="kpi-top"><AlertTriangle size={18} /><span className={kpis.red ? 'down' : 'up'}>{kpis.red} qırmızı</span></div>
        <small>Risk balansı</small>
        <strong>{kpis.green}<em> / </em>{kpis.amber}<em> / </em>{kpis.red}</strong>
        <span>Yaşıl / Amber / Qırmızı</span>
      </Card>
    </section>

    <section className="analytics-grid analytics-grid-rich">
      <Card className="chart-card wide" hover={false}>
        <header>
          <div><h2>Gələn / gedən dinamikası</h2><p>Aylıq gəmi hadisələri — filtrə uyğun</p></div>
          <span className="chart-legend"><i style={{ background: '#0A4D8C' }} /> Gələn <i style={{ background: '#00B4D8', marginLeft: 10 }} /> Gedən</span>
        </header>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={monthly}>
            <defs>
              <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0A4D8C" stopOpacity={.35} /><stop offset="95%" stopColor="#0A4D8C" stopOpacity={0} /></linearGradient>
              <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00B4D8" stopOpacity={.3} /><stop offset="95%" stopColor="#00B4D8" stopOpacity={0} /></linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={.15} />
            <XAxis dataKey="ay" />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="giris" name="Gələn" stroke="#0A4D8C" fill="url(#gIn)" strokeWidth={2.5} />
            <Area type="monotone" dataKey="cixis" name="Gedən" stroke="#00B4D8" fill="url(#gOut)" strokeWidth={2.5} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <Card className="chart-card" hover={false}>
        <header><div><h2>Liman payı</h2><p>Mənşə / marşrut</p></div></header>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={portShare} innerRadius={52} outerRadius={82} dataKey="value" paddingAngle={3} nameKey="name">
              {portShare.map((p, i) => <Cell key={p.name} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v) => `${v ?? 0}%`} />
          </PieChart>
        </ResponsiveContainer>
        <div className="port-legend">
          {portShare.map((p, i) => (
            <span key={p.name}><i style={{ background: COLORS[i % COLORS.length] }} />{p.name}<b>{p.value}%</b></span>
          ))}
        </div>
      </Card>

      <Card className="chart-card wide" hover={false}>
        <header><div><h2>Yük həcmi və avtomobil axını</h2><p>Aylıq dinamika (filtrə uyğun)</p></div></header>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={monthly}>
            <CartesianGrid strokeDasharray="3 3" opacity={.15} />
            <XAxis dataKey="ay" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="yuk" name="Yük indeksi" fill="#0A4D8C" radius={[6, 6, 0, 0]} />
            <Bar dataKey="avtomobil" name="Avtomobil" fill="#00B4D8" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="chart-card" hover={false}>
        <header><div><h2>Risk payı</h2><p>Yaşıl / amber / qırmızı</p></div></header>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={riskPie} innerRadius={48} outerRadius={78} dataKey="value" paddingAngle={4}>
              {riskPie.map(p => <Cell key={p.name} fill={p.color} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        <div className="port-legend">
          {riskPie.map(p => <span key={p.name}><i style={{ background: p.color }} />{p.name}<b>{p.value}</b></span>)}
        </div>
      </Card>

      <Card className="chart-card top-ships-card" hover={false}>
        <header><div><h2>Top gəmilər</h2><p>Hadisə və tonaj</p></div></header>
        <div className="top-ships-list">
          {topShips.length === 0 && <p className="empty-analytics">Filtrə uyğun gəmi yoxdur</p>}
          {topShips.map((s, i) => (
            <div key={`${s.name}-${i}`} className="top-ship-row">
              <span className="rank">{i + 1}</span>
              <div>
                <strong title={s.name}>{s.name}</strong>
                <small>{s.count} hadisə · {formatNum(s.tonaj)} t</small>
              </div>
              <div className="top-ship-bar"><i style={{ width: `${Math.min(100, (s.count / (topShips[0]?.count || 1)) * 100)}%` }} /></div>
            </div>
          ))}
        </div>
      </Card>

    </section>
  </>
}

function amberCount(list: TrafficEvent[]) {
  return list.filter(e => e.risk === 'amber').length
}
