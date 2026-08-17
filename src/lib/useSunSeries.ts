import { useMemo } from 'react'
import { niceChartMax } from './chartFrame'
import { computeInstant, YEAR, type CalcModel, type Inputs } from './model'
import {
  computeDailySun,
  computeDayCurve,
  computeYearlySun,
  daysInYear,
  type DaySunPoint,
  type YearSunPoint,
} from './solar'
import { useDebounced } from './useDebounced'
import { useIdleDailyStep } from './useIdleDailyStep'

export function useSunSeries(inputs: Inputs) {
  const dailyStep = useIdleDailyStep(
    [
      inputs.lat,
      inputs.lon,
      inputs.facing,
      inputs.dayOfYear,
      inputs.projection,
      inputs.heightWall,
      inputs.slope,
      inputs.doorHeight,
      inputs.roomDepth,
    ].join(','),
  )
  const instant = useMemo(() => computeInstant(inputs, YEAR), [inputs])
  const daily = useMemo(
    () =>
      computeDailySun({
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
        stepMin: dailyStep,
      }),
    [
      inputs.lat,
      inputs.lon,
      inputs.facing,
      inputs.projection,
      inputs.heightWall,
      inputs.slope,
      inputs.doorHeight,
      inputs.roomDepth,
      inputs.dayOfYear,
      instant.date.year,
      instant.date.month,
      instant.date.day,
      instant.tz.hours,
      instant.daylight.sunriseMin,
      instant.daylight.sunsetMin,
      dailyStep,
    ],
  )
  const model = useMemo((): CalcModel => ({ ...instant, daily }), [instant, daily])
  const yearInputs = useDebounced(
    {
      lat: inputs.lat,
      lon: inputs.lon,
      facing: inputs.facing,
      projection: inputs.projection,
      heightWall: inputs.heightWall,
      slope: inputs.slope,
      doorHeight: inputs.doorHeight,
      roomDepth: inputs.roomDepth,
      eaveProjection: inputs.eaveProjection,
      eaveHeightWall: inputs.eaveHeightWall,
      compareProjection: inputs.compareProjection,
      compareHeightWall: inputs.compareHeightWall,
      compareSlope: inputs.compareSlope,
    },
    220,
  )
  const yearSeries = useMemo(
    () =>
      computeYearlySun({
        lat: yearInputs.lat,
        lon: yearInputs.lon,
        year: YEAR,
        facing: yearInputs.facing,
        length: yearInputs.projection,
        heightWall: yearInputs.heightWall,
        slopeDeg: yearInputs.slope,
        doorHeight: yearInputs.doorHeight,
        roomDepth: yearInputs.roomDepth,
      }),
    [yearInputs],
  )
  const eaveYear = useMemo(
    () =>
      computeYearlySun({
        lat: yearInputs.lat,
        lon: yearInputs.lon,
        year: YEAR,
        facing: yearInputs.facing,
        length: yearInputs.eaveProjection,
        heightWall: yearInputs.eaveHeightWall,
        slopeDeg: 0,
        doorHeight: yearInputs.doorHeight,
        roomDepth: yearInputs.roomDepth,
      }),
    [
      yearInputs.lat,
      yearInputs.lon,
      yearInputs.facing,
      yearInputs.eaveProjection,
      yearInputs.eaveHeightWall,
      yearInputs.doorHeight,
      yearInputs.roomDepth,
    ],
  )
  const compareYear = useMemo((): YearSunPoint[] => {
    if (yearInputs.compareProjection == null) return []
    return computeYearlySun({
      lat: yearInputs.lat,
      lon: yearInputs.lon,
      year: YEAR,
      facing: yearInputs.facing,
      length: yearInputs.compareProjection,
      heightWall: yearInputs.compareHeightWall ?? yearInputs.heightWall,
      slopeDeg: yearInputs.compareSlope ?? 0,
      doorHeight: yearInputs.doorHeight,
      roomDepth: yearInputs.roomDepth,
    })
  }, [yearInputs])
  const yearAxisMax = useMemo(() => {
    const eavePeak = eaveYear.reduce((m, p) => Math.max(m, p.heatKwh), 0)
    const awningPeak = yearSeries.reduce((m, p) => Math.max(m, p.heatKwh), 0)
    const comparePeak = compareYear.reduce((m, p) => Math.max(m, p.heatKwh), 0)
    return niceChartMax(Math.max(eavePeak, awningPeak, comparePeak))
  }, [eaveYear, yearSeries, compareYear])
  const dayCurve = useMemo(
    (): DaySunPoint[] =>
      computeDayCurve({
        lat: inputs.lat,
        lon: inputs.lon,
        year: YEAR,
        month: model.date.month,
        day: model.date.day,
        tzHours: model.tz.hours,
        facing: inputs.facing,
        length: inputs.projection,
        heightWall: inputs.heightWall,
        slopeDeg: inputs.slope,
        doorHeight: inputs.doorHeight,
        roomDepth: inputs.roomDepth,
        sunriseMin: model.daylight.sunriseMin,
        sunsetMin: model.daylight.sunsetMin,
        stepMin: 5,
      }),
    [
      inputs.lat,
      inputs.lon,
      inputs.facing,
      inputs.projection,
      inputs.heightWall,
      inputs.slope,
      inputs.doorHeight,
      inputs.roomDepth,
      model.date.month,
      model.date.day,
      model.tz.hours,
      model.daylight.sunriseMin,
      model.daylight.sunsetMin,
    ],
  )

  return {
    model,
    dayCurve,
    yearSeries,
    eaveYear,
    compareYear,
    yearAxisMax,
    dayMax: daysInYear(YEAR),
  }
}
