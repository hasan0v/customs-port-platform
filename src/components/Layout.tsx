import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Anchor, BarChart3, Bell, ChevronLeft, ClipboardCheck, FileText, LayoutDashboard, Menu, Moon, Search, Settings, Ship, Sun, UserRound, X } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

const links = [
  ['/', 'İdarəetmə paneli', LayoutDashboard], ['/gemiler', 'Gəmi əməliyyatları', Ship], ['/qeydiyyat', 'Qeydiyyat', ClipboardCheck],
  ['/beyannameler', 'Bəyannamələr', FileText],
  ['/tarixce', 'İnspektorun fəaliyyəti', UserRound], ['/analitika', 'Analitika', BarChart3], ['/parametrler', 'Parametrlər', Settings],
] as const

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

export default function Layout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const { dark, toggleDark, sidebarOpen, setSidebarOpen, commandOpen, setCommandOpen, profile } = useAppStore()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => { document.documentElement.classList.toggle('dark', dark) }, [dark])

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCommandOpen(true)
      }
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [setCommandOpen])

  // Mobile drawer: ESC + body scroll lock
  useEffect(() => {
    if (!sidebarOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [sidebarOpen, setSidebarOpen])

  const initials = (profile.name || 'V')
    .split(/\s+/)
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'V'

  return (
    <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <header className="brand">
          <span className="brand-mark"><Anchor /></span>
          <div className="brand-text">
            <strong>VGLP</strong>
            <small>Vahid Gömrük-Liman Platforması</small>
          </div>
          <button type="button" className="mobile-close" onClick={() => setSidebarOpen(false)} aria-label="Menyunu bağla"><X /></button>
        </header>
        <nav aria-label="Əsas naviqasiya">
          {links.map(([to, label, Icon]) => (
            <NavLink key={to} end={to === '/'} to={to} onClick={() => setSidebarOpen(false)}>
              <Icon size={20} /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      <button
        type="button"
        className="collapse-btn"
        onClick={() => setCollapsed(v => !v)}
        aria-label={collapsed ? 'Yan paneli aç' : 'Yan paneli yığ'}
      >
        <ChevronLeft className={collapsed ? 'rotate' : ''} />
      </button>
      <div className="content-shell">
        <header className="topbar">
          <button type="button" className="hamburger" onClick={() => setSidebarOpen(true)} aria-label="Menyunu aç"><Menu /></button>
          <button type="button" className="global-search" onClick={() => setCommandOpen(true)}>
            <Search size={18} />
            <span>Gəmi, avtomobil və ya bəyannamə axtar...</span>
            <kbd>{isMac ? '⌘ K' : 'Ctrl K'}</kbd>
          </button>
          <div className="top-actions">
            <button type="button" className="icon-btn" aria-label="Bildirişlər"><Bell /><i className="notification-dot">3</i></button>
            <button type="button" className="icon-btn" onClick={toggleDark} aria-label="Mövzunu dəyiş">{dark ? <Sun /> : <Moon />}</button>
            <div className="profile">
              <span>{initials}</span>
              <div>
                <strong>{profile.name}</strong>
                <small>{profile.role}</small>
              </div>
            </div>
          </div>
        </header>
        <main key={location.pathname} className="main-content">{children}</main>
        <footer>© 2026 Vahid Gömrük-Liman Platforması</footer>
      </div>
      {commandOpen && (
          <CommandPalette
            onClose={() => setCommandOpen(false)}
            onSelect={(path) => { navigate(path); setCommandOpen(false) }}
          />
      )}
      {sidebarOpen && <div className="mobile-overlay" onClick={() => setSidebarOpen(false)} aria-hidden="true" />}
    </div>
  )
}

function CommandPalette({ onClose, onSelect }: { onClose: () => void; onSelect: (p: string) => void }) {
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const { ships, vehicles } = useAppStore()

  const results = useMemo(() => {
    if (!q) {
      return [
        { title: 'Gəmi əməliyyat mərkəzi', sub: 'AIS + VAİS vahid görünüş', path: '/gemiler', icon: '→' },
        { title: 'Qeydiyyat', sub: 'Gəmi → avtomobil → bəyannamə', path: '/qeydiyyat', icon: '→' },
        { title: 'İnspektorun fəaliyyəti', sub: 'Maşın · bəyannamə · status', path: '/tarixce', icon: '→' },
        { title: 'Analitika', sub: 'Giriş-çıxış və risk paneli', path: '/analitika', icon: '→' },
      ]
    }
    const s = q.toLocaleLowerCase('az')
    return [
      ...ships.filter(x => `${x.ad} ${x.id}`.toLocaleLowerCase('az').includes(s)).slice(0, 4).map(x => ({
        title: x.ad, sub: `${x.id} · ${x.status}`, path: `/gemiler?id=${x.id}`, icon: 'G',
      })),
      ...vehicles.filter(x => `${x.nomre} ${x.kod}`.toLowerCase().includes(s)).slice(0, 4).map(x => ({
        title: x.nomre, sub: `${x.surucu} · ${x.yuk}`, path: `/qeydiyyat?plate=${encodeURIComponent(x.nomre)}`, icon: 'A',
      })),
    ]
  }, [q, ships, vehicles])

  useEffect(() => { setActive(0) }, [q, results.length])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActive(i => (results.length ? (i + 1) % results.length : 0))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActive(i => (results.length ? (i - 1 + results.length) % results.length : 0))
      } else if (e.key === 'Enter' && results[active]) {
        e.preventDefault()
        onSelect(results[active].path)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose, onSelect, results, active])

  return (
    <div
      className="command-backdrop"
      onMouseDown={onClose}
    >
      <section
        className="command"
        onMouseDown={e => e.stopPropagation()}
      >
        <header>
          <Search />
          <input
            autoFocus
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Sürətli axtarış..."
            aria-label="Sürətli axtarış"
          />
          <kbd>ESC</kbd>
        </header>
        <div className="command-results">
          {results.length ? results.map((r, i) => (
            <button
              type="button"
              key={`${r.path}-${r.title}-${i}`}
              className={i === active ? 'active' : ''}
              onMouseEnter={() => setActive(i)}
              onClick={() => onSelect(r.path)}
            >
              <span>{r.icon}</span>
              <div><strong>{r.title}</strong><small>{r.sub}</small></div>
            </button>
          )) : <p>Nəticə tapılmadı</p>}
        </div>
        <footer>
          <span>↑↓ seçim</span>
          <span>↵ aç</span>
          <span>ESC bağla</span>
        </footer>
      </section>
    </div>
  )
}
