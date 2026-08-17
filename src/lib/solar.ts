export type CalendarDate = {
  year: number
  month: number
  day: number
  dayOfYear: number
}

export type Timezone = {
  hours: number
  name: string
  label: string
}

export type SunPosition = {
  alt: number
  az: number
  decl: number
  hourAngle: number
  eot: number
}

export type ProfileReason = 'below-horizon' | 'off-facade' | 'parallel'

export type ProfileAngle = {
  behind: boolean
  onFacade: boolean
  azDiff: number
  /** Signed azimuth of the sun minus door facing, −180…180. Clockwise is positive. */
  azRel: number
  profile: number
  reason: ProfileReason | null
}

export type ReachStatus =
  | 'invalid-end'
  | 'none'
  | 'off-facade'
  | 'low'
  | 'full-shade'
  | 'no-opening'
  | 'door-limited'
  | 'enters'

export type SunReach = {
  heightEnd: number
  drop: number
  rafter: number
  yWall: number | null
  reach: number
  rawReach: number
  hitsBack: boolean
  /** Height of the sun patch on the back wall, metres. 0 if the ray still hits the floor. */
  backWallHeight: number
  /** Floor distance from the outer fascia inward that is in sun under the awning. */
  awningEnter: number
  status: ReachStatus
  message: string
}

export type TimeOfDay = {
  hours: number
  minutes: number
  decimal: number
  label: string
}

export type FacingLabel = {
  deg: number
  name: string
  label: string
}

export function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

export function toDeg(rad: number): number {
  return (rad * 180) / Math.PI
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n))
}

/** Compass degrees into 0…360. */
export function wrapDegrees(deg: number): number {
  return ((deg % 360) + 360) % 360
}

