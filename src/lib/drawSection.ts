import type { CalcModel } from './model'
import { toRad } from './solar'
import type { ThemeResolved } from './theme'
import { SECTION_PALETTE, type SectionPalette } from './tokens'

export type { SectionPalette }

const TYPE = '500 12px "IBM Plex Sans", "Segoe UI", system-ui, sans-serif'
const TYPE_SM = '500 11px "IBM Plex Sans", "Segoe UI", system-ui, sans-serif'

/** Visual wall only. Optical door plane is `wallX`. */
const WALL_THICK_PX = 8
const SLAB_M = 0.14
const POST_INSET_M = 0.12

export type SectionLayout = {
  scale: number
  groundY: number
  wallX: number
  innerX: number
  backX: number
  wallThick: number
  attachX: number
  attachY: number
  tipX: number
  tipY: number
  topAttachY: number
  topTipY: number
  doorTopY: number
  eaveOutX: number
  eaveBackX: number
  eaveY: number
  ridgeX: number
  ridgeY: number
  postX: number
  postW: number
  postTopY: number
  eaveTopY: number
  roofAtWallY: number
  tanP: number
  shadeFloorX: number | null
  shadeHitX: number | null
  shadeHitY: number | null
  rayOriginX: number
  rayOriginY: number
  awningOriginX: number
  awningOriginY: number
  awningEndX: number | null
  awningEndY: number | null
  awningFloorX: number | null
}

export function sectionPalette(theme: ThemeResolved): SectionPalette {
  return SECTION_PALETTE[theme]
}

/** Rise from eave tip to ridge: half the room plus the eave, at the house roof pitch. */
export function houseRoofRiseM(
  roomDepth: number,
  eaveProjection: number,
  slopeDeg: number,
): number {
  const run = roomDepth / 2 + Math.max(0.15, eaveProjection)
  return run * Math.tan(toRad(Math.max(0, slopeDeg)))
}

