import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Anchor, ArrowRight, Award, CheckCircle2, ChevronRight, Clock,
  Copy, ExternalLink, FileCheck, FileText, Filter, Globe, Info,
  Layers, MapPin, Navigation, Scale, Search, Shield, ShieldAlert,
  ShieldCheck, Ship, Sparkles, Truck, Users, Warehouse, X,
} from 'lucide-react'
import { toast } from 'sonner'
import { beyannameler, type gemiler, type GemiIstiqameti, type GemiStatus } from '../data/mockData'
import { getAvailableShipStatuses, getShipDirection, getShipOperationLabel, normalizeShipStatus, SHIP_DIRECTIONS, SHIP_STATUSES } from '../domain/ships'
import { agencies } from '../data/operationalData'
import { useAppStore } from '../store/useAppStore'
import { Button, Modal, StatusBadge } from './UI'

type ShipItem = (typeof gemiler)[number]

type Props = {
  ship: ShipItem | null
  open: boolean
  onClose: () => void
}

type TabKey = 'manifest' | 'cargo' | 'vehicles' | 'clearance'

const WAIT_REASONS = [
  'Fiziki yoxlama',
  'X-Ray / Rentgen baxışı',
  'Kinoloji xidmət (itlə yoxlama)',
  'Sənəd çatışmazlığı / Dəqiqləşdirmə',
  'AQTA fitosanitar / baytarlıq rəyi',
  'Gömrük dəyərinin dəqiqləşdirilməsi',
  'Yol vergisinin ödənilməsi',
] as const

const agencyNameMap: Record<string, string> = {
  DGK: 'Dövlət Gömrük Komitəsi',
  DSX: 'Dövlət Sərhəd Xidməti',
  DDA: 'Dövlət Dəniz Agentliyi',
  AQTA: 'Qida Təhlükəsizliyi Agentliyi',
  FHN: 'Fövqəladə Hallar Nazirliyi',
}

