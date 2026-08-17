import { describe, expect, it } from 'vitest'
import { DEFAULT_INPUTS } from './model'
import { mergeScene, parseSceneSearch, writeSceneSearch } from './scene'

describe('shareable scene URL', () => {
  it('round-trips the main inputs', () => {
    const src = {
      ...DEFAULT_INPUTS,
      lat: -33.85,
      lon: 151.21,
      facing: 180,
      projection: 6.5,
    }
    const parsed = parseSceneSearch(writeSceneSearch(src))
    expect(parsed).not.toBeNull()
    const merged = mergeScene(DEFAULT_INPUTS, parsed!)
    expect(merged.lat).toBeCloseTo(-33.85, 4)
    expect(merged.lon).toBeCloseTo(151.21, 4)
    expect(merged.facing).toBe(180)
    expect(merged.projection).toBeCloseTo(6.5, 2)
    expect(merged.eaveProjection).toBeCloseTo(0.6, 2)
    expect(merged.eaveHeightWall).toBeCloseTo(2.3, 2)
    expect(merged.houseRoofSlope).toBe(15)
  })

  it('clamps a junk compare and roof slope from the URL', () => {
    const parsed = parseSceneSearch('?cp=99&chw=0.2&csl=80&hrs=90&fac=400')
    expect(parsed).not.toBeNull()
    const merged = mergeScene(DEFAULT_INPUTS, parsed!)
    expect(merged.compareProjection).toBe(12)
    expect(merged.compareHeightWall).toBeGreaterThanOrEqual(1.8)
    expect(merged.compareSlope).toBe(35)
    expect(merged.houseRoofSlope).toBe(35)
    expect(merged.facing).toBe(40)
  })

  it('returns null for an empty query', () => {
    expect(parseSceneSearch('')).toBeNull()
    expect(parseSceneSearch('?')).toBeNull()
  })
})
