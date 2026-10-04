import {
  clamp,
  dateFromDayOfYear,
  getDaylight,
  getSunPosition,
  getTimezone,
  toDeg,
  toRad,
  wrapDegrees,
} from './solar'
import {
  getGardenGrid,
  getTreeInstances,
  getTreeInstancesFromItems,
  type GardenConfig,
  type GardenGridCell,
  type Point2D,
  type TreeConfig,
  type TreeInstance,
  type TreeItem,
} from './gardenModel'

export type GardenInstantSun = {
  sunlitRatio: number // 0 to 1
  sunlitPercent: number // 0 to 100
  sunlitAreaM2: number
  totalAreaM2: number
  status: 'full-sun' | 'partial-sun' | 'full-shade' | 'night'
  shadowLengthMax: number
  shadowAzimuth: number
  gridStates: boolean[] // true = sunlit, false = shaded
  distanceTreeToGarden: number
  bearingTreeToGarden: number
  sunAlt: number
  sunAz: number
}

/** Check if a 2D ground point is in shadow of any of the trees. */
export function isPointInTreeShadow(
  pt: Point2D,
  trees: TreeInstance[],
  sunAlt: number,
  sunAz: number,
): boolean {
  if (sunAlt <= 0) return true // night / below horizon

  const altRad = toRad(sunAlt)
  const azRad = toRad(sunAz)
  const tanAlt = Math.tan(altRad)
  if (tanAlt <= 1e-4) return true

  // Direction coefficients of ray from point P towards the sun:
  // x(z) = pt.x + kx * z
  // y(z) = pt.y + ky * z
  const kx = Math.sin(azRad) / tanAlt
  const ky = Math.cos(azRad) / tanAlt
  const kSq = kx * kx + ky * ky

  for (const tree of trees) {
    const x0 = pt.x - tree.x
    const y0 = pt.y - tree.y

    // 1. Crown Ellipsoid Test:
    // ((x0 + kx * z)^2 + (y0 + ky * z)^2) / Rh^2 + (z - Hc)^2 / Rz^2 <= 1
    const rhSq = tree.crownRadius * tree.crownRadius
    const rzSq = tree.crownRadiusZ * tree.crownRadiusZ

    const A = kSq / rhSq + 1 / rzSq
    const B = 2 * ((x0 * kx + y0 * ky) / rhSq - tree.crownCenter / rzSq)
    const C = (x0 * x0 + y0 * y0) / rhSq + (tree.crownCenter * tree.crownCenter) / rzSq

    const zStar = clamp(-B / (2 * A), tree.crownBase, tree.height)
    const crownVal = A * zStar * zStar + B * zStar + C
    if (crownVal <= 1) return true

    // 2. Trunk Cylinder Test:
    // (x0 + kx * z)^2 + (y0 + ky * z)^2 <= rTrunk^2 for z in [0, crownBase]
    if (tree.crownBase > 0.05) {
      const rTrunk = Math.max(0.12, 0.15 * tree.crownRadius)
      const zTrunkStar = kSq > 1e-8 ? clamp(-(x0 * kx + y0 * ky) / kSq, 0, tree.crownBase) : 0
      const xT = x0 + kx * zTrunkStar
      const yT = y0 + ky * zTrunkStar
      if (xT * xT + yT * yT <= rTrunk * rTrunk) return true
    }
  }

  return false
}

export function resolveTrees(
  treeOrInstances?: TreeConfig | TreeInstance[] | TreeItem[],
  anchorLat?: number,
  anchorLon?: number,
): TreeInstance[] {
  if (!treeOrInstances) return []
  if (Array.isArray(treeOrInstances)) {
    if (treeOrInstances.length === 0) return []
    // Check if it's already TreeInstance (has crownRadius)
    if ('crownRadius' in treeOrInstances[0]) {
      return treeOrInstances as TreeInstance[]
    }
    // It is TreeItem[]
    return getTreeInstancesFromItems(
      treeOrInstances as TreeItem[],
      anchorLat ?? 0,
      anchorLon ?? 0,
    )
  }
  return getTreeInstances(treeOrInstances as TreeConfig)
}

