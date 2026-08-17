import { useState } from 'react'
import { AwningKey } from './components/AwningKey'
import { ConsoleAwning } from './components/ConsoleAwning'
import { ConsoleDateTime } from './components/ConsoleDateTime'
import { ConsoleLocation } from './components/ConsoleLocation'
import { DaySunChart } from './components/DaySunChart'
import { ExpandButton } from './components/ExpandButton'
import { LocationPane } from './components/LocationPane'
import { Popout } from './components/Popout'
import { ResultsPanel } from './components/ResultsPanel'
import { SectionCanvas } from './components/SectionCanvas'
import { SunPlan } from './components/SunPlan'
import { ThemeSwitch } from './components/ThemeSwitch'
import { YearSunChart } from './components/YearSunChart'
import { YEAR } from './lib/model'
import { clearCompare, hasCompare, replaceSceneUrl, snapshotCompare } from './lib/scene'
import { awningHeadline, clamp, formatDate, formatFacing, formatTime, reachHeadline, type SunReach } from './lib/solar'
import { useStudioSession } from './lib/useStudioSession'
import { useSunSeries } from './lib/useSunSeries'
import { useThemePref } from './lib/theme'
import { downloadText, yearSeriesCsv } from './lib/yearCsv'

function reachTone(status: SunReach['status']): 'sun' | 'shade' | 'warn' | 'none' {
  if (status === 'enters' || status === 'door-limited') return 'sun'
  if (status === 'full-shade') return 'shade'
  if (status === 'invalid-end') return 'warn'
  return 'none'
}

