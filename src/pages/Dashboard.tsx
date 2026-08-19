import { lazy, Suspense, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Anchor, ArrowDownToLine, ArrowLeft, ArrowUpFromLine, AlertTriangle,
  CarFront, ChevronRight, CircleDot, Clock3, Container, ExternalLink,
  FileText, MapPinned, PackageCheck, Route, ShieldCheck, Ship,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Card, Modal, PageHeader, StatusBadge } from '../components/UI'
import DateRangePicker, { type DateRange, getDefaultRange } from '../components/DateRangePicker'
import RefreshRatePicker from '../components/RefreshRatePicker'
import { portCalls } from '../data/operationalData'
import type { GemiIstiqameti } from '../data/mockData'
import { getShipDirection, getShipDirectionTabLabel, getShipMovementSummary } from '../domain/ships'
import { useAppStore } from '../store/useAppStore'
import './Dashboard.css'

const SeaMap = lazy(() => import('../components/SeaMap'))
type ShipDirection = GemiIstiqameti
type ShipDirectionFilter = 'Hamısı' | ShipDirection
type QueueFilter = 'Hamısı' | 'Gözləyən' | 'Problemli' | 'Buraxılıb'

const queueFilterLabels: Record<QueueFilter, string> = {
  Hamısı: 'Hamısı',
  Gözləyən: 'Gözləyən',
  Problemli: 'Girişə icazə verilməyən',
  Buraxılıb: 'Buraxılıb',
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { ships, vehicles, declarations } = useAppStore()
  const [dateRange, setDateRange] = useState<DateRange>(() => getDefaultRange('today'))
  const [refreshRate, setRefreshRate] = useState('5 dəq')
  const [shipDirection, setShipDirection] = useState<ShipDirectionFilter>('Hamısı')
  const [selectedShipId, setSelectedShipId] = useState('')
  const [selectedPlate, setSelectedPlate] = useState('')
  const [selectedDeclaration, setSelectedDeclaration] = useState('')
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('Hamısı')
  const [mapOpen, setMapOpen] = useState(false)

  const chooseDirection = (direction: ShipDirectionFilter) => {
    setShipDirection(direction)
    setSelectedShipId('')
    setSelectedPlate('')
  }

  const movementSummary = useMemo(() => getShipMovementSummary(ships), [ships])

  const directionCounts = useMemo(() => ({
    Hamısı: movementSummary.total,
    Gələn: movementSummary.Gələn,
    Gedən: movementSummary.Gedən,
  }), [movementSummary])

  const filteredShips = useMemo(() => {
    if (shipDirection === 'Hamısı') return ships
    return ships.filter(ship => getShipDirection(ship) === shipDirection)
  }, [ships, shipDirection])

  const allDetails = useMemo(() => [
    { label: 'Körpüdə (giriş)', value: movementSummary.byStatus.Körpüdə.Gələn, tone: 'green', status: 'Körpüdə' as const, direction: 'Gələn' as const },
    { label: 'Körpüdə (çıxış)', value: movementSummary.byStatus.Körpüdə.Gedən, tone: 'green', status: 'Körpüdə' as const, direction: 'Gedən' as const },
    { label: 'Lövbərdə (giriş)', value: movementSummary.byStatus.Lövbərdə.Gələn, tone: 'amber', status: 'Lövbərdə' as const, direction: 'Gələn' as const },
    { label: 'Yolda (giriş)', value: movementSummary.byStatus.Yolda.Gələn, tone: 'blue', status: 'Yolda' as const, direction: 'Gələn' as const },
    { label: 'Yolda (çıxış)', value: movementSummary.byStatus.Yolda.Gedən, tone: 'blue', status: 'Yolda' as const, direction: 'Gedən' as const },
  ], [movementSummary])

  const shipStats = useMemo(() => {
    const details = shipDirection === 'Hamısı'
      ? allDetails
      : allDetails.filter(stat => stat.direction === shipDirection)

    return {
      total: shipDirection === 'Hamısı' ? movementSummary.total : directionCounts[shipDirection],
      details,
    }
  }, [allDetails, shipDirection, movementSummary.total, directionCounts])

  const vehicleCountByShip = useMemo(() => vehicles.reduce<Record<string, number>>((counts, vehicle) => {
    counts[vehicle.gemi] = (counts[vehicle.gemi] ?? 0) + 1
    return counts
  }, {}), [vehicles])

  const activeShip = filteredShips.find(ship => ship.id === selectedShipId)

  const queue = useMemo(() => {
    if (!activeShip) return []
    return vehicles
      .filter(v => v.gemi === activeShip.id || v.gemi === activeShip.ad)
      .map((vehicle, index) => {
        const linked = declarations.filter(item => item.avtomobil === vehicle.nomre)
        const hasIssue = linked.some(item => item.status === 'Risk nəzarəti' || item.status === 'Yoxlamada')
        const released = !hasIssue && index % 4 === 0
        const state: Exclude<QueueFilter, 'Hamısı'> = hasIssue ? 'Problemli' : released ? 'Buraxılıb' : 'Gözləyən'
        return { vehicle, linked, state, priority: hasIssue ? 0 : released ? 2 : 1, index }
      })
      .sort((a, b) => a.priority - b.priority || a.index - b.index)
  }, [vehicles, declarations, activeShip])

  const filteredQueue = queue.filter(item => queueFilter === 'Hamısı' || item.state === queueFilter)
  const selectedItem = queue.find(item => item.vehicle.nomre === selectedPlate)
  const activeDeclaration = selectedItem?.linked.find(item => item.kod === selectedDeclaration) ?? selectedItem?.linked[0]
  const totalCargo = portCalls.reduce((sum, item) => sum + item.cargoTons, 0)
  const totalVehicles = portCalls.reduce((sum, item) => sum + item.vehicles, 0)
  const issueCount = queue.filter(item => item.state === 'Problemli').length
  const unloadingShips = movementSummary.unloading
  const loadingShips = movementSummary.loading

  const chooseVehicle = (plate: string, firstDeclaration = '') => {
    setSelectedPlate(plate)
    setSelectedDeclaration(firstDeclaration)
  }

  const chooseShip = (shipId: string) => {
    setSelectedShipId(shipId)
    setSelectedPlate('')
    setSelectedDeclaration('')
    setQueueFilter('Hamısı')
  }

  const showShipList = () => {
    setSelectedShipId('')
    setSelectedPlate('')
  }

  return <>
    <PageHeader title="İdarəetmə Paneli" action={<div className="command-toolbar" aria-label="Dashboard filtrləri">
      <DateRangePicker value={dateRange} onChange={setDateRange} align="right" />
      <RefreshRatePicker value={refreshRate} onChange={setRefreshRate} align="right" />
      <span className="command-live"><i /> Canlı · {refreshRate}</span>
    </div>} />

    <div className="ship-direction-tabs" role="tablist" aria-label="Gəmiləri istiqamətə görə göstər">
      {(['Hamısı', 'Gələn', 'Gedən'] as ShipDirectionFilter[]).map(direction => <button
        type="button"
        role="tab"
        aria-selected={shipDirection === direction}
        className={shipDirection === direction ? 'active' : ''}
        onClick={() => chooseDirection(direction)}
        key={direction}
      >
        <span>{direction === 'Hamısı' ? <Ship /> : direction === 'Gələn' ? <ArrowDownToLine /> : <ArrowUpFromLine />}</span>
        <span><strong>{getShipDirectionTabLabel(direction)}</strong><small>{directionCounts[direction]} gəmi</small></span>
      </button>)}
    </div>

    <section className="port-overview dashboard-port-overview" aria-label="Beynəlxalq Dəniz Ticarət Limanı göstəriciləri">
      <Card className="port-overview-lead dashboard-port-overview-lead" hover={false}>
        <div className="overview-title"><span><Anchor /></span><div><small>BEYNƏLXALQ DƏNİZ TİCARƏT LİMANI · {dateRange.label.toLocaleUpperCase('az')}</small><h2>{shipDirection === 'Hamısı' ? 'Gəmi axını' : getShipDirectionTabLabel(shipDirection)}</h2></div></div>
        <div className="vessel-total"><strong>{shipStats.total}</strong><span>{shipDirection === 'Gedən' ? 'Körpü + yolda' : 'Körpü + lövbər + yolda'}</span></div>
        <div className="vessel-direction-stats">
          {shipStats.details.map(stat => <Link
            className="vessel-stat-link"
            to={`/gemiler?status=${encodeURIComponent(stat.status)}&direction=${encodeURIComponent(stat.direction)}`}
            aria-label={`${shipDirection === 'Hamısı' ? stat.label : stat.status}: ${stat.value}. Əlaqəli gəmilərə bax`}
            key={`${stat.status}-${stat.direction}`}
          ><strong>{stat.value}</strong><span><i className={`status-dot ${stat.tone}`} /> {shipDirection === 'Hamısı' ? stat.label : stat.status}</span></Link>)}
        </div>
      </Card>
      <Link className="glass-card flow-stat dashboard-stat-link" to="/gemiler?status=K%C3%B6rp%C3%BCd%C9%99&direction=G%C9%99l%C9%99n" aria-label={`Boşaldılan gəmilər: ${unloadingShips}. Siyahıya bax`}><span className="flow-icon orange"><ArrowDownToLine /></span><div><small>Boşaldılan gəmi</small><strong>{unloadingShips}</strong></div></Link>
      <Link className="glass-card flow-stat dashboard-stat-link" to="/gemiler?status=K%C3%B6rp%C3%BCd%C9%99&direction=Ged%C9%99n" aria-label={`Yüklənən gəmilər: ${loadingShips}. Siyahıya bax`}><span className="flow-icon green"><ArrowUpFromLine /></span><div><small>Yüklənən gəmi</small><strong>{loadingShips}</strong></div></Link>
      <Link className="glass-card flow-stat dashboard-stat-link" to="/beyannameler" aria-label="Yük bəyannamələrinə bax"><span className="flow-icon blue"><PackageCheck /></span><div><small>Yük</small><strong>{Math.round(totalCargo).toLocaleString('az-AZ')} t</strong></div></Link>
      <Link className="glass-card flow-stat dashboard-stat-link" to="/qeydiyyat" aria-label="Nəqliyyat vasitələrinə bax"><span className="flow-icon cyan"><CarFront /></span><div><small>Nəqliyyat vasitəsi</small><strong>{totalVehicles}</strong></div></Link>
      <Link className="glass-card flow-stat dashboard-stat-link" to="/beyannameler" aria-label="Konteyner məlumatlarına bax"><span className="flow-icon yellow"><Container /></span><div><small>Konteyner</small><strong>184</strong></div></Link>
    </section>

    <section className="command-grid">
      <div className="command-map-column">
        <Card className="command-map" hover={false}>
          <header className="command-card-head"><div><span className="command-head-icon"><MapPinned /></span><div><h2>Gəmi mövqeləri</h2><small>GPS · Xəzər dənizi</small></div></div><button type="button" onClick={() => setMapOpen(true)}>Tam ekran <ExternalLink /></button></header>
          <Suspense fallback={<div className="map-skeleton" />}><SeaMap compact visibleShips={filteredShips} /></Suspense>
        </Card>
      </div>

      <Card className="vehicle-command vessel-vehicle-command" hover={false}>
        {!activeShip ? <>
          <header className="command-card-head vehicle-head"><div><span className="command-head-icon"><Ship /></span><div><h2>Gəmilər</h2><small>Əlaqəli nəqliyyatlara baxmaq üçün gəmi seçin</small></div></div><span className="stage-count">{filteredShips.length}</span></header>
          <section className="dashboard-ship-picker" aria-label="Gəmilərin siyahısı">
            <div className="dashboard-ship-list" role="listbox" aria-label="Nəqliyyatları göstəriləcək gəmini seçin">
              {filteredShips.map(ship => <button type="button" role="option" aria-selected="false" onClick={() => chooseShip(ship.id)} key={ship.id}>
                <span className="dashboard-ship-icon"><Ship /></span>
                <span className="dashboard-ship-name"><strong>{ship.ad}</strong><small>{ship.status} · {getShipDirection(ship)}</small></span>
                <span className="dashboard-ship-count"><strong>{vehicleCountByShip[ship.id] ?? 0}</strong><small>nəqliyyat</small></span>
                <ChevronRight />
              </button>)}
            </div>
          </section>
        </> : <>
          <header className="vehicle-stage-header">
            <button type="button" className="vehicle-stage-back" onClick={showShipList} aria-label="Gəmilərin siyahısına qayıt"><ArrowLeft /></button>
            <div><small>SEÇİLMİŞ GƏMİ</small><h2>{activeShip.ad}</h2><span>{activeShip.status} · {getShipDirection(activeShip)}</span></div>
            <strong><CarFront /> {queue.length}</strong>
          </header>
          {issueCount > 0 && <div className="vehicle-stage-notice"><AlertTriangle /><span>{issueCount} nəqliyyatın girişinə icazə yoxdur</span></div>}
          <div className="queue-tabs" role="tablist">{(['Hamısı', 'Gözləyən', 'Problemli', 'Buraxılıb'] as QueueFilter[]).map(filter => <button type="button" role="tab" aria-label={filter === 'Problemli' ? 'Girişə icazə verilməyən nəqliyyatlar' : queueFilterLabels[filter]} title={filter === 'Problemli' ? 'Girişə icazə verilməyən' : undefined} aria-selected={queueFilter === filter} className={queueFilter === filter ? 'active' : ''} onClick={() => setQueueFilter(filter)} key={filter}>{queueFilterLabels[filter]}<b>{queue.filter(item => filter === 'Hamısı' || item.state === filter).length}</b></button>)}</div>
          <div className="vehicle-queue staged-vehicle-queue" aria-label={`${activeShip.ad} üzrə nəqliyyat vasitələri`}>{filteredQueue.length > 0 ? filteredQueue.map(({ vehicle, linked, state }, index) => <motion.button type="button" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index, 8) * .025 }} className={state === 'Problemli' ? 'problem' : ''} onClick={() => chooseVehicle(vehicle.nomre, linked[0]?.kod)} key={`${vehicle.kod}-${index}`}>
            <span className={`queue-state ${state === 'Problemli' ? 'problem' : state === 'Buraxılıb' ? 'released' : 'waiting'}`}><CircleDot /></span><span className="vehicle-id"><strong>{vehicle.nomre}</strong><small>{vehicle.marka} · B/L {vehicle.billOfLading}</small></span><span className="vehicle-status"><b title={state === 'Problemli' ? 'Girişə icazə verilməyən' : undefined}>{queueFilterLabels[state]}</b><small>{linked.length} sənəd</small></span><ChevronRight />
          </motion.button>) : <div className="vehicle-queue-empty"><CarFront /><strong>Nəqliyyat tapılmadı</strong><small>{queue.length === 0 ? 'Bu gəmiyə əlaqəli nəqliyyat vasitəsi yoxdur.' : `“${queueFilterLabels[queueFilter]}” statusunda nəqliyyat yoxdur.`}</small></div>}</div>
        </>}
      </Card>
    </section>

    <Modal open={mapOpen} onClose={() => setMapOpen(false)} title="Gəmi mövqeləri · GPS" wide><div className="map-modal-body"><Suspense fallback={<div className="map-skeleton" />}><SeaMap visibleShips={filteredShips} /></Suspense></div></Modal>
    <Modal open={!!selectedItem} onClose={() => chooseVehicle('')} title={selectedItem ? `${selectedItem.vehicle.nomre} · Nəqliyyat detalları` : 'Nəqliyyat detalları'}>
      {selectedItem && <section className="vehicle-context vehicle-detail-modal">
        <header><div><small>SEÇİLMİŞ NƏQLİYYAT</small><h3>{selectedItem.vehicle.nomre}</h3></div><StatusBadge status={queueFilterLabels[selectedItem.state]} /></header>
        <div className="manifest-ribbon"><span><Route /></span><div><small>Manifest · B/L {selectedItem.vehicle.billOfLading}</small><strong>{selectedItem.vehicle.yuk}</strong><em>{selectedItem.vehicle.menshe} → {selectedItem.vehicle.teyinat}</em></div><ShieldCheck /></div>
        <div className="declaration-selector"><label><FileText /> Gömrük bəyannamələri <b>{selectedItem.linked.length}</b></label>{selectedItem.linked.length > 0 ? <select value={activeDeclaration?.kod ?? ''} onChange={event => setSelectedDeclaration(event.target.value)}>{selectedItem.linked.map(item => <option value={item.kod} key={item.kod}>{item.kod} · {item.status}</option>)}</select> : <p>Bəyannamə hələ yaradılmayıb.</p>}</div>
        {activeDeclaration && <div className="declaration-preview"><div><small>Status</small><StatusBadge status={activeDeclaration.status} /></div><div><small>Mal</small><strong>{activeDeclaration.mallar[0]?.ad ?? '—'}</strong></div><div><small>Ümumi dəyər</small><strong>{activeDeclaration.umumiDeyer.toLocaleString('az-AZ')} {activeDeclaration.valyuta}</strong></div></div>}
        <button type="button" className="open-workflow" onClick={() => navigate(`/qeydiyyat?shipId=${selectedItem.vehicle.gemi}`)}><Clock3 /> Əməliyyatı davam etdir <ChevronRight /></button>
      </section>}
    </Modal>
  </>
}
