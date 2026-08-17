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
  /** Area under today's intensity-weighted indoor curve, in m·h. */
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
  const peak = useMemo(() => series.reduce((m, p) => Math.max(m, p.reach), 0), [series])
  const awningPeak = useMemo(() => series.reduce((m, p) => Math.max(m, p.awningEnter), 0), [series])
  const axisTop = niceChartMax(Math.max(yMax, peak, awningPeak))
  const x0 = sunriseMin
  const x1 = Math.max(sunriseMin + 1, sunsetMin)
  const frame = makeChartFrame(W, H, axisFont, x0, x1, axisTop)
  const { pad, ih, xOf, yOf } = frame

  const line = series
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xOf(p.minutes).toFixed(1)} ${yOf(p.reach).toFixed(1)}`)
    .join(' ')
  const awningLine = series
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xOf(p.minutes).toFixed(1)} ${yOf(p.awningEnter).toFixed(1)}`)
    .join(' ')

  const hours: number[] = []
  for (let h = Math.ceil(x0 / 60); h <= Math.floor(x1 / 60); h++) hours.push(h * 60)

  const focusMin = hoverMin ?? selectedMinutes
  const focusReach = lerpKeyed(series, focusMin, (p) => p.minutes, (p) => p.reach)
  const focusAwning = lerpKeyed(series, focusMin, (p) => p.minutes, (p) => p.awningEnter)
  const focusFace = lerpKeyed(series, focusMin, (p) => p.minutes, (p) => p.intensity)

  function minFromClientX(svg: SVGSVGElement, clientX: number) {
    return Math.round(pointerToDomain(svg, clientX, frame, x0, x1))
  }

  return (
    <section className="year-chart">
      <div className="year-chart-head">
        <h3>Indoor reach on {dateLabel}</h3>
        <p>
          {dayArea != null ? (
            <>
              Today <strong>{dayArea.toFixed(2)} m·h</strong>
              {' · '}
            </>
          ) : null}
          {formatTime(focusMin).label}: <strong>{focusReach.toFixed(2)} m inside</strong>
          {` · ${focusAwning.toFixed(2)} m under awning`}
          {peak > 0
            ? ` · face-on ${(focusFace * 100).toFixed(0)}% · peak ${peak.toFixed(2)} m`
            : ' · no sun through the door'}
        </p>
      </div>
      <p className="hint">
        Solid is indoor reach (m). Dashed amber is how far sun walks in under the awning from
        the outer edge. Fill is stronger when the beam is more face-on. Click or use arrow keys
        to set the clock (Shift+arrow = one hour). Indoor metres include sun on the back
        wall. Y is reach, not daily m·h.
      </p>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ fontSize: axisFont }}
        role="slider"
        tabIndex={0}
        aria-label={`Indoor reach through the day on ${dateLabel}`}
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
          const alpha = (a.intensity + b.intensity) / 2
          if (alpha <= 0 && a.reach <= 0 && b.reach <= 0) return null
          const d = `M ${xOf(a.minutes).toFixed(1)} ${yOf(a.reach).toFixed(1)} L ${xOf(b.minutes).toFixed(1)} ${yOf(b.reach).toFixed(1)} L ${xOf(b.minutes).toFixed(1)} ${yOf(0).toFixed(1)} L ${xOf(a.minutes).toFixed(1)} ${yOf(0).toFixed(1)} Z`
          return <path key={a.minutes} d={d} className="year-fill" opacity={0.15 + alpha * 0.7} />
        })}
        {line ? <path d={line} className="year-line" /> : null}
        {awningLine ? <path d={awningLine} className="day-awning" /> : null}
        <line
          x1={xOf(selectedMinutes)}
          x2={xOf(selectedMinutes)}
          y1={pad.t}
          y2={pad.t + ih}
          className="year-today"
        />
        <circle
          cx={xOf(selectedMinutes)}
          cy={yOf(lerpKeyed(series, selectedMinutes, (p) => p.minutes, (p) => p.reach))}
          r={4}
          className="year-today-dot"
        />
        <circle
          cx={xOf(selectedMinutes)}
          cy={yOf(lerpKeyed(series, selectedMinutes, (p) => p.minutes, (p) => p.awningEnter))}
          r={3}
          className="day-awning-dot"
        />
        {hoverMin != null ? (
          <>
            <line x1={xOf(hoverMin)} x2={xOf(hoverMin)} y1={pad.t} y2={pad.t + ih} className="year-hover" />
            <circle cx={xOf(hoverMin)} cy={yOf(focusReach)} r={3.5} className="year-hover-dot" />
            <circle cx={xOf(hoverMin)} cy={yOf(focusAwning)} r={3} className="day-awning-dot" />
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