/** Compute instant solar metrics for the vegie garden. */
export function computeGardenInstantSun(
  garden: GardenConfig | null | undefined,
  treeOrInstances: TreeConfig | TreeInstance[] | TreeItem[],
  sunAlt: number,
  sunAz: number,
  gridCells?: GardenGridCell[],
  anchorLat = 0,
  anchorLon = 0,
): GardenInstantSun {
  const trees = resolveTrees(treeOrInstances, anchorLat, anchorLon)
  const effectiveGarden = garden ?? {
    width: 3,
    length: 5,
    rotation: 0,
    offsetEast: 0,
    offsetNorth: 0,
  }
  const cells = garden ? (gridCells ?? getGardenGrid(effectiveGarden)) : []
  const totalArea = garden ? effectiveGarden.width * effectiveGarden.length : 0

  const gridStates = cells.map((cell) => !isPointInTreeShadow(cell, trees, sunAlt, sunAz))
  const sunlitCount = gridStates.filter(Boolean).length
  const sunlitRatio = cells.length > 0 ? sunlitCount / cells.length : 1
  const sunlitPercent = sunlitRatio * 100
  const sunlitAreaM2 = sunlitRatio * totalArea

  let status: GardenInstantSun['status'] = 'night'
  if (sunAlt <= 0) {
    status = 'night'
  } else if (!garden) {
    status = 'full-sun'
  } else if (sunlitRatio >= 0.95) {
    status = 'full-sun'
  } else if (sunlitRatio <= 0.05) {
    status = 'full-shade'
  } else {
    status = 'partial-sun'
  }

  const maxHeight = trees.reduce((m, t) => Math.max(m, t.height), 0)
  const shadowLengthMax =
    sunAlt > 0.1 && maxHeight > 0 ? maxHeight / Math.tan(toRad(sunAlt)) : 0
  const shadowAzimuth = wrapDegrees(sunAz + 180)

  const dist = Math.hypot(effectiveGarden.offsetEast, effectiveGarden.offsetNorth)
  const bearing = wrapDegrees(toDeg(Math.atan2(effectiveGarden.offsetEast, effectiveGarden.offsetNorth)))

  return {
    sunlitRatio,
    sunlitPercent,
    sunlitAreaM2,
    totalAreaM2: totalArea,
    status,
    shadowLengthMax,
    shadowAzimuth,
    gridStates,
    distanceTreeToGarden: dist,
    bearingTreeToGarden: bearing,
    sunAlt,
    sunAz,
  }
}

export type GardenDayPoint = {
  minutes: number
  sunlitPercent: number
  sunlitAreaM2: number
  sunAlt: number
  sunAz: number
  intensity: number
}

export type GardenCropSuitability = {
  tier: 'full-sun' | 'partial-sun' | 'shade'
  title: string
  hoursLabel: string
  recommendations: string[]
  description: string
}

export type GardenDailySun = {
  daylightMinutes: number
  directSunHoursAvg: number
  directSunHoursMin: number
  directSunHoursMax: number
  dailyDoseM2h: number
  peakSunlitArea: number
  suitability: GardenCropSuitability
  dayCurve: GardenDayPoint[]
  gridSunHours: number[]
}

export function getCropSuitability(hours: number): GardenCropSuitability {
  if (hours >= 5.8) {
    return {
      tier: 'full-sun',
      title: 'Full Sun (6+ hrs)',
      hoursLabel: `${hours.toFixed(1)} hrs/day`,
      recommendations: [
        'Tomatoes',
        'Capsicums / Chillies',
        'Zucchini & Squash',
        'Cucumbers',
        'Eggplants',
        'Sweet Corn',
        'Bush Beans',
        'Strawberries',
      ],
      description:
        'Prime solar location! Abundant direct sun supports heavy fruiting vegetables, high yields, and warm-season crops.',
    }
  }
  if (hours >= 3.2) {
    return {
      tier: 'partial-sun',
      title: 'Partial Sun (3.5 – 6 hrs)',
      hoursLabel: `${hours.toFixed(1)} hrs/day`,
      recommendations: [
        'Lettuce & Salad Greens',
        'Spinach & Silverbeet',
        'Kale & Broccoli',
        'Carrots & Beetroot',
        'Radishes & Turnips',
        'Parsley, Coriander, Mint',
        'Spring Onions',
      ],
      description:
        'Ideal for leafy greens and root vegetables. Partial afternoon shade is beneficial in hot climates to prevent bolting.',
    }
  }
  return {
    tier: 'shade',
    title: 'Low Sun / Shade (< 3.5 hrs)',
    hoursLabel: `${hours.toFixed(1)} hrs/day`,
    recommendations: [
      'Asian Greens (Pak Choy)',
      'Rocket / Arugula',
      'Mizuna',
      'Watercress',
      'Mint & Lemon Balm',
      'Microgreens',
      'Shade Herbs',
    ],
    description:
      'Heavy shade from the tree canopy limits sun-loving crops. Focus on shade-tolerant greens, or consider pruning or repositioning.',
  }
}