/** Signed angle into −180…180. */
export function wrapSigned180(deg: number): number {
  return ((deg + 180) % 360 + 360) % 360 - 180
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

export function daysInYear(year: number): number {
  return isLeapYear(year) ? 366 : 365
}

/** dayOfYear is 1-based (1 = 1 Jan). */
export function dateFromDayOfYear(year: number, dayOfYear: number): CalendarDate {
  const doy = clamp(Math.round(dayOfYear), 1, daysInYear(year))
  const dt = new Date(Date.UTC(year, 0, doy))
  return {
    year: dt.getUTCFullYear(),
    month: dt.getUTCMonth() + 1,
    day: dt.getUTCDate(),
    dayOfYear: doy,
  }
}

export function dayOfYearOn(year: number, month: number, day: number): number {
  const start = Date.UTC(year, 0, 1)
  const dt = Date.UTC(year, month - 1, day)
  return 1 + Math.round((dt - start) / 86400000)
}

function firstSundayOfMonth(year: number, monthIndex: number): number {
  const d = new Date(Date.UTC(year, monthIndex, 1))
  const dow = d.getUTCDay()
  return dow === 0 ? 1 : 8 - dow
}

function lastSundayOfMonth(year: number, monthIndex: number): number {
  const last = new Date(Date.UTC(year, monthIndex + 1, 0))
  return last.getUTCDate() - last.getUTCDay()
}

/** Broken Hill / Yancowinna uses central time east of the 141° meridian. */
function isBrokenHill(lat: number, lon: number): boolean {
  return lat <= -31.3 && lat >= -32.4 && lon >= 141 && lon <= 141.7
}

/**
 * SA + NT + Broken Hill. Western QLD (Mount Isa, Cloncurry, Birdsville) is
 * east of 138° and north of 26°S — that strip stays on AEST.
 */
function isCentralAustralia(lat: number, lon: number): boolean {
  if (isBrokenHill(lat, lon)) return true
  if (lon < 129 || lon >= 141) return false
  if (lon < 138) return true
  return lat <= -26
}

/**
 * QLD keeps AEST year-round. NSW/Vic/Tas use AEDT.
 * Crude walk of the QLD/NSW border: 29°S, then the Granite Belt, then
 * Point Danger (~28.16°S) on the coast.
 */
function isQueenslandNoDst(lat: number, lon: number): boolean {
  if (lon < 141) return lat > -26
  if (lon < 151.3) return lat > -29
  if (lon < 152.4) return lat > -28.9
  if (lon < 153.15) return lat > -28.25
  return lat > -28.16
}

function isAustralianEasternDst(year: number, month: number, day: number): boolean {
  const startDay = firstSundayOfMonth(year, 9)
  const endDay = firstSundayOfMonth(year, 3)
  if (month > 10 || month < 4) return true
  if (month < 10 && month > 4) return false
  if (month === 10) return day >= startDay
  if (month === 4) return day < endDay
  return false
}

/**
 * Civil timezone at lat/lon for a given date.
 * Australia (east/central DST, Broken Hill central) and New Zealand DST;
 * everywhere else uses a longitude estimate.
 */
export function getTimezone(
  lat: number,
  lon: number,
  year: number,
  month: number,
  day: number,
): Timezone {
  if (lat <= -10 && lat >= -45 && lon >= 112 && lon <= 154.5) {
    if (lon < 129) {
      return { hours: 8, name: 'AWST', label: 'UTC+8 AWST' }
    }
    if (isCentralAustralia(lat, lon)) {
      if (lat > -26) {
        return { hours: 9.5, name: 'ACST', label: 'UTC+9:30 ACST' }
      }
      const dst = isAustralianEasternDst(year, month, day)
      return dst
        ? { hours: 10.5, name: 'ACDT', label: 'UTC+10:30 ACDT' }
        : { hours: 9.5, name: 'ACST', label: 'UTC+9:30 ACST' }
    }
    if (isQueenslandNoDst(lat, lon)) {
      return { hours: 10, name: 'AEST', label: 'UTC+10 AEST' }
    }
    const dst = isAustralianEasternDst(year, month, day)
    return dst
      ? { hours: 11, name: 'AEDT', label: 'UTC+11 AEDT' }
      : { hours: 10, name: 'AEST', label: 'UTC+10 AEST' }
  }

  if (lat <= -33 && lat >= -48 && lon >= 166 && lon <= 179) {
    const startDay = lastSundayOfMonth(year, 8)
    const endDay = firstSundayOfMonth(year, 3)
    let dst = false
    if (month > 9 || month < 4) dst = true
    else if (month === 9) dst = day >= startDay
    else if (month === 4) dst = day < endDay
    return dst
      ? { hours: 13, name: 'NZDT', label: 'UTC+13 NZDT' }
      : { hours: 12, name: 'NZST', label: 'UTC+12 NZST' }
  }

  const hours = Math.round(lon / 15)
  const sign = hours >= 0 ? '+' : '−'
  const abs = Math.abs(hours)
  return {
    hours,
    name: `UTC${hours >= 0 ? '+' : '-'}${abs}`,
    label: `UTC${sign}${abs} (from longitude)`,
  }
}

function julianDay(year: number, month: number, day: number, hourUt: number): number {
  let y = year
  let m = month
  if (m <= 2) {
    y -= 1
    m += 12
  }
  const A = Math.floor(y / 100)
  const B = 2 - A + Math.floor(A / 4)
  return (
    Math.floor(365.25 * (y + 4716)) +
    Math.floor(30.6001 * (m + 1)) +
    day +
    B -
    1524.5 +
    hourUt / 24
  )
}

/**
 * NOAA-style solar altitude / azimuth.
 * Azimuth: 0° = north, clockwise (90° = east).
 * hourLocal is decimal hours in the location's civil time.
 */
export function getSunPosition(
  lat: number,
  lon: number,
  year: number,
  month: number,
  day: number,
  hourLocal: number,
  tzHours: number,
): SunPosition {
  const hourUt = hourLocal - tzHours
  const jd = julianDay(year, month, day, hourUt)
  const T = (jd - 2451545.0) / 36525

  const L0 = (280.46646 + T * (36000.76983 + T * 0.0003032)) % 360
  const M = 357.52911 + T * (35999.05029 - 0.0001537 * T)
  const Mr = toRad(M)
  const C =
    Math.sin(Mr) * (1.914602 - T * (0.004817 + 0.000014 * T)) +
    Math.sin(2 * Mr) * (0.019993 - 0.000101 * T) +
    Math.sin(3 * Mr) * 0.000289
  const trueLong = L0 + C
  const omega = 125.04 - 1934.136 * T
  const lambda = trueLong - 0.00569 - 0.00478 * Math.sin(toRad(omega))
  const eps0 = 23.439291 - T * (0.013004167 + T * (1.63889e-7 - T * 5.0361e-7))
  const eps = eps0 + 0.00256 * Math.cos(toRad(omega))
  const decl = toDeg(Math.asin(clamp(Math.sin(toRad(eps)) * Math.sin(toRad(lambda)), -1, 1)))

  const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T)
  const y = Math.pow(Math.tan(toRad(eps / 2)), 2)
  const eot = 4 * toDeg(
    y * Math.sin(2 * toRad(L0)) -
      2 * e * Math.sin(Mr) +
      4 * e * y * Math.sin(Mr) * Math.cos(2 * toRad(L0)) -
      0.5 * y * y * Math.sin(4 * toRad(L0)) -
      1.25 * e * e * Math.sin(2 * Mr),
  )

  const solarTimeMin = hourLocal * 60 + 4 * (lon - 15 * tzHours) + eot
  const hra = wrapSigned180(15 * (solarTimeMin / 60 - 12))

  const latR = toRad(lat)
  const decR = toRad(decl)
  const hraR = toRad(hra)
  const sinAlt =
    Math.sin(latR) * Math.sin(decR) + Math.cos(latR) * Math.cos(decR) * Math.cos(hraR)
  const alt = toDeg(Math.asin(clamp(sinAlt, -1, 1)))

  const cosAlt = Math.cos(toRad(alt))
  const cosLat = Math.cos(latR)
  let az = 0
  if (Math.abs(cosAlt) < 1e-8 || Math.abs(cosLat) < 1e-8) {
    az = hra >= 0 ? 270 : 90
  } else {
    const cosAz = (Math.sin(decR) - Math.sin(toRad(alt)) * Math.sin(latR)) / (cosAlt * cosLat)
    az = toDeg(Math.acos(clamp(cosAz, -1, 1)))
    if (Math.sin(hraR) > 0) az = 360 - az
  }

  return {
    alt,
    az: (az + 360) % 360,
    decl,
    hourAngle: hra,
    eot,
  }
}

