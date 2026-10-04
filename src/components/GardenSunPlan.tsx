import { useRef, useState } from 'react'
import {
  getGardenCorners,
  getGardenGrid,
  getTreeInstances,
  type GardenConfig,
  type TreeConfig,
} from '../lib/gardenModel'
import type { GardenInstantSun } from '../lib/gardenSolar'
import { formatFacing, toDeg, toRad, wrapDegrees } from '../lib/solar'
import { LayoutControls } from './LayoutControls'

type GardenSunPlanProps = {
  tree: TreeConfig
  garden: GardenConfig
  instant: GardenInstantSun
  sunAlt: number
  sunAz: number
  sunRiseAz: number | null
  sunSetAz: number | null
  onPatchTree?: (partial: Partial<TreeConfig>) => void
  onPatchGarden?: (partial: Partial<GardenConfig>) => void
}

function polar(cx: number, cy: number, radius: number, degFromNorth: number) {
  const r = toRad(degFromNorth)
  return {
    x: cx + radius * Math.sin(r),
    y: cy - radius * Math.cos(r),
  }
}

export function GardenSunPlan({
  tree,
  garden,
  instant,
  sunAlt,
  sunAz,
  sunRiseAz,
  sunSetAz,
  onPatchTree,
  onPatchGarden,
}: GardenSunPlanProps) {
  const [viewMode, setViewMode] = useState<'plan' | 'nudge'>('plan')
  const [selectedItem, setSelectedItem] = useState<'none' | 'garden' | 'tree'>('garden')
  const [dragMode, setDragMode] = useState<'none' | 'move-garden' | 'rotate-garden' | 'rotate-tree' | 'move-tree'>('none')

  const svgRef = useRef<SVGSVGElement>(null)
  const cx = 100
  const cy = 100
  const ringR = 86

  // Coordinate scaling: map ground metres to SVG coords
  const dist = Math.hypot(garden.offsetEast, garden.offsetNorth)
  const maxM = Math.max(16, dist + Math.max(garden.width, garden.length) / 2 + 3)
  const scale = 58 / maxM

  function toPlanSvg(eastM: number, northM: number) {
    return {
      x: cx + eastM * scale,
      y: cy - northM * scale, // SVG Y is downwards, North is upwards
    }
  }

  function fromPlanSvg(svgX: number, svgY: number) {
    return {
      eastM: (svgX - cx) / scale,
      northM: (cy - svgY) / scale,
    }
  }

  const trees = getTreeInstances(tree)
  const corners = getGardenCorners(garden).map((p) => toPlanSvg(p.x, p.y))
  const gardenPolyStr = corners.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  const gridCells = getGardenGrid(garden, 6, 8)
  const gardenCenterSvg = toPlanSvg(garden.offsetEast, garden.offsetNorth)
  const treeCenterSvg = toPlanSvg(0, 0)

  // Rotation handle positions
  const gardenRotHandleSvg = polar(gardenCenterSvg.x, gardenCenterSvg.y, 22, garden.rotation)
  const treeRotHandleSvg = polar(treeCenterSvg.x, treeCenterSvg.y, (tree.diameter / 2) * scale + 12, tree.rotation)

  const ticks = Array.from({ length: 72 }, (_, i) => {
    const deg = i * 5
    const major = deg % 90 === 0
    const mid = deg % 30 === 0
    const inner = major ? ringR - 8 : mid ? ringR - 4 : ringR - 2
    return { deg, a: polar(cx, cy, inner, deg), b: polar(cx, cy, ringR, deg), major, mid }
  })

  const sunPt = polar(cx, cy, ringR, sunAz)

  const caption =
    sunAlt <= 0
      ? 'Sun is below the horizon (night)'
      : `Sun ${formatFacing(sunAz).name} (${sunAlt.toFixed(0)}° alt) · ${instant.sunlitPercent.toFixed(0)}% of vegie garden in direct sun`

  // SVG Pointer Event Handlers for Direct Manipulation
  function handlePointerDown(e: React.PointerEvent<SVGElement>, mode: typeof dragMode) {
    if (!onPatchGarden || !onPatchTree) return
    e.preventDefault()
    e.stopPropagation()
    setDragMode(mode)
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (dragMode === 'none' || !svgRef.current || !onPatchGarden || !onPatchTree) return
    const rect = svgRef.current.getBoundingClientRect()
    // Map client coordinates to 0..200 SVG coordinates:
    const svgX = ((e.clientX - rect.left) / rect.width) * 200
    const svgY = ((e.clientY - rect.top) / rect.height) * 200
    const { eastM, northM } = fromPlanSvg(svgX, svgY)

    if (dragMode === 'move-garden') {
      onPatchGarden({
        offsetEast: Number(eastM.toFixed(1)),
        offsetNorth: Number(northM.toFixed(1)),
      })
    } else if (dragMode === 'move-tree') {
      // Moving tree moves garden in relative opposition
      onPatchGarden({
        offsetEast: Number((-eastM).toFixed(1)),
        offsetNorth: Number((-northM).toFixed(1)),
      })
    } else if (dragMode === 'rotate-garden') {
      const dx = svgX - gardenCenterSvg.x
      const dy = gardenCenterSvg.y - svgY // North is up
      const angle = wrapDegrees(toDeg(Math.atan2(dx, dy)))
      onPatchGarden({ rotation: Math.round(angle) })
    } else if (dragMode === 'rotate-tree') {
      const dx = svgX - treeCenterSvg.x
      const dy = treeCenterSvg.y - svgY
      const angle = wrapDegrees(toDeg(Math.atan2(dx, dy)))
      onPatchTree({ rotation: Math.round(angle) })
    }
  }

  function handlePointerUp() {
    setDragMode('none')
  }

  return (
    <figure className={`sun-plan ${instant.status === 'full-sun' ? 'is-on' : 'is-off'}`} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* View Switcher: Interactive Plan vs Move & Rotate Panel */}
      {onPatchGarden && onPatchTree ? (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 4 }}>
          <button
            type="button"
            className={`nav-tab ${viewMode === 'plan' ? 'is-active' : ''}`}
            onClick={() => setViewMode('plan')}
            style={{ fontSize: '0.78rem', padding: '4px 10px' }}
          >
            🧭 2D Sun Plan (Drag/Rotate)
          </button>
          <button
            type="button"
            className={`nav-tab ${viewMode === 'nudge' ? 'is-active' : ''}`}
            onClick={() => setViewMode('nudge')}
            style={{ fontSize: '0.78rem', padding: '4px 10px' }}
          >
            🕹️ Move &amp; Rotate Controls
          </button>
        </div>
      ) : null}

      {viewMode === 'nudge' && onPatchGarden && onPatchTree ? (
        <div style={{ width: '100%', maxWidth: 380, margin: '0 auto' }}>
          <LayoutControls
            tree={tree}
            garden={garden}
            onPatchTree={onPatchTree}
            onPatchGarden={onPatchGarden}
          />
        </div>
      ) : (
        <>
          <svg
            ref={svgRef}
            viewBox="0 0 200 200"
            role="img"
            aria-label={caption}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{
              touchAction: 'none',
              userSelect: 'none',
              cursor: dragMode !== 'none' ? 'grabbing' : 'default',
            }}
          >
            {/* Compass Ring */}
            <circle cx={cx} cy={cy} r={ringR} className="sun-plan-ring" />
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

            {/* Cardinal Directions */}
            {['N', 'E', 'S', 'W'].map((label, i) => {
              const p = polar(cx, cy, ringR + 8, i * 90)
              return (
                <text
                  key={label}
                  x={p.x}
                  y={p.y}
                  className="sun-plan-cardinal"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {label}
                </text>
              )
            })}

            {/* Sunrise / Sunset Horizon Rays */}
            {sunRiseAz != null ? (
              <line
                x1={cx}
                y1={cy}
                x2={polar(cx, cy, ringR - 6, sunRiseAz).x}
                y2={polar(cx, cy, ringR - 6, sunRiseAz).y}
                stroke="#f0d060"
                strokeWidth={1.5}
                strokeDasharray="3, 3"
              />
            ) : null}
            {sunSetAz != null ? (
              <line
                x1={cx}
                y1={cy}
                x2={polar(cx, cy, ringR - 6, sunSetAz).x}
                y2={polar(cx, cy, ringR - 6, sunSetAz).y}
                stroke="#e35a4a"
                strokeWidth={1.5}
                strokeDasharray="3, 3"
              />
            ) : null}

            {/* Sun Beam Vector */}
            {sunAlt > 0 ? (
              <>
                <line
                  x1={sunPt.x}
                  y1={sunPt.y}
                  x2={cx}
                  y2={cy}
                  stroke="#ff8a3c"
                  strokeWidth={1.5}
                  strokeDasharray="4, 3"
                  opacity={0.7}
                />
                <circle cx={sunPt.x} cy={sunPt.y} r={7} fill="#ff8a3c" />
                <circle cx={sunPt.x} cy={sunPt.y} r={4} fill="#fff" />
              </>
            ) : null}

            {/* Connecting Line Between Tree & Garden Center */}
            <line
              x1={treeCenterSvg.x}
              y1={treeCenterSvg.y}
              x2={gardenCenterSvg.x}
              y2={gardenCenterSvg.y}
              stroke="var(--faint)"
              strokeWidth={1}
              strokeDasharray="2, 2"
              opacity={0.6}
            />

            {/* Vegie Garden Enclosure Outline & Drag Group */}
            <g
              onClick={() => setSelectedItem('garden')}
              style={{ cursor: 'grab' }}
              onPointerDown={(e) => {
                setSelectedItem('garden')
                handlePointerDown(e, 'move-garden')
              }}
            >
              <polygon
                points={gardenPolyStr}
                fill={selectedItem === 'garden' ? 'rgba(224, 122, 47, 0.18)' : 'rgba(43, 110, 79, 0.15)'}
                stroke={selectedItem === 'garden' ? '#ff9800' : '#e07a2f'}
                strokeWidth={selectedItem === 'garden' ? 2.5 : 1.8}
              />

              {/* Individual Garden Bed Sample Cells */}
              {gridCells.map((c, i) => {
                const pt = toPlanSvg(c.x, c.y)
                const isSun = instant.gridStates[i] ?? true
                return (
                  <circle
                    key={c.index}
                    cx={pt.x}
                    cy={pt.y}
                    r={1.8}
                    fill={isSun ? '#48bb78' : '#4a5568'}
                    opacity={0.88}
                  />
                )
              })}

              {/* Garden Center Drag Anchor Icon */}
              <circle cx={gardenCenterSvg.x} cy={gardenCenterSvg.y} r={4} fill="#e07a2f" />
              <text x={gardenCenterSvg.x} y={gardenCenterSvg.y - 6} fill="var(--ink)" fontSize={8} fontWeight={600} textAnchor="middle">
                🥕
              </text>
            </g>

            {/* Garden Rotation Lever & Handle */}
            {selectedItem === 'garden' && onPatchGarden ? (
              <g>
                <line
                  x1={gardenCenterSvg.x}
                  y1={gardenCenterSvg.y}
                  x2={gardenRotHandleSvg.x}
                  y2={gardenRotHandleSvg.y}
                  stroke="#ff9800"
                  strokeWidth={1.5}
                />
                <circle
                  cx={gardenRotHandleSvg.x}
                  cy={gardenRotHandleSvg.y}
                  r={5}
                  fill="#ff9800"
                  stroke="#fff"
                  strokeWidth={1.5}
                  style={{ cursor: 'crosshair' }}
                  onPointerDown={(e) => handlePointerDown(e, 'rotate-garden')}
                />
              </g>
            ) : null}

            {/* Trees Group & Drag Anchor */}
            <g
              onClick={() => setSelectedItem('tree')}
              style={{ cursor: 'grab' }}
              onPointerDown={(e) => {
                setSelectedItem('tree')
                handlePointerDown(e, 'move-tree')
              }}
            >
              {trees.map((t) => {
                const p = toPlanSvg(t.x, t.y)
                const rPx = t.crownRadius * scale
                return (
                  <g key={t.id}>
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={Math.max(3, rPx)}
                      fill={selectedItem === 'tree' ? '#48bb78' : '#34a853'}
                      fillOpacity={0.68}
                      stroke={selectedItem === 'tree' ? '#fff' : '#1e7b34'}
                      strokeWidth={selectedItem === 'tree' ? 2 : 1.5}
                    />
                    <circle cx={p.x} cy={p.y} r={1.5} fill="#5c3a21" />
                  </g>
                )
              })}

              {/* Tree Center Anchor */}
              <circle cx={treeCenterSvg.x} cy={treeCenterSvg.y} r={3.5} fill="#2e7d32" />
              <text x={treeCenterSvg.x} y={treeCenterSvg.y - 6} fill="var(--ink)" fontSize={8} fontWeight={600} textAnchor="middle">
                🌳
              </text>
            </g>

            {/* Tree Rotation Lever & Handle */}
            {selectedItem === 'tree' && onPatchTree ? (
              <g>
                <line
                  x1={treeCenterSvg.x}
                  y1={treeCenterSvg.y}
                  x2={treeRotHandleSvg.x}
                  y2={treeRotHandleSvg.y}
                  stroke="#34a853"
                  strokeWidth={1.5}
                />
                <circle
                  cx={treeRotHandleSvg.x}
                  cy={treeRotHandleSvg.y}
                  r={5}
                  fill="#34a853"
                  stroke="#fff"
                  strokeWidth={1.5}
                  style={{ cursor: 'crosshair' }}
                  onPointerDown={(e) => handlePointerDown(e, 'rotate-tree')}
                />
              </g>
            ) : null}
          </svg>
          <figcaption style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--muted)' }}>
            {caption}
            <br />
            <span style={{ fontSize: '0.74rem', color: 'var(--faint)' }}>
              Tip: Click &amp; drag 🥕 or 🌳 to move. Drag the colored circle handle to rotate. Or switch to 🕹️ Move &amp; Rotate Controls above.
            </span>
          </figcaption>
        </>
      )}
    </figure>
  )
}
