import type { CalcModel } from '../lib/model'
import { awningHeadline, degLabel, metres, reachHeadline } from '../lib/solar'

type ResultsPanelProps = {
  model: CalcModel
}

export function ResultsPanel({ model }: ResultsPanelProps) {
  const { reach, sun, prof, daily } = model

  let tone = 'none'
  if (reach.status === 'enters' || reach.status === 'door-limited') tone = 'sun'
  else if (reach.status === 'full-shade') tone = 'shade'
  else if (reach.status === 'off-facade') tone = 'none'
  else if (reach.status === 'invalid-end') tone = 'warn'

  const label = reachHeadline(reach)

  const reachScale = Math.max(model.roomDepth, reach.reach, 0.01)
  const reachPct =
    reach.status === 'enters' || reach.status === 'door-limited'
      ? Math.min(100, (reach.reach / reachScale) * 100)
      : 0
  const awningPct = Math.min(100, (reach.awningEnter / Math.max(model.length, 0.01)) * 100)
  const awningTone = reach.awningEnter > 0 ? 'sun' : 'none'

  return (
    <>
      <div className="results results-pair is-triple">
        <div className={`metric ${tone}`}>
          <div className="kicker">Sun enter now</div>
          <div className="big">{label}</div>
          <div className="sub">{reach.message}</div>
          <div
            className="reach"
            role="meter"
            aria-label="Indoor sun reach, including the back wall"
            aria-valuemin={0}
            aria-valuemax={reachScale}
            aria-valuenow={
              reach.status === 'enters' || reach.status === 'door-limited' ? reach.reach : 0
            }
          >
            <span className="reach-fill" style={{ width: `${reachPct}%` }} />
          </div>
          <div className="reach-cap">
            0{' '}
            <span>
              {reach.hitsBack
                ? `floor ${model.roomDepth.toFixed(1)} m + wall`
                : `house ${model.roomDepth.toFixed(1)} m`}
            </span>
          </div>
        </div>
        <div className={`metric ${awningTone}`}>
          <div className="kicker">Under awning now</div>
          <div className="big">{awningHeadline(reach, model.length)}</div>
          <div className="sub">
            How far sun walks in from the outer edge under the patio roof.
          </div>
          <div
            className="reach"
            role="meter"
            aria-label="Sun under awning versus projection"
            aria-valuemin={0}
            aria-valuemax={model.length}
            aria-valuenow={reach.awningEnter}
          >
            <span className="reach-fill" style={{ width: `${awningPct}%` }} />
          </div>
          <div className="reach-cap">
            0 <span>awning {model.length.toFixed(1)} m</span>
          </div>
        </div>
        <div className={`metric${daily.doseMh > 0 ? ' sun' : ' none'}`}>
          <div className="kicker">Daily indoor sun</div>
          <div className="big">
            {daily.doseMh.toFixed(2)} <small>m·h</small>
          </div>
          <div className="sub">
            {daily.hoursInside > 0
              ? `${daily.hoursInside.toFixed(1)} h through the door · deepest ${daily.maxReach.toFixed(2)} m`
              : 'No sun through this door today'}
          </div>
          <div className="sub">
            Reach × face-on × hours. Sun that hits the back wall still counts.
            {daily.hoursUnderAwning > 0
              ? ` Under awning up to ${daily.maxAwningEnter.toFixed(2)} m for ${daily.hoursUnderAwning.toFixed(1)} h.`
              : ''}
          </div>
        </div>
      </div>
      <div className="stats">
        <div>
          Rafter length <strong>{Number.isFinite(reach.rafter) ? metres(reach.rafter) : '—'}</strong>
        </div>
        <div>
          Roof drop <strong>{metres(reach.drop)}</strong>
        </div>
        <div>
          Sun altitude <strong>{degLabel(sun.alt)}</strong>
        </div>
        <div>
          Sun azimuth <strong>{degLabel(sun.az)}</strong>
        </div>
        <div>
          Off facade <strong>{degLabel(prof.azDiff)}</strong>
        </div>
        <div>
          Profile angle <strong>{prof.behind ? '—' : degLabel(prof.profile)}</strong>
        </div>
        <div>
          Under awning <strong>{metres(reach.awningEnter)}</strong>
        </div>
      </div>
    </>
  )
}
