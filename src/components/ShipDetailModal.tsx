import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronRight, Copy, Download, ExternalLink, Eye, FileCheck, FileText,
  FileUp, MapPin, PackageSearch, Ship, Upload,
} from 'lucide-react'
import { toast } from 'sonner'
import { beyannameler, type gemiler, type GemiIstiqameti, type GemiStatus } from '../data/mockData'
import {
  getAvailableShipStatuses, getShipDirection, getShipDirectionDisplayLabel,
  getShipOperationLabel, normalizeShipStatus, SHIP_DIRECTIONS,
} from '../domain/ships'
import {
  emptyManifestHeader, formatFileSize, inspectManifestFile,
  type ManifestDocument, type ManifestHeader,
} from '../domain/manifestDocument'
import { useAppStore } from '../store/useAppStore'
import { Button, Modal, StatusBadge } from './UI'

type ShipItem = (typeof gemiler)[number]

type Props = {
  ship: ShipItem | null
  open: boolean
  onClose: () => void
}

function formatShipDate(value?: string) {
  if (!value) return ''
  const m = value.match(/(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})/)
  if (m) return `${m[3]}.${m[2]}.${m[1]} · ${m[4]}:${m[5]}`
  const d = value.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (d) return `${d[3]}.${d[2]}.${d[1]}`
  return value
}

function getShipCargoType(ship: ShipItem) {
  const text = `${ship.novu} ${ship.yuk}`.toLocaleLowerCase('az')
  if (text.includes('konteyner') || text.includes('teu')) return 'Konteyner yükü'
  if (text.includes('ro-ro') || text.includes('tir') || text.includes('avtomobil') || text.includes('bərə')) {
    return 'Ro-Ro / nəqliyyat vasitələri'
  }
  if (text.includes('tanker') || text.includes('maye') || text.includes('neft')) return 'Maye yük'
  if (text.includes('bulk') || text.includes('topa') || text.includes('quru') || text.includes('kükürd') || text.includes('taxıl') || text.includes('gübrə')) {
    return 'Topa / quru yük'
  }
  return ship.yuk || ship.novu
}

function formatCargoAmount(ship: ShipItem, cargoType: string) {
  const isContainer = cargoType.includes('Konteyner')
  const isVehicleCargo = cargoType.includes('Ro-Ro') || cargoType.includes('nəqliyyat')

  if (isContainer && ship.konteynerSayi > 0) {
    return `${ship.konteynerSayi.toLocaleString('az-AZ')} konteyner / TEU`
  }
  if (isVehicleCargo && ship.avtomobilSayi > 0) {
    return `${ship.avtomobilSayi.toLocaleString('az-AZ')} nəqliyyat vasitəsi`
  }
  if (isVehicleCargo && ship.tirTutumu > 0) {
    return `${ship.tirTutumu.toLocaleString('az-AZ')} TIR tutumu`
  }
  return `${ship.tonaj.toLocaleString('az-AZ')} ton`
}

