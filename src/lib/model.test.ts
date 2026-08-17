import { afterEach, describe, expect, it } from 'vitest'
import { awningEndHeight, dayOfYearOn, daysInYear, formatDate, formatTime, siteCivilNow } from './solar'
import {
  DEFAULT_INPUTS,
  STORAGE_KEY,
  SLOPE_MAX,
  OPERA_HOUSE,
  WALL_HEIGHT_MIN,
  YEAR,
  computeModel,
  hasStoredInputs,
  clampInputs,
  loadInputs,
  resetInputs,
  saveInputs,
  setHeightEnd,
  setHeightWall,
} from './model'

const memory = new Map<string, string>()

function mockStorage() {
  memory.clear()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value)
      },
      removeItem: (key: string) => {
        memory.delete(key)
      },
    },
  })
}

afterEach(() => {
  memory.clear()
})

describe('defaults and persistence', () => {
  it('starts on 1 Aug 9am at Sydney Opera House with the requested dimensions', () => {
    expect(DEFAULT_INPUTS.lat).toBeCloseTo(OPERA_HOUSE.lat, 6)
    expect(DEFAULT_INPUTS.lon).toBeCloseTo(OPERA_HOUSE.lon, 6)
    expect(DEFAULT_INPUTS.placeLabel).toBe('Sydney Opera House')
    expect(DEFAULT_INPUTS.facing).toBe(0)
    expect(DEFAULT_INPUTS.dayOfYear).toBe(dayOfYearOn(YEAR, 8, 1))
    expect(formatDate(YEAR, DEFAULT_INPUTS.dayOfYear).label).toMatch(/1 Aug/)
    expect(DEFAULT_INPUTS.timeMinutes).toBe(540)
    expect(formatTime(DEFAULT_INPUTS.timeMinutes).label).toBe('09:00')
    expect(DEFAULT_INPUTS.projection).toBe(3)
    expect(DEFAULT_INPUTS.heightWall).toBe(3)
    expect(DEFAULT_INPUTS.slope).toBe(5)
    expect(DEFAULT_INPUTS.doorHeight).toBe(2)
    expect(DEFAULT_INPUTS.roomDepth).toBe(10)
    expect(DEFAULT_INPUTS.eaveProjection).toBe(0.6)
    expect(DEFAULT_INPUTS.eaveHeightWall).toBe(2.3)
    expect(DEFAULT_INPUTS.houseRoofSlope).toBe(15)
  })

  it('reset points the door north, shortens the awning to 3 m, and uses civil now', () => {
    const now = new Date('2026-03-10T03:00:00.000Z')
    const civil = siteCivilNow(OPERA_HOUSE.lat, OPERA_HOUSE.lon, now)
    const next = resetInputs(now)
    expect(next.facing).toBe(0)
    expect(next.projection).toBe(3)
    expect(next.dayOfYear).toBe(civil.dayOfYear)
    expect(next.timeMinutes).toBe(civil.timeMinutes)
    expect(next.heightWall).toBe(3)
  })

  it('computes end height from wall height, projection and slope', () => {
    const model = computeModel(DEFAULT_INPUTS, YEAR)
    expect(model.reach.heightEnd).toBeCloseTo(awningEndHeight(3, 3, 5), 12)
    expect(model.reach.heightEnd).toBeCloseTo(3 - 3 * Math.tan((5 * Math.PI) / 180), 12)
  })

  it('places sunrise and sunset on the azimuth plan for a normal day', () => {
    const model = computeModel(DEFAULT_INPUTS, YEAR)
    expect(model.daylight.polar).toBeNull()
    expect(model.sunRise).not.toBeNull()
    expect(model.sunSet).not.toBeNull()
    expect(Math.abs(model.sunRise!.alt)).toBeLessThan(1.2)
    expect(Math.abs(model.sunSet!.alt)).toBeLessThan(1.2)
    // Sydney winter: rise in the NE quadrant, set in the NW quadrant.
    expect(model.sunRise!.az).toBeGreaterThan(40)
    expect(model.sunRise!.az).toBeLessThan(90)
    expect(model.sunSet!.az).toBeGreaterThan(270)
    expect(model.sunSet!.az).toBeLessThan(320)
  })

  it('omits sunrise and sunset on polar night', () => {
    const model = computeModel({ ...DEFAULT_INPUTS, lat: 80, lon: 20, dayOfYear: dayOfYearOn(YEAR, 12, 21) }, YEAR)
    expect(model.daylight.polar).toBe('night')
    expect(model.sunRise).toBeNull()
    expect(model.sunSet).toBeNull()
  })

  it('moves wall height when the end-height slider is dragged', () => {
    const start = computeModel(DEFAULT_INPUTS, YEAR)
    const next = setHeightEnd(DEFAULT_INPUTS, 2.2)
    const after = computeModel(next, YEAR)
    expect(after.reach.heightEnd).toBeCloseTo(2.2, 2)
    expect(next.heightWall - after.reach.heightEnd).toBeCloseTo(start.reach.drop, 8)
    expect(next.slope).toBe(DEFAULT_INPUTS.slope)
  })

  it('moves end height when the wall-height slider is dragged', () => {
    const next = setHeightWall(DEFAULT_INPUTS, 3.5)
    const after = computeModel(next, YEAR)
    expect(next.heightWall).toBe(3.5)
    expect(after.reach.heightEnd).toBeCloseTo(awningEndHeight(3.5, 3, 5), 12)
  })

  it('round-trips user changes through localStorage', () => {
    mockStorage()
    expect(loadInputs()).toEqual(DEFAULT_INPUTS)
    const changed = {
      ...DEFAULT_INPUTS,
      projection: 5.5,
      slope: 12,
      facing: 180,
    }
    saveInputs(changed)
    expect(memory.has(STORAGE_KEY)).toBe(true)
    expect(loadInputs()).toEqual(changed)
  })

  it('lifts a v3 save with the old 5 m room to 10 m', () => {
    mockStorage()
    memory.set(
      'sun-penetration-v3',
      JSON.stringify({
        lat: OPERA_HOUSE.lat,
        lon: OPERA_HOUSE.lon,
        facing: 22,
        date: 213,
        time: 540,
        al: 4,
        ah: 3,
        slope: 5,
        dh: 2,
        rd: 5,
      }),
    )
    const loaded = loadInputs()
    expect(loaded.roomDepth).toBe(10)
    expect(loaded.projection).toBe(4)
  })

  it('clamps stored junk to slider limits', () => {
    const next = clampInputs({
      ...DEFAULT_INPUTS,
      lat: 120,
      lon: -200,
      facing: 400,
      projection: 99,
      slope: -4,
      doorHeight: 0.2,
      roomDepth: 40,
      dayOfYear: 900,
    })
    expect(next.lat).toBe(90)
    expect(next.lon).toBe(-180)
    expect(next.facing).toBe(40)
    expect(next.projection).toBe(12)
    expect(next.slope).toBe(0)
    expect(next.doorHeight).toBe(1)
    expect(next.roomDepth).toBe(20)
    expect(next.dayOfYear).toBe(daysInYear(YEAR))
  })

  it('clamps compare dims and leaves a missing compare as null', () => {
    const junk = clampInputs({
      ...DEFAULT_INPUTS,
      compareProjection: 99,
      compareHeightWall: 0.2,
      compareSlope: 80,
    })
    expect(junk.compareProjection).toBe(12)
    expect(junk.compareHeightWall).toBe(WALL_HEIGHT_MIN)
    expect(junk.compareSlope).toBe(SLOPE_MAX)
    expect(clampInputs(DEFAULT_INPUTS).compareProjection).toBeNull()
  })

  it('reports whether a previous visit is stored', () => {
    mockStorage()
    expect(hasStoredInputs()).toBe(false)
    saveInputs(DEFAULT_INPUTS)
    expect(hasStoredInputs()).toBe(true)
  })
})
