import { useMemo, useState, useEffect } from 'react'
import {
  Download, Eye, FileCheck2, Filter, Search, CircleCheck, FileText,
  PackageCheck, Printer, X, Truck, ArrowRight, ArrowUpDown, ArrowDownToLine, ArrowUpFromLine,
  Building2, Globe, Shield, ShieldAlert, Ship, RotateCcw,
} from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { Declaration } from '../data/mockData'
import type { GemiIstiqameti } from '../data/mockData'
import { getShipDirection, getShipMovementSummary } from '../domain/ships'
import { useAppStore } from '../store/useAppStore'
import { Button, Card, PageHeader, StatusBadge } from '../components/UI'
import { DeclarationDocumentView } from '../components/DeclarationDocumentView'
import './Declarations.css'

const money = (value: number, currency = 'AZN') =>
  new Intl.NumberFormat('az-AZ', { maximumFractionDigits: 2 }).format(value) + ` ${currency}`

const num = (value: number) =>
  new Intl.NumberFormat('az-AZ', { maximumFractionDigits: 0 }).format(value)

type RejimFilter = 'Hamısı' | 'İD 80' | 'İD 40'
type SortField = 'tarix_desc' | 'deyer_desc' | 'deyer_asc' | 'ceki_desc'
type ShipDirection = GemiIstiqameti
type ShipDirectionFilter = 'Hamısı' | ShipDirection

