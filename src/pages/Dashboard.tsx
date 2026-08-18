import { lazy, Suspense, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle, Anchor, ArrowDownToLine, ArrowUpFromLine, CarFront,
  ChevronRight, CircleDot, Clock3, Container, ExternalLink, FileText, MapPinned,
  PackageCheck, RefreshCw, Route, Ship, ShieldCheck,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card, Modal, PageHeader, StatusBadge } from '../components/UI'
import DateRangePicker, { type DateRange, getDefaultRange } from '../components/DateRangePicker'
import { portCalls } from '../data/operationalData'
import { useAppStore } from '../store/useAppStore'
import './Dashboard.css'

const SeaMap = lazy(() => import('../components/SeaMap'))
type QueueFilter = 'Hamısı' | 'Gözləyən' | 'Problemli' | 'Buraxılıb'
type ShipDirection = 'Gələn' | 'Gedən'
type ShipDirectionFilter = 'Hamısı' | ShipDirection

const getShipDirection = (ship: { menshe: string; teyinat?: string }): ShipDirection => {
  const origin = ship.menshe.toLocaleLowerCase('az')
  const destination = ship.teyinat?.toLocaleLowerCase('az') ?? ''

  if (destination.includes('ələt')) return 'Gələn'
  return origin.includes('ələt') ? 'Gedən' : 'Gələn'
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { ships, vehicles, declarations } = useAppStore()
  const [mapOpen, setMapOpen] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange>(() => getDefaultRange('today'))
  const [refreshRate, setRefreshRate] = useState('5 dəq')
  const [shipDirection, setShipDirection] = useState<ShipDirectionFilter>('Hamısı')
  const [selectedShipId, setSelectedShipId] = useState(ships[0]?.id ?? '')
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('Hamısı')
  const [selectedPlate, setSelectedPlate] = useState(vehicles[0]?.nomre ?? '')
  const [selectedDeclaration, setSelectedDeclaration] = useState('')

  const directionCounts = useMemo(() => ({
    Hamısı: ships.length,
    Gələn: ships.filter(ship => getShipDirection(ship) === 'Gələn').length,
    Gedən: ships.filter(ship => getShipDirection(ship) === 'Gedən').length,
  }), [ships])

  const filteredShips = useMemo(
    () => ships.filter(ship => shipDirection === 'Hamısı' || getShipDirection(ship) === shipDirection),
    [shipDirection, ships],
  )

  const shipStats = useMemo(() => {
    const count = (status: 'Lövbərdə' | 'Yolda', direction?: ShipDirection) => ships.filter(ship =>
      ship.status === status && (!direction || getShipDirection(ship) === direction),
    ).length

    return {
      total: filteredShips.length,
      details: shipDirection === 'Hamısı'
        ? [
            { label: 'Lövbərdə gələn gəmi', value: count('Lövbərdə', 'Gələn'), tone: 'amber' },
            { label: 'Lövbərdə gedən gəmi', value: count('Lövbərdə', 'Gedən'), tone: 'amber' },
            { label: 'Yolda gələn gəmi', value: count('Yolda', 'Gələn'), tone: 'blue' },
            { label: 'Yolda gedən gəmi', value: count('Yolda', 'Gedən'), tone: 'blue' },
          ]
        : [
            { label: 'Lövbərdə', value: count('Lövbərdə', shipDirection), tone: 'amber' },
            { label: 'Yolda', value: count('Yolda', shipDirection), tone: 'blue' },
          ],
    }
  }, [filteredShips.length, shipDirection, ships])

  const vehicleCountByShip = useMemo(() => vehicles.reduce<Record<string, number>>((counts, vehicle) => {
    counts[vehicle.gemi] = (counts[vehicle.gemi] ?? 0) + 1
    return counts
  }, {}), [vehicles])

  const activeShip = filteredShips.find(ship => ship.id === selectedShipId) ?? filteredShips[0]

  const queue = useMemo(() => vehicles.filter(vehicle => vehicle.gemi === activeShip?.id).map((vehicle, index) => {
    const linked = declarations.filter(item => item.avtomobil === vehicle.nomre)
    const hasIssue = linked.some(item => item.status === 'Risk nəzarəti' || item.waitReasons?.some(reason => /risk|uyğunsuz|çatış|çəki/i.test(reason)))
    const released = !hasIssue && index % 6 === 0
    const state: Exclude<QueueFilter, 'Hamısı'> = hasIssue ? 'Problemli' : released ? 'Buraxılıb' : 'Gözləyən'
    return { vehicle, linked, state, priority: hasIssue ? 0 : released ? 2 : 1, index }
  }).sort((a, b) => a.priority - b.priority || a.index - b.index), [vehicles, declarations, activeShip?.id])

  const filteredQueue = queue.filter(item => queueFilter === 'Hamısı' || item.state === queueFilter)
  const selectedItem = queue.find(item => item.vehicle.nomre === selectedPlate) ?? queue[0]
  const activeDeclaration = selectedItem?.linked.find(item => item.kod === selectedDeclaration) ?? selectedItem?.linked[0]
  const totalCargo = portCalls.reduce((sum, item) => sum + item.cargoTons, 0)
  const totalVehicles = portCalls.reduce((sum, item) => sum + item.vehicles, 0)
  const issueCount = queue.filter(item => item.state === 'Problemli').length
  const unloadingShips = filteredShips.filter(ship => ship.status === 'Körpüdə' && getShipDirection(ship) === 'Gələn').length
  const loadingShips = filteredShips.filter(ship => ship.status === 'Körpüdə' && getShipDirection(ship) === 'Gedən').length

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

  return <>
    <PageHeader title="Əməliyyat mərkəzi" action={<div className="command-toolbar" aria-label="Dashboard filtrləri">
      <DateRangePicker value={dateRange} onChange={setDateRange} align="right" />
      <label><RefreshCw /><select value={refreshRate} onChange={event => setRefreshRate(event.target.value)} aria-label="Yenilənmə intervalı"><option>1 dəq</option><option>5 dəq</option><option>15 dəq</option></select></label>
      <span className="command-live"><i /> Canlı · {refreshRate}</span>
    </div>} />

    <div className="ship-direction-tabs" role="tablist" aria-label="Gəmiləri istiqamətə görə göstər">
      {(['Hamısı', 'Gedən', 'Gələn'] as ShipDirectionFilter[]).map(direction => <button
        type="button"
        role="tab"
        aria-selected={shipDirection === direction}
        className={shipDirection === direction ? 'active' : ''}
        onClick={() => setShipDirection(direction)}
        key={direction}
      >
        <span>{direction === 'Hamısı' ? <Ship /> : direction === 'Gedən' ? <ArrowUpFromLine /> : <ArrowDownToLine />}</span>
        <span><strong>{direction === 'Hamısı' ? 'Hamısı' : `${direction} gəmilər`}</strong><small>{directionCounts[direction]} gəmi</small></span>
      </button>)}
    </div>

    <section className="port-overview dashboard-port-overview" aria-label="Ələt limanı göstəriciləri">
      <Card className="port-overview-lead dashboard-port-overview-lead" hover={false}>
        <div className="overview-title"><span><Anchor /></span><div><small>ƏLƏT LİMANI · {dateRange.label.toLocaleUpperCase('az')}</small><h2>{shipDirection === 'Hamısı' ? 'Gəmi axını' : `${shipDirection} gəmilər`}</h2></div></div>
        <div className="vessel-total"><strong>{shipStats.total}</strong><span>Ümumi</span></div>
        <div className="vessel-direction-stats">
          {shipStats.details.map(stat => <article key={stat.label}><strong>{stat.value}</strong><span><i className={`status-dot ${stat.tone}`} /> {stat.label}</span></article>)}
        </div>
      </Card>
      <Card className="flow-stat" hover={false}><span className="flow-icon orange"><ArrowDownToLine /></span><div><small>Boşaldılan gəmi</small><strong>{unloadingShips}</strong><em>{unloadingShips} əməliyyat aktiv</em></div></Card>
      <Card className="flow-stat" hover={false}><span className="flow-icon green"><ArrowUpFromLine /></span><div><small>Yüklənən gəmi</small><strong>{loadingShips}</strong><em>{loadingShips} əməliyyat aktiv</em></div></Card>
      <Card className="flow-stat" hover={false}><span className="flow-icon blue"><PackageCheck /></span><div><small>Yük</small><strong>{Math.round(totalCargo).toLocaleString('az-AZ')} t</strong><em>Bu gün emal</em></div></Card>
      <Card className="flow-stat" hover={false}><span className="flow-icon cyan"><CarFront /></span><div><small>Nəqliyyat vasitəsi</small><strong>{totalVehicles}</strong><em>{queue.filter(item => item.state === 'Gözləyən').length} növbədə</em></div></Card>
      <Card className="flow-stat" hover={false}><span className="flow-icon yellow"><Container /></span><div><small>Konteyner</small><strong>184</strong><em>22 transferdə</em></div></Card>
    </section>

    <section className="command-grid">
      <div className="command-map-column">
        <Card className="command-map" hover={false}>
          <header className="command-card-head"><div><span className="command-head-icon"><MapPinned /></span><div><h2>Gəmi mövqeləri</h2><small>AIS / GPS · Xəzər dənizi</small></div></div><button type="button" onClick={() => setMapOpen(true)}>Tam ekran <ExternalLink /></button></header>
          <Suspense fallback={<div className="map-skeleton" />}><SeaMap compact visibleShips={filteredShips} /></Suspense>
        </Card>
      </div>

      <Card className="vehicle-command vessel-vehicle-command" hover={false}>
        <header className="command-card-head vehicle-head"><div><span className="command-head-icon"><Ship /></span><div><h2>Gəmilər və nəqliyyat vasitələri</h2><small>Gəmi seçin, əlaqəli nəqliyyatlara baxın</small></div></div>{issueCount > 0 && <span className="issue-count"><AlertTriangle /> {issueCount}</span>}</header>

        <section className="dashboard-ship-picker" aria-label="Gəmilərin siyahısı">
          <div className="dashboard-ship-picker-label"><span>GƏMİLƏR</span><b>{filteredShips.length}</b></div>
          <div className="dashboard-ship-list" role="listbox" aria-label="Nəqliyyatları göstəriləcək gəmini seçin">
            {filteredShips.map(ship => {
              const selected = activeShip?.id === ship.id
              return <button type="button" role="option" aria-selected={selected} className={selected ? 'selected' : ''} onClick={() => chooseShip(ship.id)} key={ship.id}>
                <span className="dashboard-ship-icon"><Ship /></span>
                <span className="dashboard-ship-name"><strong>{ship.ad}</strong><small>{ship.status} · {getShipDirection(ship)}</small></span>
                <span className="dashboard-ship-count"><strong>{vehicleCountByShip[ship.id] ?? 0}</strong><small>nəqliyyat</small></span>
                <ChevronRight />
              </button>
            })}
          </div>
        </section>

        <div className="selected-ship-summary"><div><small>SEÇİLMİŞ GƏMİ</small><strong>{activeShip?.ad ?? 'Gəmi yoxdur'}</strong></div><span><CarFront /> {queue.length} nəqliyyat</span></div>
        <div className="queue-tabs" role="tablist">{(['Hamısı', 'Gözləyən', 'Problemli', 'Buraxılıb'] as QueueFilter[]).map(filter => <button type="button" role="tab" aria-selected={queueFilter === filter} className={queueFilter === filter ? 'active' : ''} onClick={() => setQueueFilter(filter)} key={filter}>{filter}<b>{queue.filter(item => filter === 'Hamısı' || item.state === filter).length}</b></button>)}</div>
        <div className="vehicle-queue" aria-label={`${activeShip?.ad ?? 'Seçilmiş gəmi'} üzrə nəqliyyat vasitələri`}>{filteredQueue.length > 0 ? filteredQueue.map(({ vehicle, linked, state }, index) => <motion.button type="button" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index, 8) * .025 }} className={`${selectedItem?.vehicle.nomre === vehicle.nomre ? 'selected' : ''} ${state === 'Problemli' ? 'problem' : ''}`} onClick={() => chooseVehicle(vehicle.nomre, linked[0]?.kod)} key={`${vehicle.kod}-${index}`}>
          <span className={`queue-state ${state === 'Problemli' ? 'problem' : state === 'Buraxılıb' ? 'released' : 'waiting'}`}><CircleDot /></span><span className="vehicle-id"><strong>{vehicle.nomre}</strong><small>{vehicle.marka} · B/L {vehicle.billOfLading}</small></span><span className="vehicle-status"><b>{state}</b><small>{linked.length} sənəd</small></span><ChevronRight />
        </motion.button>) : <div className="vehicle-queue-empty"><CarFront /><strong>Nəqliyyat tapılmadı</strong><small>{queue.length === 0 ? 'Bu gəmiyə əlaqəli nəqliyyat vasitəsi yoxdur.' : `“${queueFilter}” statusunda nəqliyyat yoxdur.`}</small></div>}</div>

        {selectedItem && <section className="vehicle-context">
          <header><div><small>SEÇİLMİŞ NƏQLİYYAT</small><h3>{selectedItem.vehicle.nomre}</h3></div><StatusBadge status={selectedItem.state} /></header>
          <div className="manifest-ribbon"><span><Route /></span><div><small>Manifest · B/L {selectedItem.vehicle.billOfLading}</small><strong>{selectedItem.vehicle.yuk}</strong><em>{selectedItem.vehicle.menshe} → {selectedItem.vehicle.teyinat}</em></div><ShieldCheck /></div>
          <div className="declaration-selector"><label><FileText /> Gömrük bəyannamələri <b>{selectedItem.linked.length}</b></label>{selectedItem.linked.length > 0 ? <select value={activeDeclaration?.kod ?? ''} onChange={event => setSelectedDeclaration(event.target.value)}>{selectedItem.linked.map(item => <option value={item.kod} key={item.kod}>{item.kod} · {item.status}</option>)}</select> : <p>Bəyannamə hələ yaradılmayıb.</p>}</div>
          {activeDeclaration && <div className="declaration-preview"><div><small>Status</small><StatusBadge status={activeDeclaration.status} /></div><div><small>Mal</small><strong>{activeDeclaration.mallar[0]?.ad ?? '—'}</strong></div><div><small>Ümumi dəyər</small><strong>{activeDeclaration.umumiDeyer.toLocaleString('az-AZ')} {activeDeclaration.valyuta}</strong></div></div>}
          <button type="button" className="open-workflow" onClick={() => navigate(`/qeydiyyat?shipId=${selectedItem.vehicle.gemi}`)}><Clock3 /> Əməliyyatı davam etdir <ChevronRight /></button>
        </section>}
      </Card>
    </section>

    <Modal open={mapOpen} onClose={() => setMapOpen(false)} title="Gəmi mövqeləri · AIS / GPS" wide><div className="map-modal-body"><Suspense fallback={<div className="map-skeleton" />}><SeaMap visibleShips={filteredShips} /></Suspense></div></Modal>
  </>
}
