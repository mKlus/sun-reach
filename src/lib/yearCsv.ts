import { formatDate, yearSeriesArea, yearSeriesPeak, type YearSunPoint } from './solar'

export function yearSeriesCsv(
  year: number,
  series: YearSunPoint[],
  eave: YearSunPoint[],
  compare: YearSunPoint[],
): string {
  const eaveByDay = new Map(eave.map((p) => [p.dayOfYear, p.doseMh]))
  const cmpByDay = new Map(compare.map((p) => [p.dayOfYear, p.doseMh]))
  const lines = [
    'Day,Date,This awning m·h,Eave m·h,Compare m·h',
    `Peak day,,${yearSeriesPeak(series).toFixed(3)},${yearSeriesPeak(eave).toFixed(3)},${
      compare.length ? yearSeriesPeak(compare).toFixed(3) : ''
    }`,
    `Year total,,${yearSeriesArea(series).toFixed(3)},${yearSeriesArea(eave).toFixed(3)},${
      compare.length ? yearSeriesArea(compare).toFixed(3) : ''
    }`,
    ...series.map((p) => {
      const label = formatDate(year, p.dayOfYear).label.replace(/,/g, '')
      const eaveV = eaveByDay.get(p.dayOfYear)
      const cmpV = cmpByDay.get(p.dayOfYear)
      return `${p.dayOfYear},${label},${p.doseMh.toFixed(3)},${
        eaveV == null ? '' : eaveV.toFixed(3)
      },${cmpV == null ? '' : cmpV.toFixed(3)}`
    }),
  ]
  return lines.join('\n')
}

export function downloadText(filename: string, text: string, type = 'text/csv'): void {
  const blob = new Blob([text], { type })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}
