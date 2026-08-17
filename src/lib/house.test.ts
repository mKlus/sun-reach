import { describe, expect, it } from 'vitest'
import { housePolygon } from './house'

describe('housePolygon', () => {
  it('puts the glass (first two corners) north of the pin when facing 0', () => {
    const lat = -33.856784
    const lon = 151.215297
    const poly = housePolygon(lat, lon, 0)
    expect(poly).toHaveLength(4)
    expect(poly[0][0]).toBeGreaterThan(lat)
    expect(poly[1][0]).toBeGreaterThan(lat)
    expect(poly[2][0]).toBeLessThan(lat)
    expect(poly[3][0]).toBeLessThan(lat)
  })

  it('stretches the house footprint with house width', () => {
    const lat = -33.856784
    const lon = 151.215297
    const short = housePolygon(lat, lon, 0, 4)
    const long = housePolygon(lat, lon, 0, 20)
    expect(short[2][0]).toBeLessThan(lat)
    expect(long[2][0]).toBeLessThan(short[2][0])
  })
})
