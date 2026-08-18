import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Anchor, ArrowRight, CheckCircle2, CircleDot, Container, Ship, Truck } from 'lucide-react'
import type { Avtomobil as DeckVehicle } from '../data/mockData'

type Ship = { id: string; ad: string; novu: string; menshe: string; kanal: string; girisTarixi: string }

type Props = {
  ship: Ship
  vehicles: DeckVehicle[]
  selectedPlate: string
  registeredPlates: string[]
  onSelect: (vehicle: DeckVehicle) => void
}

const DECK_SLOTS = Array.from({ length: 30 }, (_, index) => ({
  x: 32 + (index % 5) * 9,
  y: 30 + Math.floor(index / 5) * 9.2,
}))

export default function VehicleDeckSelector({ ship, vehicles, selectedPlate, registeredPlates, onSelect }: Props) {
  const reduceMotion = useReducedMotion()
  const deckVehicles = vehicles.slice(0, 30)
  const selected = deckVehicles.find(vehicle => vehicle.nomre === selectedPlate)
  const completed = new Set(registeredPlates)

  return (
    <section className="vehicle-deck-selector" aria-label="Ro-Ro gəmisində avtomobil seçimi">
      <div className="deck-selector-head">
        <div>
          <span className="deck-title-eyebrow">RO-RO MANİFESTİ</span>
          <h2><Anchor /> Gəmi göyərtəsi</h2>
          <p>Avtomobili plandakı yerindən seçin, manifest məlumatları avtomatik gətirilsin.</p>
        </div>
        <div className="deck-live-meta"><i /><span>{deckVehicles.length} avtomobil</span><small>{ship.kanal}</small></div>
      </div>

      <div className="deck-selector-layout">
        <div className="roro-deck-stage">
          <div className="deck-water" />
          <div className="roro-ship-wrap">
            <svg className="roro-ship-plan" viewBox="0 0 100 100" role="img" aria-label={`${ship.ad} gəmisinin göyərtə planı`}>
              <defs>
                <linearGradient id="deckHull" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#ecf8fb" /><stop offset=".5" stopColor="#b9d9e5" /><stop offset="1" stopColor="#79a7bd" /></linearGradient>
                <linearGradient id="deckSurface" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#416f87" /><stop offset="1" stopColor="#173d56" /></linearGradient>
                <filter id="deckShadow"><feGaussianBlur stdDeviation="2.2" /></filter>
              </defs>
              <ellipse cx="50" cy="91" rx="40" ry="4.5" fill="#021e33" opacity=".45" filter="url(#deckShadow)" />
              <path d="M28 5 Q50 -2 72 5 L88 21 V83 L75 95 H25 L12 83 V21 Z" fill="url(#deckHull)" stroke="#d6f0f6" strokeWidth="1.15" />
              <path d="M29 14 H71 L80 24 V79 L69 88 H31 L20 79 V24 Z" fill="url(#deckSurface)" stroke="#88cce0" strokeWidth=".7" />
              <path d="M50 17 V85" stroke="#d8f1f6" strokeOpacity=".4" strokeWidth=".55" strokeDasharray="2 2" />
              <path d="M25 31 H75 M23 40 H77 M22 49 H78 M21 58 H79 M20 67 H80 M20 76 H80" stroke="#c9e8f0" strokeOpacity=".24" strokeWidth=".5" />
              <path d="M31 28 V79 M41 28 V79 M59 28 V79 M69 28 V79" stroke="#c9e8f0" strokeOpacity=".18" strokeWidth=".4" />
              <rect x="43" y="17" width="14" height="8" rx="1.5" fill="#7bb4c7" opacity=".55" />
              <path d="M38 18 H62" stroke="#e7f8fb" strokeOpacity=".8" strokeWidth=".8" />
              <path d="M32 87 H68" stroke="#d9f2f7" strokeWidth="1.2" />
              <text x="50" y="10" textAnchor="middle" fill="#d9f7ff" fontSize="2.7" fontWeight="800" letterSpacing="1">RO-RO VEHICLE DECK</text>
              <text x="50" y="93" textAnchor="middle" fill="#b7eafa" fontSize="2.15" fontWeight="700" letterSpacing=".7">STERN RAMP · ƏLƏT</text>
            </svg>
            <span className="deck-bow-label">BOW</span>
            <span className="deck-stern-label">RAMP</span>
            <div className="deck-car-points">
              {deckVehicles.map((vehicle, index) => {
                const slot = DECK_SLOTS[index]
                const isSelected = vehicle.nomre === selectedPlate
                const isRegistered = completed.has(vehicle.nomre)
                return <motion.button
                  key={`${vehicle.kod}-${index}`}
                  type="button"
                  className={`deck-car-point${isSelected ? ' selected' : ''}${isRegistered ? ' registered' : ''}`}
                  style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
                  onClick={() => onSelect(vehicle)}
                  aria-label={`${vehicle.nomre}: ${vehicle.marka}. ${isRegistered ? 'Qeydiyyatdan keçib' : 'Qeydiyyat üçün seç'}`}
                  title={`${vehicle.nomre} · ${vehicle.marka}`}
                  initial={{ opacity: 0, scale: .5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: reduceMotion ? 0 : index * .018 }}
                  whileHover={reduceMotion ? undefined : { scale: 1.16 }}
                  whileTap={{ scale: .94 }}
                >
                  <Truck className="deck-truck-icon" />
                  {isRegistered && <CheckCircle2 className="deck-badge" />}
                </motion.button>
              })}
            </div>
          </div>
          <div className="deck-legend"><span><i className="available" /> Boş / qeydiyyat üçün</span><span><i className="active" /> Seçilmiş</span><span><i className="complete" /> Qeydiyyatdan keçib</span></div>
        </div>

        <aside className="deck-selection-panel" aria-live="polite">
          <div className="deck-panel-vessel"><Ship /><div><span>AKTİV GƏMİ</span><strong>{ship.ad}</strong><small>{ship.id} · {ship.kanal}</small></div></div>
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div key={selected.nomre} className="deck-selected-car" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                <span className="deck-selected-kicker"><CircleDot /> SEÇİLƏN AVTOMOBİL</span>
                <div className="deck-plate"><Truck /><strong>{selected.nomre}</strong>{completed.has(selected.nomre) && <em>Qeydiyyatdan keçib</em>}</div>
                <dl>
                  <div><dt>Marka / model</dt><dd>{selected.marka}</dd></div>
                  <div><dt>Sürücü</dt><dd>{selected.surucu}</dd></div>
                  <div><dt>Bill of Lading</dt><dd>{selected.billOfLading || '—'}</dd></div>
                  <div><dt>Marşrut</dt><dd>{selected.menshe} → {selected.teyinat}</dd></div>
                </dl>
                <div className="deck-cargo"><Container /><span><small>MANİFEST YÜKÜ</small><b>{selected.yuk}</b></span></div>
                <button type="button" className="deck-open-registration" onClick={() => onSelect(selected)}>Qeydiyyatı davam etdir <ArrowRight /></button>
              </motion.div>
            ) : (
              <motion.div className="deck-empty-selection" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Truck />
                <strong>Avtomobil seçin</strong>
                <p>Göyərtədəki nöqtəyə klikləyin. Sistem avtomobil, sürücü və yük məlumatlarını manifestdən açacaq.</p>
                <div className="deck-empty-guide"><span><b>1</b> Avtomobili seç</span><i /><span><b>2</b> Məlumatı yoxla</span></div>
              </motion.div>
            )}
          </AnimatePresence>
        </aside>
      </div>
    </section>
  )
}
