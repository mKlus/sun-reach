import { useEffect, useRef, type ReactNode } from 'react'

type PopoutProps = {
  title: string
  onClose: () => void
  children: ReactNode
  size?: 'wide' | 'map'
}

export function Popout({ title, onClose, children, size = 'wide' }: PopoutProps) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div className="popout-root no-print">
      <button type="button" className="popout-backdrop" aria-label="Close overlay" onClick={onClose} />
      <div
        className={`popout-panel popout-${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="popout-title"
      >
        <header className="popout-head">
          <h2 id="popout-title">{title}</h2>
          <button type="button" ref={closeRef} onClick={onClose}>
            Close
          </button>
        </header>
        <div className="popout-body">{children}</div>
      </div>
    </div>
  )
}
