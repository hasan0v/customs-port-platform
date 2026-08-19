import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Anchor, ArrowRight, CheckCircle2, ChevronRight, CircleDot, Container,
  FileCheck, FileText, Filter, Layers, List, Navigation, Search,
  ShieldAlert, ShieldCheck, Ship, Truck, UserCheck, Waves, ExternalLink,
} from 'lucide-react'
import type { Avtomobil as DeckVehicle, Declaration } from '../data/mockData'
import { Modal } from './UI'
import { DeclarationDocumentView } from './DeclarationDocumentView'

type Ship = {
  id: string
  ad: string
  novu: string
  menshe: string
  kanal: string
  girisTarixi: string
}

type Props = {
  ship: Ship
  vehicles: DeckVehicle[]
  selectedPlate: string
  registeredPlates: string[]
  onSelect: (vehicle: DeckVehicle) => void
  declarations?: Declaration[]
  onConfirmRegistration?: (vehicle: DeckVehicle) => void
  onOpenShipDetails?: () => void
}

type DeckLane = 'all' | 'port' | 'center' | 'starboard'
type StatusFilter = 'all' | 'pending' | 'completed' | 'inspected'
type VehicleWorkflowStatus = Exclude<StatusFilter, 'all'>

// Country flag / badge helper based on plate format
function getCountryCode(plate: string): { code: string; color: string } {
  if (plate.startsWith('15') || plate.startsWith('77') || plate.startsWith('99') || plate.startsWith('10') || plate.startsWith('90')) {
    return { code: 'AZ', color: '#0087a8' }
  }
  if (plate.startsWith('KZ') || plate.includes('KZ') || plate.startsWith('12') || plate.startsWith('02')) {
    return { code: 'KZ', color: '#0ea5e9' }
  }
  if (plate.startsWith('TM') || plate.includes('TM')) {
    return { code: 'TM', color: '#16a34a' }
  }
  if (plate.startsWith('TR') || plate.startsWith('34') || plate.startsWith('06')) {
    return { code: 'TR', color: '#dc2626' }
  }
  if (plate.startsWith('GE')) {
    return { code: 'GE', color: '#ea580c' }
  }
  return { code: 'INT', color: '#64748b' }
}

