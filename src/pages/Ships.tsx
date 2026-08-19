import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity, BadgeCheck, Boxes, ChevronRight, CloudSun,
  Download, FileScan, Filter, MapPinned, Plus, RefreshCw, Search, ShieldAlert, Ship as ShipIcon,
  Users, Waves, Wind, X,
} from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import SeaMap from '../components/SeaMap'
import ShipScene3D from '../components/ShipScene3D'
import ShipDetailModal from '../components/ShipDetailModal'
import { Button, Card, Modal, PageHeader, StatusBadge } from '../components/UI'
import { agencies, portCalls, type PortCall } from '../data/operationalData'
import type { GemiIstiqameti } from '../data/mockData'
import { getAvailableShipStatuses, getShipDirection, getShipDirectionDisplayLabel, getShipMovementSummary, getShipOperationLabel, normalizeShipStatus } from '../domain/ships'
import { fetchAlatWeather, type LiveWeather } from '../services/liveData'
import './Ships.css'

const clearanceTone = { approved: 'approved', pending: 'pending', review: 'review' } as const
const shipStatuses = ['Lövbərdə', 'Yolda', 'Körpüdə'] as const
const shipDirections: GemiIstiqameti[] = ['Gələn', 'Gedən']

const normalizePortName = (value: string) => {
  const normalized = value.toLocaleLowerCase('az')
  if (normalized.includes('ələt') || normalized.includes('bakı beynəlxalq dəniz')) return 'Ələt'
  if (normalized.includes('aktau')) return 'Aktau'
  if (normalized.includes('kurık') || normalized.includes('kuryk')) return 'Kurık'
  if (normalized.includes('türkmənbaşı')) return 'Türkmənbaşı'
  return value.split(',')[0].replace(/\s+(dəniz\s+)?limanı.*$/i, '').trim()
}

const getShipPorts = (ship: { menshe: string; teyinat?: string }) => Array.from(new Set([
  normalizePortName(ship.menshe),
  ship.teyinat ? normalizePortName(ship.teyinat) : '',
].filter(Boolean)))

