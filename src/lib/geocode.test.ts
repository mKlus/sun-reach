import { describe, expect, it } from 'vitest'
import { OPERA_HOUSE } from './model'
import {
  localPlaceHints,
  mergePlaceHits,
  parseEsriCandidates,
  parseNominatimHits,
} from './geocode'

describe('localPlaceHints', () => {
  it('finds the Opera House from partial queries', () => {
    for (const q of ['Sydney Opera House', 'opera house', 'Bennelong']) {
      const hits = localPlaceHints(q)
      expect(hits).toHaveLength(1)
      expect(hits[0].lat).toBeCloseTo(OPERA_HOUSE.lat, 6)
      expect(hits[0].lon).toBeCloseTo(OPERA_HOUSE.lon, 6)
    }
  })

  it('does not force a hint on an unrelated search', () => {
    expect(localPlaceHints('Bega')).toEqual([])
    expect(localPlaceHints('10')).toEqual([])
    expect(localPlaceHints('ab')).toEqual([])
  })
})

describe('parseEsriCandidates', () => {
  it('maps a candidate and drops junk', () => {
    const hits = parseEsriCandidates({
      candidates: [
        {
          address: 'Sydney Opera House, Bennelong Point, Sydney',
          score: 100,
          location: { x: OPERA_HOUSE.lon, y: OPERA_HOUSE.lat },
        },
        {
          address: 'Sydney Opera House, Bennelong Point, Sydney',
          score: 100,
          location: { x: OPERA_HOUSE.lon, y: OPERA_HOUSE.lat },
        },
        { address: 'noise', score: 10, location: { x: 0, y: 0 } },
        { address: 'no coords', score: 99 },
      ],
    })
    expect(hits).toHaveLength(1)
    expect(hits[0].display_name).toMatch(/Opera House/)
    expect(hits[0].lat).toBeCloseTo(OPERA_HOUSE.lat, 6)
    expect(hits[0].lon).toBeCloseTo(OPERA_HOUSE.lon, 6)
  })
})

describe('parseNominatimHits', () => {
  it('keeps valid rows', () => {
    const hits = parseNominatimHits([
      { display_name: 'Bega, New South Wales, Australia', lat: '-36.68', lon: '149.84' },
      { display_name: 'bad', lat: 'nope', lon: '1' },
    ])
    expect(hits).toHaveLength(1)
    expect(hits[0].lat).toBeCloseTo(-36.68, 4)
  })
})

describe('mergePlaceHits', () => {
  it('prefers the first list and caps at 6', () => {
    const a = { display_name: 'A', lat: OPERA_HOUSE.lat, lon: OPERA_HOUSE.lon }
    const b = { display_name: 'B', lat: OPERA_HOUSE.lat, lon: OPERA_HOUSE.lon }
    const extra = Array.from({ length: 8 }, (_, i) => ({
      display_name: `X${i}`,
      lat: -33 - i * 0.01,
      lon: 151 + i * 0.01,
    }))
    const merged = mergePlaceHits([a], [b, ...extra])
    expect(merged[0].display_name).toBe('A')
    expect(merged).toHaveLength(6)
  })
})
