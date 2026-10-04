import { useRef, useState } from 'react'
import {
  ChartYGrid,
  lerpKeyed,
  makeChartFrame,
  pointerToDomain,
} from '../lib/chartFrame'
import type { GardenDayPoint } from '../lib/gardenSolar'
import { formatTime } from '../lib/solar'
import { useSvgScreenFont } from '../lib/useSvgScreenFont'

type GardenDaySunChartProps = {
  dateLabel: string
  series: GardenDayPoint[]
  selectedMinutes: number
  totalAreaM2: number
  dailyDoseM2h: number
  avgHours: number
  sunriseMin: number
  sunsetMin: number
  tall?: boolean
  onSelectMinutes?: (minutes: number) => void
}

export function GardenDaySunChart({
  dateLabel,
  series,
  selectedMinutes,
  totalAreaM2,
  dailyDoseM2h,
  avgHours,
  sunriseMin,
  sunsetMin,
  tall = false,
  onSelectMinutes,
}: GardenDaySunChartProps) {
  const [hoverMin, setHoverMin] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const W = 640
  const H = tall ? 340 : 200
  const axisFont = useSvgScreenFont(svgRef, W, 12)

  const axisTop = 100 // Y-axis is 0% to 100% sunlit
  const x0 = sunriseMin
  const x1 = Math.max(sunriseMin + 1, sunsetMin)
  const frame = makeChartFrame(W, H, axisFont, x0, x1, axisTop)
  const { pad, ih, xOf, yOf } = frame

  const line = series
    .map(
      (p, i) =>
        `${i === 0 ? 'M' : 'L'} ${xOf(p.minutes).toFixed(1)} ${yOf(p.sunlitPercent).toFixed(1)}`,
    )
    .join(' ')

  const area = series.length
    ? `${line} L ${xOf(series[series.length - 1].minutes).toFixed(1)} ${yOf(0).toFixed(1)} L ${xOf(series[0].minutes).toFixed(1)} ${yOf(0).toFixed(1)} Z`
    : ''

  const hours: number[] = []
  for (let h = Math.ceil(x0 / 60); h <= Math.floor(x1 / 60); h++) hours.push(h * 60)

  const focusMin = hoverMin ?? selectedMinutes
  const focusPercent = lerpKeyed(
    series,
    focusMin,
    (p) => p.minutes,
    (p) => p.sunlitPercent,
  )
  const focusArea = (focusPercent / 100) * totalAreaM2

  function minFromClientX(svg: SVGSVGElement, clientX: number) {
    return Math.round(pointerToDomain(svg, clientX, frame, x0, x1))
  }

  return (
    <section className="year-chart">
      <div className="year-chart-head">
        <h3>Vegie garden direct sun on {dateLabel}</h3>
        <p>
          Today <strong>{avgHours.toFixed(1)} hrs average direct sun</strong>
          {' · '}
          Dose: <strong>{dailyDoseM2h.toFixed(1)} m²·h</strong>
          {' · '}
          {formatTime(focusMin).label}:{' '}
          <strong>
            {focusPercent.toFixed(0)}% sunlit ({focusArea.toFixed(1)} m²)
          </strong>
        </p>
      </div>
      <p className="hint">
        Percentage of the vegie garden enclosure receiving direct unshaded sunlight. Shaded portions are cast by the tree canopy. Click or use arrow keys to scrub the time of day.
      </p>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ fontSize: axisFont }}
        role="slider"
        tabIndex={0}
        aria-label={`Vegie garden direct sun through the day on ${dateLabel}`}
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
        {area ? <path d={area} className="year-fill" style={{ fill: 'rgba(255, 138, 60, 0.22)' }} /> : null}
        {line ? <path d={line} className="year-line" /> : null}

        {/* Selected time line & dot */}
        <line
          x1={xOf(selectedMinutes)}
          x2={xOf(selectedMinutes)}
          y1={pad.t}
          y2={pad.t + ih}
          className="year-today"
        />
        <circle
          cx={xOf(selectedMinutes)}
          cy={yOf(lerpKeyed(series, selectedMinutes, (p) => p.minutes, (p) => p.sunlitPercent))}
          r={4}
          className="year-today-dot"
        />

        {/* Hover min indicator */}
        {hoverMin != null ? (
          <>
            <line x1={xOf(hoverMin)} x2={xOf(hoverMin)} y1={pad.t} y2={pad.t + ih} className="year-hover" />
            <circle cx={xOf(hoverMin)} cy={yOf(focusPercent)} r={3.5} className="year-hover-dot" />
          </>
        ) : null}

        {/* Time hour ticks on X-axis */}
        {hours.map((m) => (
          <text key={m} x={xOf(m)} y={H - 8} className="year-month" textAnchor="middle">
            {formatTime(m).label}
          </text>
        ))}
      </svg>
    </section>
  )
}
