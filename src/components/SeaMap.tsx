import { useState } from 'react'
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, Tooltip } from 'react-leaflet'
import { gemiler, limanlar } from '../data/mockData'
import { useAppStore } from '../store/useAppStore'
import ShipDetailModal from './ShipDetailModal'

const routeColor = '#00B4D8'

export default function SeaMap({
  compact = false,
  visibleShips,
}: {
  compact?: boolean
  visibleShips?: typeof gemiler
}) {
  const { ships } = useAppStore()
  const [selected, setSelected] = useState<(typeof gemiler)[number] | null>(null)
  const displayedShips = visibleShips ?? ships

  return (
    <div className={`sea-map ${compact ? 'compact-map' : ''}`}>
      <MapContainer
        center={[41.1, 50.9]}
        zoom={6}
        minZoom={6}
        maxZoom={12}
        scrollWheelZoom
        className="leaflet-map"
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {limanlar.slice(1).map(l => (
          <Polyline
            key={l.ad}
            positions={[[limanlar[0].lat, limanlar[0].lng], [l.lat, l.lng]]}
            pathOptions={{ color: routeColor, dashArray: '7 10', opacity: 0.55, weight: 2 }}
          />
        ))}

        {limanlar.map(l => (
          <CircleMarker
            key={l.ad}
            center={[l.lat, l.lng]}
            radius={l.esas ? 11 : 7}
            pathOptions={{
              color: l.esas ? '#F4A261' : '#0A4D8C',
              fillColor: l.esas ? '#F4A261' : '#00B4D8',
              fillOpacity: 0.9,
            }}
          >
            <Tooltip permanent direction="top">{l.ad}</Tooltip>
          </CircleMarker>
        ))}

        {displayedShips.slice(0, compact ? 6 : 12).map((g, i) => {
          const isUnderway = g.status === 'Yolda'
          const isAnchored = g.status === 'Lövbərdə'
          const markerColor = isUnderway ? '#0A4D8C' : isAnchored ? '#e28a39' : '#2A9D8F'

          return (
            <CircleMarker
              eventHandlers={{ click: () => setSelected(g) }}
              key={g.id}
              center={[g.lat, g.lng]}
              radius={8}
              className="ship-marker"
              pathOptions={{
                color: '#fff',
                fillColor: markerColor,
                fillOpacity: 1,
                weight: 2.5,
              }}
            >
              <Tooltip direction="top" offset={[0, -8]}>
                <div className="map-ship-tooltip-text">
                  <strong>{g.ad}</strong>
                  <small>{g.novu} · {g.status}</small>
                  <span>{g.suret} düyün · {g.yuk}</span>
                </div>
              </Tooltip>

              <Popup>
                <div className="map-popup-card">
                  <div className="map-popup-head">
                    <strong>{g.ad}</strong>
                    <small>{g.id} · {g.bayraq}</small>
                  </div>
                  <div className="map-popup-meta">
                    <div><span>Status:</span> <b>{g.status}</b></div>
                    <div><span>Sürət:</span> <b>{g.suret} kn</b> ({Math.round(g.suret * 1.852)} km/s)</div>
                    <div><span>Yük:</span> <b>{g.yuk}</b></div>
                    <div><span>Mənşə:</span> <b>{g.menshe}</b></div>
                    <div><span>Kanal:</span> <b>{g.kanal}</b></div>
                  </div>
                  <button
                    type="button"
                    className="map-popup-btn"
                    onClick={() => setSelected(g)}
                  >
                    Detallı məlumatı aç →
                  </button>
                </div>
              </Popup>
            </CircleMarker>
          )
        })}
      </MapContainer>

      <div className="map-overlay">
        <span>AIS XƏRİTƏSİ · CANLI İZLƏMƏ</span>
        <small>{displayedShips.length} aktiv gəmi</small>
      </div>

      <ShipDetailModal
        ship={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}