export function layoutSection(model: CalcModel, viewW: number, viewH: number): SectionLayout {
  const {
    length,
    heightWall,
    slopeDeg,
    doorHeight,
    roomDepth,
    eaveProjection,
    eaveHeightWall,
    houseRoofSlope,
    reach,
    prof,
  } = model
  const padL = 52
  const padR = 36
  const groundY = viewH - 70
  const usableH = groundY - 24
  const usableW = viewW - padL - padR
  const houseEave = Math.max(0.15, eaveProjection)
  const roofRise = houseRoofRiseM(roomDepth, houseEave, houseRoofSlope)
  const indoorNeed = roomDepth + houseEave + 0.35
  const outdoorNeed = Math.max(length, houseEave) + 0.55
  const heightNeed =
    Math.max(heightWall, eaveHeightWall, reach.heightEnd, doorHeight, 2.4) + roofRise + 0.2
  const scale = Math.min(usableW / (outdoorNeed + indoorNeed), usableH / heightNeed)

  const wallThick = WALL_THICK_PX
  const wallX = padL + outdoorNeed * scale
  const innerX = wallX + wallThick
  const backX = wallX + roomDepth * scale

  const Hend = reach.heightEnd * scale
  const H = heightWall * scale
  const D = Math.min(doorHeight, heightWall) * scale
  const L = length * scale
  const attachX = wallX
  const attachY = groundY - H
  const tipX = wallX - L
  const tipY = groundY - Hend
  const slopeR = toRad(Math.max(0, slopeDeg))
  const slabRise = Math.max(6, SLAB_M * scale) / Math.max(0.45, Math.cos(slopeR))
  const topAttachY = attachY - slabRise
  const topTipY = tipY - slabRise

  const eaveLen = houseEave * scale
  const eaveY = groundY - eaveHeightWall * scale
  const eaveSlab = Math.max(5, SLAB_M * scale)
  const eaveTopY = eaveY - eaveSlab
  const eaveOutX = wallX - eaveLen
  const eaveBackX = backX + eaveLen
  const ridgeX = (wallX + backX) / 2
  const ridgeY = eaveTopY - roofRise * scale
  const roofRun = ridgeX - eaveOutX
  const tWall = roofRun === 0 ? 0 : (wallX - eaveOutX) / roofRun
  const roofAtWallY = eaveTopY + tWall * (ridgeY - eaveTopY)

  const postW = Math.max(3.5, 0.09 * scale)
  const postX = tipX + Math.max(postW + 1, POST_INSET_M * scale)
  const span = attachX - tipX
  const postT = span === 0 ? 0 : Math.min(1, Math.max(0, (postX - tipX) / span))
  const postTopY = tipY + postT * (attachY - tipY)

  const tanP = prof.profile > 0.05 ? Math.tan(toRad(prof.profile)) : 0
  const doorTopY = groundY - D

  let shadeFloorX: number | null = null
  let shadeHitX: number | null = null
  let shadeHitY: number | null = null
  let rayOriginX = tipX
  let rayOriginY = tipY
  let awningEndX: number | null = null
  let awningEndY: number | null = null
  let awningFloorX: number | null = null
  if (reach.heightEnd > 0 && !prof.behind && tanP > 0) {
    const fromTip = (groundY - tipY) / tanP
    const patioHitX = tipX + fromTip
    if (reach.awningEnter > 0) {
      awningFloorX = tipX + reach.awningEnter * scale
    }

    if (reach.status === 'door-limited') {
      rayOriginX = wallX
      rayOriginY = doorTopY
      shadeFloorX = wallX + D / tanP
      const wallHitY = groundY - Math.max(0, (reach.yWall ?? 0) * scale)
      awningEndX = wallX
      awningEndY = wallHitY
    } else if (reach.status === 'enters') {
      rayOriginX = tipX
      rayOriginY = tipY
      shadeFloorX = patioHitX
      awningEndX = Math.min(backX, patioHitX)
      awningEndY = groundY
    } else {
      awningEndX = patioHitX
      awningEndY = groundY
    }
    if (shadeFloorX != null) {
      if (shadeFloorX > backX) {
        shadeHitX = backX
        shadeHitY = groundY - Math.max(0, reach.backWallHeight) * scale
        shadeFloorX = backX
        if (reach.status === 'enters') {
          awningEndX = backX
          awningEndY = shadeHitY
        }
      } else {
        shadeFloorX = Math.max(wallX, shadeFloorX)
        shadeHitX = shadeFloorX
        shadeHitY = groundY
      }
    }
  }

  return {
    scale,
    groundY,
    wallX,
    innerX,
    backX,
    wallThick,
    attachX,
    attachY,
    tipX,
    tipY,
    topAttachY,
    topTipY,
    doorTopY,
    eaveOutX,
    eaveBackX,
    eaveY,
    ridgeX,
    ridgeY,
    postX,
    postW,
    postTopY,
    eaveTopY,
    roofAtWallY,
    tanP,
    shadeFloorX,
    shadeHitX,
    shadeHitY,
    rayOriginX,
    rayOriginY,
    awningOriginX: tipX,
    awningOriginY: tipY,
    awningEndX,
    awningEndY,
    awningFloorX,
  }
}

function fillPoly(
  ctx: CanvasRenderingContext2D,
  pts: Array<{ x: number; y: number }>,
  fill: string,
  stroke?: string,
  width = 1.5,
) {
  ctx.beginPath()
  ctx.moveTo(pts[0].x, pts[0].y)
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
  if (stroke) {
    ctx.strokeStyle = stroke
    ctx.lineWidth = width
    ctx.stroke()
  }
}