export type Daylight = {
  sunriseMin: number
  sunsetMin: number
  polar: 'day' | 'night' | null
}

/**
 * Civil sunrise / sunset in clock minutes past midnight.
 * Uses a -0.833° geometric altitude (disk + refraction).
 */
export function getDaylight(
  lat: number,
  lon: number,
  year: number,
  month: number,
  day: number,
  tzHours: number,
): Daylight {
  const noon = getSunPosition(lat, lon, year, month, day, 12, tzHours)
  const latR = toRad(lat)
  const decR = toRad(noon.decl)
  const denom = Math.cos(latR) * Math.cos(decR)
  if (Math.abs(denom) < 1e-12) {
    return noon.alt > 0
      ? { sunriseMin: 0, sunsetMin: 1439, polar: 'day' }
      : { sunriseMin: 0, sunsetMin: 0, polar: 'night' }
  }

  const cosH = (Math.sin(toRad(-0.833)) - Math.sin(latR) * Math.sin(decR)) / denom
  if (cosH > 1) {
    return { sunriseMin: 0, sunsetMin: 0, polar: 'night' }
  }
  if (cosH < -1) {
    return { sunriseMin: 0, sunsetMin: 1439, polar: 'day' }
  }

  const hourAngleDeg = toDeg(Math.acos(clamp(cosH, -1, 1)))
  const offset = 4 * (lon - 15 * tzHours) + noon.eot
  const sunriseMin = Math.round((12 - hourAngleDeg / 15) * 60 - offset)
  const sunsetMin = Math.round((12 + hourAngleDeg / 15) * 60 - offset)
  const rise = clamp(sunriseMin, 0, 1439)
  const set = clamp(sunsetMin, 0, 1439)
  if (set <= rise) {
    return { sunriseMin: rise, sunsetMin: rise, polar: 'night' }
  }
  return { sunriseMin: rise, sunsetMin: set, polar: null }
}

export function clampToDaylight(timeMin: number, daylight: Daylight): number {
  if (daylight.polar === 'night') return daylight.sunriseMin
  if (daylight.polar === 'day') return clamp(timeMin, 0, 1439)
  return clamp(timeMin, daylight.sunriseMin, daylight.sunsetMin)
}

/** Shortest signed yaw from facing to the sun, −180…180, clockwise positive. */
export function signedAzimuthDiff(az: number, facing: number): number {
  return wrapSigned180(az - facing)
}

/**
 * Vertical profile angle on a section perpendicular to the wall.
 * facing: degrees clockwise from north that the glass faces.
 * Sun reaches the glass only while it is in the outward hemisphere (azDiff < 90°).
 */
