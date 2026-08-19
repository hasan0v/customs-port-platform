import { toast } from 'sonner'
import type { Declaration } from '../data/mockData'
import { useAppStore } from '../store/useAppStore'

const num = (value: number, digits = 2) =>
  new Intl.NumberFormat('az-AZ', { maximumFractionDigits: digits }).format(value)

function formatDate(d: Declaration) {
  if (d.qeydiyyatTarixi) return d.qeydiyyatTarixi
  if (/^\d{4}-\d{2}-\d{2}$/.test(d.tarix)) {
    const [y, m, day] = d.tarix.split('-')
    return `${day}.${m}.${y}`
  }
  return d.tarix
}

type Row = { label: string; value: string }

function InfoTable({ rows }: { rows: Row[] }) {
  return (
    <table className="decl-info-table">
      <tbody>
        {rows.map(row => (
          <tr key={row.label}>
            <th>{row.label}</th>
            <td>{row.value || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function DeclarationDocumentView({
  declaration: initialDecl,
  compact = false,
  vehiclePlate,
  onStatusChange,
}: {
  declaration: Declaration
  compact?: boolean
  vehiclePlate?: string
  onStatusChange?: (status: string) => void
}) {
  const updateDeclaration = useAppStore(state => state.updateDeclaration)
  const storeDecl = useAppStore(state => state.declarations.find(b => b.kod === initialDecl.kod))
  const d = storeDecl || initialDecl

  const handleStatusChange = (newStatus: string) => {
    updateDeclaration(d.kod, { status: newStatus })
    onStatusChange?.(newStatus)
    toast.success(`Bəyannamə № ${d.kod} statusu yeniləndi: ${newStatus}`)
  }

  const item = d.mallar[0]
  const gonderen = d.gonderen ?? d.satici
  const gonderenOlke = d.gonderenOlke ?? d.saticiOlke
  const brokerLine = [
    d.broker,
    d.brokerVun ? `(VÖEN: ${d.brokerVun})` : '',
  ].filter(Boolean).join(' ')
  const operatorLine = [
    d.gomrukResmilikAparan,
    d.attestatNo ? `(Attestat №: ${d.attestatNo}${d.attestatTarixi ? `, Tarix: ${d.attestatTarixi}` : ''})` : '',
  ].filter(Boolean).join(' ')

  const adminRows: Row[] = [
    { label: 'Bəyannamənin tipi (Qr. 1)', value: d.senedNovu ?? (d.gomrukRejimi === '80 00 00' ? 'İD 80 (Tranzit)' : 'İD 40 (İdxal)') },
    { label: 'Sorğu / Bəyannamə №', value: d.kod },
    { label: 'Tarix və vaxt', value: formatDate(d) },
    { label: 'Göndərən / İxracatçı (Qr. 2)', value: gonderen ? `"${gonderen}"${gonderenOlke ? `, ${gonderenOlke}` : ''}` : '—' },
    { label: 'Malı qəbul edən / İdxalatçı (Qr. 8)', value: d.alici ? `"${d.alici}"${d.aliciOlke ? `, ${d.aliciOlke}` : ''}` : '—' },
    { label: 'Bəyannaməçi / Təmsilçi (Qr. 14)', value: [brokerLine, d.brokerUnvan].filter(Boolean).join('\n') },
    { label: 'Göndərən ölkə (Qr. 15)', value: d.gonderenOlke ?? d.ticaretolke ?? '—' },
    { label: 'Təyinat ölkəsi (Qr. 17)', value: d.aliciOlke ?? 'Qazaxıstan' },
    {
      label: 'Sərhəddəki nəqliyyat vasitəsi (Qr. 18/21)',
      value: (vehiclePlate || d.serhedNeqliyyat || d.avtomobil || '').trim() || '—',
    },
    { label: 'Sərhəd gömrük orqanı (Qr. 29)', value: d.serhedKecmeMentegesi ?? '00204 Qırmızı körpü g/p' },
    { label: 'Təyinat gömrük orqanı (Qr. 30)', value: d.teyinatGomrukOrqani ?? '13005 Beynəlxalq Dəniz Ticarət Limanı g/p' },
    { label: 'Gömrük rəsmiləşdirilməsini aparan şəxs (Qr. 54)', value: operatorLine || '—' },
    { label: 'Əlaqəli B/L və ya CMR qaiməsi', value: d.billOfLading ? `B/L: ${d.billOfLading}${d.vehicleOrder ? ` · Order: ${d.vehicleOrder}` : ''}` : '—' },
  ]

  const goodsRows: Row[] = [
    { label: 'Malın sıra nömrəsi və adı (Qr. 31)', value: `1. ${item.ad}` },
    { label: 'Yer və bağlama sayı', value: `${item.miqdar} ${item.olcuVahidi}` },
    { label: 'Malın kodu - XİF MN (Qr. 33)', value: (item.xifMnKodu ?? item.hsKod).replace(/(\d{6})(\d+)/, '$1 $2') },
    { label: 'Brutto çəki (Qr. 35)', value: item.bruttoCeki != null ? `${num(item.bruttoCeki)} kq` : '—' },
    { label: 'Netto çəki (Qr. 38)', value: item.netCeki != null ? `${num(item.netCeki)} kq` : '—' },
    { label: 'Mənşə ölkəsi (Qr. 34)', value: item.menşe ?? d.menseOlke ?? '—' },
    { label: 'İnvoys dəyəri və valyuta (Qr. 22)', value: d.invoysDeyer ? `${num(d.invoysDeyer)} ${d.valyuta === 'AZN' && d.valyutaMezennesi && d.valyutaMezennesi !== 1 ? (d.valyutaMezennesi > 1 ? 'EUR' : 'KZT') : d.valyuta}` : '—' },
    { label: 'Rəsmi valyuta məzənnəsi (Qr. 23)', value: d.valyutaMezennesi ? `${d.valyutaMezennesi.toFixed(4)} AZN` : '1.7000 AZN' },
    { label: 'Ümumi gömrük dəyəri (Qr. 45/46)', value: `${num(d.umumiDeyer)} AZN` },
    { label: 'Statistik dəyər (Qr. 46)', value: d.statistikDeyer ? `${num(d.statistikDeyer)} USD` : '—' },
    { label: 'Əməliyyat / Prosedur kodu (Qr. 37)', value: d.gomrukRejimi ?? '80 00 00' },
  ]

  return (
    <div className={`decl-doc-view${compact ? ' compact' : ''}`}>
      <header className="decl-doc-head">
        <div>
          <small>AZƏRBAYCAN RESPUBLİKASI DÖVLƏT GÖMRÜK KOMİTƏSİ</small>
          <strong>{d.senedNovu ?? 'GÖMRÜK BƏYANNAMƏSİ'} · {d.kod}</strong>
          <span>Sorğu qeydiyyatı: {formatDate(d)} · {d.source ?? 'Elektron Vahid Pəncərə'}</span>
        </div>
        <div className="decl-head-status-wrap">
          <label className="decl-status-label">Bəyannamə / Yük Statusu</label>
          <select
            className={`decl-status-select ${d.status === 'Təsdiqlənib' ? 'approved' : d.status === 'Risk nəzarəti' ? 'risk' : 'review'}`}
            value={d.status}
            onChange={e => handleStatusChange(e.target.value)}
          >
            <option value="Təsdiqlənib">🟢 Təsdiqlənib (Yaşıl Dəhliz)</option>
            <option value="Yoxlamada">🟡 Yoxlamada (Sarı Dəhliz)</option>
            <option value="Gözləmədə">🟡 Gözləmədə (Əlavə baxış)</option>
            <option value="Risk nəzarəti">🔴 Risk nəzarəti (Qırmızı Dəhliz)</option>
          </select>
        </div>
      </header>

      <section className="decl-doc-section">
        <h3><span>01</span> Ümumi və İnzibati Məlumatlar (Qrafalar 1–30)</h3>
        <InfoTable rows={adminRows} />
      </section>

      <section className="decl-doc-section">
        <h3><span>02</span> Mal və Dəyər Spesifikasiyası (Qrafalar 31–46)</h3>
        {d.mallar.length > 1 && (
          <div className="decl-goods-list">
            {d.mallar.map((mal, idx) => (
              <article key={`${mal.hsKod}-${idx}`}>
                <b>{idx + 1}. {mal.ad}</b>
                <small>XİF {mal.xifMnKodu ?? mal.hsKod} · {mal.miqdar} {mal.olcuVahidi} · {num(mal.deyer)} AZN</small>
              </article>
            ))}
          </div>
        )}
        <InfoTable rows={goodsRows} />
      </section>

      {/* Qr 47 Gömrük ödənişləri */}
      {d.odemeler && d.odemeler.length > 0 && (
        <section className="decl-doc-section">
          <h3><span>03</span> Hesablanmış Gömrük Ödənişləri (Qrafa 47)</h3>
          <table className="decl-payments-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginTop: 8 }}>
            <thead>
              <tr style={{ background: 'var(--bg-accent, rgba(0,0,0,0.04))', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '6px 10px' }}>Növ (Kod)</th>
                <th style={{ padding: '6px 10px', textAlign: 'right' }}>Hesablama bazası</th>
                <th style={{ padding: '6px 10px', textAlign: 'right' }}>Tarif dərəcəsi</th>
                <th style={{ padding: '6px 10px', textAlign: 'right' }}>Məbləğ (AZN)</th>
                <th style={{ padding: '6px 10px', textAlign: 'center' }}>ÖÜ</th>
              </tr>
            </thead>
            <tbody>
              {d.odemeler.map((p, idx) => (
                <tr key={`${p.kod}-${idx}`} style={{ borderBottom: '1px solid var(--border, #e5e7eb)' }}>
                  <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontWeight: 600 }}>
                    {p.kod === '01' ? '01 - Gömrük yığımı' : p.kod === '03' ? '03 - Əlavə vərəq yığımı' : p.kod === '20' ? '20 - İdxal gömrük rüsumu' : p.kod === '32' ? '32 - Əlavə Dəyər Vergisi (18%)' : p.kod === '75' ? '75 - Gömrük xidməti haqqı' : p.kod === '85' ? '85 - Elektron xidmət haqqı' : `${p.kod} - Digər ödəniş`}
                  </td>
                  <td style={{ padding: '6px 10px', textAlign: 'right' }}>{p.hesablamaEsasi ? num(p.hesablamaEsasi) : '—'}</td>
                  <td style={{ padding: '6px 10px', textAlign: 'right' }}>{p.faizVeyaTarif}</td>
                  <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700 }}>{num(p.mebleg)} AZN</td>
                  <td style={{ padding: '6px 10px', textAlign: 'center', fontFamily: 'monospace' }}>{p.od}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 700, borderTop: '2px solid var(--border)' }}>
                <td colSpan={3} style={{ padding: '8px 10px' }}>YEKUN GÖMRÜK ÖDƏNİŞLƏRİ CƏMİ:</td>
                <td style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--primary, #0A4D8C)' }}>
                  {num(d.odemeler.reduce((s, p) => s + p.mebleg, 0))} AZN
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </section>
      )}

      {/* Təqdim olunan sənədlər */}
      <section className="decl-doc-section">
        <h3><span>04</span> Təqdim Olunan Sənədlər (Qrafa 44)</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 12 }}>
          <span style={{ padding: '4px 8px', background: 'var(--bg-accent, rgba(0,0,0,0.05))', borderRadius: 4, border: '1px solid var(--border)' }}>
            <strong>2015</strong> — Beynəlxalq CMR / Nəqliyyat qaiməsi
          </span>
          <span style={{ padding: '4px 8px', background: 'var(--bg-accent, rgba(0,0,0,0.05))', borderRadius: 4, border: '1px solid var(--border)' }}>
            <strong>4041</strong> — Kommersiya İnvoysu / Hesab-faktura
          </span>
          <span style={{ padding: '4px 8px', background: 'var(--bg-accent, rgba(0,0,0,0.05))', borderRadius: 4, border: '1px solid var(--border)' }}>
            <strong>8001</strong> — Mənşə Sertifikatı / Tranzit icazəsi
          </span>
        </div>
      </section>

      <footer className="decl-doc-note">
        Təsdiq: GB-də göstərilən məlumatlar rəsmi elektron reyestr ilə tam uyğundur. Bəyannaməçi: <strong>{d.broker}</strong>
      </footer>
    </div>
  )
}