export default function App() {
  const session = useStudioSession()
  const { inputs, patch, ready } = session
  const { model, dayCurve, yearSeries, eaveYear, compareYear, yearAxisMax, dayMax } =
    useSunSeries(inputs)
  const [themePref, setThemePref] = useThemePref()
  const [showHints, setShowHints] = useState(false)
  const [copyLabel, setCopyLabel] = useState('Copy link')
  const [popout, setPopout] = useState<null | 'map' | 'day' | 'year' | 'section'>(null)

  function setClock(timeMinutes: number) {
    patch({
      timeMinutes: clamp(
        timeMinutes,
        model.daylight.polar === 'night' ? 0 : model.daylight.sunriseMin,
        model.daylight.polar === 'night' ? 0 : model.daylight.sunsetMin,
      ),
    })
  }

  return (
    <div className="studio">
      <header className="mast">
        <div className="brand">
          <span className="mark" aria-hidden>
            <svg viewBox="0 0 36 36">
              <rect className="mark-plate" width="36" height="36" rx="10" />
              <circle cx="26" cy="10" r="4" fill="#ff8a3c" />
              <path className="mark-wall" d="M8 26V13.2L26 17.4V26" fill="none" strokeWidth="1.6" />
              <path d="M8 13.2 26 17.4" stroke="#ff8a3c" strokeWidth="2.4" strokeLinecap="square" />
              <rect x="7" y="16.4" width="2.3" height="9.6" fill="#3ec8d8" />
            </svg>
          </span>
          <div>
            <p className="eyebrow">Patio study</p>
            <h1>Sun Reach</h1>
          </div>
        </div>
        <p className="lede">
          Section through a glass door and sloped awning. Set the site, facing, and roof fall —
          then read how far winter sun walks indoors.
        </p>
        <div className="mast-tools">
          <ThemeSwitch value={themePref} onChange={setThemePref} />
          <div className="live">
            <span>
              {formatDate(YEAR, inputs.dayOfYear).label}
              <em>{formatTime(inputs.timeMinutes).label}</em>
            </span>
            <span>
              Door
              <em>{formatFacing(inputs.facing).label}</em>
            </span>
            <span>
              Daily
              <em>{model.daily.doseMh.toFixed(2)} m·h</em>
            </span>
          </div>
        </div>
      </header>

      <div className="stage">
        <aside className="console">
          <div className="console-tools">
            <button type="button" onClick={() => setShowHints((v) => !v)}>
              {showHints ? 'Hide tips' : 'Show tips'}
            </button>
            <button type="button" onClick={session.resetDefaults}>
              Reset defaults
            </button>
            <button
              type="button"
              onClick={() => {
                replaceSceneUrl(inputs)
                void navigator.clipboard.writeText(window.location.href).then(
                  () => {
                    setCopyLabel('Copied')
                    window.setTimeout(() => setCopyLabel('Copy link'), 1600)
                  },
                  () => {
                    setCopyLabel('Copy failed')
                    window.setTimeout(() => setCopyLabel('Copy link'), 1600)
                  },
                )
              }}
            >
              {copyLabel}
            </button>
            <button type="button" className="no-print" onClick={() => window.print()}>
              Print
            </button>
          </div>
          <ConsoleLocation
            ready={ready}
            inputs={inputs}
            model={model}
            recenter={session.recenter}
            locateLabel={session.locateLabel}
            mapActive={popout !== 'map'}
            showHints={showHints}
            onUserEdit={session.markPlaceTouched}
            onPick={(lat, lon, label) => {
              session.markPlaceTouched()
              session.setLocation(lat, lon, true, label)
            }}
            onLocation={(lat, lon) => session.setLocation(lat, lon, false)}
            onLocate={() => session.locateDevice()}
            onExpand={() => setPopout('map')}
            onFacing={(facing) => patch({ facing })}
          />
          <ConsoleDateTime
            inputs={inputs}
            model={model}
            dayMax={dayMax}
            showHints={showHints}
            onDay={(dayOfYear) => patch({ dayOfYear })}
            onTime={(timeMinutes) => patch({ timeMinutes })}
            onPreset={session.applyPreset}
          />
          <ConsoleAwning
            inputs={inputs}
            model={model}
            showHints={showHints}
            onProjection={(projection) => patch({ projection })}
            onWallHeight={session.changeWallHeight}
            onEndHeight={session.changeEndHeight}
            onSlope={(slope) => patch({ slope })}
            onDoorHeight={(doorHeight) => patch({ doorHeight })}
            onRoomDepth={(roomDepth) => patch({ roomDepth })}
            onEaveProjection={(eaveProjection) => patch({ eaveProjection })}
            onEaveHeight={(eaveHeightWall) => patch({ eaveHeightWall })}
            onHouseRoofSlope={(houseRoofSlope) => patch({ houseRoofSlope })}
          />
        </aside>

        <main className="gallery">
          <div className="studio-pair">
            <article className="print tile-section">
              <div className="print-bar">
                <div className="print-copy">
                  <h2>House section</h2>
                  <p className="print-desc">
                    Side cut through the room, the glass door, and the patio roof.
                  </p>
                  <p className="print-meta">
                    {formatDate(YEAR, inputs.dayOfYear).label}
                    {' · '}
                    {formatTime(inputs.timeMinutes).label}
                    {' · '}
                    {formatFacing(inputs.facing).label}
                  </p>
                </div>
                <strong className={`print-live is-${reachTone(model.reach.status)}`}>
                  {reachHeadline(model.reach)}
                  {model.reach.awningEnter > 0
                    ? ` · under ${awningHeadline(model.reach, model.length)}`
                    : ''}
                </strong>
              </div>
              <div className="section-stage">
                <ExpandButton className="expand-btn no-print" onClick={() => setPopout('section')} />
                <SectionCanvas model={model} />
              </div>
            </article>

            <article className="tile tile-day">
              <ExpandButton className="expand-btn no-print" onClick={() => setPopout('day')} />
              <DaySunChart
                dateLabel={formatDate(YEAR, inputs.dayOfYear).label}
                series={dayCurve}
                selectedMinutes={inputs.timeMinutes}
                dayArea={model.daily.doseMh}
                yMax={inputs.roomDepth}
                sunriseMin={model.daylight.sunriseMin}
                sunsetMin={model.daylight.sunsetMin}
                onSelectMinutes={setClock}
              />
            </article>
          </div>

          <div className="bento">
            <article className="tile tile-plan">
              <header className="tile-head">
                <h2>Azimuth</h2>
                <p>Sun versus the glass</p>
              </header>
              <SunPlan model={model} />
            </article>

            <article className="tile tile-readout">
              <header className="tile-head">
                <h2>Readout</h2>
                <p>This minute and this day</p>
              </header>
              <ResultsPanel model={model} />
            </article>

            <article className="tile tile-year">
              <ExpandButton className="expand-btn no-print" onClick={() => setPopout('year')} />
              <div className="tile-actions no-print">
                <button type="button" onClick={() => session.setInputs((s) => snapshotCompare(s))}>
                  Compare this awning
                </button>
                {hasCompare(inputs) ? (
                  <button type="button" onClick={() => session.setInputs((s) => clearCompare(s))}>
                    Clear compare
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    downloadText(
                      `sun-reach-${YEAR}.csv`,
                      yearSeriesCsv(YEAR, yearSeries, eaveYear, compareYear),
                    )
                  }}
                >
                  Download CSV
                </button>
              </div>
              <AwningKey inputs={inputs} />
              <YearSunChart
                year={YEAR}
                series={yearSeries}
                selectedDay={inputs.dayOfYear}
                yMax={yearAxisMax}
                reference={eaveYear}
                compare={hasCompare(inputs) ? compareYear : undefined}
                todayDose={model.daily.doseMh}
                onSelectDay={(dayOfYear) => patch({ dayOfYear: clamp(dayOfYear, 1, dayMax) })}
              />
            </article>
          </div>

          <footer className="fine">
            Solar position is a NOAA-style estimate. Australian eastern / central DST and New
            Zealand DST are applied; other places use a longitude timezone. Map tiles © Esri.
            Search © Esri World Geocoding / Nominatim. Treat results as a design aid, not a
            survey.
          </footer>
        </main>
      </div>
      {popout === 'map' ? (
        <Popout title="Site" size="map" onClose={() => setPopout(null)}>
          <LocationPane
            ready={ready}
            placeLabel={inputs.placeLabel}
            lat={inputs.lat}
            lon={inputs.lon}
            facing={inputs.facing}
            roomDepth={inputs.roomDepth}
            recenter={session.recenter}
            locateLabel={session.locateLabel}
            active
            large
            showFacing
            showHints={showHints}
            onUserEdit={session.markPlaceTouched}
            onPick={(lat, lon, label) => {
              session.markPlaceTouched()
              session.setLocation(lat, lon, true, label)
            }}
            onLocation={(lat, lon) => session.setLocation(lat, lon, false)}
            onLocate={() => session.locateDevice()}
            onFacing={(facing) => patch({ facing })}
          />
        </Popout>
      ) : null}
      {popout === 'day' ? (
        <Popout title="Indoor reach today" onClose={() => setPopout(null)}>
          <DaySunChart
            dateLabel={formatDate(YEAR, inputs.dayOfYear).label}
            series={dayCurve}
            selectedMinutes={inputs.timeMinutes}
            dayArea={model.daily.doseMh}
            yMax={inputs.roomDepth}
            sunriseMin={model.daylight.sunriseMin}
            sunsetMin={model.daylight.sunsetMin}
            tall
            onSelectMinutes={setClock}
          />
        </Popout>
      ) : null}
      {popout === 'section' ? (
        <Popout title="House section" onClose={() => setPopout(null)}>
          <SectionCanvas model={model} large />
        </Popout>
      ) : null}
      {popout === 'year' ? (
        <Popout title="Daily indoor sun through the year" onClose={() => setPopout(null)}>
          <AwningKey inputs={inputs} />
          <YearSunChart
            year={YEAR}
            series={yearSeries}
            selectedDay={inputs.dayOfYear}
            yMax={yearAxisMax}
            reference={eaveYear}
            compare={hasCompare(inputs) ? compareYear : undefined}
            todayDose={model.daily.doseMh}
            tall
            onSelectDay={(dayOfYear) => patch({ dayOfYear: clamp(dayOfYear, 1, dayMax) })}
          />
        </Popout>
      ) : null}
    </div>
  )
}
