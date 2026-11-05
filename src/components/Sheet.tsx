import { useEffect, type ReactNode } from 'react'
import { IconClose } from './Icons'

export function Sheet(props: { title: string; subtitle?: ReactNode; onClose: () => void; children: ReactNode }) {
  const { title, subtitle, onClose, children } = props

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        <div className="sheet-head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Fermer">
            <IconClose />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
