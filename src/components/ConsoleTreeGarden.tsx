import {
  GARDEN_LENGTH_MAX,
  GARDEN_LENGTH_MIN,
  GARDEN_WIDTH_MAX,
  GARDEN_WIDTH_MIN,
  TREE_DIAMETER_MAX,
  TREE_DIAMETER_MIN,
  TREE_HEIGHT_MAX,
  TREE_HEIGHT_MIN,
  type GardenConfig,
  type TreeItem,
} from '../lib/gardenModel'
import { formatFacing } from '../lib/solar'
import { SliderField } from './SliderField'

type ConsoleTreeGardenProps = {
  trees: TreeItem[]
  garden: GardenConfig | null
  selectedTreeId: string | null
  isGardenSelected: boolean
  showHints: boolean
  onSelectTree: (id: string | null) => void
  onSelectGarden: (selected: boolean) => void
  onAddTree: () => void
  onDeleteTree: (id: string) => void
  onUpdateTree: (id: string, partial: Partial<TreeItem>) => void
  onAddGarden: () => void
  onDeleteGarden: () => void
  onPatchGarden: (partial: Partial<GardenConfig>) => void
}

export function ConsoleTreeGarden({
  trees,
  garden,
  selectedTreeId,
  isGardenSelected,
  showHints,
  onSelectTree,
  onSelectGarden,
  onAddTree,
  onDeleteTree,
  onUpdateTree,
  onAddGarden,
  onDeleteGarden,
  onPatchGarden,
}: ConsoleTreeGardenProps) {
  const activeTree = trees.find((t) => t.id === selectedTreeId) ?? null

  return (
    <section className="block">
      <h2>
        <span className="idx">03</span> Trees &amp; Vegie Garden
      </h2>

      {/* On-Map Quick Actions Summary */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={onAddTree}
          style={{
            flex: 1,
            background: 'var(--lift)',
            color: 'var(--ink)',
            border: '1px solid var(--hair-strong)',
            borderRadius: 8,
            padding: '7px 10px',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          ➕ Add Tree ({trees.length})
        </button>

        {!garden ? (
          <button
            type="button"
            onClick={onAddGarden}
            style={{
              flex: 1,
              background: '#e07a2f',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '7px 10px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ➕ Add Garden
          </button>
        ) : (
          <button
            type="button"
            onClick={onDeleteGarden}
            style={{
              flex: 1,
              background: 'rgba(239, 68, 68, 0.12)',
              color: '#ef4444',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 8,
              padding: '7px 10px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            🗑️ Remove Garden
          </button>
        )}
      </div>

      {/* Tree Selector Pills */}
      {trees.length > 0 ? (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: '0.76rem', color: 'var(--muted)', marginBottom: 4 }}>
            Trees on site:
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {trees.map((t, idx) => {
              const isSelected = t.id === selectedTreeId
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    onSelectGarden(false)
                    onSelectTree(isSelected ? null : t.id)
                  }}
                  style={{
                    background: isSelected ? 'var(--raised)' : 'var(--lift)',
                    color: isSelected ? 'var(--ink)' : 'var(--muted)',
                    border: isSelected ? '2px solid #228b22' : '1px solid var(--hair-strong)',
                    borderRadius: 8,
                    padding: '4px 9px',
                    fontSize: '0.78rem',
                    fontWeight: isSelected ? 600 : 500,
                    cursor: 'pointer',
                  }}
                >
                  🌳 Tree #{idx + 1} ({t.height.toFixed(1)}m)
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      {/* Selected Tree Sliders (Enabled when a tree is selected) */}
      {activeTree ? (
        <div
          className="slider-group"
          style={{
            background: 'var(--lift)',
            border: '1.5px solid #228b22',
            borderRadius: 10,
            padding: '12px 14px',
            marginBottom: 14,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 10,
            }}
          >
            <p className="group-title" style={{ margin: 0, color: 'var(--ink)', fontWeight: 600 }}>
              Selected Tree Settings
            </p>
            <button
              type="button"
              onClick={() => {
                onDeleteTree(activeTree.id)
                onSelectTree(null)
              }}
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                border: '1px solid #ef4444',
                borderRadius: 6,
                padding: '2px 7px',
                fontSize: '0.72rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🗑️ Delete
            </button>
          </div>

          <SliderField
            id="selected-tree-height"
            label="Tree height"
            value={activeTree.height}
            min={TREE_HEIGHT_MIN}
            max={TREE_HEIGHT_MAX}
            step={0.5}
            display={`${activeTree.height.toFixed(1)} m`}
            hint="Total tree height from ground to canopy top."
            showHint={showHints}
            onChange={(height) => onUpdateTree(activeTree.id, { height })}
          />

          <SliderField
            id="selected-tree-diam"
            label="Tree width / diameter"
            value={activeTree.diameter}
            min={TREE_DIAMETER_MIN}
            max={TREE_DIAMETER_MAX}
            step={0.5}
            display={`${activeTree.diameter.toFixed(1)} m`}
            hint="Canopy crown width."
            showHint={showHints}
            onChange={(diameter) => onUpdateTree(activeTree.id, { diameter })}
          />
        </div>
      ) : (
        <div
          style={{
            padding: '10px 12px',
            background: 'var(--lift)',
            border: '1px dashed var(--hair-strong)',
            borderRadius: 8,
            fontSize: '0.78rem',
            color: 'var(--muted)',
            marginBottom: 14,
            textAlign: 'center',
          }}
        >
          Select a tree on the map to adjust its height and width sliders.
        </div>
      )}

      {/* Selected Garden Settings (If Garden is selected or present) */}
      {garden && isGardenSelected ? (
        <div
          className="slider-group"
          style={{
            background: 'var(--lift)',
            border: '1.5px solid #e07a2f',
            borderRadius: 10,
            padding: '12px 14px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 10,
            }}
          >
            <p className="group-title" style={{ margin: 0, color: 'var(--ink)', fontWeight: 600 }}>
              🥕 Garden Bed Settings
            </p>
            <button
              type="button"
              onClick={onDeleteGarden}
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                border: '1px solid #ef4444',
                borderRadius: 6,
                padding: '2px 7px',
                fontSize: '0.72rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🗑️ Delete
            </button>
          </div>

          <SliderField
            id="garden-w"
            label="Garden width"
            value={garden.width}
            min={GARDEN_WIDTH_MIN}
            max={GARDEN_WIDTH_MAX}
            step={0.5}
            display={`${garden.width.toFixed(1)} m`}
            hint="Width of vegie bed enclosure."
            showHint={showHints}
            onChange={(width) => onPatchGarden({ width })}
          />

          <SliderField
            id="garden-l"
            label="Garden length"
            value={garden.length}
            min={GARDEN_LENGTH_MIN}
            max={GARDEN_LENGTH_MAX}
            step={0.5}
            display={`${garden.length.toFixed(1)} m`}
            hint="Length of vegie bed enclosure."
            showHint={showHints}
            onChange={(length) => onPatchGarden({ length })}
          />

          <SliderField
            id="garden-rot"
            label="Garden orientation"
            value={garden.rotation}
            min={0}
            max={359}
            step={5}
            display={formatFacing(garden.rotation).label}
            hint="Orientation angle of the enclosure."
            showHint={showHints}
            onChange={(rotation) => onPatchGarden({ rotation })}
          />
        </div>
      ) : null}
    </section>
  )
}