export default function ShipDetailModal({ ship, open, onClose }: Props) {
  const navigate = useNavigate()
  const updateShip = useAppStore(state => state.updateShip)
  const manifests = useAppStore(state => state.manifests)
  const addManifest = useAppStore(state => state.addManifest)
  const [manifestViewerOpen, setManifestViewerOpen] = useState(false)
  const [manifestBusy, setManifestBusy] = useState(false)
  const [manifestDragging, setManifestDragging] = useState(false)

  const manifestDoc = useMemo(
    () => (ship ? manifests.find(item => item.shipId === ship.id) ?? null : null),
    [manifests, ship],
  )

  if (!ship) return null

  const cargoType = getShipCargoType(ship)
  const cargoAmount = formatCargoAmount(ship, cargoType)
  const shipDeclarations = beyannameler.filter(item => item.gemiId === ship.id)

  const copyManifest = () => {
    const text = ship.manifestNo || ship.billOfLading || ship.id
    void navigator.clipboard?.writeText(text)
    toast.success(`Sənəd nömrəsi kopyalandı: ${text}`)
  }

  const copyImo = () => {
    void navigator.clipboard?.writeText(ship.id)
    toast.success(`IMO kodu kopyalandı: ${ship.id}`)
  }

  const uploadManifest = async (file?: File | null) => {
    if (!file) return
    setManifestBusy(true)
    const result = await inspectManifestFile(file)
    setManifestBusy(false)
    if (!result.ok) {
      toast.error(result.error)
      return
    }

    const now = new Date()
    const header: ManifestHeader = {
      ...emptyManifestHeader,
      portLoading: ship.menshe.split(',')[0] ?? '',
      portDischarge: (ship.teyinat ?? '').split(',')[0] ?? '',
      arrivalDate: formatShipDate(ship.girisTarixi),
    }
    const document: ManifestDocument = {
      id: `MNF-${now.getTime()}`,
      shipId: ship.id,
      fileName: file.name,
      size: file.size,
      uploadedAt: now.toLocaleString('az-AZ'),
      url: URL.createObjectURL(file),
      pageCount: result.pageCount,
      header,
    }
    addManifest(document)
    toast.success(`${file.name} manifest PDF faylı gəmi səhifəsinə əlavə edildi`)
  }

  const currentDirection = getShipDirection(ship)
  const availableStatuses = getAvailableShipStatuses(currentDirection)

  const handleDirectionChange = (newDirection: GemiIstiqameti) => {
    const nextStatus = normalizeShipStatus(ship.status, newDirection)
    updateShip(ship.id, { istiqamet: newDirection, status: nextStatus })
    if (newDirection === 'Gedən' && ship.status === 'Lövbərdə') {
      toast.info(`${ship.ad}: Çıxış istiqamətində status 'Körpüdə' olaraq yeniləndi`)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="" wide>
      <div className="ship-full-detail">
        <header className="ship-full-hero">
          <div className="ship-hero-main">
            <span className="ship-avatar-icon"><Ship /></span>
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

          <div className="ship-hero-controls-cluster">
            <div className="ship-quick-selects">
              <label>
                <small>İstiqamət</small>
                <select value={currentDirection} onChange={event => handleDirectionChange(event.target.value as GemiIstiqameti)}>
                  {SHIP_DIRECTIONS.map(direction => (
                    <option value={direction} key={direction}>{getShipDirectionDisplayLabel(direction)}</option>
                  ))}
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
              <span className={`ship-risk-badge ${ship.riskDerecesi === 'Yüksək' ? 'high' : ship.riskDerecesi === 'Orta' ? 'medium' : 'low'}`}>
                {ship.riskDerecesi || 'Aşağı'} risk
              </span>
            </div>
          </div>
        </header>

        <div className="ship-tab-panel">
          <div className="ship-grid-two">
            <section className="ship-card-section">
              <h3><FileCheck size={15} /> Gəmi haqqında</h3>
              <dl className="ship-metrics-grid">
                <div>
                  <dt>Konosament Nömrəsi (B/L)</dt>
                  <dd className="accent-num">
                    <strong>{ship.billOfLading || 'BL-637'}</strong>
                    <button type="button" onClick={copyManifest} title="Kopyala" className="copy-inline-btn"><Copy size={12} /></button>
                  </dd>
                </div>
                <div><dt>Manifest Nömrəsi</dt><dd><strong>{ship.manifestNo || 'MNF-637'}</strong></dd></div>
                <div><dt>Orijinal Konosament Sayı</dt><dd><strong>{ship.originalBlSayi || 5} nüsxə (Original)</strong></dd></div>
                <div><dt>Daşıma və Ödəniş Şərti</dt><dd><span className="live-pill"><i /> {ship.dasimaQeydi || 'Clean on board · Freight prepaid'}</span></dd></div>
                <div><dt>Gəmi Sahibi / Operator</dt><dd><strong>{ship.sahib || 'LLC "ALPHA"'}</strong></dd></div>
                <div><dt>Yükün növü</dt><dd><strong>{cargoType}</strong></dd></div>
                <div><dt>Yük çəkisi / sayı</dt><dd className="accent-num"><strong>{cargoAmount}</strong></dd></div>
                <div><dt>Gəmi Kapitanı</dt><dd><strong>{ship.kapitan || 'Master of «Альфа Меркурий»'}</strong></dd></div>
                <div><dt>Gömrük Buraxılış Qeydi</dt><dd><strong>{ship.gomrukMohuru || 'RUGSAT BERILDI (TDSG №15)'}</strong></dd></div>
              </dl>
            </section>

            <section className="ship-card-section ship-voyage-card">
              <div className="ship-voyage-heading">
                <h3><MapPin size={15} /> Marşrut və liman zənciri</h3>
                <span>{getShipDirectionDisplayLabel(currentDirection)}</span>
              </div>

              <div className="ship-voyage-route">
                <article className="ship-voyage-port origin">
                  <small>Yükləmə limanı</small>
                  <strong title={ship.menshe}>{ship.menshe}</strong>
                  <div className="ship-voyage-time">
                    <span>Giriş tarixi</span>
                    <time dateTime={ship.girisTarixi}>{formatShipDate(ship.girisTarixi)}</time>
                  </div>
                </article>

                <div className="ship-voyage-progress" aria-label={`Cari mövqe: ${ship.status}`}>
                  <div className="ship-voyage-line"><i /><span><Ship size={13} /></span><i /></div>
                  <strong>{ship.status}</strong>
                  <small>{getShipOperationLabel(ship)}</small>
                </div>

                <article className="ship-voyage-port destination">
                  <small>Boşaltma limanı</small>
                  <strong title={ship.teyinat}>{ship.teyinat}</strong>
                  <div className="ship-voyage-time">
                    <span>Təxmini çatma (ETA)</span>
                    <time dateTime={ship.cixisTarixi || undefined}>{formatShipDate(ship.cixisTarixi) || 'Məlum deyil'}</time>
                  </div>
                </article>
              </div>

              <dl className="ship-voyage-stats">
                <div><dt>Yük növü</dt><dd>{cargoType}</dd></div>
                <div><dt>Yük çəkisi / sayı</dt><dd>{cargoAmount}</dd></div>
                <div><dt>Yanalma körpüsü</dt><dd>{ship.kanal || 'Təyin edilməyib'}</dd></div>
              </dl>
            </section>
          </div>

          <section className="ship-card-section ship-manifest-pdf-card">
            <h3><FileUp size={15} /> Manifest/Bill of PDF faylı</h3>
            {!manifestDoc ? (
              <label
                className={`manifest-dropzone${manifestDragging ? ' dragging' : ''}${manifestBusy ? ' busy' : ''}`}
                onDragOver={event => { event.preventDefault(); setManifestDragging(true) }}
                onDragLeave={() => setManifestDragging(false)}
                onDrop={event => {
                  event.preventDefault()
                  setManifestDragging(false)
                  void uploadManifest(event.dataTransfer.files?.[0])
                }}
              >
                <Upload size={22} />
                <div>
                  <strong>{manifestBusy ? 'Fayl yoxlanılır…' : 'Manifest/Bill of PDF əlavə et'}</strong>
                </div>
                <input hidden type="file" accept="application/pdf,.pdf" onChange={event => void uploadManifest(event.target.files?.[0])} />
              </label>
            ) : (
              <div className="manifest-loaded">
                <div className="manifest-file">
                  <span className="manifest-file-icon"><FileText size={18} /></span>
                  <div>
                    <strong>{manifestDoc.fileName}</strong>
                    <small>
                      {formatFileSize(manifestDoc.size)}
                      {manifestDoc.pageCount ? ` · ${manifestDoc.pageCount} səhifə` : ''}
                      {' · '}yükləndi {manifestDoc.uploadedAt}
                    </small>
                  </div>
                  <div className="manifest-file-actions">
                    <Button type="button" variant="secondary" onClick={() => setManifestViewerOpen(true)}><Eye size={14} /> Bax</Button>
                    <a className="btn btn-ghost" href={manifestDoc.url} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Aç</a>
                    <a className="btn btn-ghost" href={manifestDoc.url} download={manifestDoc.fileName}><Download size={14} /> Yüklə</a>
                    <label className="btn btn-ghost manifest-replace">
                      <input hidden type="file" accept="application/pdf,.pdf" onChange={event => void uploadManifest(event.target.files?.[0])} />
                      <Upload size={14} /> Dəyiş
                    </label>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        <footer className="ship-modal-footer">
          <Button variant="ghost" onClick={copyManifest}><Copy size={14} /> Sənəd № kopyala</Button>
          <Button variant="ghost" onClick={() => { onClose(); navigate(`/beyannameler?q=${encodeURIComponent(ship.ad)}`) }}>
            <FileText size={14} /> Bəyannamələr ({shipDeclarations.length})
          </Button>
          <Button variant="primary" onClick={() => { onClose(); navigate(`/qeydiyyat?shipId=${ship.id}`) }}>
            <PackageSearch size={14} /> Qeydiyyata başla <ChevronRight size={14} />
          </Button>
        </footer>

        {manifestDoc && (
          <Modal open={manifestViewerOpen} onClose={() => setManifestViewerOpen(false)} title={`Manifest sənədi · ${manifestDoc.fileName}`} wide>
            <div className="manifest-viewer">
              <iframe src={manifestDoc.url} title={manifestDoc.fileName} />
              <div className="manifest-viewer-actions">
                <small>
                  {formatFileSize(manifestDoc.size)}
                  {manifestDoc.pageCount ? ` · ${manifestDoc.pageCount} səhifə` : ''}
                  {' · '}yükləndi {manifestDoc.uploadedAt}
                </small>
                <a className="btn btn-secondary" href={manifestDoc.url} target="_blank" rel="noreferrer">Yeni pəncərədə aç</a>
              </div>
              <small className="manifest-viewer-hint">Önizləmə açılmırsa, sənədi yeni pəncərədə açın və ya “Yüklə” düyməsi ilə endirin.</small>
            </div>
          </Modal>
        )}
      </div>
    </Modal>
  )
}