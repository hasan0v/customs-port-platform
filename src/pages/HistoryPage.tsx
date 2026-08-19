import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Download, FileDown, Filter, Scan, Search, SearchCode, Trash2, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '../store/useAppStore'
import { Button, Card, Modal, PageHeader, StatusBadge } from '../components/UI'

export type InspectorHistoryRow = {
  id: string
  plate: string
  declarationKod: string
  malAdi: string
  ceki: string
  qeydeAlınma: string
  buraxilis: string
  status: string
  inspektor: string
  source: 'registration' | 'declaration'
  waitChannel?: string | null
  waitReasons?: string[]
}

function formatWeight(mal: { netCeki?: number; bruttoCeki?: number; miqdar?: number; olcuVahidi?: string }) {
  if (mal.netCeki != null || mal.bruttoCeki != null) {
    const parts = [
      mal.netCeki != null ? `netto ${mal.netCeki.toLocaleString('az-AZ')} kq` : null,
      mal.bruttoCeki != null ? `brutto ${mal.bruttoCeki.toLocaleString('az-AZ')} kq` : null,
    ].filter(Boolean)
    return parts.join(' · ')
  }
  if (mal.miqdar != null) return `${mal.miqdar.toLocaleString('az-AZ')} ${mal.olcuVahidi || 'vahid'}`
  return '—'
}

function mapDeclarationStatus(status: string) {
  if (status.includes('Təsdiq') || status === 'Buraxıldı') return 'Buraxıldı'
  if (status.includes('İmtina')) return 'İmtina'
  if (status.includes('Risk')) return 'Gözləmədə'
  if (status.includes('Yoxlama') || status.includes('Gözlə') || status.includes('Yönləndir')) return 'Gözləmədə'
  if (status.includes('Arxiv')) return 'Arxivləşdirilib'
  return status
}

function isWaitingStatus(status: string) {
  return status === 'Gözləmədə' || status.includes('Yoxlama') || status.includes('Yönləndir') || status.includes('Risk')
}

function channelIcon(channel?: string | null) {
  if (!channel) return AlertTriangle
  if (channel.includes('X ray') || channel.includes('X-ray')) return Scan
  if (channel.includes('Kinoloji') || channel.includes('itin')) return SearchCode
  return Search
}

