import { useMemo, useRef, useState } from 'react'
import {
  ChartYGrid,
  lerpKeyed,
  makeChartFrame,
  monotoneCubicPath,
  pointerToDomain,
} from '../lib/chartFrame'
import type { GardenYearPoint } from '../lib/gardenSolar'
import { dayOfYearOn, daysInYear, formatDate } from '../lib/solar'
import { useSvgScreenFont } from '../lib/useSvgScreenFont'
import { downloadText } from '../lib/yearCsv'

type GardenYearSunChartProps = {
  year: number
  series: GardenYearPoint[]
  selectedDay: number
  yMax: number
  tall?: boolean
  onSelectDay?: (dayOfYear: number) => void
}

export function GardenYearSunChart({
  year,
  series,
  selectedDay,
  yMax,
  tall = false,
  onSelectDay,
}: GardenYearSunChartProps) {
  const [hoverDay, setHoverDay] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const W = 640
  const H = tall ? 380 : 220
  const axisFont = useSvgScreenFont(svgRef, W, 12)
  const dayMax = daysInYear(year)

  const peakHours = useMemo(
    () => series.reduce((m, p) => Math.max(m, p.directSunHoursAvg), 0),
    [series],
  )
  const minHours = useMemo(
    () => series.reduce((m, p) => (m === 0 ? p.directSunHoursAvg : Math.min(m, p.directSunHoursAvg)), 0),
    [series],
  )

  const axisTop = Math.max(8, yMax)
  const frame = makeChartFrame(W, H, axisFont, 1, dayMax, axisTop)
  const { pad, ih, xOf, yOf } = frame

  const pathOf = (pts: GardenYearPoint[]) =>
    monotoneCubicPath(pts.map((p) => ({ x: xOf(p.dayOfYear), y: yOf(p.directSunHoursAvg) })))

  const line = pathOf(series)
  const area = series.length
    ? `${line} L ${xOf(series[series.length - 1].dayOfYear).toFixed(1)} ${yOf(0).toFixed(1)} L ${xOf(series[0].dayOfYear).toFixed(1)} ${yOf(0).toFixed(1)} Z`
    : ''

  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ].map((name, i) => ({ name, day: dayOfYearOn(year, i + 1, 15) }))

  const focusDay = hoverDay ?? selectedDay
  const focusHours = lerpKeyed(series, focusDay, (p) => p.dayOfYear, (p) => p.directSunHoursAvg)
  const focusLabel = formatDate(year, focusDay).label

  function dayFromClientX(svg: SVGSVGElement, clientX: number) {
    return Math.round(pointerToDomain(svg, clientX, frame, 1, dayMax))
  }

  function downloadCsv() {
    const header = 'DayOfYear,Date,DirectSunHoursAvg,DailyDoseM2h,PeakSunlitAreaM2\n'
    const rows = series
      .map((p) => {
        const d = formatDate(year, p.dayOfYear)
        return `${p.dayOfYear},${d.label},${p.directSunHoursAvg.toFixed(2)},${p.dailyDoseM2h.toFixed(2)},${p.sunlitAreaPeak.toFixed(2)}`
      })
      .join('\n')
    downloadText(`vegie-garden-sun-${year}.csv`, header + rows)
  }

  return (
    <section className="year-chart">
      {tall ? null : (
        <div className="year-chart-head">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3>Daily direct sun on vegie garden through the year</h3>
              <p>Average daily direct sunlight hours received by the garden bed across all seasons.</p>
            </div>
            <button
              type="button"
              className="no-print"
              style={{
                border: '1px solid var(--hair-strong)',
                background: 'var(--lift)',
                color: 'var(--ink)',
                borderRadius: 999,
                padding: '4px 12px',
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
              onClick={downloadCsv}
            >
              Download CSV
            </button>
          </div>
        </div>
      )}
      <p className="hint">
        Direct sun varies seasonally as the sun's path shifts. In winter, trees cast long shadows towards the poles. Click or use arrow keys to jump between dates.
      </p>

      <table className="curve-stats">
        <thead>
          <tr>
            <th scope="col"> </th>
            <th scope="col">Sun Hours</th>
            <th scope="col">Growing Assessment</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">{focusLabel}</th>
            <td>
              <strong>{focusHours.toFixed(1)} hrs/day</strong>
            </td>
            <td>{focusHours >= 6 ? 'Full Sun (Fruiting Crops)' : focusHours >= 3.5 ? 'Partial Sun (Greens & Herbs)' : 'Shade (Low Light)'}</td>
          </tr>
          <tr>
            <th scope="row">Peak Day</th>
            <td>{peakHours.toFixed(1)} hrs/day</td>
            <td>Maximum summer sun reach</td>
          </tr>
          <tr>
            <th scope="row">Lowest Day</th>
            <td>{minHours.toFixed(1)} hrs/day</td>
            <td>Deepest winter shadow</td>
          </tr>
        </tbody>
      </table>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ fontSize: axisFont }}
        role="slider"
        tabIndex={0}
        aria-label="Daily direct sun hours on vegie garden for each day of the year"
        aria-valuemin={1}
        aria-valuemax={dayMax}
        aria-valuenow={selectedDay}
        aria-valuetext={focusLabel}
        onMouseMove={(e) => setHoverDay(dayFromClientX(e.currentTarget, e.clientX))}
        onMouseLeave={() => setHoverDay(null)}
        onClick={(e) => onSelectDay?.(dayFromClientX(e.currentTarget, e.clientX))}
        onKeyDown={(e) => {
          if (!onSelectDay) return
          const step = e.shiftKey ? 7 : 1
          if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
            e.preventDefault()
            onSelectDay(Math.max(1, selectedDay - step))
          } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
            e.preventDefault()
            onSelectDay(Math.min(dayMax, selectedDay + step))
          } else if (e.key === 'Home') {
            e.preventDefault()
            onSelectDay(1)
          } else if (e.key === 'End') {
            e.preventDefault()
            onSelectDay(dayMax)
          }
        }}
      >
        <ChartYGrid frame={frame} yMax={axisTop} />
        {area ? <path d={area} className="year-fill" style={{ fill: 'rgba(52, 168, 83, 0.22)' }} /> : null}
        {line ? <path d={line} className="year-line" style={{ stroke: '#34a853' }} /> : null}

        {/* Selected Day Indicator */}
        <line
          x1={xOf(selectedDay)}
          x2={xOf(selectedDay)}
          y1={pad.t}
          y2={pad.t + ih}
          className="year-today"
        />
        <circle
          cx={xOf(selectedDay)}
          cy={yOf(lerpKeyed(series, selectedDay, (p) => p.dayOfYear, (p) => p.directSunHoursAvg))}
          r={4}
          className="year-today-dot"
        />

        {/* Hover Indicator */}
        {hoverDay != null ? (
          <>
            <line
              x1={xOf(hoverDay)}
              x2={xOf(hoverDay)}
              y1={pad.t}
              y2={pad.t + ih}
              className="year-hover"
            />
            <circle
              cx={xOf(hoverDay)}
              cy={yOf(lerpKeyed(series, hoverDay, (p) => p.dayOfYear, (p) => p.directSunHoursAvg))}
              r={3.5}
              className="year-hover-dot"
            />
          </>
        ) : null}

        {/* Month labels */}
        {months.map((m) => (
          <text key={m.name} x={xOf(m.day)} y={H - 8} className="year-month" textAnchor="middle">
            {m.name}
          </text>
        ))}
      </svg>
    </section>
  )
}