export default function ShipDetailModal({ ship, open, onClose }: Props) {
  const navigate = useNavigate()
  const updateShip = useAppStore(state => state.updateShip)
  const vehicles = useAppStore(state => state.vehicles)
  const updateVehicle = useAppStore(state => state.updateVehicle)
  const [activeTab, setActiveTab] = useState<TabKey>('manifest')
  const [vehicleFilter, setVehicleFilter] = useState<'Hamısı' | 'Buraxılış' | 'Gözləmədə' | 'Risk / Digər'>('Hamısı')
  const [vehicleQuery, setVehicleQuery] = useState('')

  if (!ship) return null

  const copyManifest = () => {
    const text = ship.manifestNo || ship.billOfLading || ship.id
    void navigator.clipboard?.writeText(text)
    toast.success(`Sənəd nömrəsi kopyalandı: ${text}`)
  }

  const copyImo = () => {
    void navigator.clipboard?.writeText(ship.id)
    toast.success(`IMO kodu kopyalandı: ${ship.id}`)
  }

  // Gəmiyə bağlı avtomobillər
  const shipVehicles = vehicles.filter(v => v.gemi === ship.id || (ship.id === 'IMO9834210' && (v.nomre.includes('1234') || v.nomre.includes('DG'))))
  const allVehiclesForShip = shipVehicles.length > 0 ? shipVehicles : vehicles.slice(0, 4)

  const displayedVehicles = allVehiclesForShip.filter(v => {
    const q = vehicleQuery.trim().toLowerCase()
    const matchesQ = !q || `${v.nomre} ${v.marka} ${v.surucu} ${v.yuk} ${v.billOfLading || ''} ${v.vehicleOrder || ''}`.toLowerCase().includes(q)
    if (!matchesQ) return false
    if (vehicleFilter === 'Buraxılış') return v.status === 'Buraxıldı' || v.status.includes('Təsdiq')
    if (vehicleFilter === 'Gözləmədə') return v.status === 'Gözləmədə' || v.status.includes('Gözlə')
    if (vehicleFilter === 'Risk / Digər') return v.status === 'Risk nəzarəti' || v.status === 'Qeydiyyatda' || v.status === 'Yoxlanılır'
    return true
  })

  const vehicleStats = {
    total: allVehiclesForShip.length,
    approved: allVehiclesForShip.filter(v => v.status === 'Buraxıldı' || v.status.includes('Təsdiq')).length,
    waiting: allVehiclesForShip.filter(v => v.status === 'Gözləmədə' || v.status.includes('Gözlə')).length,
    other: allVehiclesForShip.filter(v => v.status !== 'Buraxıldı' && !v.status.includes('Təsdiq') && v.status !== 'Gözləmədə' && !v.status.includes('Gözlə')).length,
  }

  const handleVehicleStatusChange = (plate: string, nextStatus: string) => {
    if (nextStatus === 'Gözləmədə') {
      const current = vehicles.find(v => v.nomre === plate)
      const reason = (current as any)?.waitReason || 'Fiziki yoxlama'
      updateVehicle(plate, { status: 'Gözləmədə', waitReason: reason })
      toast.warning(`${plate} statusu 'Gözləmədə' olaraq yeniləndi (${reason})`)
    } else if (nextStatus === 'Buraxılış təsdiq olundu' || nextStatus === 'Buraxıldı') {
      updateVehicle(plate, { status: 'Buraxıldı', waitReason: undefined })
      toast.success(`${plate}: Buraxılış statusu təsdiqləndi ✅`)
    } else if (nextStatus === 'Risk nəzarəti') {
      updateVehicle(plate, { status: 'Risk nəzarəti' })
      toast.error(`${plate}: Risk nəzarəti kanalına yönləndirildi ⚠️`)
    } else {
      updateVehicle(plate, { status: nextStatus })
      toast.info(`${plate} statusu: ${nextStatus}`)
    }
  }

  const handleVehicleReasonChange = (plate: string, nextReason: string) => {
    updateVehicle(plate, { status: 'Gözləmədə', waitReason: nextReason })
    toast.info(`${plate} üçün gözləmə səbəbi: ${nextReason}`)
  }

  // Gəmiyə bağlı bəyannamələr
  const shipDeclarations = beyannameler.filter(b => b.gemiId === ship.id || displayedVehicles.some(v => v.nomre === b.avtomobil))
  const displayedDeclarations = shipDeclarations.length > 0 ? shipDeclarations : beyannameler.slice(0, 3)

  return (
    <Modal open={open} onClose={onClose} title="" wide>
      <div className="ship-full-detail">
        {/* Header Strip */}
        <header className="ship-full-hero">
          <div className="ship-hero-main">
            <span className="ship-avatar-icon">
              <Ship />
            </span>
            <div className="ship-hero-text">
              <div className="ship-hero-topline">
                <span className="ship-type-tag">{ship.novu}</span>
                <span className="ship-flag-tag">🚩 {ship.bayraq}</span>
                <span className="ship-callsign-tag">Manifest: {ship.manifestNo || 'MNF-637'} · B/L: {ship.billOfLading || 'BL-637'}</span>
              </div>
              <h2>{ship.ad}</h2>
              <p className="ship-hero-sub">
                <button type="button" className="imo-copy-btn" onClick={copyImo} title="Kopyala">
                  IMO: <strong>{ship.id}</strong> <Copy size={11} />
                </button>
                <span>·</span>
                <span>Sahibi: <strong>{ship.sahib || 'ASCO (Azərbaycan Xəzər Dəniz Gəmiçiliyi QSC)'}</strong></span>
                <span>·</span>
                <span>Kapitan: <strong>{ship.kapitan || 'R. Əliyev'}</strong></span>
              </p>
            </div>
          </div>

          {(() => {
            const currentDirection = getShipDirection(ship)
            const availableStatuses = getAvailableShipStatuses(currentDirection)

            const handleModalDirectionChange = (newDir: GemiIstiqameti) => {
              const nextStatus = normalizeShipStatus(ship.status, newDir)
              updateShip(ship.id, { istiqamet: newDir, status: nextStatus })
              if (newDir === 'Gedən' && ship.status === 'Lövbərdə') {
                toast.info(`${ship.ad}: Çıxış istiqamətində lövbər statusu olmadığından status 'Körpüdə' olaraq yeniləndi`)
              }
            }

            return (
              <div className="ship-hero-controls-cluster">
                <div className="ship-quick-selects">
                  <label>
                    <small>İstiqamət</small>
                    <select value={currentDirection} onChange={event => handleModalDirectionChange(event.target.value as GemiIstiqameti)}>
                      {SHIP_DIRECTIONS.map(direction => <option value={direction} key={direction}>{direction}</option>)}
                    </select>
                  </label>
                  <label>
                    <small>Mövqe statusu</small>
                    <select value={ship.status} onChange={event => updateShip(ship.id, { status: event.target.value as GemiStatus })}>
                      {availableStatuses.map(status => <option value={status} key={status}>{status}</option>)}
                    </select>
                  </label>
                </div>

                <div className="ship-hero-status-row">
                  <StatusBadge status={ship.status} />
                  <strong className="ship-operation-label">{getShipOperationLabel(ship)}</strong>
                  <span className={`ship-risk-badge ${ship.riskDerecesi === 'Yüksək' ? 'high' : ship.riskDerecesi === 'Orta' ? 'medium' : 'low'}`}>
                    <ShieldCheck size={13} /> {ship.riskDerecesi || 'Aşağı'} risk
                  </span>
                </div>
              </div>
            )
          })()}
        </header>

        {/* Tab Navigation */}
        <nav className="ship-detail-tabs" role="tablist" aria-label="Gəmi məlumat bölmələri">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'manifest'}
            className={activeTab === 'manifest' ? 'active' : ''}
            onClick={() => setActiveTab('manifest')}
          >
            <FileText size={15} />
            <span>Dəniz Manifesti & B/L</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'cargo'}
            className={activeTab === 'cargo' ? 'active' : ''}
            onClick={() => setActiveTab('cargo')}
          >
            <Warehouse size={15} />
            <span>Yük & Çəki Spesifikasiyası</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'vehicles'}
            className={activeTab === 'vehicles' ? 'active' : ''}
            onClick={() => setActiveTab('vehicles')}
          >
            <Truck size={15} />
            <span>Göyərtədəki TIR-lar & CMR ({displayedVehicles.length})</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'clearance'}
            className={activeTab === 'clearance' ? 'active' : ''}
            onClick={() => setActiveTab('clearance')}
          >
            <ShieldCheck size={15} />
            <span>Vahid Pəncərə & Gömrük</span>
          </button>
        </nav>

        {/* Tab Content Panels */}
        <div className="ship-tab-panel">
          {/* TAB 1: DƏNİZ MANİFESTİ VƏ KONOSAMENT (BILL OF LADING) */}
          {activeTab === 'manifest' && (
            <div className="ship-grid-two">
              <section className="ship-card-section">
                <h3><FileCheck size={15} /> Rəsmi Konosament Məlumatları (Bill of Lading)</h3>
                <dl className="ship-metrics-grid">
                  <div>
                    <dt>Konosament Nömrəsi (B/L)</dt>
                    <dd className="accent-num">
                      <strong>{ship.billOfLading || 'BL-637'}</strong>
                      <button type="button" onClick={copyManifest} title="Kopyala" style={{ marginLeft: 6, background: 'none', border: 'none', cursor: 'pointer', opacity: 0.7 }}>
                        <Copy size={12} />
                      </button>
                    </dd>
                  </div>
                  <div>
                    <dt>Giriş Manifest Nömrəsi</dt>
                    <dd><strong>{ship.manifestNo || 'MNF-637'}</strong></dd>
                  </div>
                  <div>
                    <dt>Orijinal Konosament Sayı</dt>
                    <dd><strong>{ship.originalBlSayi || 5} nüsxə (Original)</strong></dd>
                  </div>
                  <div>
                    <dt>Daşıma və Ödəniş Şərti</dt>
                    <dd><span className="live-pill"><i /> {ship.dasimaQeydi || 'Clean on board · Freight prepaid'}</span></dd>
                  </div>
                  <div>
                    <dt>Gəmi Sahibi / Operator</dt>
                    <dd><strong>{ship.sahib || 'LLC "ALPHA"'}</strong></dd>
                  </div>
                  <div>
                    <dt>Ekspeditor / Forwarder</dt>
                    <dd><strong>{ship.ekspeditor || 'Pace North Co Inc.'}</strong></dd>
                  </div>
                  <div>
                    <dt>Gəmi Kapitanı</dt>
                    <dd><strong>{ship.kapitan || 'Master of «Альфа Меркурий»'}</strong></dd>
                  </div>
                  <div>
                    <dt>Gömrük Buraxılış Qeydi</dt>
                    <dd><strong>{ship.gomrukMohuru || 'RUGSAT BERILDI (TDSG №15)'}</strong></dd>
                  </div>
                </dl>
              </section>

              <section className="ship-card-section">
                <h3><MapPin size={15} /> Marşrut və Liman Zənciri</h3>
                <div className="voyage-strip">
                  <div className="voyage-port">
                    <small>YÜKLƏMƏ LİMANI</small>
                    <strong>{ship.menshe}</strong>
                    <span>Tarix: {ship.girisTarixi.replace('T', ' ')}</span>
                  </div>
                  <div className="voyage-connector">
                    <i />
                    <span>{ship.status === 'Lövbərdə' ? 'Lövbərdə' : ship.status === 'Körpüdə' ? 'Körpüdə' : 'Tranzitdə'}</span>
                    <i />
                  </div>
                  <div className="voyage-port text-right">
                    <small>BOŞALTMA LİMANI (ƏLƏT)</small>
                    <strong>{ship.teyinat}</strong>
                    <span>ETA: {ship.cixisTarixi ? ship.cixisTarixi.replace('T', ' ') : '—'}</span>
                  </div>
                </div>

                <div className="voyage-stats">
                  <div>
                    <small>Son Təyinat Yeri</small>
                    <strong>{ship.sonTeyinat || 'BƏƏ (Dubay / UAE)'}</strong>
                  </div>
                  <div>
                    <small>Gömrük Postu</small>
                    <strong>13005 Beynəlxalq Liman g/p</strong>
                  </div>
                  <div>
                    <small>Yanalma Körpüsü</small>
                    <strong>{ship.kanal}</strong>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* TAB 2: YÜK VƏ ÇƏKİ SPESİFİKASİYASI */}
          {activeTab === 'cargo' && (
            <div className="ship-grid-two">
              <section className="ship-card-section">
                <h3><Warehouse size={15} /> Manifest Yükü və Faktiki Çəki</h3>
                <dl className="ship-metrics-grid">
                  <div>
                    <dt>Daşınan Yükün Təsviri</dt>
                    <dd><strong>{ship.yuk}</strong></dd>
                  </div>
                  <div>
                    <dt>Faktiki Brutto Çəki</dt>
                    <dd className="accent-num">
                      <strong>
                        {ship.tonaj > 1000 ? `${(ship.tonaj / 1000).toFixed(1)} t` : `${ship.tonaj.toLocaleString('az-AZ')} MTS`}
                      </strong>
                    </dd>
                  </div>
                  <div>
                    <dt>Yükləmə Növü</dt>
                    <dd><strong>{ship.yuk.includes('kükürd') ? 'Topa (Bulk) / Quru yük' : ship.yuk.includes('TIR') ? 'Ro-Ro Nəqliyyat' : 'Konteyner'}</strong></dd>
                  </div>
                  <div>
                    <dt>Gömrük Marşrutu</dt>
                    <dd><strong>00204 Qırmızı körpü / 00502 Mazımqara → 13005 Ələt g/p</strong></dd>
                  </div>
                  <div>
                    <dt>Bəyannamə Sayı</dt>
                    <dd><strong>{ship.beyannameSayi || displayedDeclarations.length} ədəd</strong></dd>
                  </div>
                  <div>
                    <dt>Bəyannamə Rejimi</dt>
                    <dd><strong>İD 80 (Tranzit / İdxal rejimi)</strong></dd>
                  </div>
                </dl>
              </section>

              <section className="ship-card-section">
                <h3><FileText size={15} /> Əlaqəli Gömrük Bəyannamələri</h3>
                <div className="cargo-decl-summary">
                  <div className="cargo-decl-stat">
                    <span>Cəmi Bəyannamə</span>
                    <strong>{ship.beyannameSayi || displayedDeclarations.length}</strong>
                  </div>
                  <div className="cargo-decl-stat green">
                    <span>Təsdiqlənmiş</span>
                    <strong>{displayedDeclarations.filter(d => d.status === 'Təsdiqlənib').length || 2}</strong>
                  </div>
                  <div className="cargo-decl-stat amber">
                    <span>Gömrük Nəzarəti</span>
                    <strong>{displayedDeclarations.filter(d => d.status !== 'Təsdiqlənib').length || 1}</strong>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* TAB 3: GÖYƏRTƏDƏKİ TIR-LAR VƏ CMR QAİMƏLƏRİ */}
          {activeTab === 'vehicles' && (
            <section className="ship-card-section">
              <div className="tir-section-header">
                <div className="tir-section-title">
                  <h3><Truck size={15} /> Sənədlər Üzrə Rəsmi Nəqliyyat Vasitələri və CMR Qaimələri</h3>
                  <small>Gəmi göyərtəsindəki TIR-ların canlı status və gözləmə səbəbi idarəetməsi:</small>
                </div>
                <div className="cargo-decl-summary" style={{ gap: 6 }}>
                  <div className="cargo-decl-stat" style={{ padding: '4px 8px' }}>
                    <span style={{ fontSize: 7.5 }}>Cəmi TIR</span>
                    <strong style={{ fontSize: 13 }}>{vehicleStats.total}</strong>
                  </div>
                  <div className="cargo-decl-stat green" style={{ padding: '4px 8px' }}>
                    <span style={{ fontSize: 7.5 }}>Buraxılış Təsdiq</span>
                    <strong style={{ fontSize: 13 }}>{vehicleStats.approved}</strong>
                  </div>
                  <div className="cargo-decl-stat amber" style={{ padding: '4px 8px' }}>
                    <span style={{ fontSize: 7.5 }}>Gözləmədə</span>
                    <strong style={{ fontSize: 13 }}>{vehicleStats.waiting}</strong>
                  </div>
                </div>
              </div>

              {/* Toolbar: Axtarış və Status filterləri */}
              <div className="tir-filter-toolbar">
                <div className="tir-search-box">
                  <Search />
                  <input
                    placeholder="TIR nömrəsi, sürücü, yük və ya B/L axtar..."
                    value={vehicleQuery}
                    onChange={e => setVehicleQuery(e.target.value)}
                  />
                  {vehicleQuery && (
                    <button type="button" onClick={() => setVehicleQuery('')} style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--muted)', display: 'grid', placeItems: 'center', padding: 0 }}>
                      <X size={12} />
                    </button>
                  )}
                </div>
                <div className="tir-filter-tabs" role="tablist">
                  {(['Hamısı', 'Buraxılış', 'Gözləmədə', 'Risk / Digər'] as const).map(tab => (
                    <button
                      type="button"
                      key={tab}
                      className={vehicleFilter === tab ? 'active' : ''}
                      onClick={() => setVehicleFilter(tab)}
                    >
                      {tab === 'Buraxılış' ? `Buraxılış (${vehicleStats.approved})` : tab === 'Gözləmədə' ? `Gözləmədə (${vehicleStats.waiting})` : tab === 'Hamısı' ? `Hamısı (${vehicleStats.total})` : `Risk / Digər (${vehicleStats.other})`}
                    </button>
                  ))}
                </div>
              </div>

              {/* TIR Kartları */}
              <div className="tir-cards-grid">
                {displayedVehicles.map((v, i) => {
                  const isApproved = v.status === 'Buraxıldı' || v.status.includes('Təsdiq')
                  const isWaiting = v.status === 'Gözləmədə' || v.status.includes('Gözlə')
                  const isRisk = v.status === 'Risk nəzarəti'
                  const currentReason = (v as any).waitReason || 'Fiziki yoxlama'

                  return (
                    <article key={v.kod || v.nomre || i} className="tir-manage-card">
                      <div className="tir-manage-header">
                        <div className="tir-plate-group">
                          <span className="tir-plate-badge">{v.nomre}</span>
                          <span className="tir-model-tag">{v.marka}</span>
                        </div>
                        {(v as any).ceki && <span className="tir-weight-tag"><Scale size={11} /> {(v as any).ceki}</span>}
                      </div>

                      <div className="tir-info-grid">
                        <div><strong>Yük:</strong> <span>{v.yuk}</span></div>
                        <div><strong>Sürücü:</strong> <span>{v.surucu}</span></div>
                        <div><strong>Marşrut:</strong> <span>{v.menshe} → {v.teyinat}</span></div>
                        <div><strong>Sənəd:</strong> <span>B/L: {v.billOfLading || '—'} {v.vehicleOrder ? `· Order: ${v.vehicleOrder}` : ''}</span></div>
                      </div>

                      {/* Status & Səbəb İdarəetmə Paneli */}
                      <div className="tir-status-manager">
                        <div className="tir-status-row">
                          <div className="tir-status-select-wrap">
                            <label className="tir-field-label">Cari Status</label>
                            <select
                              className={`tir-status-dropdown ${isApproved ? 'approved' : isWaiting ? 'waiting' : isRisk ? 'danger' : ''}`}
                              value={isApproved ? 'Buraxılış təsdiq olundu' : isWaiting ? 'Gözləmədə' : isRisk ? 'Risk nəzarəti' : 'Qeydiyyatda'}
                              onChange={e => handleVehicleStatusChange(v.nomre, e.target.value)}
                            >
                              <option value="Buraxılış təsdiq olundu">🟢 Buraxılış təsdiq olunan</option>
                              <option value="Gözləmədə">🟡 Gözləmə (Səbəbi ilə)</option>
                              <option value="Risk nəzarəti">🔴 Risk nəzarəti</option>
                              <option value="Qeydiyyatda">🔵 Qeydiyyatda</option>
                            </select>
                          </div>

                          <button
                            type="button"
                            className="tir-open-reg-btn"
                            onClick={() => {
                              onClose()
                              navigate(`/qeydiyyat?plate=${encodeURIComponent(v.nomre)}&shipId=${ship.id}`)
                            }}
                            title="Vahid Qeydiyyat pəncərəsində tam rəsmiləşdirmə"
                          >
                            <span>Qeydiyyat</span>
                            <ChevronRight size={13} />
                          </button>
                        </div>

                        {/* Gözləmədə olduqda səbəb seçimi */}
                        {isWaiting && (
                          <div className="tir-wait-reason-box">
                            <div className="tir-wait-reason-head">
                              <Clock size={12} />
                              <span>Gözləmə səbəbi:</span>
                            </div>
                            <select
                              className="tir-reason-select"
                              value={currentReason}
                              onChange={e => handleVehicleReasonChange(v.nomre, e.target.value)}
                            >
                              {WAIT_REASONS.map(reason => (
                                <option value={reason} key={reason}>⏳ {reason}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>

              {displayedVehicles.length === 0 && (
                <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--muted)', fontSize: 11 }}>
                  Axtarışa və ya filtrə uyğun nəqliyyat vasitəsi tapılmadı.
                </div>
              )}
            </section>
          )}

          {/* TAB 4: VAHİD PƏNCƏRƏ VƏ GÖMRÜK ÖDƏNİŞLƏRİ */}
          {activeTab === 'clearance' && (
            <div className="ship-grid-two">
              <section className="ship-card-section">
                <h3><ShieldCheck size={15} /> Vahid Pəncərə Dövlət Nəzarət Qurumları Təsdiqi</h3>
                <p className="section-hint">Liman və gömrük akvatoriyasına giriş üçün aidiyyəti qurumların elektron rəy statusu:</p>

                <div className="clearances-grid">
                  {Object.entries(ship.clearances || {
                    DGK: 'approved',
                    DSX: 'approved',
                    DDA: 'approved',
                    AQTA: 'approved',
                    FHN: 'approved',
                  }).map(([agencyCode, state]) => {
                    const info = agencies[agencyCode as keyof typeof agencies] || { short: agencyCode, name: agencyNameMap[agencyCode] || agencyCode }
                    const isApproved = state === 'approved'
                    const isReview = state === 'review'

                    return (
                      <article key={agencyCode} className={`clearance-agency-card ${state}`}>
                        <div className="agency-icon-wrap">
                          <span className="agency-badge-code">{info.short}</span>
                        </div>
                        <div className="agency-content">
                          <strong>{info.name}</strong>
                          <small>
                            {isApproved
                              ? 'Elektron icazə verildi · Sistem inteqrasiyası aktiv'
                              : isReview
                              ? 'Əlavə sənəd və laboratoriya yoxlaması tələb olunur'
                              : 'Müraciət icradadır · Rəy gözlənilir'}
                          </small>
                        </div>
                        <div className="agency-status-pill">
                          <em className={state}>
                            {isApproved ? 'Təsdiqləndi' : isReview ? 'Yoxlama' : 'Gözləyir'}
                          </em>
                        </div>
                      </article>
                    )
                  })}
                </div>
              </section>

              <section className="ship-card-section">
                <h3><FileCheck size={15} /> Rəsmi Bəyannaməçi və Gömrük Ödənişləri</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ padding: 10, borderRadius: 6, background: 'var(--bg-accent, rgba(0,0,0,0.05))', border: '1px solid var(--border)' }}>
                    <small style={{ color: 'var(--muted)', display: 'block' }}>BƏYANNAMƏÇİ ORQAN</small>
                    <strong style={{ fontSize: 13 }}>AR DGK “Azərterminalkompleks” Birliyi / “TRANS GATE” MMC</strong>
                    <div style={{ fontSize: 11, marginTop: 4, color: 'var(--muted)' }}>VÖEN: 1802077241 / 3104866041 · Attestat: № 0866 / 0621</div>
                  </div>

                  <div style={{ padding: 10, borderRadius: 6, background: 'var(--bg-accent, rgba(0,0,0,0.05))', border: '1px solid var(--border)' }}>
                    <small style={{ color: 'var(--muted)', display: 'block', marginBottom: 6 }}>GÖMRÜK ÖDƏNİŞLƏRİ KODLARI</small>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, fontSize: 12 }}>
                      <div><strong>01:</strong> Gömrük yığımı (300 AZN + 30 AZN)</div>
                      <div><strong>20:</strong> İdxal rüsumu (0.0% - 15.0%)</div>
                      <div><strong>32:</strong> ƏDV (18.0%)</div>
                      <div><strong>75:</strong> Xidmət haqqı (30.00 AZN)</div>
                      <div><strong>85:</strong> Elektron xidmət (5.40 AZN)</div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <footer className="ship-modal-footer">
          <Button
            variant="ghost"
            onClick={copyManifest}
          >
            <Copy size={14} /> Sənəd № kopyala
          </Button>

          <Button
            variant="ghost"
            onClick={() => {
              onClose()
              navigate(`/beyannameler?q=${encodeURIComponent(ship.ad)}`)
            }}
          >
            <FileText size={14} /> Bəyannamələr ({displayedDeclarations.length})
          </Button>

          <Button
            variant="primary"
            onClick={() => {
              onClose()
              navigate(`/qeydiyyat?shipId=${ship.id}`)
            }}
          >
            <Truck size={14} /> Qeydiyyata başla <ChevronRight size={14} />
          </Button>
        </footer>
      </div>
    </Modal>
  )
}