export default function HistoryPage() {
  const { registrations, declarations, profile, clearRegistrations } = useAppStore()
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('Hamısı')
  const [inspektorFilter, setInspektorFilter] = useState('Hamısı')
  const [waitDetail, setWaitDetail] = useState<InspectorHistoryRow | null>(null)
  const [page, setPage] = useState(1)
  const pageSize = 20

  /** Real inteqrasiya: təsdiqlənmiş qeydiyyatlar + sistem bəyannamələri */
  const allRows = useMemo(() => {
    const rows: InspectorHistoryRow[] = []
    const seenDecl = new Set<string>()

    registrations.forEach(r => {
      const decl = declarations.find(d => d.kod === r.declarationKod)
      const mal = decl?.mallar?.[0]
      seenDecl.add(r.declarationKod)
      const status = mapDeclarationStatus(r.status)
      rows.push({
        id: r.id,
        plate: r.plate || r.transport?.dovletNisani || decl?.avtomobil || '—',
        declarationKod: r.declarationKod,
        malAdi: r.malAdi || mal?.ad || '—',
        ceki: r.ceki || (mal ? formatWeight(mal) : '—'),
        qeydeAlınma: r.qeydeAlınma || decl?.qeydiyyatTarixi || decl?.tarix || r.savedAt,
        buraxilis: status === 'Gözləmədə' ? '—' : (r.buraxilis || r.savedAt),
        status,
        inspektor: r.operator || profile.name,
        source: 'registration',
        waitChannel: r.manualRoute || decl?.waitChannel,
        waitReasons: r.waitReasons?.length
          ? r.waitReasons
          : r.manualRoute
            ? [`Əlavə yoxlama kanalı: ${r.manualRoute}`, ...(r.riskReasons || [])]
            : r.riskReasons,
      })
    })

    declarations.forEach((d, i) => {
      if (seenDecl.has(d.kod)) return
      if (!d.avtomobil || d.avtomobil === '—') return
      const mal = d.mallar[0]
      const status = mapDeclarationStatus(d.status)
      const isReleased = status === 'Buraxıldı'
      rows.push({
        id: `decl-${d.kod}`,
        plate: d.avtomobil,
        declarationKod: d.kod,
        malAdi: mal?.ad || '—',
        ceki: mal ? formatWeight(mal) : '—',
        qeydeAlınma: d.qeydiyyatTarixi || d.tarix,
        buraxilis: isReleased ? (d.qeydiyyatTarixi || d.tarix) : '—',
        status,
        inspektor: d.gomrukResmilikAparan
          || (i % 3 === 0 ? profile.name : ['A. Məmmədli', 'N. Hüseynov', 'R. Şirəliyev'][i % 3]),
        source: 'declaration',
        waitChannel: d.waitChannel,
        waitReasons: d.waitReasons,
      })
    })

    return rows.sort((a, b) => String(b.qeydeAlınma).localeCompare(String(a.qeydeAlınma), 'az'))
  }, [registrations, declarations, profile.name])

  const inspectors = useMemo(
    () => ['Hamısı', ...Array.from(new Set(allRows.map(r => r.inspektor))).sort((a, b) => a.localeCompare(b, 'az'))],
    [allRows],
  )

  const statuses = useMemo(
    () => ['Hamısı', ...Array.from(new Set(allRows.map(r => r.status)))],
    [allRows],
  )

  const rows = useMemo(() => {
    const s = q.toLocaleLowerCase('az').trim()
    return allRows.filter(r => {
      if (statusFilter !== 'Hamısı' && r.status !== statusFilter) return false
      if (inspektorFilter !== 'Hamısı' && r.inspektor !== inspektorFilter) return false
      if (!s) return true
      return `${r.plate} ${r.declarationKod} ${r.malAdi} ${r.inspektor} ${r.status} ${r.waitChannel ?? ''}`
        .toLocaleLowerCase('az')
        .includes(s)
    })
  }, [allRows, q, statusFilter, inspektorFilter])

  const stats = useMemo(() => ({
    total: rows.length,
    released: rows.filter(r => r.status === 'Buraxıldı' || r.status.includes('Təsdiq')).length,
    waiting: rows.filter(r => isWaitingStatus(r.status)).length,
    mine: rows.filter(r => r.inspektor === profile.name).length,
  }), [rows, profile.name])

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const pagedRows = useMemo(
    () => rows.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [rows, currentPage],
  )

  useEffect(() => { setPage(1) }, [q, statusFilter, inspektorFilter])

  const exportCsv = () => {
    const header = 'Maşın nömrəsi,Bəyannamə nömrəsi,Malın adı,Çəkisi,Qeydə alınma tarixi,Buraxılış tarixi,Status,Gözləmə səbəbi,Kanal,İnspektor\n'
    const body = rows.map(r =>
      [
        r.plate, r.declarationKod, r.malAdi, r.ceki, r.qeydeAlınma, r.buraxilis, r.status,
        (r.waitReasons || []).join(' | '), r.waitChannel || '', r.inspektor,
      ]
        .map(v => `"${String(v).replace(/"/g, '""')}"`)
        .join(','),
    ).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['\uFEFF' + header + body], { type: 'text/csv;charset=utf-8' }))
    a.download = 'inspektor-kecmis.csv'
    a.click()
    toast.success(`${rows.length} qeyd ixrac edildi`)
  }

  const resetFilters = () => {
    setQ('')
    setStatusFilter('Hamısı')
    setInspektorFilter('Hamısı')
    toast.success('Filtrlər sıfırlandı')
  }

  const openWaitDetail = (r: InspectorHistoryRow) => {
    if (!isWaitingStatus(r.status)) return
    setWaitDetail(r)
  }

  const WaitIcon = channelIcon(waitDetail?.waitChannel)

  return <>
    <PageHeader
      title="İnspektorun fəaliyyəti"
      action={
        <div className="header-actions">
          <Button
            variant="ghost"
            disabled={registrations.length === 0}
            title={registrations.length === 0
              ? 'Təsdiqlənmiş qeydiyyat yoxdur'
              : 'Bu brauzerdə saxlanılan qeydiyyatları silir — sistem bəyannamələrinə toxunmur'}
            onClick={() => {
              if (!window.confirm(`${registrations.length} təsdiqlənmiş qeydiyyat bu brauzerdən silinsin?`)) return
              clearRegistrations()
              toast.success('Qeydiyyat qeydləri təmizləndi')
            }}
          >
            <Trash2 /> Qeydləri sıfırla ({registrations.length})
          </Button>
          <Button variant="ghost" onClick={() => window.print()}><FileDown /> PDF / Çap</Button>
          <Button onClick={exportCsv}><Download /> CSV ixrac</Button>
        </div>
      }
    />

    <section className="mini-stats inspector-kpis">
      <Card><small>Cəmi</small><strong>{stats.total}</strong></Card>
      <Card><small>Buraxıldı</small><strong>{stats.released}</strong></Card>
      <Card><small>Gözləmədə</small><strong>{stats.waiting}</strong></Card>
      <Card><small>Mənim qeydlərim</small><strong>{stats.mine}</strong></Card>
    </section>

    <Card className="data-card history-table material-table inspector-history-table" hover={false}>
      <header>
        <h2>Fəaliyyət jurnalı · {rows.length}</h2>
        <div className="table-tools">
          <label>
            <Search />
            <input
              placeholder="Maşın, bəyannamə, mal, inspektor..."
              value={q}
              onChange={e => setQ(e.target.value)}
            />
          </label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} aria-label="Status">
            {statuses.map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={inspektorFilter} onChange={e => setInspektorFilter(e.target.value)} aria-label="İnspektor">
            {inspectors.map(s => <option key={s}>{s}</option>)}
          </select>
          <button type="button" onClick={resetFilters} aria-label="Filtrləri sıfırla"><Filter /></button>
        </div>
      </header>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Maşın nömrəsi</th>
              <th>Bəyannamə nömrəsi</th>
              <th>Malın adı</th>
              <th>Çəkisi</th>
              <th>Qeydə alınma tarixi</th>
              <th>Buraxılış tarixi</th>
              <th>Status</th>
              <th>İnspektor</th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.map(r => {
              const waiting = isWaitingStatus(r.status)
              return (
                <tr key={r.id} className={r.source === 'registration' ? 'featured-row' : ''}>
                  <td><strong>{r.plate}</strong></td>
                  <td>
                    <strong>{r.declarationKod}</strong>
                    {r.source === 'registration' && <small className="reference-tag">Qeydiyyat</small>}
                  </td>
                  <td><span className="mal-cell">{r.malAdi}</span></td>
                  <td><small className="weight-cell">{r.ceki}</small></td>
                  <td>{r.qeydeAlınma}</td>
                  <td>{r.buraxilis}</td>
                  <td>
                    {waiting ? (
                      <button
                        type="button"
                        className="status-wait-btn"
                        onClick={() => openWaitDetail(r)}
                        title="Gözləmə səbəbini göstər"
                      >
                        <StatusBadge status={r.status} />
                        {r.waitChannel && <em className="wait-channel-hint">{r.waitChannel}</em>}
                      </button>
                    ) : (
                      <StatusBadge status={r.status} />
                    )}
                  </td>
                  <td>
                    <span className="inspector-cell">
                      <UserRound size={14} />
                      {r.inspektor}
                    </span>
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="empty-table-cell">
                  Filtrə uyğun qeyd yoxdur. Qeydiyyat tamamladıqdan sonra buraya düşəcək.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {rows.length > pageSize && (
        <footer className="table-pagination" aria-label="Səhifələmə">
          <span>{(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, rows.length)} / {rows.length} qeyd</span>
          <div>
            <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Əvvəlki</button>
            <strong>{currentPage} / {pageCount}</strong>
            <button type="button" onClick={() => setPage(p => Math.min(pageCount, p + 1))} disabled={currentPage === pageCount}>Növbəti</button>
          </div>
        </footer>
      )}
    </Card>

    <Modal open={!!waitDetail} onClose={() => setWaitDetail(null)} title="Gözləmə səbəbi">
      {waitDetail && (
        <div className="wait-reason-modal">
          <div className="wait-reason-hero">
            <span className="wait-reason-icon"><WaitIcon size={22} /></span>
            <div>
              <small>STATUS</small>
              <strong>Gözləmədə</strong>
              <p>
                {waitDetail.plate} · {waitDetail.declarationKod}
              </p>
            </div>
            <StatusBadge status="Gözləmədə" />
          </div>

          <dl className="wait-reason-meta">
            <div>
              <dt>Mal</dt>
              <dd>{waitDetail.malAdi}</dd>
            </div>
            <div>
              <dt>Çəki</dt>
              <dd>{waitDetail.ceki}</dd>
            </div>
            <div>
              <dt>Qeydə alınma</dt>
              <dd>{waitDetail.qeydeAlınma}</dd>
            </div>
            <div>
              <dt>İnspektor</dt>
              <dd>{waitDetail.inspektor}</dd>
            </div>
          </dl>

          {waitDetail.waitChannel && (
            <div className="wait-channel-box">
              <small>YÖNLƏNDİRMƏ KANALI</small>
              <strong>{waitDetail.waitChannel}</strong>
              <p>
                {waitDetail.waitChannel === 'Fiziki yoxlama' && 'Yük fiziki baxış / açılış yoxlamasına yönləndirilib.'}
                {waitDetail.waitChannel === 'X ray' && 'Yük skaner / rentgen (X-ray) yoxlamasına yönləndirilib.'}
                {(waitDetail.waitChannel.includes('Kinoloji') || waitDetail.waitChannel.includes('itin')) && 'Kinoloji itin tətbiqi ilə axtarış yoxlamasına yönləndirilib.'}
                {!['Fiziki yoxlama', 'X ray'].includes(waitDetail.waitChannel) && !waitDetail.waitChannel.includes('Kinoloji') && !waitDetail.waitChannel.includes('itin') && 'Əlavə nəzarət kanalına yönləndirilib.'}
              </p>
            </div>
          )}

          <div className="wait-reasons-list">
            <small>NİYƏ GÖZLƏMƏDƏDİR?</small>
            <ul>
              {(waitDetail.waitReasons && waitDetail.waitReasons.length > 0
                ? waitDetail.waitReasons
                : ['Səbəb qeyd olunmayıb — ümumi emal növbəsi']
              ).map(reason => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>

          <Button variant="ghost" onClick={() => setWaitDetail(null)}>Bağla</Button>
        </div>
      )}
    </Modal>
  </>
}