export type GardenDailySample = {
  lat: number
  lon: number
  year: number
  month: number
  day: number
  tzHours: number
  garden: GardenConfig | null
  tree?: TreeConfig
  trees?: TreeItem[]
  treeInstances?: TreeInstance[]
  sunriseMin: number
  sunsetMin: number
  stepMin?: number
}

/** Compute full daily solar integration for the vegie garden. */
export function computeGardenDailySun(sample: GardenDailySample): GardenDailySun {
  const step = Math.max(2, Math.round(sample.stepMin ?? 5))
  const trees = resolveTrees(sample.treeInstances ?? sample.trees ?? sample.tree, sample.lat, sample.lon)
  if (!sample.garden) {
    return {
      daylightMinutes: Math.max(0, sample.sunsetMin - sample.sunriseMin),
      directSunHoursAvg: 0,
      directSunHoursMin: 0,
      directSunHoursMax: 0,
      dailyDoseM2h: 0,
      peakSunlitArea: 0,
      suitability: getCropSuitability(0),
      dayCurve: [],
      gridSunHours: [],
    }
  }

  const cells = getGardenGrid(sample.garden)
  const cellSunMinutes = new Float64Array(cells.length)
  const totalArea = sample.garden.width * sample.garden.length

  const dayCurve: GardenDayPoint[] = []
  let doseM2h = 0
  let peakArea = 0

  const daylightMins = Math.max(0, sample.sunsetMin - sample.sunriseMin)

  for (let m = sample.sunriseMin; m < sample.sunsetMin; m += step) {
    const dt = Math.min(step, sample.sunsetMin - m)
    const midMin = m + dt / 2
    const sun = getSunPosition(
      sample.lat,
      sample.lon,
      sample.year,
      sample.month,
      sample.day,
      midMin / 60,
      sample.tzHours,
    )

    if (sun.alt <= 0) continue

    let sunlitCount = 0
    for (let c = 0; c < cells.length; c++) {
      const inShade = isPointInTreeShadow(cells[c], trees, sun.alt, sun.az)
      if (!inShade) {
        sunlitCount++
        cellSunMinutes[c] += dt
      }
    }

    const ratio = cells.length > 0 ? sunlitCount / cells.length : 0
    const area = ratio * totalArea
    const intensity = Math.max(0, Math.sin(toRad(sun.alt)))
    doseM2h += area * intensity * (dt / 60)
    if (area > peakArea) peakArea = area

    dayCurve.push({
      minutes: midMin,
      sunlitPercent: ratio * 100,
      sunlitAreaM2: area,
      sunAlt: sun.alt,
      sunAz: sun.az,
      intensity,
    })
  }

  const gridSunHours = Array.from(cellSunMinutes).map((m) => m / 60)
  const sumHours = gridSunHours.reduce((a, b) => a + b, 0)
  const avgHours = gridSunHours.length > 0 ? sumHours / gridSunHours.length : 0
  const minHours = gridSunHours.length > 0 ? Math.min(...gridSunHours) : 0
  const maxHours = gridSunHours.length > 0 ? Math.max(...gridSunHours) : 0

  return {
    daylightMinutes: daylightMins,
    directSunHoursAvg: avgHours,
    directSunHoursMin: minHours,
    directSunHoursMax: maxHours,
    dailyDoseM2h: doseM2h,
    peakSunlitArea: peakArea,
    suitability: getCropSuitability(avgHours),
    dayCurve,
    gridSunHours,
  }
}

export type GardenYearPoint = {
  dayOfYear: number
  directSunHoursAvg: number
  dailyDoseM2h: number
  sunlitAreaPeak: number
}

export type GardenYearlySample = {
  lat: number
  lon: number
  year: number
  garden: GardenConfig | null
  tree?: TreeConfig
  trees?: TreeItem[]
  treeInstances?: TreeInstance[]
  dayStep?: number
  timeStep?: number
}

