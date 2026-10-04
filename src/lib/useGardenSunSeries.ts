import { useMemo } from 'react'
import { niceChartMax } from './chartFrame'
import {
  getGardenGrid,
  type GardenInputs,
} from './gardenModel'
import {
  computeGardenDailySun,
  computeGardenInstantSun,
  computeGardenYearlySun,
  type GardenDailySun,
  type GardenDayPoint,
  type GardenInstantSun,
  type GardenYearPoint,
} from './gardenSolar'
import { YEAR } from './model'
import {
  clampToDaylight,
  dateFromDayOfYear,
  daysInYear,
  formatTime,
  getDaylight,
  getSunPosition,
  getTimezone,
  type CalendarDate,
  type Daylight,
  type SunPosition,
  type TimeOfDay,
  type Timezone,
} from './solar'
import { useDebounced } from './useDebounced'

export type GardenCalcModel = {
  inputs: GardenInputs
  date: CalendarDate
  time: TimeOfDay
  tz: Timezone
  daylight: Daylight
  sun: SunPosition
  sunRise: SunPosition | null
  sunSet: SunPosition | null
  instant: GardenInstantSun
  daily: GardenDailySun
  dayCurve: GardenDayPoint[]
  yearSeries: GardenYearPoint[]
  yearAxisMax: number
  dayMax: number
}

export function useGardenSunSeries(inputs: GardenInputs): GardenCalcModel {
  const date = useMemo(() => dateFromDayOfYear(YEAR, inputs.dayOfYear), [inputs.dayOfYear])

  const tz = useMemo(
    () => getTimezone(inputs.lat, inputs.lon, date.year, date.month, date.day),
    [inputs.lat, inputs.lon, date.year, date.month, date.day],
  )

  const daylight = useMemo(
    () => getDaylight(inputs.lat, inputs.lon, date.year, date.month, date.day, tz.hours),
    [inputs.lat, inputs.lon, date.year, date.month, date.day, tz.hours],
  )

  const clampedMinutes = useMemo(
    () => clampToDaylight(inputs.timeMinutes, daylight),
    [inputs.timeMinutes, daylight],
  )

  const time = useMemo(() => formatTime(clampedMinutes), [clampedMinutes])

  const sun = useMemo(
    () =>
      getSunPosition(
        inputs.lat,
        inputs.lon,
        date.year,
        date.month,
        date.day,
        time.decimal,
        tz.hours,
      ),
    [inputs.lat, inputs.lon, date.year, date.month, date.day, time.decimal, tz.hours],
  )

  const hasHorizon = daylight.polar === null
  const sunRise = useMemo(
    () =>
      hasHorizon
        ? getSunPosition(
            inputs.lat,
            inputs.lon,
            date.year,
            date.month,
            date.day,
            daylight.sunriseMin / 60,
            tz.hours,
          )
        : null,
    [hasHorizon, inputs.lat, inputs.lon, date.year, date.month, date.day, daylight.sunriseMin, tz.hours],
  )

  const sunSet = useMemo(
    () =>
      hasHorizon
        ? getSunPosition(
            inputs.lat,
            inputs.lon,
            date.year,
            date.month,
            date.day,
            daylight.sunsetMin / 60,
            tz.hours,
          )
        : null,
    [hasHorizon, inputs.lat, inputs.lon, date.year, date.month, date.day, daylight.sunsetMin, tz.hours],
  )

  const gridCells = useMemo(() => getGardenGrid(inputs.garden, 8, 12), [inputs.garden])

  const instant = useMemo(
    () => computeGardenInstantSun(inputs.garden, inputs.tree, sun.alt, sun.az, gridCells),
    [inputs.garden, inputs.tree, sun.alt, sun.az, gridCells],
  )

  const daily = useMemo(
    () =>
      computeGardenDailySun({
        lat: inputs.lat,
        lon: inputs.lon,
        year: date.year,
        month: date.month,
        day: date.day,
        tzHours: tz.hours,
        garden: inputs.garden,
        tree: inputs.tree,
        sunriseMin: daylight.sunriseMin,
        sunsetMin: daylight.sunsetMin,
        stepMin: 5,
      }),
    [
      inputs.lat,
      inputs.lon,
      date.year,
      date.month,
      date.day,
      tz.hours,
      inputs.garden,
      inputs.tree,
      daylight.sunriseMin,
      daylight.sunsetMin,
    ],
  )

  const debouncedYearInputs = useDebounced(
    {
      lat: inputs.lat,
      lon: inputs.lon,
      garden: inputs.garden,
      tree: inputs.tree,
    },
    240,
  )

  const yearSeries = useMemo(
    () =>
      computeGardenYearlySun({
        lat: debouncedYearInputs.lat,
        lon: debouncedYearInputs.lon,
        year: YEAR,
        garden: debouncedYearInputs.garden,
        tree: debouncedYearInputs.tree,
        dayStep: 4,
        timeStep: 10,
      }),
    [debouncedYearInputs],
  )

  const yearAxisMax = useMemo(() => {
    const peakHours = yearSeries.reduce((m, p) => Math.max(m, p.directSunHoursAvg), 0)
    return niceChartMax(Math.max(8, peakHours))
  }, [yearSeries])

  return {
    inputs,
    date,
    time,
    tz,
    daylight,
    sun,
    sunRise,
    sunSet,
    instant,
    daily,
    dayCurve: daily.dayCurve,
    yearSeries,
    yearAxisMax,
    dayMax: daysInYear(YEAR),
  }
}
