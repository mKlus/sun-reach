import { clamp, wrapDegrees } from './solar'
import { OPERA_HOUSE } from './model'

export type TreeMode = 'single' | 'group'

export type TreeItem = {
  id: string
  lat: number
  lon: number
  height: number
  diameter: number
  trunkHeight: number
}

export type TreeConfig = {
  mode: TreeMode
  height: number
  diameter: number
  groupWidth: number
  treeCount: number
  rotation: number
  trunkHeight: number
}

export type GardenConfig = {
  width: number
  length: number
  rotation: number
  offsetEast: number
  offsetNorth: number
}

export type GardenInputs = {
  lat: number
  lon: number
  placeLabel: string
  dayOfYear: number
  timeMinutes: number
  trees: TreeItem[]
  garden: GardenConfig | null
  // Keep legacy tree for backward-compatibility if needed
  tree?: TreeConfig
}

export const TREE_HEIGHT_MIN = 1.5
export const TREE_HEIGHT_MAX = 25
export const TREE_DIAMETER_MIN = 1
export const TREE_DIAMETER_MAX = 18
export const GROUP_WIDTH_MIN = 2
export const GROUP_WIDTH_MAX = 50
export const TREE_COUNT_MIN = 1
export const TREE_COUNT_MAX = 15
export const TRUNK_HEIGHT_MIN = 0.5
export const TRUNK_HEIGHT_MAX = 5

export const GARDEN_WIDTH_MIN = 1
export const GARDEN_WIDTH_MAX = 15
export const GARDEN_LENGTH_MIN = 1
export const GARDEN_LENGTH_MAX = 25
export const GARDEN_OFFSET_MIN = -50
export const GARDEN_OFFSET_MAX = 50

export const DEFAULT_GARDEN_INPUTS: GardenInputs = {
  lat: OPERA_HOUSE.lat,
  lon: OPERA_HOUSE.lon,
  placeLabel: 'Sydney Opera House',
  dayOfYear: 213, // Aug 1
  timeMinutes: 10 * 60, // 10:00 AM
  trees: [
    {
      id: 'tree-1',
      lat: OPERA_HOUSE.lat,
      lon: OPERA_HOUSE.lon,
      height: 6.0,
      diameter: 4.0,
      trunkHeight: 1.5,
    },
    {
      id: 'tree-2',
      lat: OPERA_HOUSE.lat + 0.00003,
      lon: OPERA_HOUSE.lon + 0.00006,
      height: 5.5,
      diameter: 3.5,
      trunkHeight: 1.5,
    },
  ],
  garden: {
    width: 3.0,
    length: 6.0,
    rotation: 0, // North-South bed
    offsetEast: 1.5,
    offsetNorth: -6.0, // 6m South of tree anchor (shaded in Southern hemisphere winter)
  },
  tree: {
    mode: 'group',
    height: 6.0,
    diameter: 3.5,
    groupWidth: 12.0,
    treeCount: 4,
    rotation: 90,
    trunkHeight: 1.5,
  },
}

export const GARDEN_STORAGE_KEY = 'sun-reach-garden-v1'

export type TreeInstance = {
  id: number
  x: number // East offset in metres
  y: number // North offset in metres
  height: number
  diameter: number
  trunkHeight: number
  crownRadius: number
  crownBase: number
  crownCenter: number
  crownRadiusZ: number
}

