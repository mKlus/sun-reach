import type {
  CalendarDate,
  DailySun,
  Daylight,
  SunReach,
  ProfileAngle,
  SunPosition,
  TimeOfDay,
  Timezone,
} from './solar'
import {
  awningDrop,
  awningEndHeight,
  awningWallHeight,
  clamp,
  clampToDaylight,
  computeDailySun,
  dateFromDayOfYear,
  dayOfYearOn,
  daysInYear,
  formatTime,
  getDaylight,
  getSunPosition,
  getTimezone,
  heatKwPerM,
  profileAngle,
  siteCivilNow,
  sunReach,
  wrapDegrees,
} from './solar'

export const WALL_HEIGHT_MIN = 1.8
export const WALL_HEIGHT_MAX = 5
export const END_HEIGHT_MIN = 0.3
export const END_HEIGHT_MAX = 5
export const PROJECTION_MIN = 0.3
export const PROJECTION_MAX = 12
export const SLOPE_MIN = 0
export const SLOPE_MAX = 35
export const DOOR_HEIGHT_MIN = 1
export const DOOR_HEIGHT_MAX = 3.6
export const ROOM_DEPTH_MIN = 4
export const ROOM_DEPTH_MAX = 20
/** Default eave-reference awning — dashed year-chart curve. */
export const EAVE_REFERENCE_M = 0.6
export const EAVE_HEIGHT_DEFAULT = 2.3
export const HOUSE_ROOF_SLOPE_DEFAULT = 15
export const HOUSE_ROOF_SLOPE_MIN = 5
export const HOUSE_ROOF_SLOPE_MAX = 35

export const YEAR = new Date().getFullYear()
/** Fallback site when the browser will not share a location. */
export const OPERA_HOUSE = { lat: -33.856784, lon: 151.215297 } as const
export const STORAGE_KEY = 'sun-reach-v5'
const LEGACY_STORAGE_KEYS = ['sun-penetration-v4', 'sun-penetration-v3'] as const
/** v3 default. Lifted once when migrating to the 10 m house. */
const LEGACY_ROOM_DEPTH_M = 5

export type Inputs = {
  lat: number
  lon: number
  facing: number
  dayOfYear: number
  timeMinutes: number
  projection: number
  heightWall: number
  slope: number
  doorHeight: number
  roomDepth: number
  eaveProjection: number
  eaveHeightWall: number
  houseRoofSlope: number
  placeLabel: string
  compareProjection: number | null
  compareHeightWall: number | null
  compareSlope: number | null
}

export type CalcModel = {
  year: number
  facing: number
  dayOfYear: number
  length: number
  heightWall: number
  slopeDeg: number
  doorHeight: number
  roomDepth: number
  eaveProjection: number
  eaveHeightWall: number
  houseRoofSlope: number
  date: CalendarDate
  time: TimeOfDay
  tz: Timezone
  sun: SunPosition
  sunRise: SunPosition | null
  sunSet: SunPosition | null
  prof: ProfileAngle
  reach: SunReach
  /** Incoming heat now, kW per metre of glass width. */
  heatKw: number
  daylight: Daylight
  daily: DailySun
}

type Stored = {
  lat: number
  lon: number
  facing: number
  date: number
  time: number
  al: number
  ah: number
  slope: number
  dh: number
  rd: number
  ep?: number
  eh?: number
  hrs?: number
  place?: string
  cp?: number | null
  cah?: number | null
  cs?: number | null
}

export const DEFAULT_INPUTS: Inputs = {
  lat: OPERA_HOUSE.lat,
  lon: OPERA_HOUSE.lon,
  facing: 0,
  dayOfYear: dayOfYearOn(YEAR, 8, 1),
  timeMinutes: 9 * 60,
  projection: 3,
  heightWall: 3,
  slope: 5,
  doorHeight: 2,
  roomDepth: 10,
  eaveProjection: EAVE_REFERENCE_M,
  eaveHeightWall: EAVE_HEIGHT_DEFAULT,
  houseRoofSlope: HOUSE_ROOF_SLOPE_DEFAULT,
  placeLabel: 'Sydney Opera House',
  compareProjection: null,
  compareHeightWall: null,
  compareSlope: null,
}

/** Reset button: stock geometry, door north, clock = civil now at the site. */
export function resetInputs(now = new Date(), site = OPERA_HOUSE): Inputs {
  return applyDaylightClamp({
    ...DEFAULT_INPUTS,
    lat: site.lat,
    lon: site.lon,
    ...siteCivilNow(site.lat, site.lon, now),
  })
}

function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n)
}

