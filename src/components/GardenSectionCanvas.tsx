import type { GardenConfig, TreeConfig, TreeItem } from '../lib/gardenModel'
import type { GardenInstantSun } from '../lib/gardenSolar'
import { toRad } from '../lib/solar'

type GardenSectionCanvasProps = {
  tree: TreeConfig | TreeItem[]
  garden?: GardenConfig | null
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
  // SVG ViewBox dimensions
  const W = large ? 900 : 660
  const H = large ? 480 : 360
  const groundY = H - 65

  // Pick representative tree
  const singleTree: TreeConfig = Array.isArray(tree)
    ? {
        mode: 'single',
        height: tree[0]?.height ?? 6.0,
        diameter: tree[0]?.diameter ?? 4.0,
        groupWidth: 4.0,
        treeCount: 1,
        rotation: 0,
        trunkHeight: tree[0]?.trunkHeight ?? 1.5,
      }
    : tree

  const activeGarden: GardenConfig = garden ?? {
    width: 3.0,
    length: 6.0,
    rotation: 0,
    offsetEast: 0,
    offsetNorth: 0,
  }

  // Distance from tree base (0,0) to garden center
  const dist = Math.max(0.5, Math.hypot(activeGarden.offsetEast, activeGarden.offsetNorth))
  const bearingToGarden = instant.bearingTreeToGarden

  // Effective garden span along the tree-to-garden section line:
  const bedAngleRel = toRad(activeGarden.rotation - bearingToGarden)
  const bedSpan = Math.max(
    1.5,
    Math.abs(activeGarden.length * Math.cos(bedAngleRel)) +
      Math.abs(activeGarden.width * Math.sin(bedAngleRel)),
  )

  // Solar angles and shadow reach
  const sunElevation = Math.max(0, sunAlt)
  const isNight = sunAlt <= 0

  // Shadow direction is sunAz + 180
  const shadowAz = (sunAz + 180) % 360
  // Signed angle difference between shadow direction and bearing to garden (-180..+180)
  const angleDiff = (((shadowAz - bearingToGarden + 540) % 360) - 180)
  const angleDiffRad = toRad(angleDiff)

  // Ground shadow length from tree top:
  const shadowLength = sunElevation > 0.05 ? singleTree.height / Math.tan(toRad(sunElevation)) : 0

  // Component of shadow projected along the tree-garden axis:
  // Positive means shadow falls towards the garden (to the right).
  // Negative means shadow falls away from the garden (to the left).
  const shadowAlongLine = shadowLength * Math.cos(angleDiffRad)
  const shadowOffAxis = Math.abs(shadowLength * Math.sin(angleDiffRad))

  // World coordinates along section line (metres):
  // Tree is at x = 0.
  // Garden is at x = dist (spanning from dist - bedSpan/2 to dist + bedSpan/2).
  const minWorldX = Math.min(-singleTree.diameter / 2 - 2, shadowAlongLine < 0 ? shadowAlongLine - 2 : -3)
  const maxWorldX = Math.max(dist + bedSpan / 2 + 3, shadowAlongLine > 0 ? shadowAlongLine + 2 : dist + 4, 12)
  const worldSpan = maxWorldX - minWorldX

  const padLeft = 45
  const padRight = 45
  const scale = (W - padLeft - padRight) / Math.max(10, worldSpan)

  function toSvgX(worldX: number) {
    return padLeft + (worldX - minWorldX) * scale
  }

  function toSvgY(worldH: number) {
    return groundY - worldH * scale
  }

  const treeX = toSvgX(0)
  const treeTopY = toSvgY(singleTree.height)
  const trunkY = toSvgY(singleTree.trunkHeight)
  const crownRadiusPx = (singleTree.diameter / 2) * scale
  const crownRadiusZPx = ((singleTree.height - singleTree.trunkHeight) / 2) * scale
  const crownCenterY = (treeTopY + trunkY) / 2

  // Garden coordinates
  const gardenStartX = toSvgX(dist - bedSpan / 2)
  const gardenEndX = toSvgX(dist + bedSpan / 2)
  const gardenMidX = toSvgX(dist)
  const gardenBedH = Math.max(8, 0.45 * scale) // 45cm raised bed
  const gardenTopY = groundY - gardenBedH

  // Shadow coordinates on ground
  const shadowEndX = toSvgX(shadowAlongLine)
  const shadowTowardGarden = shadowAlongLine > 0

  // Sun position in sky
  // If shadow points towards garden (shadowAlongLine > 0), sun is on the left (behind tree).
  // If shadow points away (shadowAlongLine < 0), sun is on the right (behind garden).
  const sunDir = shadowTowardGarden ? -1 : 1
  const sunR = Math.min(W, H) * 0.42
  const sunAngleRad = toRad(Math.min(75, Math.max(12, sunElevation)))
  const sunX = treeX + sunDir * sunR * Math.cos(sunAngleRad)
  const sunY = Math.max(25, treeTopY - sunR * Math.sin(sunAngleRad))

  const isShadowHittingGarden =
    shadowTowardGarden &&
    shadowAlongLine >= dist - bedSpan / 2 &&
    shadowOffAxis <= singleTree.diameter / 2 + Math.max(activeGarden.width, activeGarden.length) / 2

  // Shadow description
  const statusLabel = isNight
    ? 'Night (Sun below horizon)'
    : !garden
      ? 'No vegie garden placed'
      : isShadowHittingGarden
        ? `Tree shade reaching garden (${instant.sunlitPercent.toFixed(0)}% sun)`
        : shadowTowardGarden
          ? shadowOffAxis > singleTree.diameter / 2 + 3
            ? `Shadow passes sideways (${shadowOffAxis.toFixed(1)}m off-axis)`
            : `Shadow falls short (${Math.max(0, dist - bedSpan / 2 - shadowAlongLine).toFixed(1)}m clear)`
          : `Garden on sunny side (100% direct sun)`

  return (
    <figure className="section-canvas-wrap" style={{ margin: 0, position: 'relative' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', display: 'block', background: 'var(--void)' }}
        role="img"
        aria-label="Cross-section diagram of trees, sun rays, shadows, and vegie garden"
      >
        <defs>
          <linearGradient id="gSectionGround" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3d332a" />
            <stop offset="100%" stopColor="#1e1814" />
          </linearGradient>
          <linearGradient id="gSectionFoliage" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#48bb78" />
            <stop offset="100%" stopColor="#22543d" />
          </linearGradient>
          <radialGradient id="gSectionSun" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffea79" stopOpacity="1" />
            <stop offset="35%" stopColor="#ff9800" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#ff5722" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Sky Background */}
        <rect width={W} height={H} fill="var(--section-mat)" rx={12} />

        {/* Ground */}
        <rect x={0} y={groundY} width={W} height={H - groundY} fill="url(#gSectionGround)" />
        <line x1={0} y1={groundY} x2={W} y2={groundY} stroke="#5a493c" strokeWidth={2} />

        {/* Shadow on Ground */}
        {!isNight && Math.abs(shadowAlongLine) > 0.2 ? (
          <rect
            x={shadowTowardGarden ? treeX : shadowEndX}
            y={groundY}
            width={Math.max(0, Math.abs(shadowEndX - treeX))}
            height={6}
            fill="#12100e"
            opacity={0.8}
            rx={2}
          />
        ) : null}

        {/* Sun in Sky & Direct Rays */}
        {!isNight ? (
          <g>
            <circle cx={sunX} cy={sunY} r={28} fill="url(#gSectionSun)" />
            <circle cx={sunX} cy={sunY} r={10} fill="#ffeb3b" />
            {/* Tangent Sun Ray passing canopy top to ground shadow edge */}
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
          rx={Math.max(6, crownRadiusPx)}
          ry={Math.max(6, crownRadiusZPx)}
          fill="url(#gSectionFoliage)"
          stroke="#2f855a"
          strokeWidth={2}
          opacity={0.92}
        />

        {/* Tree Dimension Lines */}
        <line
          x1={treeX - crownRadiusPx}
          y1={treeTopY - 14}
          x2={treeX + crownRadiusPx}
          y2={treeTopY - 14}
          stroke="var(--muted)"
          strokeWidth={1}
        />
        <text
          x={treeX}
          y={treeTopY - 18}
          fill="var(--ink)"
          fontSize={11}
          textAnchor="middle"
        >
          ⌀ {singleTree.diameter.toFixed(1)} m
        </text>

        <line
          x1={treeX - crownRadiusPx - 14}
          y1={treeTopY}
          x2={treeX - crownRadiusPx - 14}
          y2={groundY}
          stroke="var(--muted)"
          strokeWidth={1}
        />
        <text
          x={treeX - crownRadiusPx - 18}
          y={crownCenterY}
          fill="var(--ink)"
          fontSize={11}
          textAnchor="end"
          dominantBaseline="middle"
        >
          {singleTree.height.toFixed(1)} m
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
          width={Math.max(0, gardenEndX - gardenStartX - 6)}
          height={3}
          fill="#3b2314"
        />

        {/* Sprouts */}
        {Array.from({ length: 6 }).map((_, i) => {
          const px = gardenStartX + ((i + 0.5) / 6) * (gardenEndX - gardenStartX)
          return (
            <g key={i}>
              <line
                x1={px}
                y1={gardenTopY}
                x2={px}
                y2={gardenTopY - 8}
                stroke="#38a169"
                strokeWidth={1.8}
              />
              <circle cx={px - 2} cy={gardenTopY - 9} r={2.5} fill="#48bb78" />
              <circle cx={px + 2} cy={gardenTopY - 9} r={2.5} fill="#48bb78" />
            </g>
          )
        })}

        {/* Distance Dimension Line between Tree and Garden */}
        <line
          x1={treeX}
          y1={groundY + 22}
          x2={gardenMidX}
          y2={groundY + 22}
          stroke="var(--faint)"
          strokeWidth={1}
        />
        <circle cx={treeX} cy={groundY + 22} r={2} fill="var(--faint)" />
        <circle cx={gardenMidX} cy={groundY + 22} r={2} fill="var(--faint)" />
        <text
          x={(treeX + gardenMidX) / 2}
          y={groundY + 36}
          fill="var(--ink)"
          fontSize={11}
          textAnchor="middle"
        >
          Distance: {dist.toFixed(1)} m
        </text>

        {/* Garden Label */}
        <text
          x={gardenMidX}
          y={gardenTopY - 18}
          fill="var(--ink)"
          fontSize={11}
          fontWeight={600}
          textAnchor="middle"
        >
          Vegie Garden ({bedSpan.toFixed(1)} m)
        </text>

        {/* Live Status Text */}
        <text
          x={W - 16}
          y={24}
          fill={
            isNight
              ? 'var(--muted)'
              : isShadowHittingGarden
                ? 'var(--amber)'
                : 'var(--sun)'
          }
          fontSize={12}
          fontWeight={600}
          textAnchor="end"
        >
          {statusLabel}
        </text>
      </svg>
      <figcaption style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 6 }}>
        Elevation cross-section from tree anchor to vegie garden enclosure bed. Displays tree height, canopy clearance, sun ray angle, and projected ground shadow.
      </figcaption>
    </figure>
  )
}
