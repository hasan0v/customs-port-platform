import { useState } from 'react'
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, Tooltip } from 'react-leaflet'
import { gemiler, limanlar } from '../data/mockData'
import { useAppStore } from '../store/useAppStore'
import { Modal, StatusBadge } from './UI'
import ShipScene3D from './ShipScene3D'

const routeColor = '#00B4D8'
export default function SeaMap({ compact = false }: { compact?: boolean }) {
  const { ships } = useAppStore()
  const [selected, setSelected] = useState<(typeof gemiler)[number] | null>(null)
  return <div className={`sea-map ${compact ? 'compact-map' : ''}`}>
    <MapContainer center={[41.1, 50.9]} zoom={6} minZoom={6} maxZoom={12} scrollWheelZoom className="leaflet-map">
      <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {limanlar.slice(1).map(l => <Polyline key={l.ad} positions={[[limanlar[0].lat, limanlar[0].lng], [l.lat, l.lng]]} pathOptions={{ color: routeColor, dashArray: '7 10', opacity: .55, weight: 2 }} />)}
      {limanlar.map(l => <CircleMarker key={l.ad} center={[l.lat, l.lng]} radius={l.esas ? 11 : 7} pathOptions={{ color: l.esas ? '#F4A261' : '#0A4D8C', fillColor: l.esas ? '#F4A261' : '#00B4D8', fillOpacity: .9 }}><Tooltip permanent direction="top">{l.ad}</Tooltip></CircleMarker>)}
      {ships.slice(0, compact ? 6 : 10).map((g, i) => <CircleMarker eventHandlers={{ click: () => setSelected(g) }} key={g.id} center={[g.lat, g.lng]} radius={7} className="ship-marker" pathOptions={{ color: '#fff', fillColor: i % 3 === 0 ? '#2A9D8F' : '#0A4D8C', fillOpacity: 1, weight: 2 }}><Tooltip>{g.ad} · {g.id}<br />{g.yuk}</Tooltip><Popup><strong>{g.ad}</strong><br />{g.status} · {g.suret} düyün</Popup></CircleMarker>)}
    </MapContainer>
    <div className="map-overlay"><span>AIS XƏRİTƏSİ</span></div>
    <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.ad || ''}>{selected && <div className="ship-detail"><div className="ship-visual premium-ship-visual"><ShipScene3D compact name={selected.ad} course={`${Math.round(selected.suret * 6)}°`} /></div><StatusBadge status={selected.status} /><dl><div><dt>IMO kodu</dt><dd>{selected.id}</dd></div><div><dt>Yük</dt><dd>{selected.yuk}</dd></div><div><dt>Mənşə</dt><dd>{selected.menshe}</dd></div><div><dt>Sürət</dt><dd>{selected.suret} düyün</dd></div><div><dt>Tonaj</dt><dd>{selected.tonaj.toLocaleString('az-AZ')} ton</dd></div><div><dt>Kanal</dt><dd>{selected.kanal}</dd></div></dl></div>}</Modal>
  </div>
}
