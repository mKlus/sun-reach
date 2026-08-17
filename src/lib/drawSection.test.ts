import { describe, expect, it } from 'vitest'
import { houseRoofRiseM, layoutSection, sectionPalette } from './drawSection'
import { DEFAULT_INPUTS, YEAR, computeModel, type CalcModel } from './model'
import { sunReach } from './solar'

describe('section palette', () => {
  it('uses a dusk sky in dark and a paper sky in light', () => {
    const dark = sectionPalette('dark')
    const light = sectionPalette('light')
    expect(dark.sky0).not.toBe(light.sky0)
    expect(dark.sky0.startsWith('#1') || dark.sky0.startsWith('#0')).toBe(true)
    expect(light.chipText).not.toBe(dark.chipText)
    expect(dark.indoor).not.toBe(light.indoor)
  })
})

describe('section layout', () => {
  const view = { w: 1100, h: 520 }

  it('lands the grazing ray on the same floor point as the enter band', () => {
    const model = computeModel(DEFAULT_INPUTS, YEAR)
    const L = layoutSection(model, view.w, view.h)
    expect(model.reach.status).toBe('enters')
    expect(L.shadeFloorX).not.toBeNull()
    const fromWall = L.wallX + model.reach.reach * L.scale
    expect(L.shadeFloorX!).toBeCloseTo(fromWall, 5)
    expect(L.shadeFloorX!).toBeGreaterThan(L.innerX)
    expect(L.shadeFloorX!).toBeLessThanOrEqual(L.backX + 0.01)
  })

  it('draws the house eave and starts the awning at the wall above it', () => {
    const model = computeModel(DEFAULT_INPUTS, YEAR)
    const L = layoutSection(model, view.w, view.h)
    const mid = (L.wallX + L.backX) / 2
    expect(L.ridgeX).toBeCloseTo(mid, 5)
    expect(L.eaveY).toBeCloseTo(L.groundY - model.eaveHeightWall * L.scale, 5)
    expect(L.eaveOutX).toBeCloseTo(L.wallX - model.eaveProjection * L.scale, 5)
    expect(L.eaveBackX).toBeCloseTo(L.backX + model.eaveProjection * L.scale, 5)
    expect(L.attachY).toBeCloseTo(L.groundY - model.heightWall * L.scale, 5)
    expect(L.attachY).toBeLessThan(L.eaveY)
    expect(L.attachX).toBeCloseTo(L.wallX, 5)
    expect(L.eaveTopY).toBeLessThan(L.eaveY)
    expect(L.ridgeY).toBeLessThan(L.eaveTopY)
    expect(L.eaveOutX).toBeGreaterThan(0)
    expect(L.eaveOutX).toBeLessThan(L.wallX)
    expect(L.eaveBackX).toBeLessThan(view.w)
    expect(L.ridgeX).toBeGreaterThan(L.wallX)
    expect(L.wallX - L.eaveOutX).toBeCloseTo(L.eaveBackX - L.backX, 5)
    expect(L.roofAtWallY).toBeLessThan(L.eaveTopY)
    expect(L.roofAtWallY).toBeGreaterThan(L.ridgeY)
    expect(L.attachY).toBeLessThan(L.roofAtWallY)
    const rise = houseRoofRiseM(model.roomDepth, model.eaveProjection, model.houseRoofSlope)
    expect(L.eaveTopY - L.ridgeY).toBeCloseTo(rise * L.scale, 5)
  })

  it('sits the awning post just inside the outer fascia', () => {
    const model = computeModel(DEFAULT_INPUTS, YEAR)
    const L = layoutSection(model, view.w, view.h)
    expect(L.postX).toBeGreaterThan(L.tipX + L.postW / 2)
    expect(L.postX).toBeLessThan(L.attachX)
    expect(L.postTopY).toBeGreaterThanOrEqual(Math.min(L.tipY, L.attachY) - 0.5)
    expect(L.postTopY).toBeLessThanOrEqual(Math.max(L.tipY, L.attachY) + 0.5)
  })

  it('uses the door head as the ray when the awning does not shade the opening', () => {
    const reach = sunReach({
      length: 0.6,
      heightWall: 3,
      slopeDeg: 0,
      doorHeight: 2,
      profile: 45,
      behind: false,
      roomDepth: 5,
    })
    expect(reach.status).toBe('door-limited')

    const base = computeModel(DEFAULT_INPUTS, YEAR)
    const model: CalcModel = {
      ...base,
      length: 0.6,
      heightWall: 3,
      slopeDeg: 0,
      doorHeight: 2,
      roomDepth: 5,
      reach,
      prof: {
        behind: false,
        onFacade: true,
        azDiff: 0,
        azRel: 0,
        profile: 45,
        reason: null,
      },
    }
    const L = layoutSection(model, view.w, view.h)
    expect(L.rayOriginX).toBeCloseTo(L.wallX, 5)
    expect(L.rayOriginY).toBeCloseTo(L.doorTopY, 5)
    const raw = L.wallX + (L.groundY - L.doorTopY) / L.tanP
    expect(L.shadeFloorX).toBeCloseTo(Math.min(L.backX, raw), 5)
    expect(L.awningOriginX).toBeCloseTo(L.tipX, 5)
    expect(L.awningOriginY).toBeCloseTo(L.tipY, 5)
    expect(L.awningEndX).toBeCloseTo(L.wallX, 5)
    expect(L.awningEndY).toBeCloseTo(L.groundY - (reach.yWall ?? 0) * L.scale, 5)
    expect(L.awningFloorX).toBeCloseTo(L.tipX + reach.awningEnter * L.scale, 5)
  })

  it('drops the grazing ray on the patio when the house is in full shade', () => {
    const reach = sunReach({
      length: 3,
      heightWall: 2.7,
      slopeDeg: 0,
      doorHeight: 2.2,
      profile: 45,
      behind: false,
      roomDepth: 10,
    })
    expect(reach.status).toBe('full-shade')
    expect(reach.awningEnter).toBeGreaterThan(0)
    expect(reach.awningEnter).toBeLessThan(3)

    const base = computeModel(DEFAULT_INPUTS, YEAR)
    const model: CalcModel = {
      ...base,
      length: 3,
      heightWall: 2.7,
      slopeDeg: 0,
      doorHeight: 2.2,
      reach,
      prof: {
        behind: false,
        onFacade: true,
        azDiff: 0,
        azRel: 0,
        profile: 45,
        reason: null,
      },
    }
    const L = layoutSection(model, view.w, view.h)
    expect(L.awningOriginX).toBeCloseTo(L.tipX, 5)
    expect(L.awningOriginY).toBeCloseTo(L.tipY, 5)
    expect(L.awningEndX).toBeCloseTo(L.tipX + reach.awningEnter * L.scale, 5)
    expect(L.awningEndY).toBeCloseTo(L.groundY, 5)
    expect(L.awningEndX!).toBeLessThan(L.wallX - 1)
    expect(L.shadeFloorX).toBeNull()
  })

  it('does not clip the door or door-limited ray to the eave height', () => {
    const base = computeModel(
      { ...DEFAULT_INPUTS, doorHeight: 2.5, eaveHeightWall: 2.3, heightWall: 3 },
      YEAR,
    )
    const L = layoutSection(base, view.w, view.h)
    expect(L.doorTopY).toBeCloseTo(L.groundY - 2.5 * L.scale, 5)
    expect(L.doorTopY).toBeLessThan(L.eaveY)
    expect(L.eaveY).toBeCloseTo(L.groundY - 2.3 * L.scale, 5)
  })

  it('stops the shade line at the back wall when reach is capped', () => {
    const base = computeModel(DEFAULT_INPUTS, YEAR)
    const model: CalcModel = {
      ...base,
      roomDepth: 2,
      reach: {
        ...base.reach,
        reach: 8,
        rawReach: 8,
        hitsBack: true,
        backWallHeight: 1.2,
        status: 'enters',
      },
      prof: { ...base.prof, behind: false, profile: 8, onFacade: true },
    }
    const L = layoutSection(model, view.w, view.h)
    expect(L.shadeFloorX).toBeCloseTo(L.backX, 5)
    expect(L.shadeHitX).toBeCloseTo(L.backX, 5)
    expect(L.shadeHitY).toBeCloseTo(L.groundY - 1.2 * L.scale, 5)
    expect(L.shadeHitY!).toBeLessThan(L.groundY - 1)
  })
})
