import { describe, expect, it } from 'vitest'
import {
  DEFAULT_GARDEN_INPUTS,
  getGardenCorners,
  getGardenGrid,
  getTreeInstances,
} from './gardenModel'
import {
  computeGardenDailySun,
  computeGardenInstantSun,
  getCropSuitability,
  getTreeCanopyPolygons,
  getTreeShadowPolygons,
  isPointInTreeShadow,
} from './gardenSolar'

describe('gardenModel', () => {
  it('creates a single tree correctly', () => {
    const trees = getTreeInstances({
      mode: 'single',
      height: 6,
      diameter: 4,
      groupWidth: 10,
      treeCount: 3,
      rotation: 0,
      trunkHeight: 1.5,
    })
    expect(trees).toHaveLength(1)
    expect(trees[0].x).toBe(0)
    expect(trees[0].y).toBe(0)
    expect(trees[0].crownRadius).toBe(2)
  })

  it('creates a group of trees spaced along rotation axis', () => {
    const trees = getTreeInstances({
      mode: 'group',
      height: 8,
      diameter: 4,
      groupWidth: 12,
      treeCount: 3,
      rotation: 90, // East-West row
      trunkHeight: 2,
    })
    expect(trees).toHaveLength(3)
    // Span = 12 - 4 = 8m. Tree 0 at -4, Tree 1 at 0, Tree 2 at +4 along East-West
    expect(trees[0].x).toBeCloseTo(-4, 2)
    expect(trees[0].y).toBeCloseTo(0, 2)
    expect(trees[1].x).toBeCloseTo(0, 2)
    expect(trees[1].y).toBeCloseTo(0, 2)
    expect(trees[2].x).toBeCloseTo(4, 2)
    expect(trees[2].y).toBeCloseTo(0, 2)
  })

  it('computes garden corners with rotation', () => {
    const corners = getGardenCorners({
      width: 4,
      length: 6,
      rotation: 0,
      offsetEast: 10,
      offsetNorth: 20,
    })
    expect(corners).toHaveLength(4)
    // At rotation 0: u is East, v is North
    // Corners should be offset by +-2 East and +-3 North
    expect(corners[0]).toEqual({ x: 8, y: 17 })
    expect(corners[1]).toEqual({ x: 12, y: 17 })
    expect(corners[2]).toEqual({ x: 12, y: 23 })
    expect(corners[3]).toEqual({ x: 8, y: 23 })
  })

  it('generates garden grid cells spanning width and length', () => {
    const grid = getGardenGrid({
      width: 2,
      length: 4,
      rotation: 0,
      offsetEast: 0,
      offsetNorth: 0,
    }, 4, 4)
    expect(grid).toHaveLength(16)
    expect(grid[0].x).toBeGreaterThan(-1)
    expect(grid[0].x).toBeLessThan(1)
  })
})

describe('gardenSolar', () => {
  it('detects shadow when point is in path of sun ray through crown', () => {
    const trees = getTreeInstances({
      mode: 'single',
      height: 6,
      diameter: 4,
      groupWidth: 4,
      treeCount: 1,
      rotation: 0,
      trunkHeight: 1.5,
    })

    // Sun at North (azimuth 0), altitude 45 deg
    // Shadow falls to the South (negative Y)
    // Crown center is at height (6 + 1.5)/2 = 3.75m
    // Center of shadow on ground: y = -3.75 / tan(45) = -3.75m South
    const pointInShade = { x: 0, y: -3.75 }
    expect(isPointInTreeShadow(pointInShade, trees, 45, 0)).toBe(true)

    // Point far away to the North should be in sun
    const pointInSun = { x: 0, y: 10 }
    expect(isPointInTreeShadow(pointInSun, trees, 45, 0)).toBe(false)
  })

  it('returns night / shaded when sun altitude <= 0', () => {
    const trees = getTreeInstances(DEFAULT_GARDEN_INPUTS.tree)
    expect(isPointInTreeShadow({ x: 0, y: 0 }, trees, -2, 180)).toBe(true)
  })

  it('computes instant sun metrics on garden', () => {
    const instant = computeGardenInstantSun(
      {
        width: 3,
        length: 5,
        rotation: 0,
        offsetEast: 0,
        offsetNorth: 15, // 15m North
      },
      {
        mode: 'single',
        height: 6,
        diameter: 4,
        groupWidth: 4,
        treeCount: 1,
        rotation: 0,
        trunkHeight: 1.5,
      },
      50, // Sun at 50 deg altitude
      0, // Sun due North -> shadow cast to South (away from the garden)
    )

    // Garden is to the North, shadow is to the South => garden in full sun!
    expect(instant.status).toBe('full-sun')
    expect(instant.sunlitPercent).toBe(100)
    expect(instant.sunlitAreaM2).toBeCloseTo(15, 1)
  })

  it('computes daily sun integration for garden bed', () => {
    const daily = computeGardenDailySun({
      lat: -33.86,
      lon: 151.21,
      year: 2026,
      month: 1,
      day: 15,
      tzHours: 11,
      garden: {
        width: 3,
        length: 6,
        rotation: 0,
        offsetEast: 0,
        offsetNorth: 8,
      },
      tree: {
        mode: 'single',
        height: 6,
        diameter: 4,
        groupWidth: 4,
        treeCount: 1,
        rotation: 0,
        trunkHeight: 1.5,
      },
      sunriseMin: 360,
      sunsetMin: 1200,
      stepMin: 15,
    })

    expect(daily.daylightMinutes).toBe(840)
    expect(daily.directSunHoursAvg).toBeGreaterThan(0)
    expect(daily.dayCurve.length).toBeGreaterThan(0)
  })

  it('provides sensible crop recommendations', () => {
    const fullSun = getCropSuitability(7.5)
    expect(fullSun.tier).toBe('full-sun')
    expect(fullSun.recommendations).toContain('Tomatoes')

    const partial = getCropSuitability(4.5)
    expect(partial.tier).toBe('partial-sun')
    expect(partial.recommendations).toContain('Carrots & Beetroot')

    const shade = getCropSuitability(2.0)
    expect(shade.tier).toBe('shade')
  })

  it('generates shadow and canopy polygons', () => {
    const shadowPolys = getTreeShadowPolygons(DEFAULT_GARDEN_INPUTS.tree, 45, 180)
    expect(shadowPolys.length).toBe(DEFAULT_GARDEN_INPUTS.tree.treeCount)

    const canopyPolys = getTreeCanopyPolygons(DEFAULT_GARDEN_INPUTS.tree)
    expect(canopyPolys.length).toBe(DEFAULT_GARDEN_INPUTS.tree.treeCount)
  })
})
