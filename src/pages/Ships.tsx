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
import { fetchAlatWeather, type LiveWeather } from '../services/liveData'
import './Ships.css'

const clearanceTone = { approved: 'approved', pending: 'pending', review: 'review' } as const

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
  const [status, setStatus] = useState('Hamısı')
  const [port, setPort] = useState('Hamısı')
  const [selectedShip, setSelectedShip] = useState<(typeof ships)[number] | null>(null)
  const [selectedCall, setSelectedCall] = useState<PortCall | null>(portCalls[0])
  const [opsQuery, setOpsQuery] = useState('')
  const [weather, setWeather] = useState<LiveWeather | null>(null)
  const [loading, setLoading] = useState(true)
  const [newShipModalOpen, setNewShipModalOpen] = useState(false)
  const [newShipName, setNewShipName] = useState('')
  const [newShipImo, setNewShipImo] = useState('')
  const [newShipType, setNewShipType] = useState('Ro-Ro gəmisi')
  const [newShipFlag, setNewShipFlag] = useState('Azərbaycan')
  const [newShipCargo, setNewShipCargo] = useState('Avtomobillər')
  const [newShipTonnage, setNewShipTonnage] = useState('9500')
  const [newShipStatus, setNewShipStatus] = useState<'Lövbərdə' | 'Yolda' | 'Körpüdə'>('Lövbərdə')
  const [newShipChannel, setNewShipChannel] = useState('Kanal 1')
  const [newShipSpeed, setNewShipSpeed] = useState('11.5')

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

  const rows = useMemo(
    () => ships.filter(g =>
      (status === 'Hamısı' || g.status === status) &&
      (port === 'Hamısı' || getShipPorts(g).includes(port)) &&
      `${g.ad} ${g.id} ${g.yuk} ${g.menshe} ${g.teyinat ?? ''}`.toLocaleLowerCase('az').includes(q.toLocaleLowerCase('az')),
    ),
    [port, q, status, ships],
  )

  const resetShipFilters = () => {
    setQ('')
    setStatus('Hamısı')
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

  const totalCargo = portCalls.reduce((sum, item) => sum + item.cargoTons, 0)
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
      kanal: newShipChannel,
      girisTarixi: new Date().toISOString().slice(0, 16).replace('T', ' '),
      cixisTarixi: '',
      menshe: 'Kurık, Qazaxıstan',
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
    const header = 'Tip,ID,Gəmi,Status,Detal,Tonaj/Risk\n'
    const shipLines = ships.map(g =>
      ['AIS', g.id, g.ad, g.status, g.kanal, g.tonaj].map(v => `"${v}"`).join(','),
    )
    const callLines = portCalls.map(c =>
      ['PortCall', c.id, c.vessel, c.status, c.imo, c.riskScore].map(v => `"${v}"`).join(','),
    )
    const blob = new Blob([header + [...shipLines, ...callLines].join('\n')], { type: 'text/csv;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'gemi-emeliyyatlari.csv'
    link.click()
    toast.success('Birləşdirilmiş hesabat yükləndi')
  }

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
      <article>
        <span className="ops-live-icon"><CloudSun /></span>
        <div>
          <small>Hava şəraiti: Ələt</small>
          <strong>{weather ? `${weather.temperature}°C` : '—'}</strong>
          <em><Wind /> {weather ? `${weather.windSpeed} km/saat` : '—'}</em>
        </div>
      </article>
      <article>
        <span className="ops-live-icon amber"><ShipIcon /></span>
        <div>
          <small>AIS gəmilər</small>
          <strong>{ships.length}</strong>
          <em>{ships.filter(s => s.status === 'Körpüdə').length} körpüdə</em>
        </div>
      </article>
      <article>
        <span className="ops-live-icon violet"><Boxes /></span>
        <div>
          <small>Port çağırış / yük</small>
          <strong>{portCalls.length}</strong>
          <em>{totalCargo.toLocaleString('az-AZ', { maximumFractionDigits: 0 })} t</em>
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
      <Card className="radar-panel" hover={false}>
        <header className="card-heading">
          <div>
            <span className="title-icon"><Waves /></span>
            <h2>AIS radar paneli</h2>
          </div>
        </header>
        <SeaMap visibleShips={rows} />
      </Card>

      <Card className="ship-table-card" hover={false}>
        <header>
          <h2>AIS gəmilər · {rows.length}</h2>
          <div className="table-tools ships-table-tools">
            <label><Search /><input placeholder="Gəmi axtar..." value={q} onChange={e => setQ(e.target.value)} /></label>
            <select value={status} onChange={e => setStatus(e.target.value)} aria-label="Status üzrə filtr">
              <option value="Hamısı">Bütün statuslar</option>
              <option>Lövbərdə</option>
              <option>Yolda</option>
              <option>Körpüdə</option>
            </select>
            <label className="ships-port-filter"><MapPinned /><select value={port} onChange={e => setPort(e.target.value)} aria-label="Dəniz limanı üzrə filtr">
              <option value="Hamısı">Bütün limanlar ({ships.length})</option>
              {portOptions.map(item => <option value={item.name} key={item.name}>{item.name} ({item.count})</option>)}
            </select></label>
            <button type="button" onClick={resetShipFilters} aria-label="Bütün filtrləri sıfırla" disabled={!q && status === 'Hamısı' && port === 'Hamısı'}><Filter /></button>
          </div>
        </header>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Gəmi / IMO</th>
                <th>Yük</th>
                <th>Status</th>
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
                  <td><StatusBadge status={g.status} /></td>
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
    </section>

    <section className={`ops-layout merged-ops-block${selectedCall ? '' : ' ops-layout-single'}`}>
      <Card className="ops-queue" hover={false}>
        <header className="ops-card-header">
          <div>
            <h2>Liman çağırışları · VAİS</h2>
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
      ship={selectedShip}
      open={!!selectedShip}
      onClose={() => {
        setSelectedShip(null)
        if (urlShipId) setSearchParams({})
      }}
    />

    <Modal open={newShipModalOpen} onClose={() => setNewShipModalOpen(false)} title="Yeni gəmi əlavə et">
      <form onSubmit={handleCreateShip} className="new-ship-form">
        <label>Gəmi adı<input required value={newShipName} onChange={e => setNewShipName(e.target.value)} placeholder="Məsələn: Əli Həsənov" /></label>
        <label>IMO Kodu<input required value={newShipImo} onChange={e => setNewShipImo(e.target.value.toUpperCase())} placeholder="Məsələn: IMO9988776" /></label>
        <label>Növü<input required value={newShipType} onChange={e => setNewShipType(e.target.value)} /></label>
        <label>Bayraq<input required value={newShipFlag} onChange={e => setNewShipFlag(e.target.value)} /></label>
        <label>Yük növü<input required value={newShipCargo} onChange={e => setNewShipCargo(e.target.value)} /></label>
        <label>Tonaj (ton)<input type="number" required value={newShipTonnage} onChange={e => setNewShipTonnage(e.target.value)} /></label>
        <label>Status
          <select value={newShipStatus} onChange={e => setNewShipStatus(e.target.value as typeof newShipStatus)}>
            <option value="Lövbərdə">Lövbərdə</option>
            <option value="Yolda">Yolda</option>
            <option value="Körpüdə">Körpüdə</option>
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
