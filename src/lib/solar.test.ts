import { describe, expect, it } from 'vitest'
import {
  awningEndHeight,
  clampToDaylight,
  computeDailySun,
  computeDayCurve,
  computeYearlySun,
  daylightIntervals,
  dateFromDayOfYear,
  daysInYear,
  facadeIntensity,
  formatFacing,
  getDaylight,
  reachHeadline,
  siteCivilNow,
  getSunPosition,
  getTimezone,
  heatKwPerM,
  lerpYearDose,
  relativeBeam,
  profileAngle,
  rafterLength,
  sunReach,
  yearSeriesArea,
  yearSeriesPeak,
  wrapDegrees,
  wrapSigned180,
  toRad,
} from './solar'

describe('solar math', () => {
  it('wraps compass and signed angles the JS-modulo-safe way', () => {
    expect(wrapDegrees(400)).toBe(40)
    expect(wrapDegrees(-20)).toBe(340)
    expect(wrapSigned180(-200)).toBe(160)
    expect(wrapSigned180(200)).toBe(-160)
    expect(wrapSigned180(180)).toBe(-180)
  })

  it('maps day of year to calendar dates', () => {
    expect(dateFromDayOfYear(2026, 1)).toEqual({
      year: 2026,
      month: 1,
      day: 1,
      dayOfYear: 1,
    })
    expect(dateFromDayOfYear(2026, 172)).toEqual({
      year: 2026,
      month: 6,
      day: 21,
      dayOfYear: 172,
    })
    expect(dateFromDayOfYear(2026, 365).day).toBe(31)
    expect(dateFromDayOfYear(2026, 365).month).toBe(12)
    expect(daysInYear(2024)).toBe(366)
    expect(daysInYear(2026)).toBe(365)
  })

  it('uses AEDT in January and AEST in June for Bega', () => {
    const bega = { lat: -36.68, lon: 149.84 }
    const jan = getTimezone(bega.lat, bega.lon, 2026, 1, 15)
    const jun = getTimezone(bega.lat, bega.lon, 2026, 6, 21)
    expect(jan.hours).toBe(11)
    expect(jan.name).toBe('AEDT')
    expect(jun.hours).toBe(10)
    expect(jun.name).toBe('AEST')
  })

  it('does not apply DST in Brisbane; Perth is UTC+8', () => {
    expect(getTimezone(-27.47, 153.03, 2026, 1, 15).hours).toBe(10)
    expect(getTimezone(-31.95, 115.86, 2026, 1, 15).hours).toBe(8)
  })

  it('keeps western QLD on AEST, not Central', () => {
    expect(getTimezone(-20.73, 139.49, 2026, 1, 15).hours).toBe(10)
    expect(getTimezone(-20.73, 139.49, 2026, 1, 15).name).toBe('AEST')
    expect(getTimezone(-25.9, 139.35, 2026, 6, 21).hours).toBe(10)
  })

  it('applies NSW DST at Tweed Heads', () => {
    expect(getTimezone(-28.17, 153.55, 2026, 1, 15).hours).toBe(11)
    expect(getTimezone(-28.17, 153.55, 2026, 1, 15).name).toBe('AEDT')
    expect(getTimezone(-28.17, 153.55, 2026, 6, 21).hours).toBe(10)
  })

  it('keeps Broken Hill on central time, with DST', () => {
    const hill = { lat: -31.956, lon: 141.465 }
    expect(getTimezone(hill.lat, hill.lon, 2026, 1, 15).name).toBe('ACDT')
    expect(getTimezone(hill.lat, hill.lon, 2026, 6, 21).name).toBe('ACST')
    expect(getTimezone(hill.lat, hill.lon, 2026, 1, 15).hours).toBe(10.5)
  })

  it('uses NZ DST from the last Sunday in September', () => {
    const welly = { lat: -41.29, lon: 174.78 }
    expect(getTimezone(welly.lat, welly.lon, 2026, 1, 15).name).toBe('NZDT')
    expect(getTimezone(welly.lat, welly.lon, 2026, 6, 21).name).toBe('NZST')
    expect(getTimezone(welly.lat, welly.lon, 2026, 9, 15).name).toBe('NZST')
    expect(getTimezone(welly.lat, welly.lon, 2026, 9, 27).name).toBe('NZDT')
  })

  it('puts the sun high at Bega solar noon in summer', () => {
    const lat = -36.68
    const lon = 149.84
    const tz = getTimezone(lat, lon, 2026, 12, 21)
    const sun = getSunPosition(lat, lon, 2026, 12, 21, 12, tz.hours)
    expect(sun.alt).toBeGreaterThan(70)
    expect(sun.az).toBeGreaterThan(0)
    expect(sun.az).toBeLessThan(360)
  })

  it('puts winter noon sun at Bega much lower', () => {
    const lat = -36.68
    const lon = 149.84
    const tz = getTimezone(lat, lon, 2026, 6, 21)
    const sun = getSunPosition(lat, lon, 2026, 6, 21, 12, tz.hours)
    expect(sun.alt).toBeGreaterThan(20)
    expect(sun.alt).toBeLessThan(45)
  })

  it('computes known flat-awning reach', () => {
    expect(awningEndHeight(2.7, 3, 0)).toBe(2.7)

    const fullShade = sunReach({
      length: 3,
      heightWall: 2.7,
      slopeDeg: 0,
      doorHeight: 2.2,
      profile: 45,
      behind: false,
    })
    expect(fullShade.status).toBe('full-shade')
    expect(fullShade.reach).toBe(0)
    expect(fullShade.awningEnter).toBeCloseTo(2.7 / Math.tan(toRad(45)), 12)

    const enters = sunReach({
      length: 1,
      heightWall: 2.7,
      slopeDeg: 0,
      doorHeight: 2.2,
      profile: 30,
      behind: false,
    })
    const expected = 2.7 / Math.tan(toRad(30)) - 1
    expect(enters.status).toBe('enters')
    expect(enters.reach).toBeCloseTo(expected, 12)
    expect(enters.awningEnter).toBeCloseTo(1, 12)
  })

  it('drops the outer edge on a sloped awning', () => {
    const h = awningEndHeight(2.7, 3, 10)
    const expected = 2.7 - 3 * Math.tan(toRad(10))
    expect(h).toBeCloseTo(expected, 12)
    expect(h).toBeLessThan(2.7)
    expect(h).toBeGreaterThan(2.1)
    expect(rafterLength(3, 10)).toBeCloseTo(3 / Math.cos(toRad(10)), 12)
  })

  it('flags a steep slope that hits the ground', () => {
    const r = sunReach({
      length: 4,
      heightWall: 2,
      slopeDeg: 30,
      doorHeight: 2,
      profile: 40,
      behind: false,
    })
    expect(r.heightEnd).toBeLessThan(0)
    expect(r.status).toBe('invalid-end')
  })

  it('limits a high short awning by the door head', () => {
    const r = sunReach({
      length: 0.4,
      heightWall: 3.2,
      slopeDeg: 0,
      doorHeight: 2.2,
      profile: 25,
      behind: false,
    })
    expect(r.status).toBe('door-limited')
    expect(r.reach).toBeCloseTo(2.2 / Math.tan(toRad(25)), 12)
    expect(r.awningEnter).toBeCloseTo(0.4, 12)
  })

  it('measures sun walking in under the awning from the outer edge', () => {
    const high = sunReach({
      length: 3,
      heightWall: 2.7,
      slopeDeg: 0,
      doorHeight: 2.2,
      profile: 50,
      behind: false,
    })
    expect(high.status).toBe('full-shade')
    expect(high.awningEnter).toBeCloseTo(2.7 / Math.tan(toRad(50)), 12)
    expect(high.awningEnter).toBeLessThan(3)

    const raking = sunReach({
      length: 3,
      heightWall: 2.7,
      slopeDeg: 0,
      doorHeight: 2.2,
      profile: 20,
      behind: false,
    })
    expect(raking.awningEnter).toBeCloseTo(3, 12)
    expect(raking.reach).toBeGreaterThan(0)
  })

  it('counts floor plus back-wall height when the beam hits the back wall', () => {
    const r = sunReach({
      length: 2,
      heightWall: 3,
      slopeDeg: 0,
      doorHeight: 2.5,
      profile: 20,
      behind: false,
      roomDepth: 2,
    })
    expect(r.status).toBe('enters')
    expect(r.rawReach).toBeGreaterThan(2)
    expect(r.hitsBack).toBe(true)
    expect(r.backWallHeight).toBeCloseTo((r.rawReach - 2) * Math.tan(toRad(20)), 12)
    expect(r.reach).toBeCloseTo(2 + r.backWallHeight, 12)
    expect(r.reach).toBeLessThan(r.rawReach)
  })

  it('does not let a grazing ray explode into hundreds of indoor metres', () => {
    const r = sunReach({
      length: 3,
      heightWall: 3,
      slopeDeg: 0,
      doorHeight: 2,
      profile: 0.5,
      behind: false,
      roomDepth: 10,
    })
    expect(r.hitsBack).toBe(true)
    expect(r.rawReach).toBeGreaterThan(50)
    expect(r.reach).toBeLessThan(20)
    expect(r.reach).toBeGreaterThan(10)
    expect(r.backWallHeight).toBeLessThan(3.1)
  })

  it('uses only floor metres when the house is deeper than the ray', () => {
    const dims = {
      length: 1,
      heightWall: 3,
      slopeDeg: 0,
      doorHeight: 2.2,
      profile: 15,
      behind: false,
    }
    const shallow = sunReach({ ...dims, roomDepth: 4 })
    const deep = sunReach({ ...dims, roomDepth: 20 })
    expect(shallow.hitsBack).toBe(true)
    expect(deep.hitsBack).toBe(false)
    expect(deep.reach).toBeCloseTo(deep.rawReach, 12)
    expect(shallow.reach).toBeCloseTo(4 + shallow.backWallHeight, 12)
    expect(shallow.backWallHeight).toBeGreaterThan(0)
    expect(deep.backWallHeight).toBe(0)
  })

  it('flags hitsBack against a 10 m house when width is omitted', () => {
    const r = sunReach({
      length: 0.4,
      heightWall: 3,
      slopeDeg: 0,
      doorHeight: 2.2,
      profile: 8,
      behind: false,
    })
    expect(r.rawReach).toBeGreaterThan(10)
    expect(r.hitsBack).toBe(true)
    expect(r.reach).toBeCloseTo(10 + r.backWallHeight, 12)
    expect(r.reach).toBeLessThan(r.rawReach)
  })

  it('matches profile to atan(tan(alt)/cos(azDiff)) off-axis', () => {
    const p = profileAngle(32, 25, 0)
    expect(p.onFacade).toBe(true)
    expect(p.profile).toBeCloseTo(
      (180 / Math.PI) * Math.atan(Math.tan(toRad(32)) / Math.cos(toRad(25))),
      12,
    )
  })

  it('gives no indoor sun when the sun is behind the wall', () => {
    const r = sunReach({
      length: 3,
      heightWall: 2.7,
      slopeDeg: 5,
      doorHeight: 2.2,
      profile: 0,
      behind: true,
    })
    expect(r.status).toBe('off-facade')
    expect(r.reach).toBe(0)
    expect(r.heightEnd).toBeLessThan(2.7)
  })

  it('treats a 90° off-facade sun as not on the door', () => {
    const p = profileAngle(40, 90, 0)
    expect(p.behind).toBe(true)
    expect(p.onFacade).toBe(false)
    expect(p.azDiff).toBe(90)
    expect(p.reason).toBe('off-facade')
  })

  it('blocks early-morning summer SE sun on a NNE door at Bega', () => {
    const lat = -36.68
    const lon = 149.84
    const tz = getTimezone(lat, lon, 2026, 12, 21)
    const sun = getSunPosition(lat, lon, 2026, 12, 21, 6 + 10 / 60, tz.hours)
    expect(sun.alt).toBeGreaterThan(0)
    expect(sun.az).toBeGreaterThan(100)
    expect(sun.az).toBeLessThan(130)
    const p = profileAngle(sun.alt, sun.az, 22)
    expect(p.onFacade).toBe(false)
    expect(p.reason).toBe('off-facade')
  })

  it('lets midday summer sun through a NNE door at Bega', () => {
    const lat = -36.68
    const lon = 149.84
    const tz = getTimezone(lat, lon, 2026, 12, 21)
    const sun = getSunPosition(lat, lon, 2026, 12, 21, 13, tz.hours)
    const p = profileAngle(sun.alt, sun.az, 22)
    expect(sun.alt).toBeGreaterThan(60)
    expect(p.onFacade).toBe(true)
  })

  it('matches profile to altitude when the sun is square-on', () => {
    const p = profileAngle(35, 0, 0)
    expect(p.behind).toBe(false)
    expect(p.onFacade).toBe(true)
    expect(p.profile).toBeCloseTo(35, 12)
  })

  it('finds sunrise and sunset for Bega on 1 Aug', () => {
    const lat = -36.68
    const lon = 149.84
    const tz = getTimezone(lat, lon, 2026, 8, 1)
    const day = getDaylight(lat, lon, 2026, 8, 1, tz.hours)
    expect(day.polar).toBeNull()
    expect(day.sunriseMin).toBeGreaterThan(6 * 60 + 20)
    expect(day.sunriseMin).toBeLessThan(7 * 60 + 30)
    expect(day.sunsetMin).toBeGreaterThan(16 * 60 + 40)
    expect(day.sunsetMin).toBeLessThan(17 * 60 + 50)
    expect(day.sunriseMin).toBeLessThan(9 * 60)
    expect(day.sunsetMin).toBeGreaterThan(9 * 60)

    const atRise = getSunPosition(lat, lon, 2026, 8, 1, day.sunriseMin / 60, tz.hours)
    const atSet = getSunPosition(lat, lon, 2026, 8, 1, day.sunsetMin / 60, tz.hours)
    expect(Math.abs(atRise.alt)).toBeLessThan(1.2)
    expect(Math.abs(atSet.alt)).toBeLessThan(1.2)
  })

  it('gives a shorter day in June than in December at Bega', () => {
    const lat = -36.68
    const lon = 149.84
    const tzJun = getTimezone(lat, lon, 2026, 6, 21)
    const tzDec = getTimezone(lat, lon, 2026, 12, 21)
    const winter = getDaylight(lat, lon, 2026, 6, 21, tzJun.hours)
    const summer = getDaylight(lat, lon, 2026, 12, 21, tzDec.hours)
    expect(winter.sunsetMin - winter.sunriseMin).toBeLessThan(summer.sunsetMin - summer.sunriseMin)
    expect(winter.sunriseMin).toBeGreaterThan(summer.sunriseMin)
  })

  it('clamps clock time to the daylight window', () => {
    const day = { sunriseMin: 400, sunsetMin: 1000, polar: null } as const
    expect(clampToDaylight(200, day)).toBe(400)
    expect(clampToDaylight(1400, day)).toBe(1000)
    expect(clampToDaylight(720, day)).toBe(720)
    expect(clampToDaylight(720, { sunriseMin: 0, sunsetMin: 0, polar: 'night' })).toBe(0)
    expect(clampToDaylight(720, { sunriseMin: 0, sunsetMin: 1439, polar: 'day' })).toBe(720)
  })

  it('reports polar night and polar day', () => {
    const night = getDaylight(80, 20, 2026, 12, 21, 1)
    const day = getDaylight(80, 20, 2026, 6, 21, 2)
    expect(night.polar).toBe('night')
    expect(day.polar).toBe('day')
  })

  it('gives full intensity when the sun is square-on to a vertical door', () => {
    expect(facadeIntensity(0, 0)).toBeCloseTo(1, 12)
    expect(facadeIntensity(60, 0)).toBeCloseTo(0.5, 12)
    expect(facadeIntensity(0, 90)).toBe(0)
    expect(facadeIntensity(-5, 0)).toBe(0)
  })

  it('makes morning beam much weaker than a high sun', () => {
    expect(relativeBeam(8)).toBeLessThan(0.55)
    expect(relativeBeam(35)).toBeGreaterThan(relativeBeam(8) * 1.3)
    expect(heatKwPerM(8, 0, 2)).toBeLessThan(heatKwPerM(35, 0, 2) * 0.7)
    expect(heatKwPerM(8, 0, 2)).toBeLessThan(1.2)
  })

  it('gives winter daily indoor sun to a north door, none to a south door, at Bega', () => {
    const lat = -36.68
    const lon = 149.84
    const tz = getTimezone(lat, lon, 2026, 6, 21)
    const day = getDaylight(lat, lon, 2026, 6, 21, tz.hours)
    const dims = {
      lat,
      lon,
      year: 2026,
      month: 6,
      day: 21,
      tzHours: tz.hours,
      length: 1.5,
      heightWall: 3,
      slopeDeg: 0,
      doorHeight: 2,
      roomDepth: 5,
      sunriseMin: day.sunriseMin,
      sunsetMin: day.sunsetMin,
      stepMin: 5,
    }
    const north = computeDailySun({ ...dims, facing: 0 })
    const south = computeDailySun({ ...dims, facing: 180 })
    expect(north.heatKwh).toBeGreaterThan(0.5)
    expect(north.maxReach).toBeGreaterThan(0)
    expect(south.heatKwh).toBeLessThan(0.05)
    expect(north.hoursInside).toBeGreaterThan(south.hoursInside)
  })

  it('does not spike daily indoor sun on a grazing winter morning', () => {
    const lat = -36.68
    const lon = 149.84
    const tz = getTimezone(lat, lon, 2026, 6, 21)
    const day = getDaylight(lat, lon, 2026, 6, 21, tz.hours)
    const daily = computeDailySun({
      lat,
      lon,
      year: 2026,
      month: 6,
      day: 21,
      tzHours: tz.hours,
      facing: 0,
      length: 3,
      heightWall: 3,
      slopeDeg: 5,
      doorHeight: 2,
      roomDepth: 10,
      sunriseMin: day.sunriseMin,
      sunsetMin: day.sunsetMin,
      stepMin: 5,
    })
    expect(daily.heatKwh).toBeGreaterThan(0.5)
    expect(daily.maxReach).toBeLessThan(25)
    expect(daily.heatKwh).toBeLessThan(80)
  })

  it('splits daylight into leftover-aware intervals and does not count sunset twice', () => {
    const slots = daylightIntervals(600, 610, 6)
    expect(slots).toEqual([
      { sampleMin: 603, dtMin: 6 },
      { sampleMin: 608, dtMin: 4 },
    ])
    expect(slots.reduce((s, x) => s + x.dtMin, 0)).toBe(10)
    expect(daylightIntervals(600, 600, 5)).toEqual([])
  })

  it('builds a day curve whose area is near the daily indoor sun', () => {
    const lat = -36.68
    const lon = 149.84
    const tz = getTimezone(lat, lon, 2026, 6, 21)
    const day = getDaylight(lat, lon, 2026, 6, 21, tz.hours)
    const sample = {
      lat,
      lon,
      year: 2026,
      month: 6,
      day: 21,
      tzHours: tz.hours,
      facing: 0,
      length: 1.5,
      heightWall: 3,
      slopeDeg: 0,
      doorHeight: 2,
      roomDepth: 5,
      sunriseMin: day.sunriseMin,
      sunsetMin: day.sunsetMin,
      stepMin: 10,
    }
    const curve = computeDayCurve(sample)
    const daily = computeDailySun(sample)
    const slots = daylightIntervals(sample.sunriseMin, sample.sunsetMin, 10)
    const area = curve.reduce((s, p, i) => s + p.heatKw * ((slots[i]?.dtMin ?? 0) / 60), 0)
    expect(curve.length).toBeGreaterThan(10)
    expect(curve.length).toBe(slots.length)
    expect(area).toBeCloseTo(daily.heatKwh, 5)
    expect(Math.max(...curve.map((p) => p.heatKw))).toBeGreaterThan(0)
    const lit = curve.filter((p) => p.heatKw > 0)
    expect(lit.length).toBeGreaterThan(4)
    const morning = lit.slice(0, Math.max(1, Math.floor(lit.length * 0.2)))
    const high = lit.slice(Math.floor(lit.length * 0.4), Math.ceil(lit.length * 0.6))
    const morningHeat = Math.max(...morning.map((p) => p.heatKw))
    const highHeat = Math.max(...high.map((p) => p.heatKw))
    const morningReach = Math.max(...morning.map((p) => p.reach))
    const highReach = Math.max(...high.map((p) => p.reach))
    expect(morningHeat).toBeLessThan(highHeat * 0.7)
    expect(morningReach).toBeGreaterThan(highReach * 0.8)
  })

  it('builds a year series that ignores clock time and stays non-negative', () => {
    const series = computeYearlySun({
      lat: -36.68,
      lon: 149.84,
      year: 2026,
      facing: 0,
      length: 1.5,
      heightWall: 3,
      slopeDeg: 0,
      doorHeight: 2,
      roomDepth: 5,
      dayStep: 14,
      timeStep: 15,
    })
    expect(series.length).toBeGreaterThan(20)
    expect(series[0].dayOfYear).toBe(1)
    expect(series.every((p) => p.heatKwh >= 0)).toBe(true)
    expect(Math.max(...series.map((p) => p.heatKwh))).toBeGreaterThan(0.2)
  })

  it('keeps a year of daily indoor sun free of grazing spikes', () => {
    const series = computeYearlySun({
      lat: -33.856784,
      lon: 151.215297,
      year: 2026,
      facing: 0,
      length: 3,
      heightWall: 3,
      slopeDeg: 5,
      doorHeight: 2,
      roomDepth: 10,
      dayStep: 1,
      timeStep: 5,
    })
    const live = series.filter((p) => p.heatKwh > 1)
    expect(live.length).toBeGreaterThan(20)
    expect(Math.max(...series.map((p) => p.heatKwh))).toBeLessThan(80)
    let worst = 0
    for (let i = 1; i < series.length; i++) {
      const a = series[i - 1].heatKwh
      const b = series[i].heatKwh
      if (a < 2 && b < 2) continue
      const rel = Math.abs(b - a) / Math.max(a, b, 1)
      if (rel > worst) worst = rel
    }
    expect(worst).toBeLessThan(0.45)
  })

  it('cuts yearly indoor sun a lot when the awning is very long', () => {
    const base = {
      lat: -36.68,
      lon: 149.84,
      year: 2026,
      facing: 0,
      heightWall: 3,
      slopeDeg: 5,
      doorHeight: 2,
      roomDepth: 5,
      dayStep: 15,
      timeStep: 15,
    }
    const short = computeYearlySun({ ...base, length: 2 })
    const long = computeYearlySun({ ...base, length: 10 })
    const shortPeak = Math.max(...short.map((p) => p.heatKwh))
    const longPeak = Math.max(...long.map((p) => p.heatKwh))
    const shortYear = yearSeriesArea(short)
    const longYear = yearSeriesArea(long)
    expect(shortPeak).toBeGreaterThan(2)
    expect(longPeak).toBeLessThan(shortPeak)
    expect(longYear).toBeLessThan(shortYear * 0.75)
  })

  it('interpolates a year series and integrates its area', () => {
    const series = [
      { dayOfYear: 1, heatKwh: 2, hoursInside: 1, maxReach: 1 },
      { dayOfYear: 5, heatKwh: 4, hoursInside: 1, maxReach: 1 },
      { dayOfYear: 9, heatKwh: 0, hoursInside: 0, maxReach: 0 },
    ]
    expect(lerpYearDose(series, 1)).toBe(2)
    expect(lerpYearDose(series, 3)).toBe(3)
    expect(lerpYearDose(series, 9)).toBe(0)
    expect(yearSeriesPeak(series)).toBe(4)
    expect(yearSeriesArea(series)).toBeCloseTo(21, 12)
    expect(yearSeriesArea([])).toBe(0)
  })

  it('rounds a year-peak to a clean static axis top', async () => {
    const { niceChartMax } = await import('./chartFrame')
    expect(niceChartMax(27)).toBe(30)
    expect(niceChartMax(14.5)).toBe(20)
    expect(niceChartMax(0)).toBe(2)
  })

  it('converts an instant to civil clock time at Bega', () => {
    const lat = -36.68
    const lon = 149.84
    const noonAedt = siteCivilNow(lat, lon, new Date('2026-01-15T01:00:00.000Z'))
    expect(noonAedt.dayOfYear).toBe(15)
    expect(noonAedt.timeMinutes).toBe(720)
    const noonAest = siteCivilNow(lat, lon, new Date('2026-06-21T02:00:00.000Z'))
    expect(noonAest.dayOfYear).toBe(172)
    expect(noonAest.timeMinutes).toBe(720)
  })

  it('uses the same off-facade headline in the section and the readout', () => {
    expect(
      reachHeadline({
        heightEnd: 2.6,
        drop: 0.4,
        rafter: 4,
        yWall: null,
        reach: 0,
        rawReach: 0,
        hitsBack: false,
        backWallHeight: 0,
        awningEnter: 0,
        openingM: 0,
        status: 'off-facade',
        message: 'around',
      }),
    ).toBe('Not through the door')
  })

  it('wraps facing labels at 360', () => {
    expect(formatFacing(0).name).toBe('N')
    expect(formatFacing(360).name).toBe('N')
    expect(formatFacing(90).name).toBe('E')
    expect(formatFacing(180).label).toBe('S (180°)')
  })
})
