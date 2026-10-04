import { useRef, useState } from 'react'
import {
  getGardenCorners,
  getGardenGrid,
  getTreeInstances,
  type GardenConfig,
  type TreeConfig,
} from '../lib/gardenModel'
import {
  getTreeShadowPolygons,
  type GardenInstantSun,
} from '../lib/gardenSolar'
import { clamp, formatFacing, toDeg, toRad, wrapDegrees } from '../lib/solar'
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
  const [dragMode, setDragMode] = useState<
    'none' | 'move-garden' | 'rotate-garden' | 'rotate-tree' | 'move-tree'
  >('none')

  const svgRef = useRef<SVGSVGElement>(null)
  const cx = 100
  const cy = 100
  const ringR = 86

  // Coordinate scaling: map ground metres to SVG coords
  const dist = Math.hypot(garden.offsetEast, garden.offsetNorth)
  const maxSpan = Math.max(tree.groupWidth, tree.diameter, garden.width, garden.length)
  const maxM = Math.max(15, dist + maxSpan / 2 + 3)
  const naturalScale = 58 / maxM

  // Store locked scale and drag state during active pointer interaction to prevent jitter
  const dragRef = useRef<{
    mode: 'move-garden' | 'rotate-garden' | 'rotate-tree' | 'move-tree'
    startClientX: number
    startClientY: number
    startOffsetEast: number
    startOffsetNorth: number
    startRotation: number
    scale: number
  } | null>(null)

  const activeScale = dragRef.current ? dragRef.current.scale : naturalScale

  function toPlanSvg(eastM: number, northM: number, s = activeScale) {
    return {
      x: cx + eastM * s,
      y: cy - northM * s, // SVG Y is downwards, North is upwards
    }
  }

  const trees = getTreeInstances(tree)
  const corners = getGardenCorners(garden).map((p) => toPlanSvg(p.x, p.y))
  const gardenPolyStr = corners.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  const gridCells = getGardenGrid(garden, 8, 12)
  const gardenCenterSvg = toPlanSvg(garden.offsetEast, garden.offsetNorth)
  const treeCenterSvg = toPlanSvg(0, 0)

  // Shadow polygons on 2D plan
  const shadowPolys = getTreeShadowPolygons(tree, sunAlt, sunAz)
  const shadowSvgPolys = shadowPolys.map((poly) =>
    poly.map(([e, n]) => {
      const pt = toPlanSvg(e, n)
      return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`
    }).join(' '),
  )

  // Rotation handle positions
  const gardenRotHandleSvg = polar(gardenCenterSvg.x, gardenCenterSvg.y, 22, garden.rotation)
  const treeSpan = tree.mode === 'group' ? Math.max(tree.diameter, tree.groupWidth) : tree.diameter
  const treeHandleR = (treeSpan / 2) * activeScale + 14
  const treeRotHandleSvg = polar(treeCenterSvg.x, treeCenterSvg.y, treeHandleR, tree.rotation)

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

  // Delta-based Pointer Event Handlers for Direct Manipulation
  function handlePointerDown(
    e: React.PointerEvent<SVGElement>,
    mode: 'move-garden' | 'rotate-garden' | 'rotate-tree' | 'move-tree',
  ) {
    if (!onPatchGarden || !onPatchTree || !svgRef.current) return
    e.preventDefault()
    e.stopPropagation()
    setDragMode(mode)
    dragRef.current = {
      mode,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startOffsetEast: garden.offsetEast,
      startOffsetNorth: garden.offsetNorth,
      startRotation: mode === 'rotate-tree' ? tree.rotation : garden.rotation,
      scale: naturalScale,
    }
    ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const d = dragRef.current
    if (!d || !svgRef.current || !onPatchGarden || !onPatchTree) return
    const rect = svgRef.current.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return

    // Delta in SVG units (viewBox 200x200):
    const dSvgX = ((e.clientX - d.startClientX) / rect.width) * 200
    const dSvgY = ((e.clientY - d.startClientY) / rect.height) * 200

    // Delta in ground metres:
    const dEast = dSvgX / d.scale
    const dNorth = -dSvgY / d.scale // SVG Y is downwards, North is upwards

    if (d.mode === 'move-garden') {
      const nextEast = clamp(Number((d.startOffsetEast + dEast).toFixed(1)), -30, 30)
      const nextNorth = clamp(Number((d.startOffsetNorth + dNorth).toFixed(1)), -30, 30)
      onPatchGarden({ offsetEast: nextEast, offsetNorth: nextNorth })
    } else if (d.mode === 'move-tree') {
      // Moving tree moves tree, so relative to tree, garden offset is inverted:
      const nextEast = clamp(Number((d.startOffsetEast - dEast).toFixed(1)), -30, 30)
      const nextNorth = clamp(Number((d.startOffsetNorth - dNorth).toFixed(1)), -30, 30)
      onPatchGarden({ offsetEast: nextEast, offsetNorth: nextNorth })
    } else if (d.mode === 'rotate-garden') {
      const svgX = ((e.clientX - rect.left) / rect.width) * 200
      const svgY = ((e.clientY - rect.top) / rect.height) * 200
      const dx = svgX - gardenCenterSvg.x
      const dy = gardenCenterSvg.y - svgY // North is up
      const angle = wrapDegrees(Math.round(toDeg(Math.atan2(dx, dy))))
      onPatchGarden({ rotation: angle })
    } else if (d.mode === 'rotate-tree') {
      const svgX = ((e.clientX - rect.left) / rect.width) * 200
      const svgY = ((e.clientY - rect.top) / rect.height) * 200
      const dx = svgX - treeCenterSvg.x
      const dy = treeCenterSvg.y - svgY // North is up
      const angle = wrapDegrees(Math.round(toDeg(Math.atan2(dx, dy))))
      onPatchTree({ rotation: angle })
    }
  }

  function handlePointerUp() {
    dragRef.current = null
    setDragMode('none')
  }

  return (
    <figure
      className={`sun-plan ${instant.status === 'full-sun' ? 'is-on' : 'is-off'}`}
      style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
    >
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
            idPrefix="plan"
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

            {/* Sun Beam Vector from perimeter */}
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
                  opacity={0.65}
                />
                <circle cx={sunPt.x} cy={sunPt.y} r={7} fill="#ff8a3c" />
                <circle cx={sunPt.x} cy={sunPt.y} r={4} fill="#fff" />
              </>
            ) : null}

            {/* Connecting Distance Line Between Tree & Garden Center */}
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

            {/* Tree Shadows on Ground */}
            {shadowSvgPolys.map((polyStr, i) => (
              <polygon
                key={`shadow-${i}`}
                points={polyStr}
                fill="#121813"
                fillOpacity={0.48}
                stroke="#0e140f"
                strokeWidth={0.7}
              />
            ))}

            {/* Vegie Garden Enclosure Outline & Drag Group */}
            <g
              onClick={() => setSelectedItem('garden')}
              style={{ cursor: dragMode === 'move-garden' ? 'grabbing' : 'grab' }}
              onPointerDown={(e) => {
                setSelectedItem('garden')
                handlePointerDown(e, 'move-garden')
              }}
            >
              <polygon
                points={gardenPolyStr}
                fill={
                  selectedItem === 'garden'
                    ? 'rgba(224, 122, 47, 0.22)'
                    : 'rgba(43, 110, 79, 0.16)'
                }
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
                    opacity={0.9}
                  />
                )
              })}

              {/* Garden Center Drag Anchor Icon */}
              <circle
                cx={gardenCenterSvg.x}
                cy={gardenCenterSvg.y}
                r={4.5}
                fill="#e07a2f"
                stroke="#fff"
                strokeWidth={1}
              />
              <text
                x={gardenCenterSvg.x}
                y={gardenCenterSvg.y - 7}
                fill="var(--ink)"
                fontSize={8}
                fontWeight={600}
                textAnchor="middle"
              >
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
                  strokeWidth={1.8}
                  strokeDasharray="2, 1"
                />
                <circle
                  cx={gardenRotHandleSvg.x}
                  cy={gardenRotHandleSvg.y}
                  r={5.5}
                  fill="#ff9800"
                  stroke="#fff"
                  strokeWidth={1.5}
                  style={{ cursor: dragMode === 'rotate-garden' ? 'grabbing' : 'crosshair' }}
                  onPointerDown={(e) => handlePointerDown(e, 'rotate-garden')}
                />
              </g>
            ) : null}

            {/* Trees Group & Drag Anchor */}
            <g
              onClick={() => setSelectedItem('tree')}
              style={{ cursor: dragMode === 'move-tree' ? 'grabbing' : 'grab' }}
              onPointerDown={(e) => {
                setSelectedItem('tree')
                handlePointerDown(e, 'move-tree')
              }}
            >
              {trees.map((t) => {
                const p = toPlanSvg(t.x, t.y)
                const rPx = t.crownRadius * activeScale
                return (
                  <g key={t.id}>
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={Math.max(3, rPx)}
                      fill={selectedItem === 'tree' ? '#48bb78' : '#34a853'}
                      fillOpacity={0.7}
                      stroke={selectedItem === 'tree' ? '#fff' : '#1e7b34'}
                      strokeWidth={selectedItem === 'tree' ? 2 : 1.5}
                    />
                    <circle cx={p.x} cy={p.y} r={1.5} fill="#5c3a21" />
                  </g>
                )
              })}

              {/* Tree Center Anchor */}
              <circle
                cx={treeCenterSvg.x}
                cy={treeCenterSvg.y}
                r={4}
                fill="#2e7d32"
                stroke="#fff"
                strokeWidth={1}
              />
              <text
                x={treeCenterSvg.x}
                y={treeCenterSvg.y - 7}
                fill="var(--ink)"
                fontSize={8}
                fontWeight={600}
                textAnchor="middle"
              >
                🌳
              </text>
            </g>

            {/* Tree Rotation Lever & Handle (Only for Tree Groups/Rows) */}
            {selectedItem === 'tree' && tree.mode === 'group' && onPatchTree ? (
              <g>
                <line
                  x1={treeCenterSvg.x}
                  y1={treeCenterSvg.y}
                  x2={treeRotHandleSvg.x}
                  y2={treeRotHandleSvg.y}
                  stroke="#34a853"
                  strokeWidth={1.8}
                  strokeDasharray="2, 1"
                />
                <circle
                  cx={treeRotHandleSvg.x}
                  cy={treeRotHandleSvg.y}
                  r={5.5}
                  fill="#34a853"
                  stroke="#fff"
                  strokeWidth={1.5}
                  style={{ cursor: dragMode === 'rotate-tree' ? 'grabbing' : 'crosshair' }}
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