function fromStored(raw: Stored): Inputs {
  return {
    lat: raw.lat,
    lon: raw.lon,
    facing: raw.facing,
    dayOfYear: raw.date,
    timeMinutes: raw.time,
    projection: raw.al,
    heightWall: raw.ah,
    slope: raw.slope,
    doorHeight: raw.dh,
    roomDepth: raw.rd,
    eaveProjection: raw.ep ?? DEFAULT_INPUTS.eaveProjection,
    eaveHeightWall: raw.eh ?? DEFAULT_INPUTS.eaveHeightWall,
    houseRoofSlope: raw.hrs ?? DEFAULT_INPUTS.houseRoofSlope,
    placeLabel: raw.place?.trim() ? raw.place : DEFAULT_INPUTS.placeLabel,
    compareProjection: raw.cp ?? null,
    compareHeightWall: raw.cah ?? null,
    compareSlope: raw.cs ?? null,
  }
}

function toStored(inputs: Inputs): Stored {
  return {
    lat: inputs.lat,
    lon: inputs.lon,
    facing: inputs.facing,
    date: inputs.dayOfYear,
    time: inputs.timeMinutes,
    al: inputs.projection,
    ah: inputs.heightWall,
    slope: inputs.slope,
    dh: inputs.doorHeight,
    rd: inputs.roomDepth,
    ep: inputs.eaveProjection,
    eh: inputs.eaveHeightWall,
    hrs: inputs.houseRoofSlope,
    place: inputs.placeLabel,
    cp: inputs.compareProjection,
    cah: inputs.compareHeightWall,
    cs: inputs.compareSlope,
  }
}

export function hasStoredInputs(): boolean {
  try {
    return Boolean(localStorage.getItem(STORAGE_KEY) || LEGACY_STORAGE_KEYS.some((k) => localStorage.getItem(k)))
  } catch {
    return false
  }
}

export function loadInputs(): Inputs {
  try {
    const current = localStorage.getItem(STORAGE_KEY)
    const legacy = current
      ? null
      : LEGACY_STORAGE_KEYS.map((k) => localStorage.getItem(k)).find(Boolean) ?? null
    const raw = current ?? legacy
    if (!raw) return DEFAULT_INPUTS
    const parsed = JSON.parse(raw) as Partial<Stored>
    const merged = { ...toStored(DEFAULT_INPUTS), ...parsed }
    if (
      !isFiniteNumber(merged.lat) ||
      !isFiniteNumber(merged.lon) ||
      !isFiniteNumber(merged.facing)
    ) {
      return DEFAULT_INPUTS
    }
    const next = fromStored(merged)
    if (legacy && parsed.rd === LEGACY_ROOM_DEPTH_M) {
      next.roomDepth = DEFAULT_INPUTS.roomDepth
    }
    return clampInputs(next)
  } catch {
    return DEFAULT_INPUTS
  }
}

export function saveInputs(inputs: Inputs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStored(inputs)))
  } catch {
    /* quota / private mode */
  }
}

export function daylightFor(inputs: Inputs, year = YEAR): Daylight {
  const date = dateFromDayOfYear(year, inputs.dayOfYear)
  const tz = getTimezone(inputs.lat, inputs.lon, date.year, date.month, date.day)
  return getDaylight(inputs.lat, inputs.lon, date.year, date.month, date.day, tz.hours)
}

export function applyDaylightClamp(inputs: Inputs, year = YEAR): Inputs {
  const daylight = daylightFor(inputs, year)
  const timeMinutes = clampToDaylight(inputs.timeMinutes, daylight)
  if (timeMinutes === inputs.timeMinutes) return inputs
  return { ...inputs, timeMinutes }
}

/** Same min/max as the sliders. */
export function clampInputs(inputs: Inputs, year = YEAR): Inputs {
  return applyDaylightClamp({
    ...inputs,
    lat: clamp(inputs.lat, -90, 90),
    lon: clamp(inputs.lon, -180, 180),
    facing: wrapDegrees(Math.round(inputs.facing)),
    dayOfYear: clamp(Math.round(inputs.dayOfYear), 1, daysInYear(year)),
    projection: clamp(inputs.projection, PROJECTION_MIN, PROJECTION_MAX),
    heightWall: clamp(inputs.heightWall, WALL_HEIGHT_MIN, WALL_HEIGHT_MAX),
    slope: clamp(inputs.slope, SLOPE_MIN, SLOPE_MAX),
    doorHeight: clamp(inputs.doorHeight, DOOR_HEIGHT_MIN, DOOR_HEIGHT_MAX),
    roomDepth: clamp(inputs.roomDepth, ROOM_DEPTH_MIN, ROOM_DEPTH_MAX),
    eaveProjection: clamp(inputs.eaveProjection, PROJECTION_MIN, PROJECTION_MAX),
    eaveHeightWall: clamp(inputs.eaveHeightWall, WALL_HEIGHT_MIN, WALL_HEIGHT_MAX),
    houseRoofSlope: clamp(inputs.houseRoofSlope, HOUSE_ROOF_SLOPE_MIN, HOUSE_ROOF_SLOPE_MAX),
    compareProjection:
      inputs.compareProjection == null
        ? null
        : clamp(inputs.compareProjection, PROJECTION_MIN, PROJECTION_MAX),
    compareHeightWall:
      inputs.compareHeightWall == null
        ? null
        : clamp(inputs.compareHeightWall, WALL_HEIGHT_MIN, WALL_HEIGHT_MAX),
    compareSlope:
      inputs.compareSlope == null ? null : clamp(inputs.compareSlope, SLOPE_MIN, SLOPE_MAX),
  }, year)
}