export function profileAngle(alt: number, az: number, facing: number): ProfileAngle {
  const azRel = signedAzimuthDiff(az, facing)
  const azDiff = Math.abs(azRel)
  if (alt <= 0) {
    return { behind: true, onFacade: false, azDiff, azRel, profile: 0, reason: 'below-horizon' }
  }
  if (azDiff >= 90) {
    return { behind: true, onFacade: false, azDiff, azRel, profile: 0, reason: 'off-facade' }
  }
  const cosD = Math.cos(toRad(azDiff))
  if (cosD < 1e-6) {
    return { behind: true, onFacade: false, azDiff, azRel, profile: 0, reason: 'parallel' }
  }
  const profile = toDeg(Math.atan(Math.tan(toRad(alt)) / cosD))
  return { behind: false, onFacade: true, azDiff, azRel, profile, reason: null }
}

export function offFacadeMessage(az: number, facing: number, azRel: number): string {
  const sunName = formatFacing(az).name
  const doorName = formatFacing(facing).name
  const side = azRel > 0 ? 'clockwise' : 'anticlockwise'
  return `Sun is ${sunName}, door faces ${doorName} — around the ${side} side of the house, not through the glass`
}

/**
 * Positive slopeDeg = roof falls away from the wall (typical drainage).
 * length is the horizontal projection from the wall, in metres.
 */
export function awningDrop(length: number, slopeDeg: number): number {
  return length * Math.tan(toRad(slopeDeg))
}

export function awningEndHeight(heightWall: number, length: number, slopeDeg: number): number {
  return heightWall - awningDrop(length, slopeDeg)
}

export function awningWallHeight(heightEnd: number, length: number, slopeDeg: number): number {
  return heightEnd + awningDrop(length, slopeDeg)
}

export function rafterLength(length: number, slopeDeg: number): number {
  const c = Math.cos(toRad(slopeDeg))
  if (Math.abs(c) < 1e-8) return Number.POSITIVE_INFINITY
  return length / c
}

export type ReachInput = {
  length: number
  heightWall: number
  slopeDeg: number
  doorHeight: number
  profile: number
  behind: boolean
  blockReason?: ProfileReason | null
  sunAz?: number
  facing?: number
  azRel?: number
  roomDepth?: number
}

/**
 * How far the sun patch reaches across the indoor floor, in metres.
 * Door is a floor-to-head glass opening in the wall plane.
 * If the geometric floor hit is past the back wall, leftover is counted
 * as the height of the sun patch on that wall — not more fake floor.
 */
export function sunReach(opts: ReachInput): SunReach {
  const { length, heightWall, slopeDeg, doorHeight, profile, behind } = opts

  const heightEnd = awningEndHeight(heightWall, length, slopeDeg)
  const drop = heightWall - heightEnd
  const rafter = rafterLength(length, slopeDeg)
  const depth = opts.roomDepth != null && opts.roomDepth > 0 ? opts.roomDepth : 10
  const base = {
    heightEnd,
    drop,
    rafter,
    yWall: null as number | null,
    reach: 0,
    rawReach: 0,
    hitsBack: false,
    backWallHeight: 0,
    awningEnter: 0,
  }

  if (heightEnd <= 0) {
    return { ...base, status: 'invalid-end', message: 'Awning end is at or below ground' }
  }
  if (behind) {
    if (opts.blockReason === 'below-horizon') {
      return { ...base, status: 'none', message: 'Sun is below the horizon' }
    }
    const message =
      opts.sunAz != null && opts.facing != null && opts.azRel != null
        ? offFacadeMessage(opts.sunAz, opts.facing, opts.azRel)
        : 'Sun is beside or behind the house — not through this door'
    return { ...base, status: 'off-facade', reach: 0, message }
  }
  if (!(profile > 0.05)) {
    return { ...base, awningEnter: length, status: 'low', message: 'Sun too low' }
  }

  const tanP = Math.tan(toRad(profile))
  const yWall = heightEnd - length * tanP
  base.yWall = yWall
  base.awningEnter = Math.min(length, Math.max(0, heightEnd / tanP))

  function finish(raw: number, extra: { status: ReachStatus; message: string; yWall?: number | null }) {
    const hitsBack = raw > depth
    // Floor metres up to the back wall, then the height of the patch on
    // that wall. Do not keep the virtual floor past the house — at low
    // sun 1/tan(profile) explodes and the year curve spikes.
    const backWallHeight = hitsBack ? (raw - depth) * tanP : 0
    const reach = hitsBack ? depth + backWallHeight : raw
    const message = hitsBack
      ? `${extra.message} Extra past the floor heats the back wall.`
      : extra.message
    return {
      ...base,
      yWall: extra.yWall !== undefined ? extra.yWall : base.yWall,
      rawReach: raw,
      reach,
      hitsBack,
      backWallHeight,
      status: extra.status,
      message,
    }
  }

  if (yWall <= 0) {
    return { ...base, status: 'full-shade', reach: 0, message: 'Full shade on the floor' }
  }

  const opening = Math.max(0, Math.min(doorHeight, heightWall))
  if (opening <= 0) {
    return { ...base, status: 'no-opening', reach: 0, message: 'Door height is zero' }
  }

  if (yWall >= opening) {
    return finish(opening / tanP, {
      status: 'door-limited',
      message: 'Awning does not shade the opening; limited by door head',
    })
  }

  return finish(yWall / tanP, {
    status: 'enters',
    message: 'Sun enters under the awning',
  })
}

