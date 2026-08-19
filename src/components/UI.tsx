import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { LoaderCircle, X } from 'lucide-react'
import clsx from 'clsx'

export function Card({ children, className = '', hover = true }: { children: ReactNode; className?: string; hover?: boolean }) {
  return <section className={clsx('glass-card', hover && 'card-hover', className)}>{children}</section>
}

export function Button({
  children,
  className = '',
  variant = 'primary',
  size,
  type = 'button',
  disabled,
  onClick,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={clsx('btn', `btn-${variant}`, size && `btn-${size}`, className)}
      {...(props as Record<string, unknown>)}
    >
      {children}
    </button>
  )
}

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <header className="page-header">
      <div className="page-header-copy">
        <h1>{title}</h1>
      </div>
      {action && <div className="page-header-action">{action}</div>}
    </header>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status.includes('Təsdiq') || status === 'Buraxıldı' || status === 'Körpüdə' || status === 'Qeydiyyatda' || status.includes('Doğrulan') ? 'success'
    : status === 'Lövbərdə' || status === 'Yolda' || status.includes('Gözlə') || status === 'Yoxlamada' || status.includes('Yönləndir') || status.includes('Emal') ? 'warning'
    : status.includes('Risk') || status.includes('İmtina') || status.includes('qadağa') || status.includes('icazə yoxdur') ? 'danger'
    : 'info'
  return <span className={`status status-${tone}`}><i />{status}</span>
}

export function Skeleton({ className = '' }: { className?: string }) { return <span className={`skeleton ${className}`} /> }

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={title} onMouseDown={onClose}>
      <section
        className={clsx('modal', wide && 'modal-wide')}
        onMouseDown={e => e.stopPropagation()}
      >
        <header>
          <h2>{title}</h2>
          <button type="button" onClick={onClose} aria-label="Bağla"><X size={20} /></button>
        </header>
        {children}
      </section>
    </div>
  )
}

export function LoadingScreen() { return <main className="loading-screen"><LoaderCircle className="spin" /><strong>Platforma hazırlanır...</strong></main> }
