import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Play, RefreshCw, Zap } from 'lucide-react'
import { toast } from 'sonner'

export type RefreshOption = {
  key: string
  label: string
  desc: string
  seconds: number
}

const REFRESH_OPTIONS: RefreshOption[] = [
  { key: '30 san', label: '30 saniyə', desc: 'Real-vaxt kritik izləmə', seconds: 30 },
  { key: '1 dəq', label: '1 dəqiqə', desc: 'Sürətli yenilənmə', seconds: 60 },
  { key: '5 dəq', label: '5 dəqiqə', desc: 'Standart / Tövsiyə olunan', seconds: 300 },
  { key: '15 dəq', label: '15 dəqiqə', desc: 'Enerjiyə qənaət rejimi', seconds: 900 },
  { key: 'Manual', label: 'Əl ilə (Deaktiv)', desc: 'Yalnız düymə ilə yenilə', seconds: 0 },
]

type Props = {
  value: string
  onChange: (val: string) => void
  onManualRefresh?: () => void
  align?: 'left' | 'right'
}

export default function RefreshRatePicker({
  value,
  onChange,
  onManualRefresh,
  align = 'right',
}: Props) {
  const [open, setOpen] = useState(false)
  const [isSpinning, setIsSpinning] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on outside click or ESC
  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const handleSelect = (key: string) => {
    onChange(key)
    setOpen(false)
    toast.success(`Yenilənmə intervalı dəyişdirildi: ${key}`)
  }

  const handleForceRefresh = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsSpinning(true)
    setTimeout(() => setIsSpinning(false), 700)
    onManualRefresh?.()
    toast.info('Liman və gömrük telemetriyası yeniləndi')
  }

  const currentOption = REFRESH_OPTIONS.find(o => o.key === value) ?? REFRESH_OPTIONS[2]

  return (
    <div className="refresh-picker-wrap" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        className={`refresh-trigger ${open ? 'active' : ''}`}
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-label="Yenilənmə intervalını seçin"
      >
        <span
          className={`refresh-trigger-icon ${isSpinning ? 'spinning' : ''}`}
          onClick={handleForceRefresh}
          title="İndi yenilə"
        >
          <RefreshCw size={15} />
        </span>
        <span className="refresh-trigger-text">
          <strong>{value}</strong>
          <small>Yenilənmə</small>
        </span>
        <ChevronDown size={14} className={`refresh-chevron ${open ? 'rotate' : ''}`} />
      </button>

      {/* Popover Dropdown */}
      {open && (
        <div className={`refresh-popover align-${align}`}>
          <div className="refresh-popover-head">
            <small>YENİLƏNMƏ İNTERVALI</small>
            <button
              type="button"
              className="quick-refresh-btn"
              onClick={handleForceRefresh}
              title="İndi yenilə"
            >
              <RefreshCw size={11} className={isSpinning ? 'spinning' : ''} />
              <span>İndi yenilə</span>
            </button>
          </div>

          <div className="refresh-options-list">
            {REFRESH_OPTIONS.map(opt => {
              const isSelected = opt.key === value
              return (
                <button
                  type="button"
                  key={opt.key}
                  className={`refresh-opt-btn ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelect(opt.key)}
                >
                  <div className="opt-main">
                    <span className="opt-title">{opt.label}</span>
                    <small className="opt-desc">{opt.desc}</small>
                  </div>
                  {isSelected && (
                    <span className="opt-check">
                      <Check size={14} />
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          <div className="refresh-popover-footer">
            <div className="refresh-status-hint">
              <span className="live-pulse-dot" />
              <small>
                {value === 'Manual'
                  ? 'Avtomatik yenilənmə dayandırılıb'
                  : `Hər ${value} əsas data serverdən sinxronlaşdırılır`}
              </small>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