/**
 * Face-on factor for a vertical door: 1 when the beam is square to the glass,
 * 0 when it only grazes or is beside the house. Equal to cos(incidence).
 * The user's (90° − angle) idea is the same quantity, scaled 0–1.
 */
export function facadeIntensity(alt: number, azDiff: number): number {
  if (alt < 0 || azDiff >= 90) return 0
  return Math.max(0, Math.cos(toRad(alt)) * Math.cos(toRad(azDiff)))
}

export type DailySun = {
  /** Metre-hours: Σ reach × face-on intensity × hours. */
  doseMh: number
  hoursInside: number
  maxReach: number
  maxAwningEnter: number
  hoursUnderAwning: number
  minProfile: number | null
  maxProfile: number | null
}

export type DailySunSample = {
  lat: number
  lon: number
  year: number
  month: number
  day: number
  tzHours: number
  facing: number
  length: number
  heightWall: number
  slopeDeg: number
  doorHeight: number
  roomDepth: number
  sunriseMin: number
  sunsetMin: number
  stepMin?: number
}

export type DaylightInterval = {
  /** Midpoint of the interval, in clock minutes. */
  sampleMin: number
  dtMin: number
}

/** Half-open [sunrise, sunset) split into steps; last slice keeps the leftover minutes. */
export function daylightIntervals(
  sunriseMin: number,
  sunsetMin: number,
  stepMin: number,
): DaylightInterval[] {
  const step = Math.max(1, Math.round(stepMin))
  const out: DaylightInterval[] = []
  if (sunsetMin <= sunriseMin) return out
  for (let start = sunriseMin; start < sunsetMin; start += step) {
    const dtMin = Math.min(step, sunsetMin - start)
    out.push({ sampleMin: start + dtMin / 2, dtMin })
  }
  return out
}

function observeDoor(sample: DailySunSample, mins: number) {
  const sun = getSunPosition(
    sample.lat,
    sample.lon,
    sample.year,
    sample.month,
    sample.day,
    mins / 60,
    sample.tzHours,
  )
  const prof = profileAngle(sun.alt, sun.az, sample.facing)
  const hit = sunReach({
    length: sample.length,
    heightWall: sample.heightWall,
    slopeDeg: sample.slopeDeg,
    doorHeight: sample.doorHeight,
    roomDepth: sample.roomDepth,
    profile: prof.profile,
    behind: prof.behind,
    blockReason: prof.reason,
  })
  const enters =
    (hit.status === 'enters' || hit.status === 'door-limited') && hit.reach > 0
  const intensity = enters ? facadeIntensity(sun.alt, prof.azDiff) : 0
  const indoorM = enters ? hit.reach : 0
  return { sun, prof, hit, enters, intensity, indoorM, indoor: indoorM * intensity }
}