export function drawSection(
  ctx: CanvasRenderingContext2D,
  model: CalcModel,
  viewW: number,
  viewH: number,
  theme: ThemeResolved = 'dark',
): void {
  const { length, heightWall, slopeDeg, reach } = model
  const pal = sectionPalette(theme)
  const L = layoutSection(model, viewW, viewH)
  ctx.clearRect(0, 0, viewW, viewH)

  const sky = ctx.createLinearGradient(0, 0, 0, L.groundY)
  sky.addColorStop(0, pal.sky0)
  sky.addColorStop(0.55, pal.sky1)
  sky.addColorStop(1, pal.sky2)
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, viewW, L.groundY)

  const glow = ctx.createRadialGradient(L.tipX - 24, 40, 6, L.tipX + 20, 110, 300)
  glow.addColorStop(0, pal.glow)
  glow.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, L.wallX, L.groundY)

  ctx.fillStyle = pal.dirt
  ctx.fillRect(0, L.groundY, L.wallX, viewH - L.groundY)
  ctx.fillRect(L.backX, L.groundY, Math.max(0, viewW - L.backX), viewH - L.groundY)
  ctx.fillStyle = pal.floor
  ctx.fillRect(L.wallX, L.groundY, L.backX - L.wallX, viewH - L.groundY)

  ctx.strokeStyle = pal.plank
  ctx.lineWidth = 1
  for (let x = L.innerX + 16; x < L.backX; x += 14) {
    ctx.beginPath()
    ctx.moveTo(x, L.groundY + 1)
    ctx.lineTo(x + 8, viewH)
    ctx.stroke()
  }

  ctx.strokeStyle = pal.groundLine
  ctx.beginPath()
  ctx.moveTo(0, L.groundY + 0.5)
  ctx.lineTo(viewW, L.groundY + 0.5)
  ctx.stroke()

  const wallTop = L.eaveY

  ctx.fillStyle = pal.indoor
  ctx.fillRect(L.innerX, wallTop, Math.max(0, L.backX - L.innerX), L.groundY - wallTop)

  const sunOnFloor =
    L.shadeFloorX != null &&
    (reach.status === 'enters' || reach.status === 'door-limited') &&
    reach.reach > 0
  const sunUnderAwning = L.awningFloorX != null && reach.awningEnter > 0

  if (sunUnderAwning && L.awningFloorX != null) {
    const wash = ctx.createLinearGradient(L.tipX, L.tipY, L.awningFloorX, L.groundY)
    wash.addColorStop(0, pal.wash0)
    wash.addColorStop(1, pal.wash1)
    ctx.fillStyle = wash
    ctx.beginPath()
    ctx.moveTo(L.tipX, L.tipY)
    ctx.lineTo(L.awningFloorX, L.groundY)
    ctx.lineTo(L.tipX, L.groundY)
    ctx.closePath()
    ctx.fill()
  }

  if (sunOnFloor && L.shadeHitX != null && L.shadeHitY != null) {
    const wash = ctx.createLinearGradient(L.rayOriginX, L.rayOriginY, L.shadeHitX, L.shadeHitY)
    wash.addColorStop(0, pal.wash0)
    wash.addColorStop(1, pal.wash1)
    ctx.fillStyle = wash
    ctx.beginPath()
    ctx.moveTo(L.rayOriginX, L.rayOriginY)
    ctx.lineTo(L.shadeHitX, L.shadeHitY)
    if (L.shadeHitY < L.groundY - 0.5) {
      ctx.lineTo(L.backX, L.groundY)
    }
    ctx.lineTo(L.innerX, L.groundY)
    ctx.closePath()
    ctx.fill()
  }

  ctx.fillStyle = pal.wall
  ctx.fillRect(L.backX, wallTop, L.wallThick, L.groundY - wallTop)
  ctx.strokeStyle = pal.wallEdge
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(L.backX + 0.5, wallTop)
  ctx.lineTo(L.backX + 0.5, L.groundY)
  ctx.stroke()

  ctx.strokeStyle = pal.wallEdge
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(L.innerX, wallTop + 0.5)
  ctx.lineTo(L.backX, wallTop + 0.5)
  ctx.stroke()

  ctx.fillStyle = pal.wall
  ctx.fillRect(L.wallX, wallTop, L.wallThick, L.groundY - wallTop)
  ctx.strokeStyle = pal.wallEdge
  ctx.lineWidth = 2
  ctx.strokeRect(L.wallX + 1, wallTop, L.wallThick - 2, L.groundY - wallTop)
  ctx.strokeStyle = pal.wallLite
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(L.innerX - 3, wallTop + 4)
  ctx.lineTo(L.innerX - 3, L.groundY - 2)
  ctx.stroke()

  const glass = ctx.createLinearGradient(L.wallX, L.doorTopY, L.innerX, L.groundY)
  glass.addColorStop(0, pal.glass0)
  glass.addColorStop(1, pal.glass1)
  ctx.fillStyle = glass
  ctx.fillRect(L.wallX + 2, L.doorTopY, L.wallThick - 4, L.groundY - L.doorTopY)
  ctx.fillStyle = pal.glassLite
  ctx.beginPath()
  ctx.moveTo(L.wallX + 4, L.doorTopY + 6)
  ctx.lineTo(L.innerX - 4, L.doorTopY + 6)
  ctx.lineTo(L.innerX - 4, L.doorTopY + 22)
  ctx.lineTo(L.wallX + 4, L.doorTopY + 36)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = pal.wallEdge
  ctx.lineWidth = 2
  ctx.strokeRect(L.wallX + 2, L.doorTopY, L.wallThick - 4, L.groundY - L.doorTopY)
  ctx.fillStyle = pal.wallEdge
  ctx.fillRect(L.wallX + 1, L.doorTopY - 4, L.wallThick - 2, 4)

  fillPoly(
    ctx,
    [
      { x: L.eaveOutX, y: L.eaveY },
      { x: L.wallX, y: L.eaveY },
      { x: L.wallX, y: L.eaveTopY },
      { x: L.eaveOutX, y: L.eaveTopY },
    ],
    pal.roof,
    pal.roofEdge,
    1.5,
  )
  fillPoly(
    ctx,
    [
      { x: L.backX, y: L.eaveY },
      { x: L.eaveBackX, y: L.eaveY },
      { x: L.eaveBackX, y: L.eaveTopY },
      { x: L.backX, y: L.eaveTopY },
    ],
    pal.roof,
    pal.roofEdge,
    1.5,
  )
  fillPoly(
    ctx,
    [
      { x: L.eaveOutX, y: L.eaveTopY },
      { x: L.ridgeX, y: L.ridgeY },
      { x: L.eaveBackX, y: L.eaveTopY },
      { x: L.backX, y: L.eaveY },
      { x: L.wallX, y: L.eaveY },
    ],
    pal.roof,
    pal.roofEdge,
    2,
  )
  ctx.strokeStyle = pal.roofLite
  ctx.lineWidth = 3
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(L.eaveOutX, L.eaveTopY)
  ctx.lineTo(L.ridgeX, L.ridgeY)
  ctx.lineTo(L.eaveBackX, L.eaveTopY)
  ctx.stroke()

  if (reach.heightEnd > 0) {
    const gap = L.attachY - L.roofAtWallY
    if (Math.abs(gap) > 2) {
      const mx = L.wallX
      ctx.strokeStyle = pal.awningTop
      ctx.lineWidth = 2.5
      ctx.lineCap = 'square'
      ctx.beginPath()
      ctx.moveTo(mx, L.topAttachY)
      ctx.lineTo(mx, L.roofAtWallY)
      ctx.stroke()
      ctx.strokeStyle = pal.post
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(mx, L.attachY)
      ctx.lineTo(mx, L.roofAtWallY)
      ctx.stroke()
    }
    fillPoly(
      ctx,
      [
        { x: L.attachX + 1, y: L.attachY + 4 },
        { x: L.tipX + 1, y: L.tipY + 4 },
        { x: L.tipX + 1, y: L.topTipY + 4 },
        { x: L.attachX + 1, y: L.topAttachY + 4 },
      ],
      pal.awningShadow,
    )
    fillPoly(
      ctx,
      [
        { x: L.attachX, y: L.attachY },
        { x: L.tipX, y: L.tipY },
        { x: L.tipX, y: L.topTipY },
        { x: L.attachX, y: L.topAttachY },
      ],
      pal.awning,
      pal.awningTop,
      1.5,
    )
    ctx.strokeStyle = pal.awningTop
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(L.attachX, L.topAttachY)
    ctx.lineTo(L.tipX, L.topTipY)
    ctx.stroke()

    ctx.fillStyle = pal.post
    ctx.fillRect(L.postX - L.postW / 2, L.postTopY, L.postW, L.groundY - L.postTopY)
    ctx.fillRect(L.postX - L.postW, L.groundY - 4, L.postW * 2, 4)

    ctx.fillStyle = pal.awning
    ctx.beginPath()
    ctx.arc(L.attachX, L.attachY, 3.5, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.fillStyle = pal.label
  ctx.font = TYPE
  ctx.fillText('OUTSIDE', Math.max(12, L.tipX + 4), L.groundY + 42)
  ctx.fillText('INSIDE', L.innerX + 10, L.groundY + 42)

  ctx.save()
  ctx.strokeStyle = pal.dim
  ctx.fillStyle = pal.dimText
  ctx.lineWidth = 1
  ctx.setLineDash([3, 3])
  ctx.font = TYPE_SM

  const dimX = L.tipX - 8
  ctx.beginPath()
  ctx.moveTo(dimX, L.tipY)
  ctx.lineTo(dimX, L.groundY)
  ctx.stroke()
  ctx.setLineDash([])
  if (reach.heightEnd > 0) {
    ctx.fillText(`${reach.heightEnd.toFixed(2)} m`, dimX + 8, (L.tipY + L.groundY) / 2)
  }

  ctx.setLineDash([3, 3])
  ctx.beginPath()
  ctx.moveTo(L.innerX + 16, L.attachY)
  ctx.lineTo(L.innerX + 16, L.groundY)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.fillText(`${heightWall.toFixed(2)} m`, L.innerX + 20, L.attachY + 14)

  ctx.setLineDash([3, 3])
  ctx.beginPath()
  ctx.moveTo(L.tipX, L.groundY + 10)
  ctx.lineTo(L.attachX, L.groundY + 10)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.fillText(`${length.toFixed(1)} m`, (L.tipX + L.attachX) / 2 - 14, L.groundY + 22)

  if (slopeDeg > 0 && reach.heightEnd > 0) {
    ctx.fillText(
      `${slopeDeg.toFixed(1)}° fall`,
      (L.tipX + L.attachX) / 2 - 18,
      (L.topTipY + L.topAttachY) / 2 - 8,
    )
  }
  ctx.restore()

  if (L.tanP > 0 && !model.prof.behind && reach.heightEnd > 0) {
    ctx.strokeStyle = pal.ray
    ctx.lineWidth = 2
    ctx.setLineDash([6, 5])
    if (L.awningEndX != null && L.awningEndY != null) {
      const extend = 36
      ctx.beginPath()
      ctx.moveTo(L.awningOriginX - extend, L.awningOriginY - extend * L.tanP)
      ctx.lineTo(L.awningEndX, L.awningEndY)
      ctx.stroke()
    }
    const indoorRaySeparate =
      sunOnFloor &&
      L.shadeFloorX != null &&
      (Math.abs(L.rayOriginX - L.awningOriginX) > 1 || Math.abs(L.rayOriginY - L.awningOriginY) > 1)
    if (indoorRaySeparate && L.shadeHitX != null && L.shadeHitY != null) {
      ctx.beginPath()
      ctx.moveTo(L.rayOriginX, L.rayOriginY)
      ctx.lineTo(L.shadeHitX, L.shadeHitY)
      ctx.stroke()
    }
    ctx.setLineDash([])
    ctx.fillStyle = pal.enter
    if (L.awningEndX != null && L.awningEndY != null) {
      ctx.beginPath()
      ctx.arc(L.awningEndX, L.awningEndY, 3.5, 0, Math.PI * 2)
      ctx.fill()
    }
    if (sunOnFloor && L.shadeHitX != null && L.shadeHitY != null && indoorRaySeparate) {
      ctx.beginPath()
      ctx.arc(L.shadeHitX, L.shadeHitY, 3.5, 0, Math.PI * 2)
      ctx.fill()
    }

    if (sunUnderAwning && L.awningFloorX != null) {
      const p0 = L.tipX
      const p1 = Math.min(L.wallX, L.awningFloorX)
      if (p1 > p0) {
        ctx.fillStyle = pal.enter
        ctx.fillRect(p0, L.groundY - 5, p1 - p0, 6)
      }
      const label = `${reach.awningEnter.toFixed(2)} m under`
      ctx.font = TYPE
      const tw = ctx.measureText(label).width
      const lx = Math.max(8, Math.min((p0 + p1) / 2 - tw / 2, viewW - tw - 16))
      const ly = L.groundY - 18
      ctx.fillStyle = pal.chip
      ctx.beginPath()
      ctx.roundRect(lx - 5, ly - 13, tw + 10, 18, 4)
      ctx.fill()
      ctx.fillStyle = pal.chipText
      ctx.fillText(label, lx, ly)
    }

    if (sunOnFloor && L.shadeFloorX != null) {
      const p0 = L.innerX
      const p1 = L.shadeFloorX
      if (p1 > p0) {
        ctx.fillStyle = pal.enter
        ctx.fillRect(p0, L.groundY - 5, p1 - p0, 6)
      }
      if (reach.hitsBack && L.shadeHitY != null && L.shadeHitY < L.groundY - 2) {
        ctx.fillRect(L.backX - 5, L.shadeHitY, 6, L.groundY - L.shadeHitY)
      }
      const label = reach.hitsBack
        ? `${reach.reach.toFixed(2)} m + wall`
        : `${reach.reach.toFixed(2)} m inside`
      ctx.font = TYPE
      const tw = ctx.measureText(label).width
      const lx = Math.min(p0 + 8, viewW - tw - 16)
      const ly = L.groundY - 18
      ctx.fillStyle = pal.chip
      ctx.beginPath()
      ctx.roundRect(lx - 5, ly - 13, tw + 10, 18, 4)
      ctx.fill()
      ctx.fillStyle = pal.chipText
      ctx.fillText(label, lx, ly)
    }
  }
}
