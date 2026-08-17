import { describe, expect, it } from 'vitest'
import { yearSeriesCsv } from './yearCsv'

describe('yearSeriesCsv', () => {
  it('writes peak, year total, and daily rows', () => {
    const series = [
      { dayOfYear: 1, heatKwh: 2, hoursInside: 1, maxReach: 1 },
      { dayOfYear: 6, heatKwh: 4, hoursInside: 1, maxReach: 1 },
    ]
    const eave = [
      { dayOfYear: 1, heatKwh: 3, hoursInside: 1, maxReach: 1 },
      { dayOfYear: 6, heatKwh: 5, hoursInside: 1, maxReach: 1 },
    ]
    const csv = yearSeriesCsv(2026, series, eave, [])
    expect(csv).toContain('Peak day,,4.000,5.000,')
    expect(csv).toContain('Year total,,18.000,24.000,')
    expect(csv).toContain('1,')
    expect(csv).toContain('2.000,3.000,')
  })
})
