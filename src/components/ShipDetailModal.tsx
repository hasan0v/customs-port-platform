import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Anchor, ArrowRight, Award, CheckCircle2, ChevronRight, Clock,
  Copy, ExternalLink, FileCheck, FileText, Globe, Info,
  Layers, MapPin, Navigation, Shield, ShieldAlert,
  ShieldCheck, Ship, Truck, Users, Warehouse,
} from 'lucide-react'
import { toast } from 'sonner'
import { avtomobiller, beyannameler, type gemiler, type GemiIstiqameti, type GemiStatus } from '../data/mockData'
import { getShipDirection, getShipOperationLabel, SHIP_DIRECTIONS, SHIP_STATUSES } from '../domain/ships'
import { agencies } from '../data/operationalData'
import { useAppStore } from '../store/useAppStore'
import ShipScene3D from './ShipScene3D'
import { Button, Modal, StatusBadge } from './UI'

type ShipItem = (typeof gemiler)[number]

type Props = {
  ship: ShipItem | null
  open: boolean
  onClose: () => void
}

type TabKey = 'manifest' | 'cargo' | 'vehicles' | 'clearance'

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
  const [activeTab, setActiveTab] = useState<TabKey>('manifest')

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
  const shipVehicles = avtomobiller.filter(v => v.gemi === ship.id || (ship.id === 'IMO9834210' && (v.nomre.includes('1234') || v.nomre.includes('DG'))))
  const displayedVehicles = shipVehicles.length > 0 ? shipVehicles : avtomobiller.slice(0, 4)

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
                <span>Sahibi: <strong>{ship.sahib || 'LLC "ALPHA"'}</strong></span>
                <span>·</span>
                <span>Kapitan: <strong>{ship.kapitan || 'Master of the ship'}</strong></span>
              </p>
            </div>
          </div>

          <div className="ship-hero-status-cluster">
            <StatusBadge status={ship.status} />
            <strong className="ship-operation-label">{getShipOperationLabel(ship)}</strong>
            <span className={`ship-risk-badge ${ship.riskDerecesi === 'Yüksək' ? 'high' : ship.riskDerecesi === 'Orta' ? 'medium' : 'low'}`}>
              <ShieldCheck size={13} /> {ship.riskDerecesi || 'Aşağı'} risk dərəcəsi
            </span>
          </div>
        </header>

        <section className="ship-movement-controls" aria-label="Gəminin status və istiqamət idarəetməsi">
          <div>
            <small>ƏMƏLİYYAT STATUSU</small>
            <strong>{ship.status} · {getShipDirection(ship)}</strong>
          </div>
          <label>
            <span>Mövqe statusu</span>
            <select value={ship.status} onChange={event => updateShip(ship.id, { status: event.target.value as GemiStatus })}>
              {SHIP_STATUSES.map(status => <option value={status} key={status}>{status}</option>)}
            </select>
          </label>
          <label>
            <span>İstiqamət</span>
            <select value={getShipDirection(ship)} onChange={event => updateShip(ship.id, { istiqamet: event.target.value as GemiIstiqameti })}>
              {SHIP_DIRECTIONS.map(direction => <option value={direction} key={direction}>{direction}</option>)}
            </select>
          </label>
        </section>

        {/* 3D Visual Stage */}
        <div className="ship-visual-stage">
          <ShipScene3D
            compact
            name={ship.ad}
            course={ship.kurs || '000°'}
          />
        </div>

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

                <div className="cargo-action-box">
                  <p>Bu gəminin manifestindəki bəyannamələri və TIR-ları birbaşa Vahid Qeydiyyat pəncərəsində idarə edin.</p>
                  <Button
                    onClick={() => {
                      onClose()
                      navigate(`/qeydiyyat?shipId=${ship.id}`)
                    }}
                  >
                    <Truck size={14} /> Qeydiyyat və Ro-Ro manifesti <ArrowRight size={14} />
                  </Button>
                </div>
              </section>
            </div>
          )}

          {/* TAB 3: GÖYƏRTƏDƏKİ TIR-LAR VƏ CMR QAİMƏLƏRİ */}
          {activeTab === 'vehicles' && (
            <section className="ship-card-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <h3 style={{ margin: 0 }}><Truck size={15} /> Sənədlər Üzrə Rəsmi Nəqliyyat Vasitələri və CMR Qaimələri</h3>
                  <small style={{ color: 'var(--muted)' }}>Bu gəmi və reys üzrə rəsmiləşdirilən nəqliyyat vahidləri:</small>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    onClose()
                    navigate(`/qeydiyyat?shipId=${ship.id}`)
                  }}
                >
                  <Truck size={13} /> Vahid Qeydiyyatda Göstər <ArrowRight size={13} />
                </Button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
                {displayedVehicles.map((v, i) => (
                  <article key={v.kod || i} style={{
                    padding: 12,
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--card-bg, rgba(255,255,255,0.04))',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{
                        fontWeight: 700,
                        fontFamily: 'monospace',
                        fontSize: 14,
                        padding: '3px 8px',
                        background: 'var(--bg-accent, rgba(59, 130, 246, 0.12))',
                        border: '1px solid var(--border)',
                        borderRadius: 4,
                      }}>
                        {v.nomre}
                      </span>
                      <small style={{ color: 'var(--muted)', fontSize: 11 }}>{v.marka}</small>
                    </div>

                    <div style={{ fontSize: 12, lineHeight: 1.5 }}>
                      <div><strong>Yük:</strong> {v.yuk}</div>
                      <div><strong>Sürücü:</strong> {v.surucu}</div>
                      <div><strong>Marşrut:</strong> {v.menshe} → {v.teyinat}</div>
                      <div><strong>Sənəd:</strong> B/L: {v.billOfLading} {v.vehicleOrder ? `· Order: ${v.vehicleOrder}` : ''}</div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, borderTop: '1px dashed var(--border)', paddingTop: 6 }}>
                      <StatusBadge status={v.status} />
                      <button
                        type="button"
                        onClick={() => {
                          onClose()
                          navigate(`/qeydiyyat?plate=${encodeURIComponent(v.nomre)}&shipId=${ship.id}`)
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--primary, #3b82f6)',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        Qeydiyyat aç <ChevronRight size={11} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
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
