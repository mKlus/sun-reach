import { useState } from 'react'
import { clamp, formatDate, formatTime } from '../lib/solar'
import { useGardenSession } from '../lib/useGardenSession'
import { useGardenSunSeries } from '../lib/useGardenSunSeries'
import { YEAR } from '../lib/model'
import { ConsoleDateTime } from './ConsoleDateTime'
import { ConsoleTreeGarden } from './ConsoleTreeGarden'
import { ExpandButton } from './ExpandButton'
import { GardenDaySunChart } from './GardenDaySunChart'
import { GardenLocationPane } from './GardenLocationPane'
import { GardenResultsPanel } from './GardenResultsPanel'
import { GardenSectionCanvas } from './GardenSectionCanvas'
import { GardenSunPlan } from './GardenSunPlan'
import { GardenYearSunChart } from './GardenYearSunChart'
import { Popout } from './Popout'

type GardenPageProps = {
  sharedLat?: number
  sharedLon?: number
  sharedPlaceLabel?: string
  sharedDayOfYear?: number
  sharedTimeMinutes?: number
}

export function GardenPage({
  sharedLat,
  sharedLon,
  sharedPlaceLabel,
  sharedDayOfYear,
  sharedTimeMinutes,
}: GardenPageProps) {
  const session = useGardenSession({
    lat: sharedLat,
    lon: sharedLon,
    placeLabel: sharedPlaceLabel,
    dayOfYear: sharedDayOfYear,
    timeMinutes: sharedTimeMinutes,
  })

  const {
    inputs,
    patch,
    patchGarden,
    ready,
    recenter,
    addTree,
    updateTree,
    deleteTree,
    moveTree,
    addGarden,
    deleteGarden,
  } = session
  const model = useGardenSunSeries(inputs)
  const { instant, daily, dayCurve, yearSeries, yearAxisMax, dayMax, sun, sunRise, sunSet } = model

  const [showHints, setShowHints] = useState(false)
  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null)
  const [isGardenSelected, setIsGardenSelected] = useState(false)
  const [popout, setPopout] = useState<null | 'map' | 'day' | 'year' | 'section'>(null)

  function setClock(timeMinutes: number) {
    session.setClock(timeMinutes)
  }

  return (
    <div className="garden-page">
      <div className="stage">
        <aside className="console">
          <div className="console-tools">
            <button type="button" onClick={() => setShowHints((v) => !v)}>
              {showHints ? 'Hide tips' : 'Show tips'}
            </button>
            <button type="button" onClick={session.resetDefaults}>
              Reset defaults
            </button>
            <button type="button" className="no-print" onClick={() => window.print()}>
              Print
            </button>
          </div>

          {/* Section 01: Location & Map */}
          <section className="block">
            <h2>
              <span className="idx">01</span> Location &amp; Yard Map
            </h2>
            <GardenLocationPane
              ready={ready}
              placeLabel={inputs.placeLabel}
              lat={inputs.lat}
              lon={inputs.lon}
              trees={inputs.trees}
              garden={inputs.garden}
              instant={instant}
              sunAlt={sun.alt}
              sunAz={sun.az}
              recenter={recenter}
              locateLabel={session.locateLabel}
              active={popout !== 'map'}
              selectedTreeId={selectedTreeId}
              isGardenSelected={isGardenSelected}
              onSelectTree={(id) => {
                setSelectedTreeId(id)
                if (id) setIsGardenSelected(false)
              }}
              onSelectGarden={(selected) => {
                setIsGardenSelected(selected)
                if (selected) setSelectedTreeId(null)
              }}
              onAddTree={(treeLat, treeLon) => {
                const newId = addTree(treeLat, treeLon)
                setSelectedTreeId(newId)
                setIsGardenSelected(false)
              }}
              onDeleteTree={deleteTree}
              onMoveTree={moveTree}
              onUpdateTree={updateTree}
              onAddGarden={(gLat, gLon) => {
                addGarden(gLat, gLon)
                setIsGardenSelected(true)
                setSelectedTreeId(null)
              }}
              onDeleteGarden={deleteGarden}
              onGardenOffset={(offsetEast, offsetNorth) => patchGarden({ offsetEast, offsetNorth })}
              onGardenPatch={(partial) => patchGarden(partial)}
              onUserEdit={session.markPlaceTouched}
              onPick={(lat, lon, label) => {
                session.markPlaceTouched()
                session.setLocation(lat, lon, true, label)
              }}
              onLocate={() => session.locateDevice()}
              onExpand={() => setPopout('map')}
            />
            <div className="meta-row">
              <span>
                Lat {inputs.lat.toFixed(4)}, Lon {inputs.lon.toFixed(4)}
              </span>
              <span>{model.tz.label}</span>
            </div>
            {showHints ? (
              <p className="hint">
                Position your property on the map. Click ➕ Add Tree or ➕ Add Vegie Garden to add elements. Drag them to position. Click any tree to reveal height and width sliders.
              </p>
            ) : null}
          </section>

          {/* Section 02: Date & Time (Only Sliders Needed) */}
          <ConsoleDateTime
            inputs={{
              lat: inputs.lat,
              lon: inputs.lon,
              facing: 0,
              dayOfYear: inputs.dayOfYear,
              timeMinutes: inputs.timeMinutes,
              projection: 3,
              heightWall: 3,
              slope: 5,
              doorHeight: 2,
              roomDepth: 10,
              eaveProjection: 0.6,
              eaveHeightWall: 2.3,
              houseRoofSlope: 15,
              placeLabel: inputs.placeLabel,
              compareProjection: null,
              compareHeightWall: null,
              compareSlope: null,
            }}
            model={{
              year: YEAR,
              facing: 0,
              dayOfYear: inputs.dayOfYear,
              length: 3,
              heightWall: 3,
              slopeDeg: 5,
              doorHeight: 2,
              roomDepth: 10,
              eaveProjection: 0.6,
              eaveHeightWall: 2.3,
              houseRoofSlope: 15,
              date: model.date,
              time: model.time,
              tz: model.tz,
              sun: model.sun,
              sunRise: model.sunRise,
              sunSet: model.sunSet,
              prof: { behind: false, onFacade: true, azDiff: 0, azRel: 0, profile: 45, reason: null },
              reach: { openingM: 2.0, heightEnd: 2.7, drop: 0.3, rafter: 3, yWall: null, reach: 0, rawReach: 0, hitsBack: false, backWallHeight: 0, awningEnter: 0, status: 'none', message: '' },
              heatKw: 0,
              daylight: model.daylight,
              daily: { heatKwh: 0, maxHeatKw: 0, hoursInside: 0, maxReach: 0, maxAwningEnter: 0, hoursUnderAwning: 0, minProfile: null, maxProfile: null },
            }}
            dayMax={dayMax}
            showHints={showHints}
            onDay={(dayOfYear) => patch({ dayOfYear })}
            onTime={(timeMinutes) => setClock(timeMinutes)}
            onPreset={session.applyPreset}
          />

          {/* Section 03: Trees & Vegie Garden Selection Inspector */}
          <ConsoleTreeGarden
            trees={inputs.trees}
            garden={inputs.garden}
            selectedTreeId={selectedTreeId}
            isGardenSelected={isGardenSelected}
            showHints={showHints}
            onSelectTree={(id) => {
              setSelectedTreeId(id)
              if (id) setIsGardenSelected(false)
            }}
            onSelectGarden={(selected) => {
              setIsGardenSelected(selected)
              if (selected) setSelectedTreeId(null)
            }}
            onAddTree={() => {
              const newId = addTree()
              setSelectedTreeId(newId)
              setIsGardenSelected(false)
            }}
            onDeleteTree={deleteTree}
            onUpdateTree={updateTree}
            onAddGarden={() => {
              addGarden()
              setIsGardenSelected(true)
              setSelectedTreeId(null)
            }}
            onDeleteGarden={deleteGarden}
            onPatchGarden={(partial) => patchGarden(partial)}
          />
        </aside>

        {/* Main Gallery */}
        <main className="gallery">
          <div className="studio-pair">
            {/* Elevation Cross-Section */}
            <article className="print tile-section">
              <div className="print-bar">
                <div className="print-copy">
                  <h2>Tree &amp; garden section</h2>
                  <p className="print-desc">
                    Elevation cut through tree canopy, sun rays, and vegie garden bed.
                  </p>
                  <p className="print-meta">
                    {formatDate(YEAR, inputs.dayOfYear).label}
                    {' · '}
                    {formatTime(inputs.timeMinutes).label}
                    {' · '}
                    {instant.distanceTreeToGarden.toFixed(1)} m spacing
                  </p>
                </div>
                <strong className={`print-live is-${instant.status === 'full-sun' ? 'sun' : instant.status === 'partial-sun' ? 'warn' : 'shade'}`}>
                  {instant.status === 'full-sun'
                    ? '100% Full Sun'
                    : instant.status === 'partial-sun'
                      ? `${instant.sunlitPercent.toFixed(0)}% Sunlit`
                      : instant.status === 'night'
                        ? 'Night'
                        : 'Full Shade'}
                </strong>
              </div>
              <div className="section-stage">
                <ExpandButton className="expand-btn no-print" onClick={() => setPopout('section')} />
                <GardenSectionCanvas
                  tree={inputs.trees}
                  garden={inputs.garden}
                  instant={instant}
                  sunAlt={sun.alt}
                  sunAz={sun.az}
                />
              </div>
            </article>

            {/* Day Sun Curve */}
            <article className="tile tile-day">
              <ExpandButton className="expand-btn no-print" onClick={() => setPopout('day')} />
              <GardenDaySunChart
                dateLabel={formatDate(YEAR, inputs.dayOfYear).label}
                series={dayCurve}
                selectedMinutes={inputs.timeMinutes}
                totalAreaM2={instant.totalAreaM2}
                dailyDoseM2h={daily.dailyDoseM2h}
                avgHours={daily.directSunHoursAvg}
                sunriseMin={model.daylight.sunriseMin}
                sunsetMin={model.daylight.sunsetMin}
                onSelectMinutes={setClock}
              />
            </article>
          </div>

          <div className="bento">
            {/* Azimuth / Sun Plan */}
            <article className="tile tile-plan">
              <header className="tile-head">
                <h2>Sun &amp; layout plan</h2>
                <p>Tree shade footprint vs vegie bed</p>
              </header>
              <GardenSunPlan
                tree={inputs.tree!}
                garden={inputs.garden ?? { width: 3, length: 6, rotation: 0, offsetEast: 0, offsetNorth: 0 }}
                instant={instant}
                sunAlt={sun.alt}
                sunAz={sun.az}
                sunRiseAz={sunRise?.az ?? null}
                sunSetAz={sunSet?.az ?? null}
                onPatchGarden={(partial) => patchGarden(partial)}
              />
            </article>

            {/* Readout Panel */}
            <article className="tile tile-readout">
              <header className="tile-head">
                <h2>Readout &amp; suitability</h2>
                <p>Sunlight yield and crop matches</p>
              </header>
              <GardenResultsPanel
                tree={inputs.trees}
                garden={inputs.garden}
                instant={instant}
                daily={daily}
              />
            </article>

            {/* Year Sun Chart */}
            <article className="tile tile-year">
              <ExpandButton className="expand-btn no-print" onClick={() => setPopout('year')} />
              <GardenYearSunChart
                year={YEAR}
                series={yearSeries}
                selectedDay={inputs.dayOfYear}
                yMax={yearAxisMax}
                onSelectDay={(dayOfYear) => patch({ dayOfYear: clamp(dayOfYear, 1, dayMax) })}
              />
            </article>
          </div>

          <footer className="fine">
            Solar position is a NOAA-style estimate. Tree shadow is calculated via 3D ray-casting through crown ellipsoids and trunks. Satellite map tiles © Esri. Treat results as a design aid for vegetable garden planning.
          </footer>
        </main>
      </div>

      {/* Popouts / Modals */}
      {popout === 'map' ? (
        <Popout title="Site Map: Tree & Vegie Garden" size="map" onClose={() => setPopout(null)}>
          <GardenLocationPane
            ready={ready}
            placeLabel={inputs.placeLabel}
            lat={inputs.lat}
            lon={inputs.lon}
            trees={inputs.trees}
            garden={inputs.garden}
            instant={instant}
            sunAlt={sun.alt}
            sunAz={sun.az}
            recenter={recenter}
            locateLabel={session.locateLabel}
            active
            large
            selectedTreeId={selectedTreeId}
            isGardenSelected={isGardenSelected}
            onSelectTree={(id) => {
              setSelectedTreeId(id)
              if (id) setIsGardenSelected(false)
            }}
            onSelectGarden={(selected) => {
              setIsGardenSelected(selected)
              if (selected) setSelectedTreeId(null)
            }}
            onAddTree={(treeLat, treeLon) => {
              const newId = addTree(treeLat, treeLon)
              setSelectedTreeId(newId)
              setIsGardenSelected(false)
            }}
            onDeleteTree={deleteTree}
            onMoveTree={moveTree}
            onUpdateTree={updateTree}
            onAddGarden={(gLat, gLon) => {
              addGarden(gLat, gLon)
              setIsGardenSelected(true)
              setSelectedTreeId(null)
            }}
            onDeleteGarden={deleteGarden}
            onGardenOffset={(offsetEast, offsetNorth) => patchGarden({ offsetEast, offsetNorth })}
            onGardenPatch={(partial) => patchGarden(partial)}
            onUserEdit={session.markPlaceTouched}
            onPick={(lat, lon, label) => {
              session.markPlaceTouched()
              session.setLocation(lat, lon, true, label)
            }}
            onLocate={() => session.locateDevice()}
          />
        </Popout>
      ) : null}

      {popout === 'day' ? (
        <Popout title="Vegie garden direct sun today" onClose={() => setPopout(null)}>
          <GardenDaySunChart
            dateLabel={formatDate(YEAR, inputs.dayOfYear).label}
            series={dayCurve}
            selectedMinutes={inputs.timeMinutes}
            totalAreaM2={instant.totalAreaM2}
            dailyDoseM2h={daily.dailyDoseM2h}
            avgHours={daily.directSunHoursAvg}
            sunriseMin={model.daylight.sunriseMin}
            sunsetMin={model.daylight.sunsetMin}
            tall
            onSelectMinutes={setClock}
          />
        </Popout>
      ) : null}

      {popout === 'section' ? (
        <Popout title="Tree & vegie garden section" onClose={() => setPopout(null)}>
          <GardenSectionCanvas
            tree={inputs.trees}
            garden={inputs.garden}
            instant={instant}
            sunAlt={sun.alt}
            sunAz={sun.az}
            large
          />
        </Popout>
      ) : null}

      {popout === 'year' ? (
        <Popout title="Daily direct sun on vegie garden through the year" onClose={() => setPopout(null)}>
          <GardenYearSunChart
            year={YEAR}
            series={yearSeries}
            selectedDay={inputs.dayOfYear}
            yMax={yearAxisMax}
            tall
            onSelectDay={(dayOfYear) => patch({ dayOfYear: clamp(dayOfYear, 1, dayMax) })}
          />
        </Popout>
      ) : null}
    </div>
  )
}
