import { useMemo, useRef, useState } from 'react'
import { ChartYGrid, lerpKeyed, makeChartFrame, niceChartMax, pointerToDomain } from '../lib/chartFrame'
import { formatTime, type DaySunPoint } from '../lib/solar'
import { useSvgScreenFont } from '../lib/useSvgScreenFont'

type DaySunChartProps = {
  dateLabel: string
  series: DaySunPoint[]
  selectedMinutes: number
  yMax: number
  sunriseMin: number
  sunsetMin: number
  /** Today's heat through the glass, kWh per metre of width. */
  dayArea?: number
  tall?: boolean
  onSelectMinutes?: (minutes: number) => void
}

export function DaySunChart({
  dateLabel,
  series,
  selectedMinutes,
  yMax,
  sunriseMin,
  sunsetMin,
  dayArea,
  tall = false,
  onSelectMinutes,
}: DaySunChartProps) {
  const [hoverMin, setHoverMin] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const W = 640
  const H = tall ? 340 : 200
  const axisFont = useSvgScreenFont(svgRef, W, 12)
  const heatPeak = useMemo(() => series.reduce((m, p) => Math.max(m, p.heatKw), 0), [series])
  const reachPeak = useMemo(() => series.reduce((m, p) => Math.max(m, p.reach), 0), [series])
  const axisTop = niceChartMax(Math.max(yMax, heatPeak))
  const reachTop = Math.max(reachPeak, 0.01)
  const x0 = sunriseMin
  const x1 = Math.max(sunriseMin + 1, sunsetMin)
  const frame = makeChartFrame(W, H, axisFont, x0, x1, axisTop)
  const { pad, ih, xOf, yOf } = frame
  const yOfReach = (m: number) => pad.t + ih - (m / reachTop) * ih

  const heatLine = series
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xOf(p.minutes).toFixed(1)} ${yOf(p.heatKw).toFixed(1)}`)
    .join(' ')
  const reachLine = series
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xOf(p.minutes).toFixed(1)} ${yOfReach(p.reach).toFixed(1)}`)
    .join(' ')

  const hours: number[] = []
  for (let h = Math.ceil(x0 / 60); h <= Math.floor(x1 / 60); h++) hours.push(h * 60)

  const focusMin = hoverMin ?? selectedMinutes
  const focusHeat = lerpKeyed(series, focusMin, (p) => p.minutes, (p) => p.heatKw)
  const focusReach = lerpKeyed(series, focusMin, (p) => p.minutes, (p) => p.reach)
  const focusAwning = lerpKeyed(series, focusMin, (p) => p.minutes, (p) => p.awningEnter)

  function minFromClientX(svg: SVGSVGElement, clientX: number) {
    return Math.round(pointerToDomain(svg, clientX, frame, x0, x1))
  }

  return (
    <section className="year-chart">
      <div className="year-chart-head">
        <h3>Heat through the glass on {dateLabel}</h3>
        <p>
          {dayArea != null ? (
            <>
              Today <strong>{dayArea.toFixed(2)} kWh/m</strong>
              {' · '}
            </>
          ) : null}
          {formatTime(focusMin).label}: <strong>{focusHeat.toFixed(2)} kW/m</strong>
          {` · ${focusReach.toFixed(2)} m across floor`}
          {focusAwning > 0 ? ` · ${focusAwning.toFixed(2)} m under awning` : ''}
          {heatPeak <= 0 ? ' · no sun through the door' : ''}
        </p>
      </div>
      <p className="hint">
        Solid is incoming heat (kW per metre of glass). Dashed is indoor reach (own scale).
        Morning air mass knocks the heat down even when the stripe is long. Click or use
        arrow keys to set the clock (Shift+arrow = one hour).
      </p>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ fontSize: axisFont }}
        role="slider"
        tabIndex={0}
        aria-label={`Heat through the glass through the day on ${dateLabel}`}
        aria-valuemin={sunriseMin}
        aria-valuemax={sunsetMin}
        aria-valuenow={selectedMinutes}
        aria-valuetext={formatTime(selectedMinutes).label}
        onMouseMove={(e) => setHoverMin(minFromClientX(e.currentTarget, e.clientX))}
        onMouseLeave={() => setHoverMin(null)}
        onClick={(e) => onSelectMinutes?.(minFromClientX(e.currentTarget, e.clientX))}
        onKeyDown={(e) => {
          if (!onSelectMinutes) return
          const step = e.shiftKey ? 60 : 15
          if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
            e.preventDefault()
            onSelectMinutes(selectedMinutes - step)
          } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
            e.preventDefault()
            onSelectMinutes(selectedMinutes + step)
          } else if (e.key === 'Home') {
            e.preventDefault()
            onSelectMinutes(sunriseMin)
          } else if (e.key === 'End') {
            e.preventDefault()
            onSelectMinutes(sunsetMin)
          }
        }}
      >
        <ChartYGrid frame={frame} yMax={axisTop} />
        {series.slice(1).map((b, i) => {
          const a = series[i]
          if (a.heatKw <= 0 && b.heatKw <= 0) return null
          const alpha = (a.heatKw + b.heatKw) / 2 / Math.max(axisTop, 0.01)
          const d = `M ${xOf(a.minutes).toFixed(1)} ${yOf(a.heatKw).toFixed(1)} L ${xOf(b.minutes).toFixed(1)} ${yOf(b.heatKw).toFixed(1)} L ${xOf(b.minutes).toFixed(1)} ${yOf(0).toFixed(1)} L ${xOf(a.minutes).toFixed(1)} ${yOf(0).toFixed(1)} Z`
          return <path key={a.minutes} d={d} className="year-fill" opacity={0.15 + Math.min(1, alpha) * 0.7} />
        })}
        {heatLine ? <path d={heatLine} className="year-line" /> : null}
        {reachLine ? <path d={reachLine} className="day-awning" /> : null}
        <line
          x1={xOf(selectedMinutes)}
          x2={xOf(selectedMinutes)}
          y1={pad.t}
          y2={pad.t + ih}
          className="year-today"
        />
        <circle
          cx={xOf(selectedMinutes)}
          cy={yOf(lerpKeyed(series, selectedMinutes, (p) => p.minutes, (p) => p.heatKw))}
          r={4}
          className="year-today-dot"
        />
        <circle
          cx={xOf(selectedMinutes)}
          cy={yOfReach(lerpKeyed(series, selectedMinutes, (p) => p.minutes, (p) => p.reach))}
          r={3}
          className="day-awning-dot"
        />
        {hoverMin != null ? (
          <>
            <line x1={xOf(hoverMin)} x2={xOf(hoverMin)} y1={pad.t} y2={pad.t + ih} className="year-hover" />
            <circle cx={xOf(hoverMin)} cy={yOf(focusHeat)} r={3.5} className="year-hover-dot" />
            <circle cx={xOf(hoverMin)} cy={yOfReach(focusReach)} r={3} className="day-awning-dot" />
          </>
        ) : null}
        {hours.map((m) => (
          <text key={m} x={xOf(m)} y={H - 8} className="year-month" textAnchor="middle">
            {formatTime(m).label}
          </text>
        ))}
      </svg>
    </section>
  )
}
