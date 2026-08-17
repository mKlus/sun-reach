import { useMemo, useRef, useState } from 'react'
import { ChartYGrid, makeChartFrame, monotoneCubicPath, niceChartMax, pointerToDomain } from '../lib/chartFrame'

export { niceChartMax }
import {
  dayOfYearOn,
  daysInYear,
  formatDate,
  lerpYearDose,
  yearSeriesArea,
  yearSeriesPeak,
  type YearSunPoint,
} from '../lib/solar'
import { useSvgScreenFont } from '../lib/useSvgScreenFont'

type YearSunChartProps = {
  year: number
  series: YearSunPoint[]
  selectedDay: number
  /** Fixed top of the Y axis, in m·h. Does not follow the current curve. */
  yMax: number
  reference?: YearSunPoint[]
  compare?: YearSunPoint[]
  /** Exact this-awning daily dose for the selected day (1-minute walk). */
  todayDose?: number
  tall?: boolean
  onSelectDay?: (dayOfYear: number) => void
}

function fmtDay(n: number): string {
  return n.toFixed(2)
}

function fmtYear(n: number): string {
  return n >= 100 ? n.toFixed(0) : n.toFixed(1)
}

export function YearSunChart({
  year,
  series,
  selectedDay,
  yMax,
  reference,
  compare,
  todayDose,
  tall = false,
  onSelectDay,
}: YearSunChartProps) {
  const [hoverDay, setHoverDay] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const W = 640
  const H = tall ? 380 : 220
  const axisFont = useSvgScreenFont(svgRef, W, 12)
  const dayMax = daysInYear(year)
  const thisPeak = useMemo(() => yearSeriesPeak(series), [series])
  const eavePeak = useMemo(() => yearSeriesPeak(reference ?? []), [reference])
  const cmpPeak = useMemo(() => yearSeriesPeak(compare ?? []), [compare])
  const thisArea = useMemo(() => yearSeriesArea(series), [series])
  const eaveArea = useMemo(() => yearSeriesArea(reference ?? []), [reference])
  const cmpArea = useMemo(() => yearSeriesArea(compare ?? []), [compare])
  const axisTop = yMax > 0 ? yMax : 1
  const hasCompare = Boolean(compare && compare.length)
  const frame = makeChartFrame(W, H, axisFont, 1, dayMax, axisTop)
  const { pad, ih, xOf, yOf } = frame

  const pathOf = (pts: YearSunPoint[]) =>
    monotoneCubicPath(pts.map((p) => ({ x: xOf(p.dayOfYear), y: yOf(p.doseMh) })))
  const line = pathOf(series)
  const refLine = reference && reference.length ? pathOf(reference) : ''
  const compareLine = compare && compare.length ? pathOf(compare) : ''
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
  const selectedDose = todayDose ?? lerpYearDose(series, selectedDay)
  const focusThis =
    hoverDay == null || hoverDay === selectedDay
      ? selectedDose
      : lerpYearDose(series, focusDay)
  const focusEave = lerpYearDose(reference ?? [], focusDay)
  const focusCmp = lerpYearDose(compare ?? [], focusDay)
  const focusLabel = formatDate(year, focusDay).label

  function dayFromClientX(svg: SVGSVGElement, clientX: number) {
    return Math.round(pointerToDomain(svg, clientX, frame, 1, dayMax))
  }

  return (
    <section className="year-chart">
      {tall ? null : (
        <div className="year-chart-head">
          <h3>Daily indoor sun through the year</h3>
          <p>Units m·h. Year total is the sum of interpolated daily values.</p>
        </div>
      )}
      <p className="hint">
        Solid is this awning only (not stacked on the eave). Dashed is the eave reference —
        a separate 0° roof, not extra shade. Cyan is the frozen compare. Year total is the
        sum of interpolated daily m·h. Click or arrow keys jump the date (Shift+arrow = one week).
      </p>
      <table className="curve-stats">
        <thead>
          <tr>
            <th scope="col"> </th>
            <th scope="col">This</th>
            <th scope="col">Eave</th>
            {hasCompare ? <th scope="col">Compare</th> : null}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">{focusLabel}</th>
            <td>
              <strong>{fmtDay(focusThis)}</strong>
            </td>
            <td>{fmtDay(focusEave)}</td>
            {hasCompare ? <td>{fmtDay(focusCmp)}</td> : null}
          </tr>
          <tr>
            <th scope="row">Peak day</th>
            <td>{fmtDay(thisPeak)}</td>
            <td>{fmtDay(eavePeak)}</td>
            {hasCompare ? <td>{fmtDay(cmpPeak)}</td> : null}
          </tr>
          <tr>
            <th scope="row">Year total</th>
            <td>
              <strong>{fmtYear(thisArea)}</strong>
            </td>
            <td>{fmtYear(eaveArea)}</td>
            {hasCompare ? (
              <td>
                <strong>{fmtYear(cmpArea)}</strong>
              </td>
            ) : null}
          </tr>
        </tbody>
      </table>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ fontSize: axisFont }}
        role="slider"
        tabIndex={0}
        aria-label="Daily indoor sun in metre-hours for each day of the year"
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
        {refLine ? <path d={refLine} className="year-ref" /> : null}
        {compareLine ? <path d={compareLine} className="year-compare" /> : null}
        {area ? <path d={area} className="year-fill" /> : null}
        {line ? <path d={line} className="year-line" /> : null}
        <line
          x1={xOf(selectedDay)}
          x2={xOf(selectedDay)}
          y1={pad.t}
          y2={pad.t + ih}
          className="year-today"
        />
        <circle cx={xOf(selectedDay)} cy={yOf(selectedDose)} r={4} className="year-today-dot" />
        {hoverDay != null ? (
          <>
            <line
              x1={xOf(hoverDay)}
              x2={xOf(hoverDay)}
              y1={pad.t}
              y2={pad.t + ih}
              className="year-hover"
            />
            {reference && reference.length ? (
              <circle cx={xOf(hoverDay)} cy={yOf(focusEave)} r={3} className="year-hover-eave" />
            ) : null}
            {hasCompare ? (
              <circle cx={xOf(hoverDay)} cy={yOf(focusCmp)} r={3} className="year-hover-compare" />
            ) : null}
            <circle
              cx={xOf(hoverDay)}
              cy={yOf(lerpYearDose(series, hoverDay))}
              r={3.5}
              className="year-hover-dot"
            />
          </>
        ) : null}
        {months.map((m) => (
          <text key={m.name} x={xOf(m.day)} y={H - 8} className="year-month" textAnchor="middle">
            {m.name}
          </text>
        ))}
      </svg>
    </section>
  )
}
