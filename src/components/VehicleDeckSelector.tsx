import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Anchor, ArrowRight, CheckCircle2, ChevronRight, CircleDot, Container,
  FileCheck, FileText, Filter, Layers, List, Navigation, Search,
  ShieldAlert, ShieldCheck, Ship, Truck, UserCheck, Waves,
} from 'lucide-react'
import type { Avtomobil as DeckVehicle } from '../data/mockData'

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
}

type DeckLane = 'all' | 'port' | 'center' | 'starboard'
type StatusFilter = 'all' | 'pending' | 'completed' | 'inspected'

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
}: Props) {
  const [viewMode, setViewMode] = useState<'deck' | 'list'>('deck')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLane, setSelectedLane] = useState<DeckLane>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

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
      const weightTons = (18 + (idx * 1.7) % 12).toFixed(1)

      return {
        ...vehicle,
        bayNumber,
        lane,
        isRegistered,
        isInspected,
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

      let matchStatus = true
      if (statusFilter === 'completed') matchStatus = v.isRegistered
      else if (statusFilter === 'pending') matchStatus = !v.isRegistered
      else if (statusFilter === 'inspected') matchStatus = v.isInspected

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

  // Summary counts
  const totalCount = deckVehicles.length
  const registeredCount = deckVehicles.filter(v => v.isRegistered).length
  const pendingCount = totalCount - registeredCount
  const inspectedCount = deckVehicles.filter(v => v.isInspected).length

  return (
    <section className="vehicle-deck-selector" aria-label="Ro-Ro gəmisində avtomobil və manifest nəzarəti">
      {/* Top Header */}
      <div className="deck-selector-head">
        <div className="head-main">
          <span className="deck-title-eyebrow">
            <Anchor size={13} />
            RO-RO MANİFESTİ & GÖYƏRTƏ NƏZARƏTİ
          </span>
          <h2>Gəmi göyərtəsi və TIR yerləşmə planı</h2>
          <p>
            {ship.ad} ({ship.id}) göyərtəsindəki bütün nəqliyyat vasitələrinin zolaqlar üzrə manifest məlumatları.
            Birbaşa TIR-ı seçərək qeydiyyata başlaya bilərsiniz.
          </p>
        </div>

        {/* Live Counters */}
        <div className="deck-kpi-strip">
          <div className="deck-kpi-pill total">
            <Truck size={14} />
            <div>
              <strong>{totalCount}</strong>
              <small>Göyərtədə TIR</small>
            </div>
          </div>
          <div className="deck-kpi-pill completed">
            <CheckCircle2 size={14} />
            <div>
              <strong>{registeredCount}</strong>
              <small>Qeydiyyatdan keçib</small>
            </div>
          </div>
          <div className="deck-kpi-pill pending">
            <CircleDot size={14} />
            <div>
              <strong>{pendingCount}</strong>
              <small>Gözləyir</small>
            </div>
          </div>
          {inspectedCount > 0 && (
            <div className="deck-kpi-pill alert">
              <ShieldAlert size={14} />
              <div>
                <strong>{inspectedCount}</strong>
                <small>Fiziki yoxlama</small>
              </div>
            </div>
          )}
        </div>
      </div>

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
              {/* Bow (Burun) Header */}
              <div className="deck-bow-header">
                <div className="bow-shape">
                  <Navigation size={12} className="bow-icon" />
                  <span>GƏMİ BURUN HİSSƏSİ (BOW) · ŞİMAL İSTİQAMƏTİ</span>
                </div>
              </div>

              {/* Lane Selector Filters */}
              <div className="lane-filter-tabs">
                <button
                  type="button"
                  className={`lane-tab ${selectedLane === 'all' ? 'active' : ''}`}
                  onClick={() => setSelectedLane('all')}
                >
                  Bütün Zolaqlar ({filteredVehicles.length})
                </button>
                <button
                  type="button"
                  className={`lane-tab ${selectedLane === 'port' ? 'active' : ''}`}
                  onClick={() => setSelectedLane('port')}
                >
                  <span className="lane-dot port" /> Sol Bort (Port) · {portLaneVehicles.length}
                </button>
                <button
                  type="button"
                  className={`lane-tab ${selectedLane === 'center' ? 'active' : ''}`}
                  onClick={() => setSelectedLane('center')}
                >
                  <span className="lane-dot center" /> Mərkəzi Zolaq · {centerLaneVehicles.length}
                </button>
                <button
                  type="button"
                  className={`lane-tab ${selectedLane === 'starboard' ? 'active' : ''}`}
                  onClick={() => setSelectedLane('starboard')}
                >
                  <span className="lane-dot starboard" /> Sağ Bort (Starboard) · {starboardLaneVehicles.length}
                </button>
              </div>

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

              {/* Stern Ramp (Körpü / Panto) Footer */}
              <div className="deck-stern-footer">
                <div className="stern-ramp-shape">
                  <Waves size={13} />
                  <span>KÖRPÜ PANDUSU (STERN RAMP) · ƏLƏT LİMANI BOŞALTMASI</span>
                </div>
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
                          {v.isRegistered ? (
                            <span className="status-chip success">
                              <CheckCircle2 size={11} /> Qeydiyyatda
                            </span>
                          ) : v.isInspected ? (
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
          <div className="deck-panel-vessel">
            <Ship size={18} />
            <div>
              <span>AKTİV RO-RO GƏMİSİ</span>
              <strong>{ship.ad}</strong>
              <small>{ship.id} · {ship.kanal}</small>
            </div>
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
                  {selectedVehicle.isRegistered && (
                    <span className="plate-badge-done">
                      <CheckCircle2 size={12} /> TƏSDİQ
                    </span>
                  )}
                </div>

                {/* Details Grid */}
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
                    <dt>Bill of Lading</dt>
                    <dd>{selectedVehicle.billOfLading || 'BL-245263'}</dd>
                  </div>
                  <div>
                    <dt>Marşrut</dt>
                    <dd>{selectedVehicle.menshe} → {selectedVehicle.teyinat}</dd>
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

                {/* Single Window Clearances Pill */}
                <div className="panel-clearances-box">
                  <small>VAHİD PƏNCƏRƏ İCAZƏLƏRİ</small>
                  <div className="clearance-tags-list">
                    <span className="clr-tag ok"><ShieldCheck size={11} /> DGK: Təsdiq</span>
                    <span className="clr-tag ok"><ShieldCheck size={11} /> DSX: Təsdiq</span>
                    <span className="clr-tag ok"><ShieldCheck size={11} /> AQTA: Təsdiq</span>
                    <span className="clr-tag ok"><ShieldCheck size={11} /> DDA: Təsdiq</span>
                  </div>
                </div>

                {/* Action CTA Button */}
                <button
                  type="button"
                  className="deck-open-registration-btn"
                  onClick={() => onSelect(selectedVehicle)}
                >
                  <span>Qeydiyyat Addımlarına Keç ({selectedVehicle.nomre})</span>
                  <ArrowRight size={15} />
                </button>
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
        vehicle.isRegistered ? 'registered' : ''
      } ${vehicle.isInspected ? 'inspected' : ''}`}
      onClick={onSelect}
      aria-label={`${vehicle.nomre}: ${vehicle.marka}, ${vehicle.yuk}`}
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
        {vehicle.isRegistered && (
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
