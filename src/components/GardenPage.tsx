import { useMemo, useState } from 'react'
import { useGardenSession } from '../lib/useGardenSession'
import { useGardenSunSeries } from '../lib/useGardenSunSeries'
import { YEAR } from '../lib/model'
import { ConsoleDateTime } from './ConsoleDateTime'
import { GardenMap } from './GardenMap'
import { PlaceSearch } from './PlaceSearch'
import { SliderField } from './SliderField'
import {
  TREE_HEIGHT_MIN,
  TREE_HEIGHT_MAX,
  TREE_DIAMETER_MIN,
  TREE_DIAMETER_MAX,
} from '../lib/gardenModel'

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
  const { instant, dayMax, sun } = model

  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null)
  const [isGardenSelected, setIsGardenSelected] = useState(false)

  function setClock(timeMinutes: number) {
    session.setClock(timeMinutes)
  }

  const activeTree = useMemo(() => {
    return inputs.trees.find((t) => t.id === selectedTreeId) ?? null
  }, [inputs.trees, selectedTreeId])

  return (
    <div className="garden-clean-page">
      <div className="garden-clean-layout">
        {/* Left Control Panel: Only Date, Time, and Conditional Tree Sliders */}
        <aside className="garden-clean-sidebar">
          {/* Quick Header Tools */}
          <div className="console-tools" style={{ padding: '0 0 10px', display: 'flex', gap: 6 }}>
            <button type="button" onClick={session.resetDefaults}>
              Reset defaults
            </button>
            <button type="button" onClick={() => session.locateDevice()}>
              {session.locateLabel}
            </button>
          </div>

          {/* Place Search Bar */}
          <div style={{ marginBottom: 14 }}>
            <PlaceSearch
              value={inputs.placeLabel}
              onUserEdit={session.markPlaceTouched}
              onPick={(lat, lon, label) => {
                session.markPlaceTouched()
                session.setLocation(lat, lon, true, label)
              }}
            />
          </div>

          {/* Date & Time Sliders */}
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
            showHints={false}
            onDay={(dayOfYear) => patch({ dayOfYear })}
            onTime={(timeMinutes) => setClock(timeMinutes)}
            onPreset={session.applyPreset}
          />

          {/* Selected Tree Sliders (Enabled / Appearing ONLY when a tree is selected) */}
          {activeTree ? (
            <section
              className="block"
              style={{
                marginTop: 16,
                border: '1.5px solid #228b22',
                background: 'var(--lift)',
                borderRadius: 12,
                padding: '14px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 10,
                }}
              >
                <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--ink)' }}>
                  🌳 Selected Tree
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    deleteTree(activeTree.id)
                    setSelectedTreeId(null)
                  }}
                  style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#ef4444',
                    border: '1px solid #ef4444',
                    borderRadius: 6,
                    padding: '3px 8px',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Delete tree
                </button>
              </div>

              <SliderField
                id="active-tree-height"
                label="Tree height"
                value={activeTree.height}
                min={TREE_HEIGHT_MIN}
                max={TREE_HEIGHT_MAX}
                step={0.5}
                display={`${activeTree.height.toFixed(1)} m`}
                onChange={(height) => updateTree(activeTree.id, { height })}
              />

              <SliderField
                id="active-tree-width"
                label="Tree width / diameter"
                value={activeTree.diameter}
                min={TREE_DIAMETER_MIN}
                max={TREE_DIAMETER_MAX}
                step={0.5}
                display={`${activeTree.diameter.toFixed(1)} m`}
                onChange={(diameter) => updateTree(activeTree.id, { diameter })}
              />
            </section>
          ) : (
            <div
              style={{
                marginTop: 16,
                padding: '12px 14px',
                background: 'var(--lift)',
                border: '1px dashed var(--hair-strong)',
                borderRadius: 10,
                fontSize: '0.78rem',
                color: 'var(--muted)',
                textAlign: 'center',
                lineHeight: 1.4,
              }}
            >
              Click a tree pin on the map to adjust its height and width sliders.
            </div>
          )}

          {/* Quick Sunlight Readout for the Garden */}
          {inputs.garden ? (
            <div
              style={{
                marginTop: 16,
                padding: '12px 14px',
                background: 'var(--lift)',
                border: '1px solid var(--hair)',
                borderRadius: 10,
                fontSize: '0.8rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>🥕 Garden sunlight:</span>
              <strong
                style={{
                  color:
                    instant.status === 'full-sun'
                      ? 'var(--sun)'
                      : instant.status === 'partial-sun'
                        ? 'var(--amber)'
                        : 'var(--shade)',
                }}
              >
                {instant.status === 'night' ? 'Night' : `${instant.sunlitPercent.toFixed(0)}% in sun`}
              </strong>
            </div>
          ) : null}
        </aside>

        {/* Right Main Stage: Big Full-Screen Interactive Map */}
        <main className="garden-clean-map-wrap">
          {ready ? (
            <GardenMap
              lat={inputs.lat}
              lon={inputs.lon}
              trees={inputs.trees}
              garden={inputs.garden}
              instant={instant}
              sunAlt={sun.alt}
              sunAz={sun.az}
              recenter={recenter}
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
              onPickLocation={(clickLat, clickLon) =>
                session.setLocation(
                  clickLat,
                  clickLon,
                  false,
                  `${clickLat.toFixed(4)}, ${clickLon.toFixed(4)}`,
                )
              }
            />
          ) : (
            <div className="map-el" />
          )}
        </main>
      </div>
    </div>
  )
}