export type InstantModel = Omit<CalcModel, 'daily'>

/** Sun, rise/set, profile, and reach for the current clock. No daily integral. */
export function computeInstant(inputs: Inputs, year = YEAR): InstantModel {
  const date = dateFromDayOfYear(year, inputs.dayOfYear)
  const tz = getTimezone(inputs.lat, inputs.lon, date.year, date.month, date.day)
  const daylight = getDaylight(inputs.lat, inputs.lon, date.year, date.month, date.day, tz.hours)
  const time = formatTime(clampToDaylight(inputs.timeMinutes, daylight))
  const sun = getSunPosition(
    inputs.lat,
    inputs.lon,
    date.year,
    date.month,
    date.day,
    time.decimal,
    tz.hours,
  )
  const hasHorizon = daylight.polar === null
  const sunRise = hasHorizon
    ? getSunPosition(
        inputs.lat,
        inputs.lon,
        date.year,
        date.month,
        date.day,
        daylight.sunriseMin / 60,
        tz.hours,
      )
    : null
  const sunSet = hasHorizon
    ? getSunPosition(
        inputs.lat,
        inputs.lon,
        date.year,
        date.month,
        date.day,
        daylight.sunsetMin / 60,
        tz.hours,
      )
    : null
  const prof = profileAngle(sun.alt, sun.az, inputs.facing)
  const reach = sunReach({
    length: inputs.projection,
    heightWall: inputs.heightWall,
    slopeDeg: inputs.slope,
    doorHeight: inputs.doorHeight,
    roomDepth: inputs.roomDepth,
    profile: prof.profile,
    behind: prof.behind,
    blockReason: prof.reason,
    sunAz: sun.az,
    facing: inputs.facing,
    azRel: prof.azRel,
  })

  return {
    year,
    facing: inputs.facing,
    dayOfYear: inputs.dayOfYear,
    length: inputs.projection,
    heightWall: inputs.heightWall,
    slopeDeg: inputs.slope,
    doorHeight: inputs.doorHeight,
    roomDepth: inputs.roomDepth,
    eaveProjection: inputs.eaveProjection,
    eaveHeightWall: inputs.eaveHeightWall,
    houseRoofSlope: inputs.houseRoofSlope,
    date,
    time,
    tz,
    sun,
    sunRise,
    sunSet,
    prof,
    reach,
    heatKw: heatKwPerM(sun.alt, prof.azDiff, reach.openingM),
    daylight,
  }
}

export function computeModel(inputs: Inputs, year = YEAR, opts?: { dailyStep?: number }): CalcModel {
  const instant = computeInstant(inputs, year)
  const daily = computeDailySun({
    lat: inputs.lat,
    lon: inputs.lon,
    year: instant.date.year,
    month: instant.date.month,
    day: instant.date.day,
    tzHours: instant.tz.hours,
    facing: inputs.facing,
    length: inputs.projection,
    heightWall: inputs.heightWall,
    slopeDeg: inputs.slope,
    doorHeight: inputs.doorHeight,
    roomDepth: inputs.roomDepth,
    sunriseMin: instant.daylight.sunriseMin,
    sunsetMin: instant.daylight.sunsetMin,
    stepMin: opts?.dailyStep ?? 1,
  })
  return { ...instant, daily }
}

export function setHeightWall(inputs: Inputs, heightWall: number): Inputs {
  return {
    ...inputs,
    heightWall: clamp(heightWall, WALL_HEIGHT_MIN, WALL_HEIGHT_MAX),
  }
}

/** Keep the roof slope; slide the wall attachment so the outer edge sits at heightEnd. */
export function setHeightEnd(inputs: Inputs, heightEnd: number): Inputs {
  const drop = awningDrop(inputs.projection, inputs.slope)
  let wall = awningWallHeight(heightEnd, inputs.projection, inputs.slope)
  wall = clamp(wall, WALL_HEIGHT_MIN, WALL_HEIGHT_MAX)
  let end = awningEndHeight(wall, inputs.projection, inputs.slope)
  if (end < END_HEIGHT_MIN) {
    wall = clamp(END_HEIGHT_MIN + drop, WALL_HEIGHT_MIN, WALL_HEIGHT_MAX)
    end = awningEndHeight(wall, inputs.projection, inputs.slope)
  }
  if (end > END_HEIGHT_MAX) {
    wall = clamp(END_HEIGHT_MAX + drop, WALL_HEIGHT_MIN, WALL_HEIGHT_MAX)
  }
  return { ...inputs, heightWall: wall }
}
