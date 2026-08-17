import { useMemo, useState, useEffect } from 'react'
import { Download, Eye, FileCheck2, Filter, Search, CircleCheck, FileText, PackageCheck, Printer, X } from 'lucide-react'
import { toast } from 'sonner'
import { useSearchParams } from 'react-router-dom'
import type { Declaration } from '../data/mockData'
import { useAppStore } from '../store/useAppStore'
import { Button, Card, PageHeader, StatusBadge } from '../components/UI'
import { DeclarationDocumentView } from '../components/DeclarationDocumentView'

const money = (value: number, currency: string) => new Intl.NumberFormat('az-AZ', { maximumFractionDigits: 2 }).format(value) + ` ${currency}`

export default function Declarations() {
  const { declarations } = useAppStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('Hamısı')
  const [selected, setSelected] = useState<Declaration | null>(null)
  const [page, setPage] = useState(1)
  const pageSize = 20
  const urlKod = searchParams.get('kod')

  useEffect(() => {
    if (urlKod) setSelected(declarations.find(b => b.kod === urlKod) ?? null)
  }, [urlKod, declarations])

  const rows = useMemo(() => declarations.filter(b =>
    (status === 'Hamısı' || b.status === status) &&
    `${b.kod} ${b.broker} ${b.avtomobil} ${b.alici}`.toLocaleLowerCase('az').includes(q.toLocaleLowerCase('az'))
  ), [q, status, declarations])

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const pagedRows = useMemo(
    () => rows.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [rows, currentPage],
  )

  useEffect(() => { setPage(1) }, [q, status])

  const exportCsv = () => {
    const header = 'GİB kodu,Tarix,Broker,Alıcı,Mal,Dəyər,Status\n'
    const content = rows.map(b => [b.kod, b.tarix, b.broker, b.alici, b.mallar[0].ad, money(b.umumiDeyer, b.valyuta), b.status].map(v => `"${v}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([header + content], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a'); link.href = url; link.download = 'elektron-beyannameler.csv'; link.click(); URL.revokeObjectURL(url)
    toast.success('Hesabat ixrac edildi')
  }

  const closeDetail = () => { setSelected(null); if (urlKod) setSearchParams({}) }
  const approved = declarations.filter(x => x.status === 'Təsdiqlənib').length

  return <>
    <PageHeader title="Bəyannamələr" action={<Button onClick={exportCsv}><Download/> Hesabatı ixrac et</Button>} />

    <section className="mini-stats material-kpis">
      <Card><FileText/><small>Cəmi</small><strong>{declarations.length}</strong></Card>
      <Card><CircleCheck/><small>Təsdiqlənib</small><strong>{approved}</strong></Card>
      <Card><PackageCheck/><small>Yoxlamada</small><strong>{declarations.filter(x => x.status === 'Yoxlamada').length}</strong></Card>
      <Card><Filter/><small>Risk nəzarəti</small><strong>{declarations.filter(x => x.status === 'Risk nəzarəti').length}</strong></Card>
    </section>

    <Card className="data-card declarations-table material-table" hover={false}>
      <header>
        <h2>Elektron bəyannamələr</h2>
        <div className="table-tools">
          <label><Search/><input value={q} onChange={e => setQ(e.target.value)} placeholder="Kod, broker və ya alıcı..."/></label>
          <select value={status} onChange={e => setStatus(e.target.value)} aria-label="Status üzrə filtr"><option>Hamısı</option><option>Təsdiqlənib</option><option>Yoxlamada</option><option>Risk nəzarəti</option><option>Arxivləşdirilib</option></select>
          <button onClick={() => { setQ(''); setStatus('Hamısı') }} aria-label="Filtrləri sıfırla"><Filter/></button>
        </div>
      </header>
      <div className="table-scroll"><table>
        <thead><tr><th>GİB kodu</th><th>Tarix</th><th>İştirakçılar</th><th>Mal</th><th>Gömrük dəyəri</th><th>Status</th><th><span className="sr-only">Detallar</span></th></tr></thead>
        <tbody>{pagedRows.map(b => <tr key={b.kod} className={b.source ? 'featured-row' : ''}>
          <td><strong>{b.kod}</strong>{b.source && <small className="reference-tag">İstinad sənədi</small>}</td>
          <td>{b.tarix}</td>
          <td><strong>{b.alici}</strong><small>{b.broker}</small></td>
          <td><strong>{b.mallar[0].ad}</strong><small>HS {b.mallar[0].hsKod}</small></td>
          <td><strong>{money(b.umumiDeyer, b.valyuta)}</strong><small>{b.mallar[0].miqdar} {b.mallar[0].olcuVahidi}</small></td>
          <td><StatusBadge status={b.status}/></td>
          <td><button className="row-action" onClick={() => setSelected(b)} aria-label={`${b.kod} detallarını aç`}><Eye/></button></td>
        </tr>)}
        {rows.length === 0 && <tr><td colSpan={7} className="empty-table-cell">Filtrə uyğun bəyannamə tapılmadı</td></tr>}
        </tbody>
      </table></div>
      {rows.length > pageSize && (
        <footer className="table-pagination" aria-label="Səhifələmə">
          <span>{(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, rows.length)} / {rows.length} bəyannamə</span>
          <div>
            <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Əvvəlki</button>
            <strong>{currentPage} / {pageCount}</strong>
            <button type="button" onClick={() => setPage(p => Math.min(pageCount, p + 1))} disabled={currentPage === pageCount}>Növbəti</button>
          </div>
        </footer>
      )}
    </Card>

    {selected && <DeclarationSheet declaration={selected} onClose={closeDetail}/>} 
  </>
}

function DeclarationSheet({ declaration: d, onClose }: { declaration: Declaration; onClose: () => void }) {
  return <div className="declaration-backdrop" role="dialog" aria-modal="true" aria-label="Bəyannamə detalları" onMouseDown={onClose}>
    <article className="declaration-sheet declaration-sheet-full" onMouseDown={e => e.stopPropagation()}>
      <header className="sheet-toolbar">
        <div><FileCheck2/><span><small>{d.senedNovu?.toUpperCase() ?? 'GÖMRÜK BƏYANNAMƏSİ'}</small><strong>{d.kod}</strong></span></div>
        <div><Button variant="ghost" onClick={() => window.print()}><Printer/> Çap et</Button><button onClick={onClose} aria-label="Bağla"><X/></button></div>
      </header>
      <div className="declaration-sheet-body">
        <DeclarationDocumentView declaration={d} />
      </div>
      <footer className="sheet-footer"><span><CircleCheck/> Elektron sənəd doğrulanıb</span><span>Son yenilənmə: {d.qeydiyyatTarixi ?? d.tarix}</span></footer>
    </article>
  </div>
}
