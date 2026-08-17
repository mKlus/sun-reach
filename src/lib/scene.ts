import { clampInputs, type Inputs } from './model'

function num(raw: string | null): number | null {
  if (raw == null || raw === '') return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

export function parseSceneSearch(search: string): Partial<Inputs> | null {
  const q = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  if (![...q.keys()].length) return null
  const next: Partial<Inputs> = {}
  const lat = num(q.get('lat'))
  const lon = num(q.get('lon'))
  const facing = num(q.get('fac'))
  const dayOfYear = num(q.get('doy'))
  const timeMinutes = num(q.get('t'))
  const projection = num(q.get('p'))
  const heightWall = num(q.get('hw'))
  const slope = num(q.get('sl'))
  const doorHeight = num(q.get('dh'))
  const roomDepth = num(q.get('rd'))
  const eaveProjection = num(q.get('ep'))
  const eaveHeightWall = num(q.get('eh'))
  const houseRoofSlope = num(q.get('hrs'))
  if (lat != null) next.lat = lat
  if (lon != null) next.lon = lon
  if (facing != null) next.facing = facing
  if (dayOfYear != null) next.dayOfYear = dayOfYear
  if (timeMinutes != null) next.timeMinutes = timeMinutes
  if (projection != null) next.projection = projection
  if (heightWall != null) next.heightWall = heightWall
  if (slope != null) next.slope = slope
  if (doorHeight != null) next.doorHeight = doorHeight
  if (roomDepth != null) next.roomDepth = roomDepth
  if (eaveProjection != null) next.eaveProjection = eaveProjection
  if (eaveHeightWall != null) next.eaveHeightWall = eaveHeightWall
  if (houseRoofSlope != null) next.houseRoofSlope = houseRoofSlope
  const place = q.get('place')
  if (place) next.placeLabel = place
  const cp = num(q.get('cp'))
  if (cp != null) {
    next.compareProjection = cp
    next.compareHeightWall = num(q.get('chw'))
    next.compareSlope = num(q.get('csl'))
  }
  return Object.keys(next).length ? next : null
}

export function writeSceneHref(inputs: Inputs): string {
  return `${window.location.pathname}${writeSceneSearch(inputs)}${window.location.hash}`
}

/** Safari throws if replaceState runs more than 100 times in 10 seconds. */
export function replaceSceneUrl(inputs: Inputs): void {
  const next = writeSceneHref(inputs)
  const now = `${window.location.pathname}${window.location.search}${window.location.hash}`
  if (next === now) return
  try {
    window.history.replaceState(null, '', next)
  } catch {
    /* quota */
  }
}

export function writeSceneSearch(inputs: Inputs): string {
  const q = new URLSearchParams()
  q.set('lat', inputs.lat.toFixed(6))
  q.set('lon', inputs.lon.toFixed(6))
  q.set('fac', String(Math.round(inputs.facing)))
  q.set('doy', String(Math.round(inputs.dayOfYear)))
  q.set('t', String(Math.round(inputs.timeMinutes)))
  q.set('p', inputs.projection.toFixed(2))
  q.set('hw', inputs.heightWall.toFixed(2))
  q.set('sl', inputs.slope.toFixed(1))
  q.set('dh', inputs.doorHeight.toFixed(2))
  q.set('rd', inputs.roomDepth.toFixed(1))
  q.set('ep', inputs.eaveProjection.toFixed(2))
  q.set('eh', inputs.eaveHeightWall.toFixed(2))
  q.set('hrs', inputs.houseRoofSlope.toFixed(1))
  if (inputs.placeLabel) q.set('place', inputs.placeLabel)
  if (inputs.compareProjection != null) {
    q.set('cp', inputs.compareProjection.toFixed(2))
    q.set('chw', (inputs.compareHeightWall ?? 0).toFixed(2))
    q.set('csl', (inputs.compareSlope ?? 0).toFixed(1))
  }
  return `?${q.toString()}`
}

export function mergeScene(base: Inputs, partial: Partial<Inputs>): Inputs {
  return clampInputs({ ...base, ...partial })
}

export function hasCompare(inputs: Inputs): boolean {
  return inputs.compareProjection != null && Number.isFinite(inputs.compareProjection)
}

export function snapshotCompare(inputs: Inputs): Inputs {
  return {
    ...inputs,
    compareProjection: inputs.projection,
    compareHeightWall: inputs.heightWall,
    compareSlope: inputs.slope,
  }
}

export function clearCompare(inputs: Inputs): Inputs {
  return {
    ...inputs,
    compareProjection: null,
    compareHeightWall: null,
    compareSlope: null,
  }
}
