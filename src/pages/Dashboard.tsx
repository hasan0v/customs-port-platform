import { lazy, Suspense, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle, Anchor, ArrowDownToLine, ArrowUpFromLine, CalendarDays, CarFront,
  ChevronRight, CircleDot, Clock3, Container, ExternalLink, FileText, MapPinned,
  PackageCheck, Radio, RefreshCw, Route, Ship, ShieldCheck,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card, Modal, PageHeader, StatusBadge } from '../components/UI'
import { portCalls } from '../data/operationalData'
import { useAppStore } from '../store/useAppStore'

const SeaMap = lazy(() => import('../components/SeaMap'))
type QueueFilter = 'Hamısı' | 'Gözləyən' | 'Problemli' | 'Buraxılıb'
const operationLabels = ['Boşaldılır', 'Yüklənir', 'Gözləyir'] as const

export default function Dashboard() {
  const navigate = useNavigate()
  const { ships, vehicles, declarations } = useAppStore()
  const [mapOpen, setMapOpen] = useState(false)
  const [period, setPeriod] = useState('Bu gün')
  const [refreshRate, setRefreshRate] = useState('5 dəq')
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('Hamısı')
  const [selectedPlate, setSelectedPlate] = useState(vehicles[0]?.nomre ?? '')
  const [selectedDeclaration, setSelectedDeclaration] = useState('')

  const shipCounts = useMemo(() => ({
    total: ships.length,
    anchored: ships.filter(ship => ship.status === 'Lövbərdə').length,
    underway: ships.filter(ship => ship.status === 'Yolda').length,
  }), [ships])

  const queue = useMemo(() => vehicles.map((vehicle, index) => {
    const linked = declarations.filter(item => item.avtomobil === vehicle.nomre)
    const hasIssue = linked.some(item => item.status === 'Risk nəzarəti' || item.waitReasons?.some(reason => /risk|uyğunsuz|çatış|çəki/i.test(reason)))
    const released = !hasIssue && index % 6 === 0
    const state: Exclude<QueueFilter, 'Hamısı'> = hasIssue ? 'Problemli' : released ? 'Buraxılıb' : 'Gözləyən'
    return { vehicle, linked, state, priority: hasIssue ? 0 : released ? 2 : 1, index }
  }).sort((a, b) => a.priority - b.priority || a.index - b.index), [vehicles, declarations])

  const filteredQueue = queue.filter(item => queueFilter === 'Hamısı' || item.state === queueFilter)
  const selectedItem = queue.find(item => item.vehicle.nomre === selectedPlate) ?? queue[0]
  const activeDeclaration = selectedItem?.linked.find(item => item.kod === selectedDeclaration) ?? selectedItem?.linked[0]
  const totalCargo = portCalls.reduce((sum, item) => sum + item.cargoTons, 0)
  const totalVehicles = portCalls.reduce((sum, item) => sum + item.vehicles, 0)
  const issueCount = queue.filter(item => item.state === 'Problemli').length

  const chooseVehicle = (plate: string, firstDeclaration = '') => {
    setSelectedPlate(plate)
    setSelectedDeclaration(firstDeclaration)
  }

  return <>
    <PageHeader title="Əməliyyat mərkəzi" action={<div className="command-toolbar" aria-label="Dashboard filtrləri">
      <label><CalendarDays /><select value={period} onChange={event => setPeriod(event.target.value)} aria-label="Tarix müddəti"><option>Bu gün</option><option>Son 7 gün</option><option>Son 30 gün</option></select></label>
      <label><RefreshCw /><select value={refreshRate} onChange={event => setRefreshRate(event.target.value)} aria-label="Yenilənmə intervalı"><option>1 dəq</option><option>5 dəq</option><option>15 dəq</option></select></label>
      <span className="command-live"><i /> Canlı · {refreshRate}</span>
    </div>} />

    <section className="port-overview" aria-label="Ələt limanı göstəriciləri">
      <Card className="port-overview-lead" hover={false}>
        <div className="overview-title"><span><Anchor /></span><div><small>ƏLƏT LİMANI · {period.toLocaleUpperCase('az')}</small><h2>Gəmi axını</h2></div></div>
        <div className="vessel-totals">
          <article><strong>{shipCounts.total}</strong><span>Ümumi</span></article>
          <article><strong>{shipCounts.anchored}</strong><span><i className="status-dot amber" /> Lövbərdə</span></article>
          <article><strong>{shipCounts.underway}</strong><span><i className="status-dot blue" /> Yolda</span></article>
        </div>
      </Card>
      <Card className="flow-stat" hover={false}><span className="flow-icon orange"><ArrowDownToLine /></span><div><small>Boşaldılan gəmi</small><strong>{ships.filter(ship => ship.status === 'Körpüdə').length}</strong><em>3 əməliyyat aktiv</em></div></Card>
      <Card className="flow-stat" hover={false}><span className="flow-icon green"><ArrowUpFromLine /></span><div><small>Yüklənən gəmi</small><strong>{Math.max(1, ships.filter(ship => ship.status === 'Körpüdə').length - 1)}</strong><em>2 əməliyyat aktiv</em></div></Card>
      <Card className="flow-stat" hover={false}><span className="flow-icon blue"><PackageCheck /></span><div><small>Yük</small><strong>{Math.round(totalCargo).toLocaleString('az-AZ')} t</strong><em>Bu gün emal</em></div></Card>
      <Card className="flow-stat" hover={false}><span className="flow-icon cyan"><CarFront /></span><div><small>Nəqliyyat vasitəsi</small><strong>{totalVehicles}</strong><em>{queue.filter(item => item.state === 'Gözləyən').length} növbədə</em></div></Card>
      <Card className="flow-stat" hover={false}><span className="flow-icon yellow"><Container /></span><div><small>Konteyner</small><strong>184</strong><em>22 transferdə</em></div></Card>
    </section>

    <section className="command-grid">
      <div className="command-map-column">
        <Card className="command-map" hover={false}>
          <header className="command-card-head"><div><span className="command-head-icon"><MapPinned /></span><div><h2>Gəmi mövqeləri</h2><small>AIS / GPS · Xəzər dənizi</small></div></div><button type="button" onClick={() => setMapOpen(true)}>Tam ekran <ExternalLink /></button></header>
          <Suspense fallback={<div className="map-skeleton" />}><SeaMap compact /></Suspense>
        </Card>
        <Card className="vessel-operations" hover={false}>
          <header className="command-card-head"><div><span className="command-head-icon"><Radio /></span><div><h2>Aktiv gəmi əməliyyatları</h2><small>Yükləmə və boşaltma vəziyyəti</small></div></div><button type="button" onClick={() => navigate('/gemiler')}>Hamısı <ChevronRight /></button></header>
          <div className="vessel-operation-list">{ships.slice(0, 4).map((ship, index) => {
            const operation = operationLabels[index % operationLabels.length]
            return <button type="button" key={ship.id} onClick={() => navigate(`/gemiler?id=${ship.id}`)}>
              <span className={`operation-symbol ${operation === 'Yüklənir' ? 'loading' : operation === 'Boşaldılır' ? 'unloading' : 'waiting'}`}><Ship /></span>
              <span className="operation-vessel"><strong>{ship.ad}</strong><small>{ship.yuk} · {ship.kanal}</small></span>
              <span className="operation-state"><b>{operation}</b><small>{operation === 'Gözləyir' ? ship.status : `${42 + index * 13}% tamamlanıb`}</small></span><ChevronRight />
            </button>
          })}</div>
        </Card>
      </div>

      <Card className="vehicle-command" hover={false}>
        <header className="command-card-head vehicle-head"><div><span className="command-head-icon"><CarFront /></span><div><h2>Nəqliyyat vasitələri</h2><small>Prioritet növbə · {queue.length} qeyd</small></div></div>{issueCount > 0 && <span className="issue-count"><AlertTriangle /> {issueCount}</span>}</header>
        <div className="queue-tabs" role="tablist">{(['Hamısı', 'Gözləyən', 'Problemli', 'Buraxılıb'] as QueueFilter[]).map(filter => <button type="button" role="tab" aria-selected={queueFilter === filter} className={queueFilter === filter ? 'active' : ''} onClick={() => setQueueFilter(filter)} key={filter}>{filter}<b>{queue.filter(item => filter === 'Hamısı' || item.state === filter).length}</b></button>)}</div>
        <div className="vehicle-queue" aria-label="Nəqliyyat vasitəsi növbəsi">{filteredQueue.map(({ vehicle, linked, state }, index) => <motion.button type="button" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index, 8) * .025 }} className={`${selectedItem?.vehicle.nomre === vehicle.nomre ? 'selected' : ''} ${state === 'Problemli' ? 'problem' : ''}`} onClick={() => chooseVehicle(vehicle.nomre, linked[0]?.kod)} key={`${vehicle.kod}-${index}`}>
          <span className={`queue-state ${state === 'Problemli' ? 'problem' : state === 'Buraxılıb' ? 'released' : 'waiting'}`}><CircleDot /></span><span className="vehicle-id"><strong>{vehicle.nomre}</strong><small>{vehicle.marka} · B/L {vehicle.billOfLading}</small></span><span className="vehicle-status"><b>{state}</b><small>{linked.length} sənəd</small></span><ChevronRight />
        </motion.button>)}</div>

        {selectedItem && <section className="vehicle-context">
          <header><div><small>SEÇİLMİŞ NƏQLİYYAT</small><h3>{selectedItem.vehicle.nomre}</h3></div><StatusBadge status={selectedItem.state} /></header>
          <div className="manifest-ribbon"><span><Route /></span><div><small>Manifest · B/L {selectedItem.vehicle.billOfLading}</small><strong>{selectedItem.vehicle.yuk}</strong><em>{selectedItem.vehicle.menshe} → {selectedItem.vehicle.teyinat}</em></div><ShieldCheck /></div>
          <div className="declaration-selector"><label><FileText /> Gömrük bəyannamələri <b>{selectedItem.linked.length}</b></label>{selectedItem.linked.length > 0 ? <select value={activeDeclaration?.kod ?? ''} onChange={event => setSelectedDeclaration(event.target.value)}>{selectedItem.linked.map(item => <option value={item.kod} key={item.kod}>{item.kod} · {item.status}</option>)}</select> : <p>Bəyannamə hələ yaradılmayıb.</p>}</div>
          {activeDeclaration && <div className="declaration-preview"><div><small>Status</small><StatusBadge status={activeDeclaration.status} /></div><div><small>Mal</small><strong>{activeDeclaration.mallar[0]?.ad ?? '—'}</strong></div><div><small>Ümumi dəyər</small><strong>{activeDeclaration.umumiDeyer.toLocaleString('az-AZ')} {activeDeclaration.valyuta}</strong></div></div>}
          <button type="button" className="open-workflow" onClick={() => navigate(`/qeydiyyat?shipId=${selectedItem.vehicle.gemi}`)}><Clock3 /> Əməliyyatı davam etdir <ChevronRight /></button>
        </section>}
      </Card>
    </section>

    <Modal open={mapOpen} onClose={() => setMapOpen(false)} title="Gəmi mövqeləri · AIS / GPS" wide><div className="map-modal-body"><Suspense fallback={<div className="map-skeleton" />}><SeaMap /></Suspense></div></Modal>
  </>
}
