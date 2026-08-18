import ShipScene3D from './ShipScene3D'

export default function ShipHero() {
  return <section className="ship-hero hero-map cinematic-hero">
    <div className="hero-aurora" aria-hidden="true"><i/><i/><i/></div>
    <div className="hero-copy">
      <h1>Beynəlxalq dəniz ticarət limanı</h1>
    </div>
    <div className="hero-ship-stage">
      <ShipScene3D name="SHAHDAG RORO" course="074°"/>
      <div className="alat-beacon"><i/><span><strong>BEYNƏLXALQ LİMAN</strong></span></div>
    </div>
  </section>
}
