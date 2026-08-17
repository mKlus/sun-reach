import { describe, expect, it } from 'vitest'
import { monotoneCubicPath, type LinePt } from './chartFrame'

function sampleCubic(p0: LinePt, c1: LinePt, c2: LinePt, p1: LinePt, t: number): LinePt {
  const u = 1 - t
  const a = u * u * u
  const b = 3 * u * u * t
  const c = 3 * u * t * t
  const d = t * t * t
  return {
    x: a * p0.x + b * c1.x + c * c2.x + d * p1.x,
    y: a * p0.y + b * c1.y + c * c2.y + d * p1.y,
  }
}

function parseCubics(d: string): Array<{ p0: LinePt; c1: LinePt; c2: LinePt; p1: LinePt }> {
  const nums = [...d.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]))
  const segs = []
  let i = 0
  let cur = { x: nums[i++], y: nums[i++] }
  while (i < nums.length) {
    const c1 = { x: nums[i++], y: nums[i++] }
    const c2 = { x: nums[i++], y: nums[i++] }
    const p1 = { x: nums[i++], y: nums[i++] }
    segs.push({ p0: cur, c1, c2, p1 })
    cur = p1
  }
  return segs
}

describe('monotoneCubicPath', () => {
  it('is empty for no points and a move for one', () => {
    expect(monotoneCubicPath([])).toBe('')
    expect(monotoneCubicPath([{ x: 1, y: 2 }])).toBe('M 1.00 2.00')
  })

  it('uses a straight segment for two points', () => {
    expect(monotoneCubicPath([{ x: 0, y: 0 }, { x: 4, y: 2 }])).toBe('M 0.00 0.00 L 4.00 2.00')
  })

  it('passes through every sample', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 3, y: 1 },
    ]
    const segs = parseCubics(monotoneCubicPath(pts))
    expect(segs).toHaveLength(3)
    expect(segs[0].p0).toEqual({ x: 0, y: 0 })
    expect(segs[0].p1).toEqual({ x: 1, y: 2 })
    expect(segs[1].p1).toEqual({ x: 2, y: 2 })
    expect(segs[2].p1).toEqual({ x: 3, y: 1 })
  })

  it('does not overshoot a zero valley or a flat run', () => {
    const pts = [
      { x: 0, y: 2 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
      { x: 4, y: 2 },
    ]
    const segs = parseCubics(monotoneCubicPath(pts))
    for (const seg of segs) {
      for (const t of [0.25, 0.5, 0.75]) {
        const p = sampleCubic(seg.p0, seg.c1, seg.c2, seg.p1, t)
        expect(p.y).toBeGreaterThanOrEqual(-1e-9)
      }
    }
  })
})
