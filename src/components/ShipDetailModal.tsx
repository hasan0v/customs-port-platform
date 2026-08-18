import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Anchor, ArrowRight, Award, CheckCircle2, ChevronRight, Clock,
  Compass, Copy, ExternalLink, FileCheck, FileText, Gauge, Info,
  Layers, MapPin, Navigation, Radio, Shield, ShieldAlert,
  ShieldCheck, Ship, Truck, Users, Waves, X,
} from 'lucide-react'
import { toast } from 'sonner'
import type { gemiler } from '../data/mockData'
import { agencies } from '../data/operationalData'
import ShipScene3D from './ShipScene3D'
import { Button, Modal, StatusBadge } from './UI'

type ShipItem = (typeof gemiler)[number]

type Props = {
  ship: ShipItem | null
  open: boolean
  onClose: () => void
}

type TabKey = 'ais' | 'tech' | 'cargo' | 'clearance'

const agencyNameMap: Record<string, string> = {
  DGK: 'Dövlət Gömrük Komitəsi',
  DSX: 'Dövlət Sərhəd Xidməti',
  DDA: 'Dövlət Dəniz Agentliyi',
  AQTA: 'Qida Təhlükəsizliyi Agentliyi',
  FHN: 'Fövqəladə Hallar Nazirliyi',
}

