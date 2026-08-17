import type { CalcModel } from '../lib/model'
import { formatFacing, toRad } from '../lib/solar'

type SunPlanProps = {
  model: CalcModel
}

function polar(cx: number, cy: number, radius: number, degFromNorth: number) {
  const r = toRad(degFromNorth)
  return {
    x: cx + radius * Math.sin(r),
    y: cy - radius * Math.cos(r),
  }
}

function horizonRay(
  cx: number,
  cy: number,
  az: number,
  kind: 'rise' | 'set',
) {
  const tip = polar(cx, cy, 78, az)
  const label = polar(cx, cy, 68, az)
  return (
    <g className={`sun-plan-horizon is-${kind}`}>
      <line x1={cx} y1={cy} x2={tip.x} y2={tip.y} className="sun-plan-horizon-glow" />
      <line x1={cx} y1={cy} x2={tip.x} y2={tip.y} className="sun-plan-horizon-line" />
      <circle cx={tip.x} cy={tip.y} r={3.2} className="sun-plan-horizon-dot" />
      <text
        x={label.x}
        y={label.y}
        className="sun-plan-horizon-label"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {kind === 'rise' ? 'rise' : 'set'}
      </text>
    </g>
  )
}

export function SunPlan({ model }: SunPlanProps) {
  const { sun, sunRise, sunSet, prof, facing } = model
  const cx = 100
  const cy = 100
  const sunPt = polar(cx, cy, 78, sun.az)
  function localToSvg(east: number, out: number) {
    const r = toRad(facing)
    return {
      x: cx + east * Math.cos(r) + out * Math.sin(r),
      y: cy + east * Math.sin(r) - out * Math.cos(r),
    }
  }
  const housePts = [
    localToSvg(-18, 20),
    localToSvg(18, 20),
    localToSvg(18, -22),
    localToSvg(-18, -22),
  ]
  const house = housePts.map((p) => `${p.x},${p.y}`)
  const doorA = localToSvg(-12, 20)
  const doorB = localToSvg(12, 20)
  const doorMid = localToSvg(0, 20)
  const on = prof.onFacade
  const caption = on
    ? `Sun ${formatFacing(sun.az).name} is in front of the ${formatFacing(facing).name} door`
    : prof.reason === 'below-horizon'
      ? 'Sun is below the horizon'
      : `Sun ${formatFacing(sun.az).name} is around the house — not through the ${formatFacing(facing).name} door`

  const ticks = Array.from({ length: 72 }, (_, i) => {
    const deg = i * 5
    const major = deg % 90 === 0
    const mid = deg % 30 === 0
    const inner = major ? 78 : mid ? 82 : 85.5
    return { deg, a: polar(cx, cy, inner, deg), b: polar(cx, cy, 88, deg), major, mid }
  })

  return (
    <figure className={`sun-plan${on ? ' is-on' : ' is-off'}`}>
      <svg viewBox="0 0 200 200" role="img" aria-label={caption}>
        <circle cx={cx} cy={cy} r={88} className="sun-plan-ring" />
        {ticks.map((t) => (
          <line
            key={t.deg}
            x1={t.a.x}
            y1={t.a.y}
            x2={t.b.x}
            y2={t.b.y}
            className={`sun-plan-tick${t.major ? ' is-major' : t.mid ? ' is-mid' : ''}`}
          />
        ))}
        {['N', 'E', 'S', 'W'].map((label, i) => {
          const p = polar(cx, cy, 94, i * 90)
          return (
            <text key={label} x={p.x} y={p.y} className="sun-plan-cardinal" textAnchor="middle" dominantBaseline="middle">
              {label}
            </text>
          )
        })}
        <polygon points={house.join(' ')} className="sun-plan-house" />
        <line x1={doorA.x} y1={doorA.y} x2={doorB.x} y2={doorB.y} className="sun-plan-door" />
        <circle cx={doorMid.x} cy={doorMid.y} r={3} className="sun-plan-door-dot" />
        {sunRise ? horizonRay(cx, cy, sunRise.az, 'rise') : null}
        {sunSet ? horizonRay(cx, cy, sunSet.az, 'set') : null}
        {sun.alt > 0 ? (
          <>
            <line x1={sunPt.x} y1={sunPt.y} x2={cx} y2={cy} className="sun-plan-beam" />
            <circle cx={sunPt.x} cy={sunPt.y} r={8} className="sun-plan-sun" />
          </>
        ) : null}
      </svg>
      <figcaption>{caption}</figcaption>
    </figure>
  )
}
