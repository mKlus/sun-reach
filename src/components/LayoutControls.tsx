import { useState } from 'react'
import type { GardenConfig, TreeConfig } from '../lib/gardenModel'
import { formatFacing, toDeg, toRad, wrapDegrees } from '../lib/solar'
import { SliderField } from './SliderField'

type LayoutControlsProps = {
  tree: TreeConfig
  garden: GardenConfig
  idPrefix?: string
  onPatchTree: (partial: Partial<TreeConfig>) => void
  onPatchGarden: (partial: Partial<GardenConfig>) => void
}

export function LayoutControls({
  tree,
  garden,
  idPrefix = 'layout',
  onPatchTree,
  onPatchGarden,
}: LayoutControlsProps) {
  const [selectedTarget, setSelectedTarget] = useState<'garden' | 'tree'>('garden')
  const [stepSize, setStepSize] = useState<number>(1.0)

  // Distance and bearing from tree to garden
  const dist = Math.hypot(garden.offsetEast, garden.offsetNorth)
  const bearing = wrapDegrees(toDeg(Math.atan2(garden.offsetEast, garden.offsetNorth)))

  function setDistanceAndBearing(newDist: number, newBearing: number) {
    const rad = toRad(newBearing)
    onPatchGarden({
      offsetEast: Number((newDist * Math.sin(rad)).toFixed(2)),
      offsetNorth: Number((newDist * Math.cos(rad)).toFixed(2)),
    })
  }

  // Nudge functions:
  // Moving garden North increases offsetNorth.
  // Moving tree North means tree moves +North, so garden is now -North relative to tree (offsetNorth decreases).
  function nudge(dEast: number, dNorth: number) {
    const mult = selectedTarget === 'garden' ? 1 : -1
    onPatchGarden({
      offsetEast: Number((garden.offsetEast + dEast * mult).toFixed(2)),
      offsetNorth: Number((garden.offsetNorth + dNorth * mult).toFixed(2)),
    })
  }

  function rotateTarget(deltaDeg: number) {
    if (selectedTarget === 'tree') {
      if (tree.mode === 'group') {
        onPatchTree({ rotation: wrapDegrees(tree.rotation + deltaDeg) })
      }
    } else {
      onPatchGarden({ rotation: wrapDegrees(garden.rotation + deltaDeg) })
    }
  }

  function setRotationExact(deg: number) {
    if (selectedTarget === 'tree') {
      if (tree.mode === 'group') {
        onPatchTree({ rotation: wrapDegrees(deg) })
      }
    } else {
      onPatchGarden({ rotation: wrapDegrees(deg) })
    }
  }

  const currentRotation = selectedTarget === 'tree' ? tree.rotation : garden.rotation
  const isTreeSingle = selectedTarget === 'tree' && tree.mode === 'single'

  return (
    <div className="layout-controls" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Target Selector */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 6,
          background: 'var(--lift)',
          border: '1px solid var(--hair)',
          borderRadius: 10,
          padding: 3,
        }}
      >
        <button
          type="button"
          className={`mode-btn ${selectedTarget === 'garden' ? 'is-active' : ''}`}
          onClick={() => setSelectedTarget('garden')}
        >
          🥕 Vegie Garden
        </button>
        <button
          type="button"
          className={`mode-btn ${selectedTarget === 'tree' ? 'is-active' : ''}`}
          onClick={() => setSelectedTarget('tree')}
        >
          🌳 Trees
        </button>
      </div>

      {/* D-Pad Directional Movement */}
      <div
        style={{
          background: 'var(--lift)',
          border: '1px solid var(--hair-strong)',
          borderRadius: 12,
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted)' }}>
            Nudge {selectedTarget === 'garden' ? 'Vegie Garden' : 'Trees'}
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            {[0.5, 1.0, 2.5].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStepSize(s)}
                style={{
                  border: '1px solid var(--hair)',
                  background: stepSize === s ? 'var(--raised)' : 'transparent',
                  color: stepSize === s ? 'var(--ink)' : 'var(--muted)',
                  borderRadius: 6,
                  padding: '2px 6px',
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  fontWeight: stepSize === s ? 600 : 400,
                }}
              >
                {s}m
              </button>
            ))}
          </div>
        </div>

        {/* D-Pad Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 38px)',
            gridTemplateRows: 'repeat(3, 38px)',
            gap: 6,
            justifyContent: 'center',
            margin: '4px 0',
          }}
        >
          <div />
          <button
            type="button"
            title={`Move ${selectedTarget === 'garden' ? 'Garden' : 'Tree'} North`}
            aria-label={`Move ${selectedTarget === 'garden' ? 'Garden' : 'Tree'} North`}
            onClick={() => nudge(0, stepSize)}
            style={dPadBtnStyle}
          >
            ▲
          </button>
          <div />

          <button
            type="button"
            title={`Move ${selectedTarget === 'garden' ? 'Garden' : 'Tree'} West`}
            aria-label={`Move ${selectedTarget === 'garden' ? 'Garden' : 'Tree'} West`}
            onClick={() => nudge(-stepSize, 0)}
            style={dPadBtnStyle}
          >
            ◀
          </button>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.7rem',
              color: 'var(--muted)',
              border: '1px dashed var(--hair-strong)',
              borderRadius: 8,
            }}
          >
            {stepSize}m
          </div>
          <button
            type="button"
            title={`Move ${selectedTarget === 'garden' ? 'Garden' : 'Tree'} East`}
            aria-label={`Move ${selectedTarget === 'garden' ? 'Garden' : 'Tree'} East`}
            onClick={() => nudge(stepSize, 0)}
            style={dPadBtnStyle}
          >
            ▶
          </button>

          <div />
          <button
            type="button"
            title={`Move ${selectedTarget === 'garden' ? 'Garden' : 'Tree'} South`}
            aria-label={`Move ${selectedTarget === 'garden' ? 'Garden' : 'Tree'} South`}
            onClick={() => nudge(0, -stepSize)}
            style={dPadBtnStyle}
          >
            ▼
          </button>
          <div />
        </div>

        <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
          Garden from trees: <strong>{garden.offsetEast >= 0 ? '+' : ''}{garden.offsetEast.toFixed(1)}m E</strong>,{' '}
          <strong>{garden.offsetNorth >= 0 ? '+' : ''}{garden.offsetNorth.toFixed(1)}m N</strong> ({dist.toFixed(1)}m total)
        </div>
      </div>

      {/* Rotation Control for Selected Target */}
      <div
        style={{
          background: 'var(--lift)',
          border: '1px solid var(--hair-strong)',
          borderRadius: 12,
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted)' }}>
            Rotate {selectedTarget === 'garden' ? 'Garden Bed' : 'Trees'}
          </span>
          <strong style={{ fontSize: '0.85rem' }}>
            {isTreeSingle ? 'Circular (N/A)' : formatFacing(currentRotation).label}
          </strong>
        </div>

        {isTreeSingle ? (
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.35 }}>
            Single tree canopy is round; orientation applies to <strong>Group / Row of Trees</strong>. Switch tree mode above to rotate a tree row or hedge.
          </p>
        ) : (
          <>
            {/* Quick Rotation Buttons */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button type="button" onClick={() => rotateTarget(-45)} style={quickBtnStyle}>
                ↺ −45°
              </button>
              <button type="button" onClick={() => rotateTarget(-15)} style={quickBtnStyle}>
                ↺ −15°
              </button>
              <button type="button" onClick={() => rotateTarget(15)} style={quickBtnStyle}>
                ↻ +15°
              </button>
              <button type="button" onClick={() => rotateTarget(45)} style={quickBtnStyle}>
                ↻ +45°
              </button>
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button type="button" onClick={() => setRotationExact(0)} style={quickBtnStyle}>
                North (0°)
              </button>
              <button type="button" onClick={() => setRotationExact(90)} style={quickBtnStyle}>
                East (90°)
              </button>
              <button type="button" onClick={() => setRotationExact(180)} style={quickBtnStyle}>
                South (180°)
              </button>
              <button type="button" onClick={() => setRotationExact(270)} style={quickBtnStyle}>
                West (270°)
              </button>
            </div>

            <SliderField
              id={`${idPrefix}-rotation`}
              label={`${selectedTarget === 'garden' ? 'Garden bed' : 'Tree row'} orientation`}
              value={currentRotation}
              min={0}
              max={359}
              step={1}
              display={`${currentRotation}°`}
              showHint={false}
              onChange={(val) => setRotationExact(val)}
            />
          </>
        )}
      </div>

      {/* Relative Placement Sliders */}
      <div
        style={{
          background: 'var(--lift)',
          border: '1px solid var(--hair-strong)',
          borderRadius: 12,
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted)' }}>
          Distance &amp; Compass Direction
        </span>
        <SliderField
          id={`${idPrefix}-dist`}
          label="Separation distance"
          value={dist}
          min={0}
          max={30}
          step={0.25}
          display={`${dist.toFixed(1)} m`}
          showHint={false}
          onChange={(newDist) => setDistanceAndBearing(newDist, bearing)}
        />
        <SliderField
          id={`${idPrefix}-bearing`}
          label="Direction of garden from tree"
          value={bearing}
          min={0}
          max={359}
          step={1}
          display={formatFacing(bearing).label}
          showHint={false}
          onChange={(newBearing) => setDistanceAndBearing(dist, newBearing)}
        />

        {/* Quick Placement Presets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--faint)' }}>Quick alignments:</span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <button
              type="button"
              onClick={() => setDistanceAndBearing(Math.max(5, dist), 0)}
              style={quickBtnStyle}
            >
              Garden North of Trees
            </button>
            <button
              type="button"
              onClick={() => setDistanceAndBearing(Math.max(5, dist), 180)}
              style={quickBtnStyle}
            >
              Garden South of Trees
            </button>
            <button
              type="button"
              onClick={() => setDistanceAndBearing(Math.max(5, dist), 90)}
              style={quickBtnStyle}
            >
              Garden East of Trees
            </button>
            <button
              type="button"
              onClick={() => setDistanceAndBearing(Math.max(5, dist), 270)}
              style={quickBtnStyle}
            >
              Garden West of Trees
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const dPadBtnStyle: React.CSSProperties = {
  border: '1px solid var(--hair-strong)',
  background: 'var(--raised)',
  color: 'var(--ink)',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: '0.85rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 'bold',
  transition: 'background 0.15s ease',
}

const quickBtnStyle: React.CSSProperties = {
  border: '1px solid var(--hair)',
  background: 'var(--raised)',
  color: 'var(--ink)',
  borderRadius: 6,
  padding: '5px 8px',
  fontSize: '0.74rem',
  cursor: 'pointer',
  textAlign: 'center',
}
