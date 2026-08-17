/** Round up so a year's peak sits just below a clean axis top. */
export function niceChartMax(peak: number): number {
  const padded = Math.max(peak, 1) * 1.05
  const exp = 10 ** Math.floor(Math.log10(padded))
  const n = padded / exp
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 3 ? 3 : n <= 5 ? 5 : 10
  return nice * exp
}

export type ChartPad = { l: number; r: number; t: number; b: number }

export function chartPad(axisFont: number): ChartPad {
  return {
    l: Math.max(42, axisFont * 3.4),
    r: 12,
    t: 16,
    b: Math.max(28, axisFont + 14),
  }
}

export type ChartFrame = {
  W: number
  H: number
  pad: ChartPad
  iw: number
  ih: number
  xOf: (x: number) => number
  yOf: (v: number) => number
}

export function makeChartFrame(
  W: number,
  H: number,
  axisFont: number,
  x0: number,
  x1: number,
  yMax: number,
): ChartFrame {
  const pad = chartPad(axisFont)
  const iw = W - pad.l - pad.r
  const ih = H - pad.t - pad.b
  const span = x1 - x0 || 1
  const top = yMax > 0 ? yMax : 1
  return {
    W,
    H,
    pad,
    iw,
    ih,
    xOf: (x) => pad.l + ((x - x0) / span) * iw,
    yOf: (v) => pad.t + ih - (v / top) * ih,
  }
}

export type LinePt = { x: number; y: number }

function monotoneSlopes(pts: LinePt[]): number[] {
  const n = pts.length
  const delta: number[] = []
  for (let i = 0; i < n - 1; i++) {
    const dx = pts[i + 1].x - pts[i].x
    delta.push(dx === 0 ? 0 : (pts[i + 1].y - pts[i].y) / dx)
  }
  const m = Array.from({ length: n }, () => 0)
  m[0] = delta[0] ?? 0
  m[n - 1] = delta[n - 2] ?? 0
  for (let i = 1; i < n - 1; i++) {
    m[i] = delta[i - 1] * delta[i] <= 0 ? 0 : (delta[i - 1] + delta[i]) / 2
  }
  for (let i = 0; i < n - 1; i++) {
    if (delta[i] === 0) {
      m[i] = 0
      m[i + 1] = 0
      continue
    }
    const a = m[i] / delta[i]
    const b = m[i + 1] / delta[i]
    const s = a * a + b * b
    if (s > 9) {
      const t = 3 / Math.sqrt(s)
      m[i] = t * a * delta[i]
      m[i + 1] = t * b * delta[i]
    }
  }
  return m
}

function fmtPt(n: number): string {
  return n.toFixed(2)
}

/** Fritsch–Carlson monotone cubic. Passes through each sample, no overshoot. */
export function monotoneCubicPath(pts: LinePt[]): string {
  if (pts.length === 0) return ''
  if (pts.length === 1) return `M ${fmtPt(pts[0].x)} ${fmtPt(pts[0].y)}`
  if (pts.length === 2) {
    return `M ${fmtPt(pts[0].x)} ${fmtPt(pts[0].y)} L ${fmtPt(pts[1].x)} ${fmtPt(pts[1].y)}`
  }
  const m = monotoneSlopes(pts)
  let d = `M ${fmtPt(pts[0].x)} ${fmtPt(pts[0].y)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const dx = pts[i + 1].x - pts[i].x
    const c1x = pts[i].x + dx / 3
    const c1y = pts[i].y + (m[i] * dx) / 3
    const c2x = pts[i + 1].x - dx / 3
    const c2y = pts[i + 1].y - (m[i + 1] * dx) / 3
    d += ` C ${fmtPt(c1x)} ${fmtPt(c1y)} ${fmtPt(c2x)} ${fmtPt(c2y)} ${fmtPt(pts[i + 1].x)} ${fmtPt(pts[i + 1].y)}`
  }
  return d
}

export function lerpKeyed<T>(
  series: T[],
  x: number,
  getX: (p: T) => number,
  getY: (p: T) => number,
): number {
  if (!series.length) return 0
  if (x <= getX(series[0])) return getY(series[0])
  const last = series[series.length - 1]
  if (x >= getX(last)) return getY(last)
  for (let i = 1; i < series.length; i++) {
    const a = series[i - 1]
    const b = series[i]
    const bx = getX(b)
    if (x <= bx) {
      const ax = getX(a)
      const t = (x - ax) / (bx - ax || 1)
      return getY(a) + (getY(b) - getY(a)) * t
    }
  }
  return getY(last)
}

export function pointerToDomain(
  svg: SVGSVGElement,
  clientX: number,
  frame: ChartFrame,
  x0: number,
  x1: number,
): number {
  const box = svg.getBoundingClientRect()
  const x = ((clientX - box.left) / box.width) * frame.W
  const t = (x - frame.pad.l) / frame.iw
  return x0 + Math.min(1, Math.max(0, t)) * (x1 - x0)
}

export function ChartYGrid({ frame, yMax }: { frame: ChartFrame; yMax: number }) {
  const top = yMax > 0 ? yMax : 1
  const decimals = top >= 10 ? 0 : 1
  return (
    <>
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const v = top * t
        const y = frame.yOf(v)
        return (
          <g key={t}>
            <line x1={frame.pad.l} x2={frame.W - frame.pad.r} y1={y} y2={y} className="year-grid" />
            <text x={frame.pad.l - 6} y={y + 3} className="year-axis" textAnchor="end">
              {v.toFixed(decimals)}
            </text>
          </g>
        )
      })}
    </>
  )
}