export default function Ships() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { ships, addShip } = useAppStore()

  const [q, setQ] = useState('')
  const [status, setStatus] = useState(() => {
    const urlStatus = searchParams.get('status')
    return shipStatuses.some(item => item === urlStatus) ? urlStatus! : 'Hamısı'
  })
  const [direction, setDirection] = useState<'Hamısı' | GemiIstiqameti>(() => {
    const urlDirection = searchParams.get('direction') as GemiIstiqameti | null
    return urlDirection && shipDirections.includes(urlDirection) ? urlDirection : 'Hamısı'
  })
  const [port, setPort] = useState('Hamısı')
  const [selectedShip, setSelectedShip] = useState<(typeof ships)[number] | null>(null)
  const [selectedCall, setSelectedCall] = useState<PortCall | null>(portCalls[0])
  const [opsQuery, setOpsQuery] = useState('')
  const [weather, setWeather] = useState<LiveWeather | null>(null)
  const [loading, setLoading] = useState(true)
  const [weatherModalOpen, setWeatherModalOpen] = useState(false)
  const [newShipModalOpen, setNewShipModalOpen] = useState(false)
  const [newShipName, setNewShipName] = useState('')
  const [newShipImo, setNewShipImo] = useState('')
  const [newShipType, setNewShipType] = useState('Ro-Ro gəmisi')
  const [newShipFlag, setNewShipFlag] = useState('Azərbaycan')
  const [newShipCargo, setNewShipCargo] = useState('Avtomobillər')
  const [newShipTonnage, setNewShipTonnage] = useState('9500')
  const [newShipStatus, setNewShipStatus] = useState<import('../data/mockData').GemiStatus>('Lövbərdə')
  const [newShipDirection, setNewShipDirection] = useState<GemiIstiqameti>('Gələn')
  const [newShipChannel, setNewShipChannel] = useState('Kanal 1')
  const [newShipSpeed, setNewShipSpeed] = useState('11.5')

  const newShipAvailableStatuses = useMemo(() => getAvailableShipStatuses(newShipDirection), [newShipDirection])

  const handleNewShipDirectionChange = (newDir: GemiIstiqameti) => {
    setNewShipDirection(newDir)
    setNewShipStatus(prev => normalizeShipStatus(prev, newDir))
  }

  const urlShipId = searchParams.get('id')
  useEffect(() => {
    if (urlShipId) {
      const match = ships.find(g => g.id === urlShipId)
      if (match) setSelectedShip(match)
    }
  }, [urlShipId, ships])

  const loadLiveData = async () => {
    setLoading(true)
    const weatherResult = await fetchAlatWeather().catch(() => null)
    if (weatherResult) setWeather(weatherResult)
    else toast.warning('Hava məlumatı yenilənmədi — son məlumat göstərilir')
    setLoading(false)
  }

  useEffect(() => { void loadLiveData() }, [])

  const portOptions = useMemo(() => {
    const ports = Array.from(new Set(ships.flatMap(getShipPorts)))
    const preferredOrder = ['Ələt', 'Aktau', 'Kurık', 'Türkmənbaşı']
    return ports
      .sort((a, b) => {
        const aIndex = preferredOrder.indexOf(a)
        const bIndex = preferredOrder.indexOf(b)
        if (aIndex !== -1 || bIndex !== -1) return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex)
        return a.localeCompare(b, 'az')
      })
      .map(name => ({ name, count: ships.filter(ship => getShipPorts(ship).includes(name)).length }))
  }, [ships])

  const availableFilterStatuses = useMemo(() => getAvailableShipStatuses(direction), [direction])

  const handleDirectionFilterChange = (newDir: 'Hamısı' | GemiIstiqameti) => {
    setDirection(newDir)
    if (newDir === 'Gedən' && status === 'Lövbərdə') {
      setStatus('Hamısı')
    }
  }

  const rows = useMemo(
    () => ships.filter(g =>
      (status === 'Hamısı' || g.status === status) &&
      (direction === 'Hamısı' || getShipDirection(g) === direction) &&
      (port === 'Hamısı' || getShipPorts(g).includes(port)) &&
      `${g.ad} ${g.id} ${g.yuk} ${g.menshe} ${g.teyinat ?? ''}`.toLocaleLowerCase('az').includes(q.toLocaleLowerCase('az')),
    ),
    [direction, port, q, status, ships],
  )

  const resetShipFilters = () => {
    setQ('')
    setStatus('Hamısı')
    setDirection('Hamısı')
    setPort('Hamısı')
  }

  const opsRows = useMemo(
    () => portCalls.filter(call =>
      `${call.id} ${call.vessel} ${call.callSign} ${call.imo} ${call.registrationNo}`
        .toLocaleLowerCase('az')
        .includes(opsQuery.toLocaleLowerCase('az')),
    ),
    [opsQuery],
  )

  const approvals = portCalls.flatMap(item => Object.values(item.clearances)).filter(item => item === 'approved').length
  const approvalRate = Math.round(approvals / (portCalls.length * 5) * 100)

  const handleCreateShip = (e: FormEvent) => {
    e.preventDefault()
    if (!newShipImo.startsWith('IMO')) {
      toast.error('IMO kodu "IMO" ilə başlamalıdır (məs: IMO9345678)')
      return
    }
    addShip({
      id: newShipImo,
      ad: newShipName,
      novu: newShipType,
      bayraq: newShipFlag,
      yuk: newShipCargo,
      tonaj: Number(newShipTonnage) || 0,
      status: newShipStatus,
      istiqamet: newShipDirection,
      kanal: newShipChannel,
      girisTarixi: new Date().toISOString().slice(0, 16).replace('T', ' '),
      cixisTarixi: '',
      menshe: newShipDirection === 'Gələn' ? 'Kurık, Qazaxıstan' : 'Ələt, Azərbaycan',
      teyinat: newShipDirection === 'Gələn' ? 'Ələt Limanı, Bakı' : 'Kurık Limanı, Qazaxıstan',
      lat: 40.0 + (Math.random() - 0.5) * 1.5,
      lng: 50.0 + (Math.random() - 0.5) * 1.5,
      suret: Number(newShipSpeed) || 0,
    })
    toast.success(`${newShipName} gəmisi uğurla əlavə edildi!`)
    setNewShipModalOpen(false)
    setNewShipName('')
    setNewShipImo('')
  }

  const exportCsv = () => {
    const header = 'Tip,ID,Gəmi,Status,İstiqamət,Əməliyyat,Detal,Tonaj/Risk\n'
    const shipLines = ships.map(g =>
      ['Gəmi', g.id, g.ad, g.status, getShipDirection(g), getShipOperationLabel(g), g.kanal, g.tonaj].map(v => `"${v}"`).join(','),
    )
    const callLines = portCalls.map(c =>
      ['PortCall', c.id, c.vessel, c.status, '', '', c.imo, c.riskScore].map(v => `"${v}"`).join(','),
    )
    const blob = new Blob([header + [...shipLines, ...callLines].join('\n')], { type: 'text/csv;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'gemi-emeliyyatlari.csv'
    link.click()
    toast.success('Birləşdirilmiş hesabat yükləndi')
  }

  const movementSummary = useMemo(() => getShipMovementSummary(ships), [ships])

  return <>
    <PageHeader
      title="Gəmi əməliyyat mərkəzi"
      action={
        <div className="header-actions">
          <button type="button" className="source-sync" onClick={() => void loadLiveData()}>
            <RefreshCw className={loading ? 'spin' : ''} />
            <span>{loading ? 'Sinxronlaşdırılır' : 'Məlumatları yenilə'}</span>
          </button>
          <Button variant="ghost" onClick={exportCsv}><Download /> Excel / CSV</Button>
          <Button onClick={() => setNewShipModalOpen(true)}><Plus /> Yeni gəmi</Button>
        </div>
      }
    />

    <section className="ops-live-strip">
      <article
        className="ops-live-weather"
        role="button"
        tabIndex={0}
        aria-label="Ələt hava şəraiti xəritəsini Windy widget-də aç"
        onClick={() => setWeatherModalOpen(true)}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            setWeatherModalOpen(true)
          }
        }}
      >
        <span className="ops-live-icon"><CloudSun /></span>
        <div>
          <small>Hava şəraiti: Ələt</small>
          <strong className="weather-primary-wind">
            <Wind />
            {weather ? (
              <>
                <span className="wind-speed-value">{weather.windSpeed}</span>
                <span className="wind-speed-unit">km/saat</span>
              </>
            ) : '—'}
          </strong>
          <em>Temperatur: {weather ? `${weather.temperature}°C` : '—'}</em>
          <span className="ops-live-click-hint">Windy xəritəsini aç</span>
        </div>
      </article>
      <article>
        <span className="ops-live-icon amber"><ShipIcon /></span>
        <div>
          <small>Gəmilər</small>
          <strong>{movementSummary.total}</strong>
          <em>{movementSummary.byStatus.Körpüdə.total} körpüdə · {movementSummary.byStatus.Lövbərdə.Gələn} lövbərdə (giriş) · {movementSummary.byStatus.Yolda.total} yolda</em>
        </div>
      </article>
      <article className="ops-live-compact">
        <span className="ops-live-icon violet"><Boxes /></span>
        <div>
          <small>Port kontrol müraciəti</small>
          <strong>{portCalls.length}</strong>
        </div>
      </article>
      <article>
        <span className="ops-live-icon green"><BadgeCheck /></span>
        <div>
          <small>Qurum təsdiqləri</small>
          <strong>{approvalRate}%</strong>
          <em>5 qurum üzrə</em>
        </div>
      </article>
    </section>

    <section className="ships-layout">
      <Card className="ship-table-card" hover={false}>
        <header className="ship-card-header">
          <div className="ship-card-title-row">
            <div className="ship-card-title-main">
              <span className="title-icon"><ShipIcon /></span>
              <div>
                <h2>Gəmilər</h2>
                <p>Xəzər dənizi akvatoriyasında aktiv və gözləmədə olan gəmilər</p>
              </div>
            </div>
            <span className="ship-card-count-badge"><strong>{rows.length}</strong> gəmi</span>
          </div>

          <div className="table-tools ships-table-tools">
            <label className="ships-search-input">
              <Search />
              <input placeholder="Gəmi adı, IMO və ya yük axtar..." value={q} onChange={e => setQ(e.target.value)} />
            </label>
            <select value={status} onChange={e => setStatus(e.target.value)} aria-label="Status üzrə filtr">
              <option value="Hamısı">Bütün statuslar</option>
              {availableFilterStatuses.map(st => <option value={st} key={st}>{st}</option>)}
            </select>
            <select value={direction} onChange={e => handleDirectionFilterChange(e.target.value as typeof direction)} aria-label="İstiqamət üzrə filtr">
              <option value="Hamısı">Bütün istiqamətlər</option>
              <option value="Gələn">Giriş</option>
              <option value="Gedən">Çıxış</option>
            </select>
            <label className="ships-port-filter">
              <MapPinned />
              <select value={port} onChange={e => setPort(e.target.value)} aria-label="Dəniz limanı üzrə filtr">
                <option value="Hamısı">Bütün limanlar ({ships.length})</option>
                {portOptions.map(item => <option value={item.name} key={item.name}>{item.name} ({item.count})</option>)}
              </select>
            </label>
            <button
              type="button"
              className="ships-reset-btn"
              onClick={resetShipFilters}
              aria-label="Bütün filtrləri sıfırla"
              title="Filtrləri sıfırla"
              disabled={!q && status === 'Hamısı' && direction === 'Hamısı' && port === 'Hamısı'}
            >
              <Filter />
            </button>
          </div>
        </header>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Gəmi / IMO</th>
                <th>Yük</th>
                <th>Status / istiqamət</th>
                <th>Kanal</th>
                <th>Marşrut</th>
                <th>Sürət</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(g => (
                <tr key={g.id} onClick={() => setSelectedShip(g)}>
                  <td>
                    <div className="ship-name">
                      <span><ShipIcon /></span>
                      <div><strong>{g.ad}</strong><small>{g.id} · {g.bayraq}</small></div>
                    </div>
                  </td>
                  <td><strong>{g.yuk}</strong><small>{g.tonaj.toLocaleString('az-AZ')} ton</small></td>
                  <td><StatusBadge status={g.status} /><small>{getShipOperationLabel(g)}</small></td>
                  <td>{g.kanal}</td>
                  <td><span className="ship-route-cell"><strong>{normalizePortName(g.menshe)}</strong><ChevronRight /><strong>{normalizePortName(g.teyinat ?? '—')}</strong></span></td>
                  <td>{g.suret} düyün</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty-table-cell">
                    Filtrə uyğun gəmi yoxdur
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="radar-panel" hover={false}>
        <header className="card-heading">
          <div>
            <span className="title-icon"><Waves /></span>
            <h2>Radar paneli</h2>
          </div>
        </header>
        <SeaMap visibleShips={rows} />
      </Card>
    </section>

    <section className={`ops-layout merged-ops-block${selectedCall ? '' : ' ops-layout-single'}`}>
      <Card className="ops-queue" hover={false}>
        <header className="ops-card-header">
          <div>
            <h2>Liman çağırışları</h2>
          </div>
          <label className="ops-search">
            <Search />
            <input value={opsQuery} onChange={e => setOpsQuery(e.target.value)} placeholder="Gəmi, IMO, qeydiyyat..." />
          </label>
        </header>
        <div className="ops-table-wrap">
          <table className="ops-table">
            <thead>
              <tr>
                <th>Gəmi</th>
                <th>ETA / ETD</th>
                <th>Status</th>
                <th>İcazələr</th>
                <th>Risk</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {opsRows.map((call, index) => (
                <motion.tr
                  key={call.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * .03 }}
                  className={selectedCall?.id === call.id ? 'selected' : ''}
                  onClick={() => setSelectedCall(call)}
                >
                  <td>
                    <div className="ops-vessel">
                      <span><ShipIcon /></span>
                      <div>
                        <strong>{call.vessel}</strong>
                        <small>#{call.id} · {call.callSign} · IMO {call.imo}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <strong>{call.eta.split(' ')[1] || call.eta}</strong>
                    <small>{call.eta.split(' ')[0] || '—'} → {call.etd.split(' ')[1] || call.etd}</small>
                  </td>
                  <td><StatusBadge status={call.status} /></td>
                  <td>
                    <div className="agency-dots">
                      {Object.entries(call.clearances).map(([agency, state]) => (
                        <i key={agency} className={clearanceTone[state]} title={`${agencies[agency as keyof typeof agencies].name}: ${state}`}>
                          {agency.slice(0, 1)}
                        </i>
                      ))}
                    </div>
                  </td>
                  <td>
                    <span className={`risk-meter ${call.riskScore > 35 ? 'high' : call.riskScore > 20 ? 'medium' : 'low'}`}>
                      <i style={{ width: `${Math.min(100, call.riskScore)}%` }} />
                      <b>{call.riskScore}</b>
                    </span>
                  </td>
                  <td><ChevronRight /></td>
                </motion.tr>
              ))}
              {opsRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty-table-cell">
                    Axtarışa uyğun liman çağırışı yoxdur
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <AnimatePresence mode="wait">
        {selectedCall && (
          <motion.aside
            key={selectedCall.id}
            className="ops-detail"
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
          >
            <Card hover={false}>
              <header className="detail-hero">
                <div>
                  <span className="detail-kicker">PORT CALL #{selectedCall.id}</span>
                  <h2>{selectedCall.vessel}</h2>
                  <p>{selectedCall.type} · {selectedCall.flag} · IMO {selectedCall.imo}</p>
                </div>
                <button type="button" onClick={() => setSelectedCall(null)} aria-label="Bağla"><X /></button>
              </header>
              <div className="ops-ship-visual">
                <ShipScene3D compact name={selectedCall.vessel} course="074°" />
              </div>
              <div className="detail-route">
                <article><small>Əvvəlki liman</small><strong>{selectedCall.previousPort}</strong></article>
                <span><i /><b>AZBAK</b><i /></span>
                <article><small>Növbəti liman</small><strong>{selectedCall.nextPort}</strong></article>
              </div>
              <div className="detail-metrics">
                <article>
                  <Users />
                  <span><small>Ekipaj / sərnişin</small><strong>{selectedCall.crew} / {selectedCall.passengers}</strong></span>
                </article>
                <article>
                  <Boxes />
                  <span><small>Yük / avtomobil</small><strong>{selectedCall.cargoTons.toLocaleString()} t / {selectedCall.vehicles}</strong></span>
                </article>
                <article>
                  <FileScan />
                  <span><small>Bəyannamə</small><strong>{selectedCall.declarations}</strong></span>
                </article>
              </div>
              <section className="clearance-panel">
                <header>
                  <div>
                    <ShieldAlert />
                    <span><strong>Qurumlararası icazələr</strong><small>Elektron təsdiq matrisi</small></span>
                  </div>
                  <b>{Object.values(selectedCall.clearances).filter(s => s === 'approved').length}/5</b>
                </header>
                {Object.entries(selectedCall.clearances).map(([agency, state]) => (
                  <div className="clearance-row" key={agency}>
                    <span className={`agency-logo ${state}`}>{agency}</span>
                    <div>
                      <strong>{agencies[agency as keyof typeof agencies].name}</strong>
                      <small>
                        {state === 'approved' ? 'Elektron təsdiq alınıb' : state === 'review' ? 'Əlavə yoxlama tələb olunur' : 'Qurum cavabı gözlənilir'}
                      </small>
                    </div>
                    <em className={state}>{state === 'approved' ? 'Təsdiq' : state === 'review' ? 'Yoxlama' : 'Gözləyir'}</em>
                  </div>
                ))}
              </section>
              <Button
                className="detail-primary"
                onClick={() => {
                  navigate(`/qeydiyyat?shipId=IMO${selectedCall.imo}&shipName=${encodeURIComponent(selectedCall.vessel)}`)
                  toast.success(`${selectedCall.vessel} üçün qeydiyyat başladı`)
                }}
              >
                <Activity /> Vahid əməliyyatı aç <ChevronRight />
              </Button>
            </Card>
          </motion.aside>
        )}
      </AnimatePresence>
    </section>

    <ShipDetailModal
      ship={selectedShip ? ships.find(ship => ship.id === selectedShip.id) ?? selectedShip : null}
      open={!!selectedShip}
      onClose={() => {
        setSelectedShip(null)
        if (urlShipId) setSearchParams({})
      }}
    />

    <Modal open={weatherModalOpen} onClose={() => setWeatherModalOpen(false)} title="Windy hava xəritəsi — Ələt" wide>
      <div className="windy-widget-body">
        <iframe
          title="Windy.com Ələt hava şəraiti widget-i"
          src="https://embed.windy.com/embed2.html?lat=39.99&lon=49.47&detailLat=39.99&detailLon=49.47&width=950&height=600&zoom=7&level=surface&overlay=wind&product=ecmwf&menu=&message=true&marker=true&calendar=now&pressure=true&type=map&location=coordinates&detail=true&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>
    </Modal>

    <Modal open={newShipModalOpen} onClose={() => setNewShipModalOpen(false)} title="Yeni gəmi əlavə et">
      <form onSubmit={handleCreateShip} className="new-ship-form">
        <label>Gəmi adı<input required value={newShipName} onChange={e => setNewShipName(e.target.value)} placeholder="Məsələn: Əli Həsənov" /></label>
        <label>IMO Kodu<input required value={newShipImo} onChange={e => setNewShipImo(e.target.value.toUpperCase())} placeholder="Məsələn: IMO9988776" /></label>
        <label>Növü<input required value={newShipType} onChange={e => setNewShipType(e.target.value)} /></label>
        <label>Bayraq<input required value={newShipFlag} onChange={e => setNewShipFlag(e.target.value)} /></label>
        <label>Yük növü<input required value={newShipCargo} onChange={e => setNewShipCargo(e.target.value)} /></label>
        <label>Tonaj (ton)<input type="number" required value={newShipTonnage} onChange={e => setNewShipTonnage(e.target.value)} /></label>
        <label>İstiqamət
          <select value={newShipDirection} onChange={e => handleNewShipDirectionChange(e.target.value as GemiIstiqameti)}>
            {shipDirections.map(item => <option value={item} key={item}>{getShipDirectionDisplayLabel(item)}</option>)}
          </select>
        </label>
        <label>Status
          <select value={newShipStatus} onChange={e => setNewShipStatus(e.target.value as typeof newShipStatus)}>
            {newShipAvailableStatuses.map(st => <option value={st} key={st}>{st}</option>)}
          </select>
        </label>
        <label>Kanal<input required value={newShipChannel} onChange={e => setNewShipChannel(e.target.value)} /></label>
        <label>Sürət (düyün)<input type="number" step="0.1" required value={newShipSpeed} onChange={e => setNewShipSpeed(e.target.value)} /></label>
        <div className="new-ship-form-actions">
          <Button type="button" variant="ghost" onClick={() => setNewShipModalOpen(false)}>Ləğv et</Button>
          <Button type="submit"><Plus /> Əlavə et</Button>
        </div>
      </form>
    </Modal>
  </>
}
