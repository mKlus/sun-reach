import type { GardenConfig, TreeConfig } from '../lib/gardenModel'
import type { GardenDailySun, GardenInstantSun } from '../lib/gardenSolar'
import { degLabel, formatFacing, metres } from '../lib/solar'

type GardenResultsPanelProps = {
  tree: TreeConfig
  garden: GardenConfig
  instant: GardenInstantSun
  daily: GardenDailySun
}

export function GardenResultsPanel({
  tree,
  garden,
  instant,
  daily,
}: GardenResultsPanelProps) {
  const { sunlitPercent, sunlitAreaM2, totalAreaM2, status } = instant

  let tone = 'none'
  if (status === 'full-sun') tone = 'sun'
  else if (status === 'partial-sun') tone = 'warn'
  else if (status === 'full-shade') tone = 'shade'

  const suit = daily.suitability

  return (
    <>
      <div className="results results-pair is-triple">
        {/* Metric 1: Garden Sun Now */}
        <div className={`metric ${tone}`}>
          <div className="kicker">Garden sunlit now</div>
          <div className="big">{sunlitPercent.toFixed(0)}%</div>
          <div className="sub">
            {sunlitAreaM2.toFixed(1)} m² in direct sun out of {totalAreaM2.toFixed(1)} m²
          </div>
          <div
            className="reach"
            role="meter"
            aria-label="Current sunlit percentage of garden"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={sunlitPercent}
          >
            <span
              className="reach-fill"
              style={{
                width: `${sunlitPercent}%`,
                background:
                  status === 'full-sun'
                    ? 'var(--sun)'
                    : status === 'partial-sun'
                      ? 'var(--amber)'
                      : 'var(--shade)',
              }}
            />
          </div>
          <div className="reach-cap">
            0% <span>bed {garden.width.toFixed(1)}m × {garden.length.toFixed(1)}m</span>
          </div>
        </div>

        {/* Metric 2: Daily Direct Sun Hours */}
        <div className={`metric${daily.directSunHoursAvg >= 5 ? ' sun' : ' shade'}`}>
          <div className="kicker">Daily average sun</div>
          <div className="big">
            {daily.directSunHoursAvg.toFixed(1)} <small>hrs</small>
          </div>
          <div className="sub">
            {daily.directSunHoursMin.toFixed(1)} h (shaded end) – {daily.directSunHoursMax.toFixed(1)} h (sunny end)
          </div>
          <div className="sub" style={{ marginTop: 4 }}>
            Daily solar dose: <strong>{daily.dailyDoseM2h.toFixed(1)} m²·h</strong> · Daylight: {(daily.daylightMinutes / 60).toFixed(1)} hrs
          </div>
        </div>

        {/* Metric 3: Crop Suitability */}
        <div
          className="metric"
          style={{
            borderColor:
              suit.tier === 'full-sun'
                ? 'var(--sun)'
                : suit.tier === 'partial-sun'
                  ? 'var(--amber)'
                  : 'var(--shade)',
          }}
        >
          <div className="kicker">Growing suitability</div>
          <div
            className="big"
            style={{
              fontSize: '1.25rem',
              color:
                suit.tier === 'full-sun'
                  ? 'var(--sun)'
                  : suit.tier === 'partial-sun'
                    ? 'var(--amber)'
                    : 'var(--shade)',
            }}
          >
            {suit.title}
          </div>
          <p style={{ margin: '6px 0 8px', fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.35 }}>
            {suit.description}
          </p>
          <div className="crop-tag-list" style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {suit.recommendations.slice(0, 5).map((crop) => (
              <span
                key={crop}
                style={{
                  background: 'var(--lift)',
                  border: '1px solid var(--hair-strong)',
                  borderRadius: 6,
                  padding: '2px 7px',
                  fontSize: '0.74rem',
                  fontWeight: 500,
                }}
              >
                {crop}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Geometry and Solar Stats */}
      <div className="stats">
        <div>
          Tree shadow length <strong>{instant.sunAlt > 0.05 ? metres(instant.shadowLengthMax) : '—'}</strong>
        </div>
        <div>
          Shadow towards <strong>{instant.sunAlt > 0.05 ? formatFacing(instant.shadowAzimuth).label : '—'}</strong>
        </div>
        <div>
          Tree to garden <strong>{metres(instant.distanceTreeToGarden)} ({formatFacing(instant.bearingTreeToGarden).name})</strong>
        </div>
        <div>
          Sun altitude <strong>{degLabel(instant.sunAlt)}</strong>
        </div>
        <div>
          Sun azimuth <strong>{degLabel(instant.sunAz)}</strong>
        </div>
        <div>
          Tree height <strong>{metres(tree.height)}</strong>
        </div>
        <div>
          {tree.mode === 'single' ? 'Canopy diameter' : 'Tree count'}{' '}
          <strong>{tree.mode === 'single' ? metres(tree.diameter) : `${tree.treeCount} trees (${metres(tree.groupWidth)} span)`}</strong>
        </div>
      </div>
    </>
  )
}