export function computeDailySun(sample: DailySunSample): DailySun {
  let doseMh = 0
  let minutesInside = 0
  let minutesUnder = 0
  let maxReach = 0
  let maxAwningEnter = 0
  let minProfile: number | null = null
  let maxProfile: number | null = null

  for (const slot of daylightIntervals(sample.sunriseMin, sample.sunsetMin, sample.stepMin ?? 1)) {
    const obs = observeDoor(sample, slot.sampleMin)
    if (obs.hit.awningEnter > 0) {
      minutesUnder += slot.dtMin
      if (obs.hit.awningEnter > maxAwningEnter) maxAwningEnter = obs.hit.awningEnter
    }
    if (!obs.enters) continue
    doseMh += obs.indoor * (slot.dtMin / 60)
    minutesInside += slot.dtMin
    if (obs.indoorM > maxReach) maxReach = obs.indoorM
    minProfile = minProfile == null ? obs.prof.profile : Math.min(minProfile, obs.prof.profile)
    maxProfile = maxProfile == null ? obs.prof.profile : Math.max(maxProfile, obs.prof.profile)
  }

  return {
    doseMh,
    hoursInside: minutesInside / 60,
    maxReach,
    maxAwningEnter,
    hoursUnderAwning: minutesUnder / 60,
    minProfile,
    maxProfile,
  }
}

export type DaySunPoint = {
  minutes: number
  reach: number
  awningEnter: number
  intensity: number
  indoor: number
}

/** Indoor reach vs clock time for one day. Time slider is only a marker. */
export function computeDayCurve(sample: DailySunSample): DaySunPoint[] {
  return daylightIntervals(sample.sunriseMin, sample.sunsetMin, sample.stepMin ?? 5).map((slot) => {
    const obs = observeDoor(sample, slot.sampleMin)
    return {
      minutes: slot.sampleMin,
      reach: obs.indoorM,
      awningEnter: obs.hit.awningEnter,
      intensity: obs.intensity,
      indoor: obs.indoor,
    }
  })
}

export type YearSunPoint = {
  dayOfYear: number
  doseMh: number
  hoursInside: number
  maxReach: number
}

/** Daily m·h at a civil day, linear between year-series samples. */
export function lerpYearDose(series: YearSunPoint[], day: number): number {
  if (!series.length) return 0
  if (day <= series[0].dayOfYear) return series[0].doseMh
  const last = series[series.length - 1]
  if (day >= last.dayOfYear) return last.doseMh
  for (let i = 1; i < series.length; i++) {
    const a = series[i - 1]
    const b = series[i]
    if (day <= b.dayOfYear) {
      const t = (day - a.dayOfYear) / (b.dayOfYear - a.dayOfYear)
      return a.doseMh + (b.doseMh - a.doseMh) * t
    }
  }
  return last.doseMh
}

export function yearSeriesPeak(series: YearSunPoint[]): number {
  return series.reduce((m, p) => Math.max(m, p.doseMh), 0)
}

/** Sum of interpolated daily m·h from the first sample day through the last. */
export function yearSeriesArea(series: YearSunPoint[]): number {
  if (series.length === 0) return 0
  if (series.length === 1) return series[0].doseMh
  const first = series[0].dayOfYear
  const last = series[series.length - 1].dayOfYear
  let sum = 0
  for (let day = first; day <= last; day++) {
    sum += lerpYearDose(series, day)
  }
  return sum
}

export type YearSunSample = {
  lat: number
  lon: number
  year: number
  facing: number
  length: number
  heightWall: number
  slopeDeg: number
  doorHeight: number
  roomDepth: number
  dayStep?: number
  timeStep?: number
}