export default function VehicleDeckSelector({
  ship,
  vehicles,
  selectedPlate,
  registeredPlates,
  onSelect,
  declarations = [],
  onConfirmRegistration,
  onOpenShipDetails,
}: Props) {
  const [viewMode, setViewMode] = useState<'deck' | 'list'>('deck')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLane, setSelectedLane] = useState<DeckLane>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [declModalOpen, setDeclModalOpen] = useState(false)

  const completedSet = useMemo(() => new Set(registeredPlates), [registeredPlates])

  // Enhance vehicles with bay assignment and lanes (Port = Sol bort, Center = Mərkəz, Starboard = Sağ bort)
  const deckVehicles = useMemo(() => {
    return vehicles.slice(0, 30).map((vehicle, idx) => {
      let lane: 'port' | 'center' | 'starboard' = 'center'
      let bayNumber = ''
      let bayPrefix = 'C'

      if (idx % 3 === 0) {
        lane = 'port'
        bayPrefix = 'P'
        bayNumber = `${bayPrefix}-${String(Math.floor(idx / 3) + 1).padStart(2, '0')}`
      } else if (idx % 3 === 1) {
        lane = 'center'
        bayPrefix = 'C'
        bayNumber = `${bayPrefix}-${String(Math.floor(idx / 3) + 1).padStart(2, '0')}`
      } else {
        lane = 'starboard'
        bayPrefix = 'S'
        bayNumber = `${bayPrefix}-${String(Math.floor(idx / 3) + 1).padStart(2, '0')}`
      }

      const isRegistered = completedSet.has(vehicle.nomre)
      const isInspected = vehicle.status === 'Yoxlanılır' || idx % 7 === 0
      const workflowStatus: VehicleWorkflowStatus = isRegistered
        ? 'completed'
        : isInspected
          ? 'inspected'
          : 'pending'
      const weightTons = (18 + (idx * 1.7) % 12).toFixed(1)

      return {
        ...vehicle,
        bayNumber,
        lane,
        isRegistered,
        isInspected,
        workflowStatus,
        weightTons,
        country: getCountryCode(vehicle.nomre),
      }
    })
  }, [vehicles, completedSet])

  // Filter vehicles
  const filteredVehicles = useMemo(() => {
    return deckVehicles.filter(v => {
      const matchSearch =
        searchQuery === '' ||
        `${v.nomre} ${v.marka} ${v.yuk} ${v.surucu} ${v.billOfLading || ''} ${v.bayNumber}`
          .toLocaleLowerCase('az')
          .includes(searchQuery.toLocaleLowerCase('az'))

      const matchLane = selectedLane === 'all' || v.lane === selectedLane

      const matchStatus = statusFilter === 'all' || v.workflowStatus === statusFilter

      return matchSearch && matchLane && matchStatus
    })
  }, [deckVehicles, searchQuery, selectedLane, statusFilter])

  // Group vehicles by lane for the deck view
  const portLaneVehicles = useMemo(() => filteredVehicles.filter(v => v.lane === 'port'), [filteredVehicles])
  const centerLaneVehicles = useMemo(() => filteredVehicles.filter(v => v.lane === 'center'), [filteredVehicles])
  const starboardLaneVehicles = useMemo(() => filteredVehicles.filter(v => v.lane === 'starboard'), [filteredVehicles])

  // Selected vehicle or fallback to first
  const selectedVehicle = useMemo(() => {
    return (
      deckVehicles.find(v => v.nomre === selectedPlate) ??
      filteredVehicles[0] ??
      deckVehicles[0]
    )
  }, [deckVehicles, filteredVehicles, selectedPlate])

  // Linked declaration
  const linkedDecl = useMemo(() => {
    if (!selectedVehicle) return null
    return declarations.find(d =>
      d.avtomobil === selectedVehicle.nomre ||
      (Boolean(selectedVehicle.billOfLading) && d.billOfLading === selectedVehicle.billOfLading)
    )
  }, [declarations, selectedVehicle])

  const totalCount = deckVehicles.length
  const registeredCount = deckVehicles.filter(v => v.workflowStatus === 'completed').length
  const pendingCount = deckVehicles.filter(v => v.workflowStatus === 'pending').length
  const inspectedCount = deckVehicles.filter(v => v.workflowStatus === 'inspected').length

  return (
    <section className="vehicle-deck-selector" aria-label="Ro-Ro gəmisində avtomobil və manifest nəzarəti">
      {/* Control & Filter Bar */}
      <div className="deck-controls-bar">
        {/* Search */}
        <div className="deck-search-box">
          <Search size={14} />
          <input
            type="text"
            placeholder="Nömrə, sürücü, yük və ya B/L ilə axtar..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button type="button" className="clear-search" onClick={() => setSearchQuery('')}>
              ×
            </button>
          )}
        </div>

        {/* Status Filters */}
        <div className="deck-filter-pills" role="tablist">
          <button
            type="button"
            className={`filter-pill ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            Hamısı ({totalCount})
          </button>
          <button
            type="button"
            className={`filter-pill ${statusFilter === 'pending' ? 'active' : ''}`}
            onClick={() => setStatusFilter('pending')}
          >
            Gözləyən ({pendingCount})
          </button>
          <button
            type="button"
            className={`filter-pill ${statusFilter === 'completed' ? 'active' : ''}`}
            onClick={() => setStatusFilter('completed')}
          >
            Tamamlanmış ({registeredCount})
          </button>
          <button
            type="button"
            className={`filter-pill ${statusFilter === 'inspected' ? 'active' : ''}`}
            onClick={() => setStatusFilter('inspected')}
          >
            Yoxlama ({inspectedCount})
          </button>
        </div>

        {/* View Mode Toggle */}
        <div className="deck-view-toggle">
          <button
            type="button"
            className={`view-btn ${viewMode === 'deck' ? 'active' : ''}`}
            onClick={() => setViewMode('deck')}
            title="Zolaqlar üzrə göyərtə planı"
          >
            <Layers size={13} />
            <span>Göyərtə planı</span>
          </button>
          <button
            type="button"
            className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            title="Manifest cədvəli"
          >
            <List size={13} />
            <span>Manifest siyahısı</span>
          </button>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="deck-selector-layout">
        {/* Left Side: Deck Lanes or Table */}
        <div className="deck-main-viewport">
          {viewMode === 'deck' ? (
            <div className="roro-deck-schematic">
              {/* 3 Lane Columns Grid */}
              <div className="deck-lanes-grid">
                {/* Port Lane */}
                {(selectedLane === 'all' || selectedLane === 'port') && (
                  <div className="deck-lane-column port-lane">
                    <div className="lane-header">
                      <span className="lane-tag">ZOLAĞ 1 · SOL BORT</span>
                      <small>{portLaneVehicles.length} TIR</small>
                    </div>
                    <div className="lane-cards-list">
                      {portLaneVehicles.map(v => (
                        <DeckVehicleCard
                          key={v.kod}
                          vehicle={v}
                          isSelected={v.nomre === selectedVehicle?.nomre}
                          onSelect={() => onSelect(v)}
                        />
                      ))}
                      {portLaneVehicles.length === 0 && (
                        <div className="empty-lane">Bu zolaqda TIR tapılmadı</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Center Lane */}
                {(selectedLane === 'all' || selectedLane === 'center') && (
                  <div className="deck-lane-column center-lane">
                    <div className="lane-header">
                      <span className="lane-tag">ZOLAĞ 2 · MƏRKƏZ</span>
                      <small>{centerLaneVehicles.length} TIR</small>
                    </div>
                    <div className="lane-cards-list">
                      {centerLaneVehicles.map(v => (
                        <DeckVehicleCard
                          key={v.kod}
                          vehicle={v}
                          isSelected={v.nomre === selectedVehicle?.nomre}
                          onSelect={() => onSelect(v)}
                        />
                      ))}
                      {centerLaneVehicles.length === 0 && (
                        <div className="empty-lane">Bu zolaqda TIR tapılmadı</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Starboard Lane */}
                {(selectedLane === 'all' || selectedLane === 'starboard') && (
                  <div className="deck-lane-column starboard-lane">
                    <div className="lane-header">
                      <span className="lane-tag">ZOLAĞ 3 · SAĞ BORT</span>
                      <small>{starboardLaneVehicles.length} TIR</small>
                    </div>
                    <div className="lane-cards-list">
                      {starboardLaneVehicles.map(v => (
                        <DeckVehicleCard
                          key={v.kod}
                          vehicle={v}
                          isSelected={v.nomre === selectedVehicle?.nomre}
                          onSelect={() => onSelect(v)}
                        />
                      ))}
                      {starboardLaneVehicles.length === 0 && (
                        <div className="empty-lane">Bu zolaqda TIR tapılmadı</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Table View */
            <div className="deck-table-viewport">
              <table className="deck-manifest-table">
                <thead>
                  <tr>
                    <th>Bay / Yer</th>
                    <th>Dövlət Nişanı</th>
                    <th>Nəqliyyat / Model</th>
                    <th>Yük Təsviri</th>
                    <th>Sürücü</th>
                    <th>Çəki</th>
                    <th>Bill of Lading</th>
                    <th>Status</th>
                    <th>Əməliyyat</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVehicles.map(v => {
                    const isSelected = v.nomre === selectedVehicle?.nomre
                    return (
                      <tr
                        key={v.kod}
                        className={`manifest-row ${isSelected ? 'selected' : ''}`}
                        onClick={() => onSelect(v)}
                      >
                        <td>
                          <span className="bay-badge">{v.bayNumber}</span>
                        </td>
                        <td>
                          <div className="table-plate-badge">
                            <span className="flag-code" style={{ backgroundColor: v.country.color }}>
                              {v.country.code}
                            </span>
                            <strong>{v.nomre}</strong>
                          </div>
                        </td>
                        <td>
                          <div className="table-model-col">
                            <strong>{v.marka}</strong>
                            <small>{v.lane === 'port' ? 'Sol bort' : v.lane === 'center' ? 'Mərkəz' : 'Sağ bort'}</small>
                          </div>
                        </td>
                        <td>
                          <span className="table-cargo-text" title={v.yuk}>
                            {v.yuk}
                          </span>
                        </td>
                        <td>
                          <div className="table-driver-col">
                            <span>{v.surucu}</span>
                            <small>{v.menshe} → {v.teyinat}</small>
                          </div>
                        </td>
                        <td>
                          <strong>{v.weightTons} t</strong>
                        </td>
                        <td>
                          <span className="table-bl-code">{v.billOfLading || '—'}</span>
                        </td>
                        <td>
                          {v.workflowStatus === 'completed' ? (
                            <span className="status-chip success">
                              <CheckCircle2 size={11} /> Qeydiyyatda
                            </span>
                          ) : v.workflowStatus === 'inspected' ? (
                            <span className="status-chip warning">
                              <ShieldAlert size={11} /> Yoxlama
                            </span>
                          ) : (
                            <span className="status-chip neutral">
                              <CircleDot size={11} /> Gözləyir
                            </span>
                          )}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="select-row-btn"
                            onClick={e => {
                              e.stopPropagation()
                              onSelect(v)
                            }}
                          >
                            Seç <ChevronRight size={12} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {filteredVehicles.length === 0 && (
                    <tr>
                      <td colSpan={9} className="empty-table-message">
                        Axtarış filtrinə uyğun heç bir nəqliyyat vasitəsi tapılmadı.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Side: Selected Vehicle Details & Direct Action */}
        <aside className="deck-selection-panel" aria-live="polite">
          <div
            className="deck-panel-vessel"
            onClick={onOpenShipDetails}
            style={{ cursor: onOpenShipDetails ? 'pointer' : 'default' }}
            title={onOpenShipDetails ? 'Gəminin bütün detallarına baxmaq üçün klikləyin' : undefined}
          >
            <Ship size={18} />
            <div style={{ flex: 1 }}>
              <span>AKTİV RO-RO GƏMİSİ</span>
              <strong>{ship.ad}</strong>
              <small>{ship.id} · {ship.kanal}</small>
            </div>
            {onOpenShipDetails && (
              <button
                type="button"
                className="deck-vessel-detail-btn"
                onClick={e => {
                  e.stopPropagation()
                  onOpenShipDetails()
                }}
                style={{
                  border: '1px solid var(--line)',
                  background: 'var(--card)',
                  borderRadius: 7,
                  padding: '5px 10px',
                  fontSize: 10,
                  fontWeight: 800,
                  color: 'var(--ocean)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  transition: 'all .15s ease',
                }}
              >
                Gəmi detalları <ExternalLink size={11} />
              </button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {selectedVehicle ? (
              <motion.div
                key={selectedVehicle.nomre}
                className="deck-selected-car"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <div className="panel-section-head">
                  <span className="panel-kicker">
                    <CircleDot size={11} /> SEÇİLMİŞ NƏQLİYYAT VASİTƏSİ
                  </span>
                  <span className="bay-pill">{selectedVehicle.bayNumber}</span>
                </div>

                {/* License Plate Banner */}
                <div className="official-plate-box">
                  <div className="plate-flag-strip">
                    <span className="plate-country-code">{selectedVehicle.country.code}</span>
                  </div>
                  <div className="plate-main-text">
                    <strong>{selectedVehicle.nomre}</strong>
                  </div>
                  {selectedVehicle.workflowStatus === 'completed' ? (
                    <span className="plate-badge-done">
                      <CheckCircle2 size={12} /> TƏSDİQLƏNİB
                    </span>
                  ) : selectedVehicle.workflowStatus === 'inspected' ? (
                    <span className="plate-badge-pending warning">
                      YOXLAMADA
                    </span>
                  ) : (
                    <span className="plate-badge-pending">
                      GÖZLƏMƏDƏ
                    </span>
                  )}
                </div>

                {/* Details Grid - Manifest 02 məlumatları */}
                <dl className="panel-details-grid">
                  <div>
                    <dt>Marka / Model</dt>
                    <dd>{selectedVehicle.marka}</dd>
                  </div>
                  <div>
                    <dt>Sürücü</dt>
                    <dd>{selectedVehicle.surucu}</dd>
                  </div>
                  <div>
                    <dt>Göyərtə Zolağı</dt>
                    <dd>
                      {selectedVehicle.lane === 'port'
                        ? 'Zolaq 1 (Sol bort)'
                        : selectedVehicle.lane === 'center'
                        ? 'Zolaq 2 (Mərkəz)'
                        : 'Zolaq 3 (Sağ bort)'}
                    </dd>
                  </div>
                  <div>
                    <dt>Brutto Çəki</dt>
                    <dd>{selectedVehicle.weightTons} ton</dd>
                  </div>
                  <div>
                    <dt>Bill of Lading (B/L)</dt>
                    <dd>{selectedVehicle.billOfLading || 'BL-245263'}</dd>
                  </div>
                  <div>
                    <dt>Marşrut</dt>
                    <dd>{selectedVehicle.menshe} → {selectedVehicle.teyinat}</dd>
                  </div>
                  <div>
                    <dt>Təyinat Gömrük</dt>
                    <dd>13005 Beynəlxalq Dəniz Limanı</dd>
                  </div>
                  <div>
                    <dt>Keçmə Məqsədi</dt>
                    <dd>Tranzit (İD 80)</dd>
                  </div>
                </dl>

                {/* Cargo Badge */}
                <div className="panel-cargo-box">
                  <Container size={16} className="cargo-icon" />
                  <div className="cargo-content">
                    <small>MANİFEST YÜKÜ TƏSVİRİ</small>
                    <strong>{selectedVehicle.yuk}</strong>
                  </div>
                </div>

                {/* Linked Customs Declaration */}
                <div
                  className="panel-decl-box"
                  onClick={() => setDeclModalOpen(true)}
                  title="Tam gömrük bəyannaməsini aç"
                >
                  <div className="panel-decl-head">
                    <small>GÖMRÜK BƏYANNAMƏSİ (EGB)</small>
                    <div className="panel-decl-status">
                      <span className="status-chip success">
                        {linkedDecl?.status || 'Təsdiqlənib'}
                      </span>
                      <ExternalLink size={12} className="decl-ext-icon" />
                    </div>
                  </div>
                  <div className="panel-decl-body">
                    <strong className="decl-code">
                      {linkedDecl?.kod || '01263000224935'}
                    </strong>
                    <span className="decl-type">
                      {linkedDecl?.senedNovu || 'İD 80 · Tranzit'}
                    </span>
                  </div>
                </div>

                {/* Single Window Clearances Pill */}
                <div className="panel-clearances-box" style={{ marginTop: 10 }}>
                  <small>VAHİD PƏNCƏRƏ İCAZƏLƏRİ</small>
                  <div className="clearance-tags-list">
                    <span className="clr-tag ok"><ShieldCheck size={11} /> DGK: Təsdiq</span>
                    <span className="clr-tag ok"><ShieldCheck size={11} /> DSX: Təsdiq</span>
                    <span className="clr-tag ok"><ShieldCheck size={11} /> AQTA: Təsdiq</span>
                    <span className="clr-tag ok"><ShieldCheck size={11} /> DDA: Təsdiq</span>
                  </div>
                </div>

                {/* Action CTA Button */}
                {selectedVehicle.isRegistered ? (
                  <div style={{ marginTop: 14, padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, color: '#166534', fontWeight: 600, fontSize: 13 }}>
                    <CheckCircle2 size={16} />
                    <span>Nəqliyyat qeydiyyatdan keçib</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="deck-open-registration-btn"
                    style={{ marginTop: 14 }}
                    onClick={() => {
                      if (onConfirmRegistration) {
                        onConfirmRegistration(selectedVehicle)
                      } else {
                        onSelect(selectedVehicle)
                      }
                    }}
                  >
                    <span>Qeydiyyatı Təsdiq Et ({selectedVehicle.nomre})</span>
                    <CheckCircle2 size={15} />
                  </button>
                )}
              </motion.div>
            ) : (
              <div className="deck-empty-selection">
                <Truck size={36} />
                <strong>Avtomobil seçilməyib</strong>
                <p>Plandakı zolaqdan və ya siyahıdan nəqliyyat vasitəsini seçin.</p>
              </div>
            )}
          </AnimatePresence>
        </aside>
      </div>

      {/* Full Declaration Modal */}
      {linkedDecl && selectedVehicle && (
        <Modal
          open={declModalOpen}
          onClose={() => setDeclModalOpen(false)}
          title={`Gömrük Bəyannaməsi (EGB) · ${linkedDecl.kod}`}
        >
          <DeclarationDocumentView
            declaration={{
              ...linkedDecl,
              avtomobil: selectedVehicle.nomre,
            }}
            vehiclePlate={selectedVehicle.nomre}
          />
        </Modal>
      )}
    </section>
  )
}

// Individual Deck Card Component for Lane View
type CardProps = {
  vehicle: DeckVehicle & {
    bayNumber: string
    lane: string
    isRegistered: boolean
    isInspected: boolean
    workflowStatus: VehicleWorkflowStatus
    weightTons: string
    country: { code: string; color: string }
  }
  isSelected: boolean
  onSelect: () => void
}

function DeckVehicleCard({ vehicle, isSelected, onSelect }: CardProps) {
  return (
    <button
      type="button"
      className={`deck-vehicle-card ${isSelected ? 'selected' : ''} ${
        vehicle.workflowStatus === 'completed' ? 'registered' : ''
      } ${vehicle.workflowStatus === 'inspected' ? 'inspected' : ''}`}
      onClick={onSelect}
      aria-label={`${vehicle.nomre}: ${vehicle.marka}, ${vehicle.yuk}, ${
        vehicle.workflowStatus === 'completed' ? 'tamamlanmış' : vehicle.workflowStatus === 'inspected' ? 'yoxlamada' : 'gözləyən'
      }`}
    >
      {/* Top row: Bay and Flag + Plate */}
      <div className="card-top-row">
        <span className="slot-bay-label">{vehicle.bayNumber}</span>
        <div className="slot-plate-wrap">
          <span className="slot-country-tag" style={{ backgroundColor: vehicle.country.color }}>
            {vehicle.country.code}
          </span>
          <strong className="slot-plate-num">{vehicle.nomre}</strong>
        </div>
        {vehicle.workflowStatus === 'completed' && (
          <span className="slot-status-icon success" title="Qeydiyyatdan keçib">
            <CheckCircle2 size={13} />
          </span>
        )}
      </div>

      {/* Middle row: Brand and Cargo */}
      <div className="card-mid-row">
        <div className="card-model-row">
          <Truck size={12} className="model-truck-icon" />
          <span className="model-name">{vehicle.marka}</span>
          <span className="weight-tag">{vehicle.weightTons} t</span>
        </div>
        <div className="card-cargo-preview" title={vehicle.yuk}>
          <Container size={11} className="cargo-box-icon" />
          <span className="cargo-title">{vehicle.yuk}</span>
        </div>
      </div>

      {/* Bottom row: Driver & Destination */}
      <div className="card-bottom-row">
        <span className="driver-name">{vehicle.surucu}</span>
        <span className="route-arrow">
          {vehicle.menshe} → {vehicle.teyinat}
        </span>
      </div>
    </button>
  )
}
