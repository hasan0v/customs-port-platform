import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight,
  RotateCcw, X,
} from 'lucide-react'

export type DateRange = {
  startDate: string // 'YYYY-MM-DD'
  endDate: string // 'YYYY-MM-DD'
  label: string
  presetKey?: string
}

type Props = {
  value: DateRange
  onChange: (range: DateRange) => void
  align?: 'left' | 'right'
}

const AZ_MONTHS = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun',
  'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr',
]

const AZ_MONTHS_SHORT = [
  'Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn',
  'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek',
]

const AZ_WEEKDAYS = ['B.e', 'Ç.a', 'Ç', 'C.a', 'C', 'Ş', 'B']

/** Reference date for the platform demo context (July 2026) */
const BASE_DATE = new Date(2026, 6, 10) // 10 July 2026

function formatIso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseIso(str: string): Date {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

function formatDatePretty(iso: string): string {
  if (!iso) return ''
  const d = parseIso(iso)
  return `${d.getDate()} ${AZ_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`
}

function addDays(d: Date, days: number): Date {
  const res = new Date(d)
  res.setDate(res.getDate() + days)
  return res
}

export function getDefaultRange(preset: string = 'today'): DateRange {
  const today = new Date(BASE_DATE)
  const todayIso = formatIso(today)

  switch (preset) {
    case 'today':
      return {
        startDate: todayIso,
        endDate: todayIso,
        label: 'Bu gün',
        presetKey: 'today',
      }
    case 'yesterday': {
      const y = addDays(today, -1)
      const yIso = formatIso(y)
      return {
        startDate: yIso,
        endDate: yIso,
        label: 'Dünən',
        presetKey: 'yesterday',
      }
    }
    case 'last7': {
      const s = addDays(today, -6)
      return {
        startDate: formatIso(s),
        endDate: todayIso,
        label: 'Son 7 gün',
        presetKey: 'last7',
      }
    }
    case 'last30': {
      const s = addDays(today, -29)
      return {
        startDate: formatIso(s),
        endDate: todayIso,
        label: 'Son 30 gün',
        presetKey: 'last30',
      }
    }
    case 'thisMonth': {
      const first = new Date(today.getFullYear(), today.getMonth(), 1)
      const last = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      return {
        startDate: formatIso(first),
        endDate: formatIso(last),
        label: 'Bu ay',
        presetKey: 'thisMonth',
      }
    }
    case 'lastMonth': {
      const first = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const last = new Date(today.getFullYear(), today.getMonth(), 0)
      return {
        startDate: formatIso(first),
        endDate: formatIso(last),
        label: 'Keçən ay',
        presetKey: 'lastMonth',
      }
    }
    case 'thisYear': {
      const first = new Date(today.getFullYear(), 0, 1)
      return {
        startDate: formatIso(first),
        endDate: todayIso,
        label: 'İlin əvvəlindən',
        presetKey: 'thisYear',
      }
    }
    case 'allTime': {
      return {
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        label: 'Bütün dövr (2026)',
        presetKey: 'allTime',
      }
    }
    default:
      return {
        startDate: todayIso,
        endDate: todayIso,
        label: 'Bu gün',
        presetKey: 'today',
      }
  }
}

export default function DateRangePicker({
  value,
  onChange,
  align = 'right',
}: Props) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Local calendar navigation (active displayed month)
  const [navDate, setNavDate] = useState<Date>(() => {
    return value.startDate ? parseIso(value.startDate) : new Date(BASE_DATE)
  })

  // Pending selection
  const [tempStart, setTempStart] = useState<string>(value.startDate || formatIso(BASE_DATE))
  const [tempEnd, setTempEnd] = useState<string>(value.endDate || formatIso(BASE_DATE))
  const [hoverDate, setHoverDate] = useState<string | null>(null)
  const [activePreset, setActivePreset] = useState<string>(value.presetKey || 'today')

  // Sync with prop when opened
  useEffect(() => {
    if (open) {
      setTempStart(value.startDate)
      setTempEnd(value.endDate)
      setActivePreset(value.presetKey || 'custom')
      if (value.startDate) {
        setNavDate(parseIso(value.startDate))
      }
    }
  }, [open, value])

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

  const presets = useMemo(() => [
    { key: 'today', label: 'Bu gün' },
    { key: 'yesterday', label: 'Dünən' },
    { key: 'last7', label: 'Son 7 gün' },
    { key: 'last30', label: 'Son 30 gün' },
    { key: 'thisMonth', label: 'Bu ay' },
    { key: 'lastMonth', label: 'Keçən ay' },
    { key: 'thisYear', label: 'İlin əvvəlindən' },
    { key: 'allTime', label: 'Bütün dövr' },
  ], [])

  const handleSelectPreset = (key: string) => {
    const range = getDefaultRange(key)
    setTempStart(range.startDate)
    setTempEnd(range.endDate)
    setActivePreset(key)
    setNavDate(parseIso(range.startDate))
    onChange(range)
    setOpen(false)
  }

  const handleDateClick = (iso: string) => {
    setActivePreset('custom')
    if (!tempStart || (tempStart && tempEnd && tempStart !== tempEnd)) {
      // Start new selection
      setTempStart(iso)
      setTempEnd(iso)
    } else {
      // Pick end date
      if (iso < tempStart) {
        setTempStart(iso)
        setTempEnd(tempStart)
      } else {
        setTempEnd(iso)
      }
    }
  }

  const handleApply = () => {
    let finalStart = tempStart
    let finalEnd = tempEnd
    if (finalStart > finalEnd) {
      const t = finalStart
      finalStart = finalEnd
      finalEnd = t
    }

    let finalLabel = ''
    if (activePreset && activePreset !== 'custom') {
      const p = presets.find(item => item.key === activePreset)
      finalLabel = p ? p.label : `${formatDatePretty(finalStart)} – ${formatDatePretty(finalEnd)}`
    } else if (finalStart === finalEnd) {
      finalLabel = formatDatePretty(finalStart)
    } else {
      finalLabel = `${formatDatePretty(finalStart)} – ${formatDatePretty(finalEnd)}`
    }

    onChange({
      startDate: finalStart,
      endDate: finalEnd,
      label: finalLabel,
      presetKey: activePreset,
    })
    setOpen(false)
  }

  const handleReset = () => {
    const def = getDefaultRange('today')
    onChange(def)
    setTempStart(def.startDate)
    setTempEnd(def.endDate)
    setActivePreset('today')
    setOpen(false)
  }

  // Generate calendar days for displayed month
  const calendarDays = useMemo(() => {
    const year = navDate.getFullYear()
    const month = navDate.getMonth()

    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7 // Monday = 0
    const totalDays = new Date(year, month + 1, 0).getDate()
    const prevMonthTotalDays = new Date(year, month, 0).getDate()

    const days: { iso: string; dayNum: number; isCurrentMonth: boolean }[] = []

    // Previous month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthTotalDays - i
      const prevDate = new Date(year, month - 1, d)
      days.push({
        iso: formatIso(prevDate),
        dayNum: d,
        isCurrentMonth: false,
      })
    }

    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      const currDate = new Date(year, month, d)
      days.push({
        iso: formatIso(currDate),
        dayNum: d,
        isCurrentMonth: true,
      })
    }

    // Next month padding (complete grid of 35 or 42 cells)
    const remaining = (7 - (days.length % 7)) % 7
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(year, month + 1, d)
      days.push({
        iso: formatIso(nextDate),
        dayNum: d,
        isCurrentMonth: false,
      })
    }

    return days
  }, [navDate])

  const prevMonth = () => {
    setNavDate(new Date(navDate.getFullYear(), navDate.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setNavDate(new Date(navDate.getFullYear(), navDate.getMonth() + 1, 1))
  }

  const daysCount = useMemo(() => {
    if (!value.startDate || !value.endDate) return 1
    const s = parseIso(value.startDate).getTime()
    const e = parseIso(value.endDate).getTime()
    return Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1)
  }, [value])

  return (
    <div className="date-range-picker-wrap" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        className={`date-range-trigger ${open ? 'active' : ''}`}
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-label="Tarix aralığını seçin"
      >
        <span className="date-range-icon">
          <CalendarDays size={16} />
        </span>
        <span className="date-range-text">
          <strong>{value.label || 'Tarix aralığı'}</strong>
          <small>{daysCount === 1 ? '1 gün' : `${daysCount} gün`}</small>
        </span>
        <ChevronDown size={14} className={`date-chevron ${open ? 'rotate' : ''}`} />
      </button>

      {/* Popover Dropdown */}
      {open && (
        <div className={`date-range-popover align-${align}`}>
          {/* Preset Sidebar */}
          <aside className="date-presets-sidebar">
            <div className="presets-head">
              <small>SÜRƏTLİ SEÇİM</small>
            </div>
            <div className="presets-list">
              {presets.map(p => (
                <button
                  type="button"
                  key={p.key}
                  className={`preset-btn ${activePreset === p.key ? 'selected' : ''}`}
                  onClick={() => handleSelectPreset(p.key)}
                >
                  <span>{p.label}</span>
                  {activePreset === p.key && <Check size={13} />}
                </button>
              ))}
            </div>

            <div className="presets-footer">
              <button type="button" className="reset-range-btn" onClick={handleReset}>
                <RotateCcw size={12} /> Təmizlə
              </button>
            </div>
          </aside>

          {/* Calendar Body */}
          <main className="date-calendar-main">
            {/* Header / Month-Year Navigation */}
            <div className="calendar-nav-bar">
              <button
                type="button"
                className="cal-nav-btn"
                onClick={prevMonth}
                aria-label="Əvvəlki ay"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="cal-current-month">
                <strong>{AZ_MONTHS[navDate.getMonth()]}</strong>
                <span>{navDate.getFullYear()}</span>
              </div>
              <button
                type="button"
                className="cal-nav-btn"
                onClick={nextMonth}
                aria-label="Növbəti ay"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Quick manual inputs */}
            <div className="calendar-inputs-row">
              <label>
                <small>Başlanğıc:</small>
                <input
                  type="date"
                  value={tempStart}
                  onChange={e => {
                    setTempStart(e.target.value)
                    setActivePreset('custom')
                  }}
                />
              </label>
              <span className="cal-range-arrow">→</span>
              <label>
                <small>Bitmə:</small>
                <input
                  type="date"
                  value={tempEnd}
                  onChange={e => {
                    setTempEnd(e.target.value)
                    setActivePreset('custom')
                  }}
                />
              </label>
            </div>

            {/* Weekday headers */}
            <div className="calendar-grid-header">
              {AZ_WEEKDAYS.map(w => (
                <span key={w}>{w}</span>
              ))}
            </div>

            {/* Calendar Days Matrix */}
            <div className="calendar-days-grid">
              {calendarDays.map(({ iso, dayNum, isCurrentMonth }) => {
                const isStart = iso === tempStart
                const isEnd = iso === tempEnd
                const inRange =
                  tempStart && tempEnd && iso >= tempStart && iso <= tempEnd
                const isHoverRange =
                  hoverDate &&
                  tempStart &&
                  tempStart === tempEnd &&
                  ((iso >= tempStart && iso <= hoverDate) || (iso <= tempStart && iso >= hoverDate))

                return (
                  <button
                    type="button"
                    key={iso}
                    className={`cal-day-cell ${!isCurrentMonth ? 'outside' : ''} ${isStart ? 'range-start' : ''} ${isEnd ? 'range-end' : ''} ${inRange ? 'in-range' : ''} ${isHoverRange ? 'hover-range' : ''}`}
                    onClick={() => handleDateClick(iso)}
                    onMouseEnter={() => setHoverDate(iso)}
                    onMouseLeave={() => setHoverDate(null)}
                  >
                    <span>{dayNum}</span>
                  </button>
                )
              })}
            </div>

            {/* Action Bar */}
            <footer className="calendar-action-bar">
              <div className="cal-selected-preview">
                <small>SEÇİLMİŞ TARİX:</small>
                <strong>
                  {formatDatePretty(tempStart)} {tempStart !== tempEnd ? `– ${formatDatePretty(tempEnd)}` : ''}
                </strong>
              </div>

              <div className="cal-action-btns">
                <button
                  type="button"
                  className="cal-btn-cancel"
                  onClick={() => setOpen(false)}
                >
                  <X size={13} /> Ləğv et
                </button>
                <button
                  type="button"
                  className="cal-btn-apply"
                  onClick={handleApply}
                >
                  <Check size={14} /> Tətbiq et
                </button>
              </div>
            </footer>
          </main>
        </div>
      )}
    </div>
  )
}
