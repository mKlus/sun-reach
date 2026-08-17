import { useCallback, useEffect, useRef } from 'react'
import { drawSection } from '../lib/drawSection'
import type { CalcModel } from '../lib/model'
import { useResolvedTheme } from '../lib/theme'

type SectionCanvasProps = {
  model: CalcModel
  large?: boolean
}

export function SectionCanvas({ model, large = false }: SectionCanvasProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const theme = useResolvedTheme()

  const paint = useCallback(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    const rect = wrap.getBoundingClientRect()
    const w = Math.max(320, rect.width)
    const h = Math.max(280, rect.height)
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    drawSection(ctx, model, w, h, theme)
  }, [model, theme])

  useEffect(() => {
    paint()
    const wrap = wrapRef.current
    if (!wrap) return
    const ro = new ResizeObserver(() => paint())
    ro.observe(wrap)
    let gone = false
    void document.fonts?.ready.then(() => {
      if (!gone) paint()
    })
    return () => {
      gone = true
      ro.disconnect()
    }
  }, [paint])

  return (
    <div
      className={`canvas-wrap${large ? ' is-large' : ''}`}
      ref={wrapRef}
      data-section-theme={theme}
    >
      <canvas
        ref={canvasRef}
        aria-label="House section through the glass door and attached patio roof"
      />
    </div>
  )
}