/** Daily indoor sun across the year. Independent of the date/time sliders. */
export function computeYearlySun(sample: YearSunSample): YearSunPoint[] {
  const dayStep = Math.max(1, Math.round(sample.dayStep ?? 2))
  const timeStep = Math.max(1, Math.round(sample.timeStep ?? 5))
  const last = daysInYear(sample.year)
  const points: YearSunPoint[] = []
  for (let doy = 1; doy <= last; doy += dayStep) {
    const date = dateFromDayOfYear(sample.year, doy)
    const tz = getTimezone(sample.lat, sample.lon, date.year, date.month, date.day)
    const daylight = getDaylight(
      sample.lat,
      sample.lon,
      date.year,
      date.month,
      date.day,
      tz.hours,
    )
    const daily = computeDailySun({
      lat: sample.lat,
      lon: sample.lon,
      year: date.year,
      month: date.month,
      day: date.day,
      tzHours: tz.hours,
      facing: sample.facing,
      length: sample.length,
      heightWall: sample.heightWall,
      slopeDeg: sample.slopeDeg,
      doorHeight: sample.doorHeight,
      roomDepth: sample.roomDepth,
      sunriseMin: daylight.sunriseMin,
      sunsetMin: daylight.sunsetMin,
      stepMin: timeStep,
    })
    points.push({
      dayOfYear: date.dayOfYear,
      doseMh: daily.doseMh,
      hoursInside: daily.hoursInside,
      maxReach: daily.maxReach,
    })
  }
  if (points[points.length - 1]?.dayOfYear !== last) {
    const date = dateFromDayOfYear(sample.year, last)
    const tz = getTimezone(sample.lat, sample.lon, date.year, date.month, date.day)
    const daylight = getDaylight(
      sample.lat,
      sample.lon,
      date.year,
      date.month,
      date.day,
      tz.hours,
    )
    const daily = computeDailySun({
      lat: sample.lat,
      lon: sample.lon,
      year: date.year,
      month: date.month,
      day: date.day,
      tzHours: tz.hours,
      facing: sample.facing,
      length: sample.length,
      heightWall: sample.heightWall,
      slopeDeg: sample.slopeDeg,
      doorHeight: sample.doorHeight,
      roomDepth: sample.roomDepth,
      sunriseMin: daylight.sunriseMin,
      sunsetMin: daylight.sunsetMin,
      stepMin: timeStep,
    })
    points.push({
      dayOfYear: last,
      doseMh: daily.doseMh,
      hoursInside: daily.hoursInside,
      maxReach: daily.maxReach,
    })
  }
  return points
}

const COMPASS = [
  'N',
  'NNE',
  'NE',
  'ENE',
  'E',
  'ESE',
  'SE',
  'SSE',
  'S',
  'SSW',
  'SW',
  'WSW',
  'W',
  'WNW',
  'NW',
  'NNW',
] as const

/** Civil day-of-year and clock minutes at the site, from an instant. */
export function siteCivilNow(
  lat: number,
  lon: number,
  now = new Date(),
): { dayOfYear: number; timeMinutes: number } {
  const utcY = now.getUTCFullYear()
  const utcM = now.getUTCMonth() + 1
  const utcD = now.getUTCDate()
  let tz = getTimezone(lat, lon, utcY, utcM, utcD)
  let shifted = new Date(now.getTime() + tz.hours * 3600 * 1000)
  const y = shifted.getUTCFullYear()
  const mo = shifted.getUTCMonth() + 1
  const d = shifted.getUTCDate()
  if (y !== utcY || mo !== utcM || d !== utcD) {
    tz = getTimezone(lat, lon, y, mo, d)
    shifted = new Date(now.getTime() + tz.hours * 3600 * 1000)
  }
  return {
    dayOfYear: dayOfYearOn(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth() + 1,
      shifted.getUTCDate(),
    ),
    timeMinutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
  }
}

export function reachHeadline(reach: SunReach): string {
  if (reach.status === 'enters' || reach.status === 'door-limited') {
    return reach.hitsBack ? `${metres(reach.reach)} incl. back wall` : metres(reach.reach)
  }
  if (reach.status === 'full-shade') return 'Full shade'
  if (reach.status === 'off-facade') return 'Not through the door'
  if (reach.status === 'invalid-end') return 'Check dimensions'
  return 'No direct sun'
}

export function awningHeadline(reach: SunReach, length: number): string {
  if (reach.awningEnter <= 0) return 'No sun under awning'
  if (length > 0 && reach.awningEnter >= length - 1e-9) return `${metres(reach.awningEnter)} full patio`
  return metres(reach.awningEnter)
}

export function formatFacing(deg: number): FacingLabel {
  const d = ((Math.round(deg) % 360) + 360) % 360
  const name = COMPASS[Math.round(d / 22.5) % 16] ?? 'N'
  return { deg: d, name, label: `${name} (${d}°)` }
}

export function formatDate(year: number, dayOfYear: number): CalendarDate & { label: string } {
  const { month, day } = dateFromDayOfYear(year, dayOfYear)
  const dt = new Date(Date.UTC(year, month - 1, day))
  const label = dt.toLocaleDateString('en-AU', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
  return { year, month, day, dayOfYear, label }
}

export function formatTime(mins: number): TimeOfDay {
  const total = clamp(Math.round(mins), 0, 1439)
  const h = Math.floor(total / 60)
  const m = total % 60
  return {
    hours: h,
    minutes: m,
    decimal: total / 60,
    label: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
  }
}

export function metres(n: number): string {
  return `${n.toFixed(2)} m`
}

export function degLabel(n: number): string {
  return `${n.toFixed(1)}°`
}