export default function Declarations() {
  const navigate = useNavigate()
  const { declarations, ships } = useAppStore()
  const [searchParams, setSearchParams] = useSearchParams()

  const [shipDirection, setShipDirection] = useState<ShipDirectionFilter>('Hamısı')
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('Hamısı')
  const [rejim, setRejim] = useState<RejimFilter>('Hamısı')
  const [borderPost, setBorderPost] = useState('Hamısı')
  const [corridor, setCorridor] = useState('Hamısı')
  const [sortBy, setSortBy] = useState<SortField>('tarix_desc')
  const [selected, setSelected] = useState<Declaration | null>(null)
  const [page, setPage] = useState(1)
  const pageSize = 15

  const urlKod = searchParams.get('kod')
  useEffect(() => {
    if (urlKod) setSelected(declarations.find(b => b.kod === urlKod) ?? null)
  }, [urlKod, declarations])

  const directionCounts = useMemo(() => {
    const summary = getShipMovementSummary(ships)
    return { Hamısı: summary.total, Gedən: summary.Gedən, Gələn: summary.Gələn }
  }, [ships])

  const shipDirectionById = useMemo(
    () => new Map(ships.map(ship => [ship.id, getShipDirection(ship)] as const)),
    [ships],
  )

  const directionDeclarationCounts = useMemo(() => {
    let incoming = 0
    let outgoing = 0
    declarations.forEach(declaration => {
      const direction = declaration.gemiId ? shipDirectionById.get(declaration.gemiId) : undefined
      if (direction === 'Gələn') incoming += 1
      if (direction === 'Gedən') outgoing += 1
    })
    return { Hamısı: declarations.length, Gedən: outgoing, Gələn: incoming }
  }, [declarations, shipDirectionById])

  const directionDeclarations = useMemo(() => {
    if (shipDirection === 'Hamısı') return declarations
    return declarations.filter(declaration => (
      declaration.gemiId
        ? shipDirectionById.get(declaration.gemiId) === shipDirection
        : false
    ))
  }, [declarations, shipDirection, shipDirectionById])

  // Extract unique border posts and corridors from declarations
  const borderPostOptions = useMemo(() => {
    const set = new Set<string>()
    declarations.forEach(d => {
      if (d.serhedKecmeMentegesi) set.add(d.serhedKecmeMentegesi)
    })
    return ['Hamısı', ...Array.from(set)]
  }, [declarations])

  const corridorOptions = useMemo(() => {
    const set = new Set<string>()
    declarations.forEach(d => {
      const from = d.gonderenOlke || d.ticaretolke || 'Xarici ölkə'
      const to = d.aliciOlke || 'Qazaxıstan'
      set.add(`${from} → ${to}`)
    })
    return ['Hamısı', ...Array.from(set)]
  }, [declarations])

  // Filtering
  const filteredRows = useMemo(() => {
    return directionDeclarations.filter(b => {
      const isRejimMatch =
        rejim === 'Hamısı'
          ? true
          : rejim === 'İD 80'
          ? b.gomrukRejimi === '80 00 00' || b.senedNovu?.includes('80')
          : b.gomrukRejimi === '40 00 00' || b.senedNovu?.includes('40')

      const isStatusMatch = status === 'Hamısı' || b.status === status

      const isBorderMatch =
        borderPost === 'Hamısı' || (b.serhedKecmeMentegesi && b.serhedKecmeMentegesi.includes(borderPost.replace(' g/p', '')))

      const from = b.gonderenOlke || b.ticaretolke || 'Xarici ölkə'
      const to = b.aliciOlke || 'Qazaxıstan'
      const thisCorridor = `${from} → ${to}`
      const isCorridorMatch = corridor === 'Hamısı' || thisCorridor === corridor

      const searchLower = q.toLocaleLowerCase('az')
      const isSearchMatch =
        !q ||
        `${b.kod} ${b.broker} ${b.avtomobil} ${b.alici} ${b.gonderen || ''} ${b.mallar[0]?.ad || ''} ${b.mallar[0]?.hsKod || ''} ${b.billOfLading || ''}`
          .toLocaleLowerCase('az')
          .includes(searchLower)

      return isRejimMatch && isStatusMatch && isBorderMatch && isCorridorMatch && isSearchMatch
    })
  }, [directionDeclarations, q, status, rejim, borderPost, corridor])

  // Sorting
  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((a, b) => {
      if (sortBy === 'deyer_desc') return b.umumiDeyer - a.umumiDeyer
      if (sortBy === 'deyer_asc') return a.umumiDeyer - b.umumiDeyer
      if (sortBy === 'ceki_desc') {
        const cekiA = a.mallar[0]?.bruttoCeki || a.mallar[0]?.netCeki || 0
        const cekiB = b.mallar[0]?.bruttoCeki || b.mallar[0]?.netCeki || 0
        return cekiB - cekiA
      }
      // default: tarix_desc
      return (b.qeydiyyatTarixi || b.tarix).localeCompare(a.qeydiyyatTarixi || a.tarix)
    })
  }, [filteredRows, sortBy])

  // Pagination
  const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const pagedRows = useMemo(
    () => sortedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [sortedRows, currentPage],
  )

  useEffect(() => { setPage(1) }, [shipDirection, q, status, rejim, borderPost, corridor, sortBy])

  // KPI Calculations
  const totalValue = useMemo(() => directionDeclarations.reduce((sum, d) => sum + d.umumiDeyer, 0), [directionDeclarations])
  const transitDeclarations = useMemo(
    () => directionDeclarations.filter(d => d.gomrukRejimi === '80 00 00' || d.senedNovu?.includes('80')),
    [directionDeclarations],
  )
  const transitCount = transitDeclarations.length
  const transitValue = useMemo(() => transitDeclarations.reduce((sum, d) => sum + d.umumiDeyer, 0), [transitDeclarations])
  const approvedCount = useMemo(() => directionDeclarations.filter(d => d.status === 'Təsdiqlənib').length, [directionDeclarations])
  const inspectionCount = useMemo(() => directionDeclarations.filter(d => d.status !== 'Təsdiqlənib' && d.status !== 'Arxivləşdirilib').length, [directionDeclarations])

  const exportCsv = () => {
    const header = 'Bəyannamə №,Rejim,Tarix,Sərhəd G/P,Nəqliyyat,Göndərən,Alıcı,Broker,Mal,HS Kod,Brutto (kq),Gömrük Dəyəri (AZN),Status\n'
    const content = sortedRows.map(b => [
      b.kod,
      b.gomrukRejimi === '80 00 00' ? 'İD 80' : 'İD 40',
      b.qeydiyyatTarixi || b.tarix,
      b.serhedKecmeMentegesi || '00204 Qırmızı körpü',
      b.avtomobil,
      b.gonderen || b.satici,
      b.alici,
      b.broker,
      b.mallar[0]?.ad || '',
      b.mallar[0]?.hsKod || '',
      b.mallar[0]?.bruttoCeki || '',
      b.umumiDeyer,
      b.status,
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')

    const url = URL.createObjectURL(new Blob([header + content], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `gomruk-beyannameleri-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success(`${sortedRows.length} bəyannamə üzrə rəsmi hesabat ixrac edildi`)
  }

  const resetAllFilters = () => {
    setShipDirection('Hamısı')
    setQ('')
    setStatus('Hamısı')
    setRejim('Hamısı')
    setBorderPost('Hamısı')
    setCorridor('Hamısı')
    setSortBy('tarix_desc')
    toast.info('Bütün süzgəclər sıfırlandı')
  }

  const closeDetail = () => {
    setSelected(null)
    if (urlKod) setSearchParams({})
  }

  const hasActiveFilters = Boolean(shipDirection !== 'Hamısı' || q || status !== 'Hamısı' || rejim !== 'Hamısı' || borderPost !== 'Hamısı' || corridor !== 'Hamısı' || sortBy !== 'tarix_desc')

  return (
    <div className="declarations-page">
      <PageHeader
        title="Gömrük Bəyannamələri Reyestri"
        action={
          <div className="declarations-export">
            <Button variant="ghost" onClick={exportCsv}>
              <Download size={14} /> CSV İxrac et
            </Button>
          </div>
        }
      />

      {/* Gəmilərin İstiqaməti üzrə Tablar (Hamısı 13 gəmi / Gedən gəmilər 3 gəmi / Gələn gəmilər 10 gəmi) */}
      <div className="ship-direction-tabs" role="tablist" aria-label="Bəyannamələri gəmi istiqamətinə görə göstər">
        {(['Hamısı', 'Gedən', 'Gələn'] as const).map(direction => (
          <button
            type="button"
            role="tab"
            aria-selected={shipDirection === direction}
            className={shipDirection === direction ? 'active' : ''}
            onClick={() => setShipDirection(direction)}
            key={direction}
          >
            <span>
              {direction === 'Hamısı' ? <Ship /> : direction === 'Gedən' ? <ArrowUpFromLine /> : <ArrowDownToLine />}
            </span>
            <span>
              <strong>{direction === 'Hamısı' ? 'Hamısı' : `${direction} gəmilər`}</strong>
              <small>
                {directionCounts[direction]} gəmi
                <span aria-hidden="true">·</span>
                {directionDeclarationCounts[direction]} sənəd
              </small>
            </span>
          </button>
        ))}
      </div>

      {/* 4 Professional Gömrük Göstəriciləri (KPI Strip) */}
      <section className="declaration-kpis" aria-label="Bəyannamə göstəriciləri">
        <Card hover={false}>
          <FileText />
          <small>Cəmi Bəyannamə</small>
          <strong>{directionDeclarations.length} ədəd</strong>
          <span>
            Dəyər: {num(totalValue)} AZN
          </span>
        </Card>

        <Card hover={false}>
          <Globe />
          <small>İD 80 (Tranzit Rejimi)</small>
          <strong className="kpi-transit">{transitCount} ədəd</strong>
          <span>
            Tranzit: {num(transitValue)} AZN
          </span>
        </Card>

        <Card hover={false}>
          <CircleCheck />
          <small>Yaşıl Kanal (Təsdiq)</small>
          <strong className="kpi-approved">{approvedCount} ədəd</strong>
          <span>
            Rəsmiləşdirilmiş sənədlər
          </span>
        </Card>

        <Card hover={false}>
          <PackageCheck />
          <small>Nəzarət / Yoxlamada</small>
          <strong className={inspectionCount > 0 ? 'kpi-inspection' : ''}>{inspectionCount} ədəd</strong>
          <span>
            Fiziki & X-Ray yoxlaması
          </span>
        </Card>
      </section>

      {/* Zəngin və Praktik Gömrük Süzgəcləri Paneli */}
      <Card className="declarations-table" hover={false}>
        <header className="declarations-table-header">
          <div className="declarations-table-heading">
            <div>
              <h2>
                Gömrük Bəyannamələri Siyahısı <span>{sortedRows.length} sənəd</span>
              </h2>
              <p>
                Rəsmi İD 80 və İD 40 bəyannamələrinin sərhəd keçid və rəsmiləşmə parametrləri
              </p>
            </div>
          </div>

          {/* Süzgəclər Sətri */}
          <div className="declaration-filters">
            {/* Axtarış xanası */}
            <label className="declaration-search">
              <Search size={14} />
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Sorğu №, nəqliyyat, mal, broker..."
                aria-label="Bəyannamələrdə axtarış"
              />
            </label>

            {/* Rejim Filter */}
            <select
              value={rejim}
              onChange={e => setRejim(e.target.value as RejimFilter)}
              aria-label="Rejim üzrə filtr"
            >
              <option value="Hamısı">Bütün Rejimlər</option>
              <option value="İD 80">İD 80 (Tranzit)</option>
              <option value="İD 40">İD 40 (İdxal)</option>
            </select>

            {/* Sərhəd Gömrük Postu */}
            <select
              value={borderPost}
              onChange={e => setBorderPost(e.target.value)}
              aria-label="Sərhəd gömrük postu üzrə filtr"
            >
              <option value="Hamısı">Bütün Sərhəd Postları</option>
              {borderPostOptions.filter(x => x !== 'Hamısı').map(post => (
                <option key={post} value={post}>{post}</option>
              ))}
            </select>

            {/* Ölkə Dəhlizi */}
            <select
              value={corridor}
              onChange={e => setCorridor(e.target.value)}
              aria-label="Ölkə dəhlizi üzrə filtr"
            >
              <option value="Hamısı">Bütün Dəhlizlər (Ölkələr)</option>
              {corridorOptions.filter(x => x !== 'Hamısı').map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Status / Nəzarət kanalı */}
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              aria-label="Status üzrə filtr"
            >
              <option value="Hamısı">Bütün Statuslar</option>
              <option value="Təsdiqlənib">Təsdiqlənib (Yaşıl)</option>
              <option value="Yoxlamada">Yoxlamada (Sarı/Qırmızı)</option>
              <option value="Risk nəzarəti">Risk nəzarəti</option>
              <option value="Arxivləşdirilib">Arxivləşdirilib</option>
            </select>

            {/* Sıralama */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortField)}
              aria-label="Sıralama"
            >
              <option value="tarix_desc">Tarix (Ən yeni)</option>
              <option value="deyer_desc">Gömrük Dəyəri (Azalan)</option>
              <option value="deyer_asc">Gömrük Dəyəri (Artan)</option>
              <option value="ceki_desc">Brutto Çəki (Azalan)</option>
            </select>

            <button
              type="button"
              className="declaration-filter-reset"
              onClick={resetAllFilters}
              disabled={!hasActiveFilters}
              aria-label="Bütün süzgəcləri sıfırla"
              title={hasActiveFilters ? 'Bütün süzgəcləri sıfırla' : 'Aktiv süzgəc yoxdur'}
            >
              <Filter size={18} aria-hidden="true" />
            </button>
          </div>
        </header>

        {/* Cədvəl */}
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th style={{ minWidth: 150 }}>Bəyannamə №</th>
                <th style={{ minWidth: 100 }}>Tarix</th>
                <th style={{ minWidth: 110 }}>Nəqliyyat</th>
                <th style={{ minWidth: 180 }}>Tərəflər (Alıcı / Göndərən)</th>
                <th style={{ minWidth: 160 }}>Marşrut</th>
                <th style={{ minWidth: 180 }}>Yük və XİF</th>
                <th style={{ minWidth: 130, textAlign: 'right' }}>Gömrük Dəyəri</th>
                <th style={{ minWidth: 110 }}>Status</th>
                <th style={{ width: 70, textAlign: 'center' }}>Baxış</th>
              </tr>
            </thead>
            <tbody>
              {pagedRows.map(b => {
                const isId80 = b.gomrukRejimi === '80 00 00' || b.senedNovu?.includes('80')
                const good = b.mallar[0]
                
                // Təmizlənmiş adlar və ölkələr (kod artıqlıqlarını təmizləyirik)
                const gonderenClean = (b.gonderen || b.satici || '—').replace(/\s*\([^)]*\)/g, '').trim()
                const aliciClean = (b.alici || '—').replace(/\s*\([^)]*\)/g, '').trim()
                const fromCountry = (b.gonderenOlke || b.ticaretolke || '').replace(/\s*\([^)]*\)/g, '').trim()
                const toCountry = (b.aliciOlke || 'Qazaxıstan').replace(/\s*\([^)]*\)/g, '').trim()
                
                const girisPost = (b.serhedKecmeMentegesi || '00204 Qırmızı körpü').replace(/^\d+\s*/, '').replace(' g/p', '').trim()
                const cixisPost = (b.teyinatGomrukOrqani || '13005 Ələt Limanı').replace(/^\d+\s*/, '').replace(' g/p', '').replace('Beynəlxalq Dəniz Ticarət Limanı', 'Ələt Limanı').trim()

                // Qısa mal adı
                const malQisa = (good?.ad || '—').split('(')[0].split(',')[0].slice(0, 32)

                return (
                  <tr key={b.kod} style={{ transition: 'background-color 0.15s' }}>
                    {/* Bəyannamə № & Rejim */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <button
                          type="button"
                          onClick={() => setSelected(b)}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            fontSize: 13,
                            color: 'var(--primary, #0A4D8C)',
                          }}
                        >
                          {b.kod}
                        </button>
                        <span style={{
                          display: 'inline-block',
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '1px 5px',
                          borderRadius: 3,
                          width: 'fit-content',
                          background: isId80 ? 'rgba(59, 130, 246, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                          color: isId80 ? '#1d4ed8' : '#047857',
                          border: `1px solid ${isId80 ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`,
                        }}>
                          {isId80 ? 'İD 80 · Tranzit' : 'İD 40 · İdxal'}
                        </span>
                      </div>
                    </td>

                    {/* Tarix */}
                    <td>
                      <div style={{ fontSize: 12, color: 'var(--text)' }}>{b.tarix}</div>
                      <small style={{ color: 'var(--muted)', fontSize: 10 }}>
                        {b.qeydiyyatTarixi?.split(' ')[1] || '12:00'}
                      </small>
                    </td>

                    {/* Nəqliyyat */}
                    <td>
                      <strong style={{
                        fontFamily: 'monospace',
                        fontSize: 12,
                        padding: '2px 6px',
                        background: 'var(--bg-accent, rgba(0,0,0,0.04))',
                        border: '1px solid var(--border, rgba(0,0,0,0.08))',
                        borderRadius: 4,
                        letterSpacing: '0.5px',
                        whiteSpace: 'nowrap',
                      }}>
                        {b.avtomobil || '—'}
                      </strong>
                    </td>

                    {/* Tərəflər (Alıcı / Göndərən) */}
                    <td>
                      <div style={{ fontSize: 12, lineHeight: 1.3 }}>
                        <div style={{ fontWeight: 600, color: 'var(--text)' }} title={b.alici}>
                          {aliciClean} <small style={{ color: 'var(--muted)', fontWeight: 400 }}>({toCountry})</small>
                        </div>
                        <div style={{ color: 'var(--muted)', fontSize: 11, marginTop: 1 }} title={b.gonderen || b.satici}>
                          {gonderenClean} {fromCountry ? `· ${fromCountry}` : ''}
                        </div>
                      </div>
                    </td>

                    {/* Marşrut */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 500 }}>
                        <span>{girisPost}</span>
                        <span style={{ color: 'var(--muted)' }}>→</span>
                        <span style={{ color: 'var(--primary, #0A4D8C)', fontWeight: 600 }}>{cixisPost}</span>
                      </div>
                    </td>

                    {/* Mal və XİF MN */}
                    <td>
                      <div style={{ fontSize: 12, lineHeight: 1.3 }}>
                        <div style={{ fontWeight: 600, color: 'var(--text)' }} title={good?.ad}>
                          {malQisa}
                        </div>
                        <small style={{ color: 'var(--muted)', fontSize: 11 }}>
                          {good?.bruttoCeki ? `${num(good.bruttoCeki)} kq · ` : ''}HS {good?.hsKod?.slice(0, 6) || good?.xifMnKodu?.slice(0, 6) || '—'}
                        </small>
                      </div>
                    </td>

                    {/* Gömrük Dəyəri */}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>
                        {money(b.umumiDeyer)}
                      </div>
                    </td>

                    {/* Status */}
                    <td>
                      <StatusBadge status={b.status} />
                    </td>

                    {/* Əməliyyat */}
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
                        <button
                          type="button"
                          className="row-action"
                          onClick={() => setSelected(b)}
                          title="Bəyannamə vərəqini aç"
                          aria-label={`${b.kod} detallarını aç`}
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          type="button"
                          className="row-action"
                          onClick={() => navigate(`/qeydiyyat?declaration=${encodeURIComponent(b.kod)}&plate=${encodeURIComponent(b.avtomobil)}`)}
                          title="Vahid Qeydiyyatda aç"
                          aria-label={`${b.avtomobil} qeydiyyatına get`}
                        >
                          <Truck size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}

              {sortedRows.length === 0 && (
                <tr>
                  <td colSpan={9} className="empty-table-cell" style={{ padding: 32, textAlign: 'center' }}>
                    Seçilmiş süzgəclərə uyğun gömrük bəyannaməsi tapılmadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Səhifələmə */}
        {sortedRows.length > pageSize && (
          <footer className="table-pagination" aria-label="Səhifələmə" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
            <span>
              {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, sortedRows.length)} / {sortedRows.length} bəyannamə
            </span>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid var(--border)', background: 'none', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}
              >
                Əvvəlki
              </button>
              <strong>{currentPage} / {pageCount}</strong>
              <button
                type="button"
                onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                disabled={currentPage === pageCount}
                style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid var(--border)', background: 'none', cursor: currentPage === pageCount ? 'not-allowed' : 'pointer', opacity: currentPage === pageCount ? 0.5 : 1 }}
              >
                Növbəti
              </button>
            </div>
          </footer>
        )}
      </Card>

      {/* Rəsmi Bəyannamə Şərəfəsi Modalı */}
      {selected && (
        <DeclarationSheet
          declaration={selected}
          onClose={closeDetail}
          onOpenRegistration={() => {
            closeDetail()
            navigate(`/qeydiyyat?declaration=${encodeURIComponent(selected.kod)}&plate=${encodeURIComponent(selected.avtomobil)}`)
          }}
        />
      )}
    </div>
  )
}

function DeclarationSheet({
  declaration: d,
  onClose,
  onOpenRegistration,
}: {
  declaration: Declaration
  onClose: () => void
  onOpenRegistration: () => void
}) {
  return (
    <div
      className="declaration-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Bəyannamə detalları"
      onMouseDown={onClose}
    >
      <article className="declaration-sheet declaration-sheet-full" onMouseDown={e => e.stopPropagation()}>
        <header className="sheet-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileCheck2 size={20} style={{ color: 'var(--primary)' }} />
            <div>
              <small style={{ color: 'var(--muted)', display: 'block' }}>
                {d.senedNovu?.toUpperCase() ?? 'GÖMRÜK BƏYANNAMƏSİ'}
              </small>
              <strong>№ {d.kod}</strong>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Button size="sm" variant="primary" onClick={onOpenRegistration}>
              <Truck size={13} /> Vahid Qeydiyyatda aç <ArrowRight size={13} />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => window.print()}>
              <Printer size={13} /> Çap et
            </Button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Bağla"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: 'var(--muted)' }}
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="declaration-sheet-body" style={{ padding: 20, maxHeight: '80vh', overflowY: 'auto' }}>
          <DeclarationDocumentView declaration={d} />
        </div>

        <footer className="sheet-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderTop: '1px solid var(--border)', fontSize: 12 }}>
          <span><CircleCheck size={14} style={{ color: '#16a34a', verticalAlign: 'middle', marginRight: 4 }} /> Elektron dövlət gömrük reyestri ilə təsdiqlənib</span>
          <span>Sorğu qeydiyyat tarixi: {d.qeydiyyatTarixi ?? d.tarix}</span>
        </footer>
      </article>
    </div>
  )
}

