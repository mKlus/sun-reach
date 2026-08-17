import type { LatLngTuple } from 'leaflet'
import { toRad } from './solar'

function offsetMeters(lat0: number, lon0: number, northM: number, eastM: number): LatLngTuple {
  const dLat = northM / 111320
  const dLon = eastM / (111320 * Math.max(0.2, Math.cos(toRad(lat0))))
  return [lat0 + dLat, lon0 + dLon]
}

function rotateLocal(east: number, north: number, facingDeg: number): { east: number; north: number } {
  const r = toRad(facingDeg)
  const c = Math.cos(r)
  const s = Math.sin(r)
  return {
    east: east * c + north * s,
    north: -east * s + north * c,
  }
}

const HOUSE_FRONT_M = 1.2
const HOUSE_HALF_WIDTH_M = 5.2

export function housePolygon(
  lat: number,
  lon: number,
  facing: number,
  roomDepth = 10,
): LatLngTuple[] {
  const back = HOUSE_FRONT_M - roomDepth
  const local: ReadonlyArray<readonly [number, number]> = [
    [-HOUSE_HALF_WIDTH_M, HOUSE_FRONT_M],
    [HOUSE_HALF_WIDTH_M, HOUSE_FRONT_M],
    [HOUSE_HALF_WIDTH_M, back],
    [-HOUSE_HALF_WIDTH_M, back],
  ]
  return local.map(([e, n]) => {
    const r = rotateLocal(e, n, facing)
    return offsetMeters(lat, lon, r.north, r.east)
  })
}