/** Compute the individual tree instances for a given tree configuration. */
export function getTreeInstances(tree: TreeConfig): TreeInstance[] {
  const crownRadius = tree.diameter / 2
  const crownBase = Math.min(tree.trunkHeight, tree.height - 0.5)
  const crownCenter = (tree.height + crownBase) / 2
  const crownRadiusZ = Math.max(0.5, (tree.height - crownBase) / 2)

  if (tree.mode === 'single' || tree.treeCount <= 1) {
    return [
      {
        id: 0,
        x: 0,
        y: 0,
        height: tree.height,
        diameter: tree.diameter,
        trunkHeight: tree.trunkHeight,
        crownRadius,
        crownBase,
        crownCenter,
        crownRadiusZ,
      },
    ]
  }

  const count = Math.max(2, Math.min(TREE_COUNT_MAX, Math.round(tree.treeCount)))
  const span = Math.max(0, tree.groupWidth - tree.diameter)
  const rad = (tree.rotation * Math.PI) / 180
  const sinR = Math.sin(rad)
  const cosR = Math.cos(rad)

  const trees: TreeInstance[] = []
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : -span / 2 + (i * span) / (count - 1)
    const x = t * sinR
    const y = t * cosR
    trees.push({
      id: i,
      x,
      y,
      height: tree.height,
      diameter: tree.diameter,
      trunkHeight: tree.trunkHeight,
      crownRadius,
      crownBase,
      crownCenter,
      crownRadiusZ,
    })
  }
  return trees
}

/** Compute individual tree instances from an array of TreeItem positioned relative to scene anchor. */
export function getTreeInstancesFromItems(
  items: TreeItem[],
  anchorLat: number,
  anchorLon: number,
): TreeInstance[] {
  return items.map((t, idx) => {
    const north = (t.lat - anchorLat) * 111320
    const east = (t.lon - anchorLon) * (111320 * Math.max(0.2, Math.cos((anchorLat * Math.PI) / 180)))
    const crownRadius = t.diameter / 2
    const crownBase = Math.min(t.trunkHeight, t.height - 0.5)
    const crownCenter = (t.height + crownBase) / 2
    const crownRadiusZ = Math.max(0.5, (t.height - crownBase) / 2)
    return {
      id: idx,
      x: east,
      y: north,
      height: t.height,
      diameter: t.diameter,
      trunkHeight: t.trunkHeight,
      crownRadius,
      crownBase,
      crownCenter,
      crownRadiusZ,
    }
  })
}

export type Point2D = { x: number; y: number }

/** Returns the 4 corners of the vegie garden rectangle in local ground coordinates (metres). */
export function getGardenCorners(garden: GardenConfig): Point2D[] {
  const halfW = garden.width / 2
  const halfL = garden.length / 2
  const rad = (garden.rotation * Math.PI) / 180
  const cosR = Math.cos(rad)
  const sinR = Math.sin(rad)

  // Local corners: [-halfW, -halfL], [halfW, -halfL], [halfW, halfL], [-halfW, halfL]
  // Rotated by garden.rotation:
  // u (width axis, normal to length) is at rotation + 90 deg: [cosR, -sinR]
  // v (length axis) is at rotation: [sinR, cosR]
  const localOffsets = [
    { u: -halfW, v: -halfL },
    { u: halfW, v: -halfL },
    { u: halfW, v: halfL },
    { u: -halfW, v: halfL },
  ]

  return localOffsets.map((pt) => ({
    x: garden.offsetEast + pt.u * cosR + pt.v * sinR,
    y: garden.offsetNorth - pt.u * sinR + pt.v * cosR,
  }))
}

export type GardenGridCell = {
  index: number
  x: number
  y: number
  u: number // normalized 0..1 across width
  v: number // normalized 0..1 across length
}

/** Discretize the garden bed into a regular sampling grid for solar calculation. */
export function getGardenGrid(
  garden: GardenConfig,
  cols = 8,
  rows = 12,
): GardenGridCell[] {
  const rad = (garden.rotation * Math.PI) / 180
  const cosR = Math.cos(rad)
  const sinR = Math.sin(rad)
  const cells: GardenGridCell[] = []

  for (let r = 0; r < rows; r++) {
    const vNorm = (r + 0.5) / rows
    const vLocal = -garden.length / 2 + vNorm * garden.length
    for (let c = 0; c < cols; c++) {
      const uNorm = (c + 0.5) / cols
      const uLocal = -garden.width / 2 + uNorm * garden.width
      const x = garden.offsetEast + uLocal * cosR + vLocal * sinR
      const y = garden.offsetNorth - uLocal * sinR + vLocal * cosR
      cells.push({
        index: r * cols + c,
        x,
        y,
        u: uNorm,
        v: vNorm,
      })
    }
  }
  return cells
}

