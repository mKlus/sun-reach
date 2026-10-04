import type { GardenConfig, TreeConfig } from '../lib/gardenModel'
import type { GardenInstantSun } from '../lib/gardenSolar'
import { toRad } from '../lib/solar'

type GardenSectionCanvasProps = {
  tree: TreeConfig
  garden: GardenConfig
  instant: GardenInstantSun
  sunAlt: number
  sunAz: number
  large?: boolean
}

export function GardenSectionCanvas({
  tree,
  garden,
  instant,
  sunAlt,
  sunAz,
  large = false,
}: GardenSectionCanvasProps) {
  // SVG ViewBox
  const W = large ? 900 : 660
  const H = large ? 480 : 360
  const groundY = H - 65

  // Project along the line from tree center to garden center
  const dist = Math.max(0.5, Math.hypot(garden.offsetEast, garden.offsetNorth))
  const gardenSpan = garden.length // projected garden dimension

  // Determine shadow reach along this tree-garden direction
  // Shadow azimuth is sunAz + 180
  const shadowAz = (sunAz + 180) % 360
  const bearingToGarden = instant.bearingTreeToGarden
  // Signed angle between shadow direction and garden direction:
  const angleDiff = Math.abs(((shadowAz - bearingToGarden + 180) % 360) - 180)
  const angleDiffRad = toRad(angleDiff)

  // Max shadow length on ground from tree top:
  const shadowLength = sunAlt > 0.1 ? tree.height / Math.tan(toRad(sunAlt)) : 0
  // Effective projection of shadow towards the garden:
  const shadowTowardGarden = Math.max(0, shadowLength * Math.cos(angleDiffRad))

  // World coordinates along section line:
  // Tree is at x = 0.
  // Garden is at x = dist (spanning from dist - gardenSpan/2 to dist + gardenSpan/2).
  const maxWorldX = Math.max(dist + gardenSpan / 2 + 3, shadowTowardGarden + 3, 14)
  const minWorldX = -Math.max(tree.diameter / 2 + 2, 4)
  const worldSpan = maxWorldX - minWorldX

  const padLeft = 40
  const padRight = 40
  const scale = (W - padLeft - padRight) / worldSpan

  function toSvgX(worldX: number) {
    return padLeft + (worldX - minWorldX) * scale
  }

  function toSvgY(worldH: number) {
    return groundY - worldH * scale
  }

  const treeX = toSvgX(0)
  const treeTopY = toSvgY(tree.height)
  const trunkY = toSvgY(tree.trunkHeight)
  const crownRadiusPx = (tree.diameter / 2) * scale
  const crownRadiusZPx = ((tree.height - tree.trunkHeight) / 2) * scale
  const crownCenterY = (treeTopY + trunkY) / 2

  // Garden coordinates
  const gardenStartX = toSvgX(dist - gardenSpan / 2)
  const gardenEndX = toSvgX(dist + gardenSpan / 2)
  const gardenMidX = toSvgX(dist)
  const gardenBedH = 0.45 * scale // 45cm raised bed
  const gardenTopY = groundY - gardenBedH

  // Shadow coordinates on ground
  const shadowEndX = toSvgX(shadowTowardGarden)

  // Sun position in sky on section
  const sunElevation = Math.max(0, sunAlt)
  const sunAngleRad = toRad(sunElevation)
  const sunR = Math.min(W, H) * 0.42
  const sunDir = angleDiff <= 90 ? -1 : 1 // sun is behind tree or behind garden
  const sunX = treeX + sunDir * sunR * Math.cos(sunAngleRad)
  const sunY = treeTopY - sunR * Math.sin(sunAngleRad)

  const isShadowHittingGarden =
    shadowTowardGarden >= dist - gardenSpan / 2 && angleDiff <= 89

  return (
    <figure className="section-canvas-wrap" style={{ margin: 0, position: 'relative' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', display: 'block', background: 'var(--void)' }}
        role="img"
        aria-label="Cross-section diagram of trees, sun rays, shadows, and vegie garden"
      >
        <defs>
          <linearGradient id="groundGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3d332a" />
            <stop offset="100%" stopColor="#1e1814" />
          </linearGradient>
          <linearGradient id="foliageGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#48bb78" />
            <stop offset="100%" stopColor="#22543d" />
          </linearGradient>
          <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffea79" stopOpacity="1" />
            <stop offset="35%" stopColor="#ff9800" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#ff5722" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Sky Background */}
        <rect width={W} height={H} fill="var(--section-mat)" rx={12} />

        {/* Ground */}
        <rect x={0} y={groundY} width={W} height={H - groundY} fill="url(#groundGrad)" />
        <line x1={0} y1={groundY} x2={W} y2={groundY} stroke="#5a493c" strokeWidth={2} />

        {/* Shadow on Ground */}
        {sunElevation > 0.5 && shadowTowardGarden > 0 && angleDiff < 90 ? (
          <rect
            x={treeX}
            y={groundY}
            width={Math.max(0, shadowEndX - treeX)}
            height={7}
            fill="#12100e"
            opacity={0.75}
            rx={2}
          />
        ) : null}

        {/* Sun in the Sky */}
        {sunElevation > 0 ? (
          <g>
            <circle cx={sunX} cy={sunY} r={28} fill="url(#sunGlow)" />
            <circle cx={sunX} cy={sunY} r={10} fill="#ffeb3b" />
            {/* Sun Rays Tangent to Canopy */}
            {angleDiff < 90 ? (
              <line
                x1={sunX}
                y1={sunY}
                x2={shadowEndX}
                y2={groundY}
                stroke="#ffb300"
                strokeWidth={1.5}
                strokeDasharray="5, 3"
                opacity={0.65}
              />
            ) : null}
          </g>
        ) : null}

        {/* Tree Trunk */}
        <rect
          x={treeX - Math.max(3, 0.15 * scale)}
          y={trunkY}
          width={Math.max(6, 0.3 * scale)}
          height={groundY - trunkY}
          fill="#5c3a21"
          rx={2}
        />

        {/* Tree Canopy Crown (Ellipsoid) */}
        <ellipse
          cx={treeX}
          cy={crownCenterY}
          rx={crownRadiusPx}
          ry={crownRadiusZPx}
          fill="url(#foliageGrad)"
          stroke="#2f855a"
          strokeWidth={2}
          opacity={0.92}
        />

        {/* Tree Dimension Lines */}
        <line x1={treeX - crownRadiusPx} y1={treeTopY - 14} x2={treeX + crownRadiusPx} y2={treeTopY - 14} stroke="var(--muted)" strokeWidth={1} />
        <text x={treeX} y={treeTopY - 18} fill="var(--ink)" fontSize={11} textAnchor="middle">
          ⌀ {tree.diameter.toFixed(1)} m
        </text>

        <line x1={treeX - crownRadiusPx - 14} y1={treeTopY} x2={treeX - crownRadiusPx - 14} y2={groundY} stroke="var(--muted)" strokeWidth={1} />
        <text x={treeX - crownRadiusPx - 18} y={crownCenterY} fill="var(--ink)" fontSize={11} textAnchor="end" dominantBaseline="middle">
          {tree.height.toFixed(1)} m
        </text>

        {/* Vegie Garden Enclosure */}
        {/* Raised timber bed walls */}
        <rect
          x={gardenStartX}
          y={gardenTopY}
          width={gardenEndX - gardenStartX}
          height={gardenBedH}
          fill="#8d4925"
          stroke="#5c2e17"
          strokeWidth={1.5}
          rx={2}
        />
        {/* Top soil fill */}
        <rect
          x={gardenStartX + 3}
          y={gardenTopY}
          width={gardenEndX - gardenStartX - 6}
          height={3}
          fill="#3b2314"
        />
        {/* Cute little vegetable plant sprouts */}
        {Array.from({ length: 6 }).map((_, i) => {
          const px = gardenStartX + ((i + 0.5) / 6) * (gardenEndX - gardenStartX)
          return (
            <g key={i}>
              <line x1={px} y1={gardenTopY} x2={px} y2={gardenTopY - 8} stroke="#38a169" strokeWidth={1.8} />
              <circle cx={px - 2} cy={gardenTopY - 9} r={3} fill="#48bb78" />
              <circle cx={px + 2} cy={gardenTopY - 9} r={3} fill="#48bb78" />
            </g>
          )
        })}

        {/* Distance Dimension Line */}
        <line x1={treeX} y1={groundY + 22} x2={gardenMidX} y2={groundY + 22} stroke="var(--faint)" strokeWidth={1} />
        <circle cx={treeX} cy={groundY + 22} r={2} fill="var(--faint)" />
        <circle cx={gardenMidX} cy={groundY + 22} r={2} fill="var(--faint)" />
        <text x={(treeX + gardenMidX) / 2} y={groundY + 36} fill="var(--ink)" fontSize={11} textAnchor="middle">
          Distance: {dist.toFixed(1)} m
        </text>

        {/* Garden Label */}
        <text x={gardenMidX} y={gardenTopY - 18} fill="var(--ink)" fontSize={11} fontWeight={600} textAnchor="middle">
          Vegie Garden ({gardenSpan.toFixed(1)} m)
        </text>

        {/* Shadow Status Label */}
        <text
          x={W - 16}
          y={24}
          fill={isShadowHittingGarden ? 'var(--sun)' : 'var(--shade)'}
          fontSize={12}
          fontWeight={600}
          textAnchor="end"
        >
          {sunElevation <= 0
            ? 'Night (Sun below horizon)'
            : isShadowHittingGarden
              ? `Tree shade reaching garden (${instant.sunlitPercent.toFixed(0)}% sun)`
              : `Garden unshaded (${instant.sunlitPercent.toFixed(0)}% sun)`}
        </text>
      </svg>
      <figcaption style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 6 }}>
        Elevation cross-section from tree anchor to vegie garden enclosure bed. Displays tree height, canopy clearance, sun ray angle, and projected ground shadow.
      </figcaption>
    </figure>
  )
}
