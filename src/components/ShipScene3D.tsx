export default function ShipScene3D({ compact = false, name = 'SHAHDAG RORO', course = '074°' }: { compact?: boolean; name?: string; course?: string }) {
  return <figure
    className={`ship-scene-3d ${compact ? 'compact' : ''}`}
    aria-label={`${name} gəmisinin üçölçülü vizual modeli`}
  >
    <div className="scene-grid" />
    <div className="scene-glow" />
    <div className="scan-beam" />
    <div className="radar-rings"><i/><i/><i/></div>
    <svg className="vessel-model" viewBox="0 0 720 360" role="img">
      <defs>
        <linearGradient id="hullTop" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#f7fbff"/><stop offset=".5" stopColor="#b9d0e3"/><stop offset="1" stopColor="#6f8ba5"/></linearGradient>
        <linearGradient id="hullSide" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#1e587d"/><stop offset=".58" stopColor="#0a3559"/><stop offset="1" stopColor="#041e36"/></linearGradient>
        <linearGradient id="deck" x1="0" x2="1"><stop stopColor="#d8e7f2"/><stop offset="1" stopColor="#829caf"/></linearGradient>
        <linearGradient id="glass" x1="0" x2="1"><stop stopColor="#78e7ff" stopOpacity=".95"/><stop offset="1" stopColor="#0b6d99" stopOpacity=".8"/></linearGradient>
        <linearGradient id="containerA" x1="0" x2="0" y2="1"><stop stopColor="#ffb25c"/><stop offset="1" stopColor="#d66c2a"/></linearGradient>
        <linearGradient id="containerB" x1="0" x2="0" y2="1"><stop stopColor="#28c7cf"/><stop offset="1" stopColor="#08788d"/></linearGradient>
        <linearGradient id="wake" x1="0" x2="1"><stop stopColor="#63e6ff" stopOpacity="0"/><stop offset=".6" stopColor="#63e6ff" stopOpacity=".55"/><stop offset="1" stopColor="white" stopOpacity=".05"/></linearGradient>
        <filter id="shipShadow"><feGaussianBlur stdDeviation="12"/></filter>
      </defs>
      <ellipse cx="390" cy="293" rx="245" ry="28" fill="#001426" opacity=".45" filter="url(#shipShadow)"/>
      <path d="M48 274 C170 249 285 253 415 277 C509 294 590 293 690 263" fill="none" stroke="url(#wake)" strokeWidth="9" strokeLinecap="round" opacity=".7"/>
      <path d="M77 298 C212 278 310 283 430 300 C520 313 598 308 681 286" fill="none" stroke="#4cdcf4" strokeWidth="2" strokeDasharray="8 13" opacity=".42"/>
      <path d="M128 205 L619 205 L682 244 L604 280 L205 280 L83 244 Z" fill="url(#hullSide)" stroke="#72d8ed" strokeOpacity=".34" strokeWidth="2"/>
      <path d="M128 205 L594 205 L654 231 L566 253 L179 253 L83 244 Z" fill="url(#hullTop)"/>
      <path d="M179 253 L566 253 L654 231 L682 244 L604 280 L205 280 L83 244 Z" fill="url(#hullSide)" opacity=".82"/>
      <path d="M133 196 L575 196 L610 207 L565 220 L164 220 L112 207 Z" fill="url(#deck)"/>
      <g className="containers">
        <g transform="translate(239 147)"><path d="M0 12 61 0l42 13-62 13Z" fill="#ffc778"/><path d="m0 12 41 14v36L0 48Z" fill="url(#containerA)"/><path d="m41 26 62-13v35L41 62Z" fill="#9f4d22"/><path d="M8 18v27m10-24v28m10-25v28" stroke="#ffd29b" strokeWidth="2" opacity=".55"/></g>
        <g transform="translate(337 149)"><path d="M0 12 61 0l42 13-62 13Z" fill="#63e7eb"/><path d="m0 12 41 14v36L0 48Z" fill="url(#containerB)"/><path d="m41 26 62-13v35L41 62Z" fill="#07596c"/><path d="M8 18v27m10-24v28m10-25v28" stroke="#90f3f5" strokeWidth="2" opacity=".55"/></g>
        <g transform="translate(427 150)"><path d="M0 12 61 0l42 13-62 13Z" fill="#ff8e8f"/><path d="m0 12 41 14v36L0 48Z" fill="#ca3d50"/><path d="m41 26 62-13v35L41 62Z" fill="#8e2436"/><path d="M8 18v27m10-24v28m10-25v28" stroke="#ffb4b4" strokeWidth="2" opacity=".55"/></g>
      </g>
      <g className="bridge">
        <path d="M142 129 L218 112 L267 127 L245 195 L145 195 Z" fill="#dcebf4"/>
        <path d="M218 112 L267 127 L267 183 L245 195 L245 141 Z" fill="#8aa4b7"/>
        <path d="M153 140 L215 126 L238 133 L226 151 L155 164 Z" fill="url(#glass)"/>
        <path d="M154 171 L224 158 L222 171 L154 184 Z" fill="#79dff0" opacity=".55"/>
        <path d="M181 120v-43" stroke="#c9e3ee" strokeWidth="5"/><path d="M181 79h25M181 91h-20" stroke="#68d9ec" strokeWidth="3"/>
        <circle cx="181" cy="74" r="5" fill="#ffbf65"/>
        <path d="M197 113 205 83l16 27" fill="none" stroke="#a4bdcb" strokeWidth="3"/>
      </g>
      <path d="M111 230 641 230" stroke="#5ee2f4" strokeWidth="2" opacity=".6"/><path d="M153 258 583 258" stroke="#03182a" strokeWidth="4" opacity=".55"/>
      {[235,285,335,385,435,485,535].map(x => <circle key={x} cx={x} cy="268" r="3.5" fill="#71d9eb" opacity=".72"/>)}
      <path d="M600 211 648 229 618 238" fill="#e8f5fb" opacity=".9"/>
      <text x="466" y="250" fill="#b8eaf2" fontSize="13" fontFamily="Inter" fontWeight="700" letterSpacing="2">{name.slice(0, 18)}</text>
    </svg>
    <div className="ship-hud ship-hud-left"><small>GƏMİ</small><strong>{name.slice(0, 12)}</strong></div>
    <div className="ship-hud ship-hud-right"><small>KURS</small><strong>{course}</strong><span>12.4 KNOT</span></div>
    <div className="ship-depth"><span>0m</span><i/><i/><i/><span>12m</span></div>
  </figure>
}