export function clampGardenInputs(inputs: GardenInputs): GardenInputs {
  const lat = clamp(inputs.lat, -90, 90)
  const lon = clamp(inputs.lon, -180, 180)

  // Ensure trees array exists
  let rawTrees = inputs.trees
  if (!rawTrees || !Array.isArray(rawTrees) || rawTrees.length === 0) {
    if (inputs.tree) {
      // Migrate from legacy tree config
      const legacyInstances = getTreeInstances(inputs.tree)
      rawTrees = legacyInstances.map((t, idx) => ({
        id: `tree-${idx + 1}`,
        lat: lat + t.y / 111320,
        lon: lon + t.x / (111320 * Math.max(0.2, Math.cos((lat * Math.PI) / 180))),
        height: t.height,
        diameter: t.diameter,
        trunkHeight: t.trunkHeight,
      }))
    } else {
      rawTrees = DEFAULT_GARDEN_INPUTS.trees
    }
  }

  const clampedTrees: TreeItem[] = rawTrees.map((t, idx) => ({
    id: t.id || `tree-${idx + 1}`,
    lat: clamp(t.lat, -90, 90),
    lon: clamp(t.lon, -180, 180),
    height: clamp(t.height, TREE_HEIGHT_MIN, TREE_HEIGHT_MAX),
    diameter: clamp(t.diameter, TREE_DIAMETER_MIN, TREE_DIAMETER_MAX),
    trunkHeight: clamp(t.trunkHeight ?? 1.5, TRUNK_HEIGHT_MIN, TRUNK_HEIGHT_MAX),
  }))

  const garden = inputs.garden
    ? {
        width: clamp(inputs.garden.width, GARDEN_WIDTH_MIN, GARDEN_WIDTH_MAX),
        length: clamp(inputs.garden.length, GARDEN_LENGTH_MIN, GARDEN_LENGTH_MAX),
        rotation: wrapDegrees(Math.round(inputs.garden.rotation)),
        offsetEast: clamp(inputs.garden.offsetEast, GARDEN_OFFSET_MIN, GARDEN_OFFSET_MAX),
        offsetNorth: clamp(inputs.garden.offsetNorth, GARDEN_OFFSET_MIN, GARDEN_OFFSET_MAX),
      }
    : null

  // Synthesize legacy tree for any legacy consumers
  const firstTree = clampedTrees[0] || DEFAULT_GARDEN_INPUTS.trees[0]
  const legacyTree: TreeConfig = {
    mode: clampedTrees.length > 1 ? 'group' : 'single',
    height: firstTree.height,
    diameter: firstTree.diameter,
    groupWidth: 12,
    treeCount: clampedTrees.length,
    rotation: 90,
    trunkHeight: firstTree.trunkHeight,
  }

  return {
    ...inputs,
    lat,
    lon,
    dayOfYear: clamp(Math.round(inputs.dayOfYear), 1, 366),
    timeMinutes: clamp(Math.round(inputs.timeMinutes), 0, 1439),
    trees: clampedTrees,
    garden,
    tree: legacyTree,
  }
}

export function loadGardenInputs(): GardenInputs {
  try {
    const raw = localStorage.getItem(GARDEN_STORAGE_KEY)
    if (!raw) return DEFAULT_GARDEN_INPUTS
    const parsed = JSON.parse(raw) as Partial<GardenInputs>
    return clampGardenInputs({
      ...DEFAULT_GARDEN_INPUTS,
      ...parsed,
    })
  } catch {
    return DEFAULT_GARDEN_INPUTS
  }
}

export function saveGardenInputs(inputs: GardenInputs): void {
  try {
    localStorage.setItem(GARDEN_STORAGE_KEY, JSON.stringify(inputs))
  } catch {
    /* quota */
  }
}