export default function ShipDetailModal({ ship, open, onClose }: Props) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabKey>('ais')

  if (!ship) return null

  const copyCoordinates = () => {
    const text = `${ship.lat.toFixed(4)}° N, ${ship.lng.toFixed(4)}° E`
    void navigator.clipboard?.writeText(text)
    toast.success(`Koordinatlar kopyalandı: ${text}`)
  }

  const copyImo = () => {
    void navigator.clipboard?.writeText(ship.id)
    toast.success(`IMO kodu kopyalandı: ${ship.id}`)
  }

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
                <span className="ship-flag-tag">🇦🇿 {ship.bayraq}</span>
                <span className="ship-callsign-tag">MMSI: {ship.mmsi || '—'} · Çağırış: {ship.callSign || '—'}</span>
              </div>
              <h2>{ship.ad}</h2>
              <p className="ship-hero-sub">
                <button type="button" className="imo-copy-btn" onClick={copyImo} title="Kopyala">
                  IMO: <strong>{ship.id}</strong> <Copy size={11} />
                </button>
                <span>·</span>
                <span>{ship.sahib || 'ASCO (Azərbaycan Xəzər Dəniz Gəmiçiliyi QSC)'}</span>
                <span>·</span>
                <span>Qeydiyyat: <strong>{ship.qeydiyyatLimani || 'Bakı Limanı'}</strong></span>
              </p>
            </div>
          </div>

          <div className="ship-hero-status-cluster">
            <StatusBadge status={ship.status} />
            <span className={`ship-risk-badge ${ship.riskDerecesi === 'Yüksək' ? 'high' : ship.riskDerecesi === 'Orta' ? 'medium' : 'low'}`}>
              <ShieldCheck size={13} /> {ship.riskDerecesi || 'Aşağı'} risk
            </span>
          </div>
        </header>

        {/* 3D Visual Stage */}
        <div className="ship-visual-stage">
          <ShipScene3D
            compact
            name={ship.ad}
            course={ship.kurs || `${Math.round(ship.suret * 6)}°`}
          />
        </div>

        {/* Tab Navigation */}
        <nav className="ship-detail-tabs" role="tablist" aria-label="Gəmi məlumat bölmələri">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'ais'}
            className={activeTab === 'ais' ? 'active' : ''}
            onClick={() => setActiveTab('ais')}
          >
            <Compass size={15} />
            <span>AIS & Naviqasiya</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'tech'}
            className={activeTab === 'tech' ? 'active' : ''}
            onClick={() => setActiveTab('tech')}
          >
            <Anchor size={15} />
            <span>Reyestr & Texniki</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'cargo'}
            className={activeTab === 'cargo' ? 'active' : ''}
            onClick={() => setActiveTab('cargo')}
          >
            <Truck size={15} />
            <span>Yük & Manifest</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'clearance'}
            className={activeTab === 'clearance' ? 'active' : ''}
            onClick={() => setActiveTab('clearance')}
          >
            <Shield size={15} />
            <span>Vahid Pəncərə</span>
          </button>
        </nav>

        {/* Tab Content Panels */}
        <div className="ship-tab-panel">
          {activeTab === 'ais' && (
            <div className="ship-grid-two">
              <section className="ship-card-section">
                <h3><Navigation size={15} /> Canlı Naviqasiya Məlumatları</h3>
                <dl className="ship-metrics-grid">
                  <div>
                    <dt>Cari sürət (SOG)</dt>
                    <dd className="accent-num">
                      <strong>{ship.suret}</strong> <small>düyün ({Math.round(ship.suret * 1.852)} km/s)</small>
                    </dd>
                  </div>
                  <div>
                    <dt>Kurs / İstiqamət (COG)</dt>
                    <dd><strong>{ship.kurs || '074° (Şimal-Şərq)'}</strong></dd>
                  </div>
                  <div>
                    <dt>Cari Koordinatlar</dt>
                    <dd className="coords-dd">
                      <span>{ship.lat.toFixed(4)}° N, {ship.lng.toFixed(4)}° E</span>
                      <button type="button" onClick={copyCoordinates} aria-label="Koordinatları kopyala" title="Kopyala">
                        <Copy size={12} />
                      </button>
                    </dd>
                  </div>
                  <div>
                    <dt>Kanal / Yanalma sahəsi</dt>
                    <dd><strong>{ship.kanal}</strong></dd>
                  </div>
                  <div>
                    <dt>Naviqasiya statusu</dt>
                    <dd><StatusBadge status={ship.status} /></dd>
                  </div>
                  <div>
                    <dt>AIS Transponder</dt>
                    <dd><span className="live-pill"><i /> Aktiv · Class A</span></dd>
                  </div>
                </dl>
              </section>

              <section className="ship-card-section">
                <h3><MapPin size={15} /> Marşrut və Vaxt Cədvəli</h3>
                <div className="voyage-strip">
                  <div className="voyage-port">
                    <small>ÇIXIŞ LİMANI</small>
                    <strong>{ship.menshe}</strong>
                    <span>ATD: {ship.girisTarixi.replace('T', ' ')}</span>
                  </div>
                  <div className="voyage-connector">
                    <i />
                    <span>{ship.status === 'Lövbərdə' ? 'Lövbərdə' : ship.status === 'Körpüdə' ? 'Körpüdə' : 'Yolda'}</span>
                    <i />
                  </div>
                  <div className="voyage-port text-right">
                    <small>TƏYİNAT LİMANI</small>
                    <strong>{ship.teyinat || 'Bakı Beynəlxalq Dəniz Ticarət Limanı (Ələt)'}</strong>
                    <span>ETA: {ship.cixisTarixi ? ship.cixisTarixi.replace('T', ' ') : '—'}</span>
                  </div>
                </div>

                <div className="voyage-stats">
                  <div>
                    <small>Kapitan</small>
                    <strong>{ship.kapitan || 'R. Əliyev'}</strong>
                  </div>
                  <div>
                    <small>Ekipaj sayı</small>
                    <strong>{ship.ekipaj || 22} nəfər</strong>
                  </div>
                  <div>
                    <small>Dəniz qeydiyyatı</small>
                    <strong>{ship.qeydiyyatLimani || 'Bakı Limanı'}</strong>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'tech' && (
            <div className="ship-grid-two">
              <section className="ship-card-section">
                <h3><Anchor size={15} /> Dəniz Reyestri Məlumatları (ASCO)</h3>
                <dl className="ship-metrics-grid">
                  <div>
                    <dt>Gəminin rəsmi adı</dt>
                    <dd><strong>{ship.ad}</strong></dd>
                  </div>
                  <div>
                    <dt>IMO Nömrəsi</dt>
                    <dd><strong>{ship.id}</strong></dd>
                  </div>
                  <div>
                    <dt>MMSI Kodu</dt>
                    <dd><strong>{ship.mmsi || '423001137'}</strong></dd>
                  </div>
                  <div>
                    <dt>Çağırış siqnalı</dt>
                    <dd><strong>{ship.callSign || '4JOL'}</strong></dd>
                  </div>
                  <div>
                    <dt>Bayraq / Dövlət</dt>
                    <dd><strong>{ship.bayraq}</strong></dd>
                  </div>
                  <div>
                    <dt>Qeydiyyat Limanı</dt>
                    <dd><strong>{ship.qeydiyyatLimani || 'Bakı Limanı'}</strong></dd>
                  </div>
                  <div>
                    <dt>Sahibi / Operator</dt>
                    <dd><strong>{ship.sahib || 'ASCO (Azərbaycan Xəzər Dəniz Gəmiçiliyi QSC)'}</strong></dd>
                  </div>
                  <div>
                    <dt>Tikildiyi il</dt>
                    <dd><strong>{ship.tikildiyiIl || 2021}-ci il</strong></dd>
                  </div>
                </dl>
              </section>

              <section className="ship-card-section">
                <h3><Layers size={15} /> Texniki Ölçülər və Göstəricilər</h3>
                <dl className="ship-metrics-grid">
                  <div>
                    <dt>Ümumi Dedveyt (DWT)</dt>
                    <dd><strong>{ship.dwt ? ship.dwt.toLocaleString('az-AZ') : ship.tonaj.toLocaleString('az-AZ')} DWT</strong></dd>
                  </div>
                  <div>
                    <dt>Qross Tonaj (GRT)</dt>
                    <dd><strong>{ship.tonaj.toLocaleString('az-AZ')} ton</strong></dd>
                  </div>
                  <div>
                    <dt>Qabaritlər (Uzunluq × En)</dt>
                    <dd><strong>{ship.uzunluqEn || '154.5 m × 17.5 m'}</strong></dd>
                  </div>
                  <div>
                    <dt>Cari su oturumu (Draught)</dt>
                    <dd><strong>{ship.suOturumu || '4.2 m (Maks. 4.8 m)'}</strong></dd>
                  </div>
                  <div>
                    <dt>Gəmi növü</dt>
                    <dd><strong>{ship.novu}</strong></dd>
                  </div>
                  <div>
                    <dt>Təhlükəsizlik sinfi</dt>
                    <dd><strong>KM* L3 IISP R1 (Xəzər Dənizi)</strong></dd>
                  </div>
                </dl>
              </section>
            </div>
          )}

          {activeTab === 'cargo' && (
            <div className="ship-grid-two">
              <section className="ship-card-section">
                <h3><Truck size={15} /> Yük və Nəqliyyat Göstəriciləri</h3>
                <dl className="ship-metrics-grid">
                  <div>
                    <dt>Daşınan yük kateqoriyası</dt>
                    <dd><strong>{ship.yuk}</strong></dd>
                  </div>
                  <div>
                    <dt>Manifest Nömrəsi</dt>
                    <dd><strong>{ship.manifestNo || `MNF-2026-07-${ship.id.slice(-4)}`}</strong></dd>
                  </div>
                  <div>
                    <dt>Göyərtədəki nəqliyyat</dt>
                    <dd className="accent-num">
                      <strong>{ship.avtomobilSayi ? `${ship.avtomobilSayi} TIR/Avto` : '—'}</strong>
                    </dd>
                  </div>
                  <div>
                    <dt>Ro-Ro / TIR Tutumu</dt>
                    <dd><strong>{ship.tirTutumu ? `${ship.tirTutumu} TIR tutumu` : 'Quru yük / Konteyner'}</strong></dd>
                  </div>
                  <div>
                    <dt>Vaqon tutumu</dt>
                    <dd><strong>{ship.vaqonTutumu ? `${ship.vaqonTutumu} vaqon` : '—'}</strong></dd>
                  </div>
                  <div>
                    <dt>Konteyner tutumu</dt>
                    <dd><strong>{ship.konteynerSayi ? `${ship.konteynerSayi} TEU` : '—'}</strong></dd>
                  </div>
                </dl>
              </section>

              <section className="ship-card-section">
                <h3><FileText size={15} /> Gömrük Bəyannamələri və Nəzarət</h3>
                <div className="cargo-decl-summary">
                  <div className="cargo-decl-stat">
                    <span>Bağlı bəyannamə</span>
                    <strong>{ship.beyannameSayi || 28}</strong>
                  </div>
                  <div className="cargo-decl-stat green">
                    <span>Yaşıl kanal (Təsdiq)</span>
                    <strong>{Math.round((ship.beyannameSayi || 28) * 0.75)}</strong>
                  </div>
                  <div className="cargo-decl-stat amber">
                    <span>Sarı / Qırmızı (Yoxlama)</span>
                    <strong>{Math.max(1, (ship.beyannameSayi || 28) - Math.round((ship.beyannameSayi || 28) * 0.75))}</strong>
                  </div>
                </div>

                <div className="cargo-action-box">
                  <p>Bu gəmi üzrə manifest məlumatlarını birbaşa Vahid Qeydiyyat pəncərəsində aça və avtomobilləri seçə bilərsiniz.</p>
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

          {activeTab === 'clearance' && (
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
          )}
        </div>

        {/* Action Footer */}
        <footer className="ship-modal-footer">
          <Button
            variant="ghost"
            onClick={copyCoordinates}
          >
            <Copy size={14} /> Koordinatları kopyala
          </Button>

          <Button
            variant="ghost"
            onClick={() => {
              onClose()
              navigate(`/beyannameler?q=${encodeURIComponent(ship.ad)}`)
            }}
          >
            <FileText size={14} /> Bəyannamələr
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