/** Compute seasonal direct sun hours on the vegie garden across the year. */
export function computeGardenYearlySun(sample: GardenYearlySample): GardenYearPoint[] {
  if (!sample.garden) return []
  const dayStep = Math.max(1, Math.round(sample.dayStep ?? 3))
  const timeStep = Math.max(5, Math.round(sample.timeStep ?? 10))
  const points: GardenYearPoint[] = []

  for (let doy = 1; doy <= 365; doy += dayStep) {
    const date = dateFromDayOfYear(sample.year, doy)
    const tz = getTimezone(sample.lat, sample.lon, date.year, date.month, date.day)
    const daylight = getDaylight(
      sample.lat,
      sample.lon,
      date.year,
      date.month,
      date.day,
      tz.hours,
    )

    if (daylight.polar === 'night' || daylight.sunsetMin <= daylight.sunriseMin) {
      points.push({
        dayOfYear: doy,
        directSunHoursAvg: 0,
        dailyDoseM2h: 0,
        sunlitAreaPeak: 0,
      })
      continue
    }

    const daily = computeGardenDailySun({
      lat: sample.lat,
      lon: sample.lon,
      year: date.year,
      month: date.month,
      day: date.day,
      tzHours: tz.hours,
      garden: sample.garden,
      tree: sample.tree,
      trees: sample.trees,
      treeInstances: sample.treeInstances,
      sunriseMin: daylight.sunriseMin,
      sunsetMin: daylight.sunsetMin,
      stepMin: timeStep,
    })

    points.push({
      dayOfYear: doy,
      directSunHoursAvg: daily.directSunHoursAvg,
      dailyDoseM2h: daily.dailyDoseM2h,
      sunlitAreaPeak: daily.peakSunlitArea,
    })
  }

  return points
}

/** Generate polygon points (in local metres East/North) for tree shadow on ground. */
export function getTreeShadowPolygons(
  treeOrInstances: TreeConfig | TreeInstance[] | TreeItem[],
  sunAlt: number,
  sunAz: number,
  anchorLat = 0,
  anchorLon = 0,
): Array<Array<[number, number]>> {
  if (sunAlt <= 0.05) return []

  const trees = resolveTrees(treeOrInstances, anchorLat, anchorLon)
  const altRad = toRad(sunAlt)
  const tanAlt = Math.tan(altRad)
  if (tanAlt <= 1e-4) return []

  const shadowAz = wrapDegrees(sunAz + 180)
  const shadowAzRad = toRad(shadowAz)
  const sinS = Math.sin(shadowAzRad)
  const cosS = Math.cos(shadowAzRad)

  // Perpendicular unit vector to shadow
  const perpX = cosS
  const perpY = -sinS

  const polygons: Array<Array<[number, number]>> = []

  for (const t of trees) {
    // Crown shadow center displacement from tree base:
    const dMid = t.crownCenter / tanAlt
    const cx = t.x + dMid * sinS
    const cy = t.y + dMid * cosS

    // Semi-minor axis (perpendicular to shadow) = crownRadius
    // Semi-major axis (along shadow) = crownRadius / sin(alt)
    const semiMinor = t.crownRadius
    const semiMajor = t.crownRadius / Math.max(0.08, Math.sin(altRad))

    const pts: Array<[number, number]> = []
    const numPts = 24
    for (let i = 0; i < numPts; i++) {
      const angle = (i * 2 * Math.PI) / numPts
      const u = semiMinor * Math.cos(angle) // along perpendicular
      const v = semiMajor * Math.sin(angle) // along shadow direction
      pts.push([cx + u * perpX + v * sinS, cy + u * perpY + v * cosS])
    }

    // Connect with trunk base for a realistic solid shadow:
    const trunkW = Math.max(0.15, 0.2 * t.crownRadius)
    const trunkBaseL: [number, number] = [t.x - trunkW * perpX, t.y - trunkW * perpY]
    const trunkBaseR: [number, number] = [t.x + trunkW * perpX, t.y + trunkW * perpY]

    polygons.push([trunkBaseL, trunkBaseR, ...pts])
  }

  return polygons
}

/** Generate circle points for tree canopy footprint on ground. */
export function getTreeCanopyPolygons(
  treeOrInstances: TreeConfig | TreeInstance[] | TreeItem[],
  anchorLat = 0,
  anchorLon = 0,
): Array<Array<[number, number]>> {
  const trees = resolveTrees(treeOrInstances, anchorLat, anchorLon)
  const polygons: Array<Array<[number, number]>> = []
  const numPts = 24

  for (const t of trees) {
    const pts: Array<[number, number]> = []
    for (let i = 0; i < numPts; i++) {
      const a = (i * 2 * Math.PI) / numPts
      pts.push([t.x + t.crownRadius * Math.sin(a), t.y + t.crownRadius * Math.cos(a)])
    }
    polygons.push(pts)
  }

  return polygons
}
