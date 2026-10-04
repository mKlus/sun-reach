import {
  GARDEN_LENGTH_MAX,
  GARDEN_LENGTH_MIN,
  GARDEN_WIDTH_MAX,
  GARDEN_WIDTH_MIN,
  GROUP_WIDTH_MAX,
  GROUP_WIDTH_MIN,
  TREE_COUNT_MAX,
  TREE_COUNT_MIN,
  TREE_DIAMETER_MAX,
  TREE_DIAMETER_MIN,
  TREE_HEIGHT_MAX,
  TREE_HEIGHT_MIN,
  TRUNK_HEIGHT_MAX,
  TRUNK_HEIGHT_MIN,
  type GardenConfig,
  type TreeConfig,
} from '../lib/gardenModel'
import { formatFacing } from '../lib/solar'
import { LayoutControls } from './LayoutControls'
import { SliderField } from './SliderField'

type ConsoleTreeGardenProps = {
  tree: TreeConfig
  garden: GardenConfig
  showHints: boolean
  onPatchTree: (partial: Partial<TreeConfig>) => void
  onPatchGarden: (partial: Partial<GardenConfig>) => void
}

export function ConsoleTreeGarden({
  tree,
  garden,
  showHints,
  onPatchTree,
  onPatchGarden,
}: ConsoleTreeGardenProps) {
  return (
    <section className="block">
      <h2>
        <span className="idx">03</span> Tree &amp; Vegie Garden
      </h2>

      {/* Tree Mode Switch */}
      <div className="tree-mode-toggle" style={{ marginBottom: 16 }}>
        <button
          type="button"
          className={`mode-btn ${tree.mode === 'single' ? 'is-active' : ''}`}
          onClick={() => onPatchTree({ mode: 'single' })}
        >
          Single Tree
        </button>
        <button
          type="button"
          className={`mode-btn ${tree.mode === 'group' ? 'is-active' : ''}`}
          onClick={() => onPatchTree({ mode: 'group' })}
        >
          Group / Row of Trees
        </button>
      </div>

      {/* Tree Config */}
      <div className="slider-group">
        <p className="group-title">
          {tree.mode === 'single' ? 'Tree Dimensions' : 'Tree Group Specs'}
        </p>
        <SliderField
          id="in-tree-height"
          label="Tree height"
          value={tree.height}
          min={TREE_HEIGHT_MIN}
          max={TREE_HEIGHT_MAX}
          step={0.5}
          display={`${tree.height.toFixed(1)} m`}
          hint="Total tree height from ground to canopy top."
          showHint={showHints}
          onChange={(height) => onPatchTree({ height })}
        />
        <SliderField
          id="in-tree-diam"
          label={tree.mode === 'single' ? 'Canopy diameter' : 'Each tree diameter'}
          value={tree.diameter}
          min={TREE_DIAMETER_MIN}
          max={TREE_DIAMETER_MAX}
          step={0.5}
          display={`${tree.diameter.toFixed(1)} m`}
          hint="Width of individual tree crown canopy."
          showHint={showHints}
          onChange={(diameter) => onPatchTree({ diameter })}
        />
        {tree.mode === 'group' ? (
          <>
            <SliderField
              id="in-group-width"
              label="Total width of all trees"
              value={tree.groupWidth}
              min={GROUP_WIDTH_MIN}
              max={GROUP_WIDTH_MAX}
              step={0.5}
              display={`${tree.groupWidth.toFixed(1)} m`}
              hint="Overall span from outer edge of first tree to last tree."
              showHint={showHints}
              onChange={(groupWidth) => {
                const autoCount = Math.max(
                  2,
                  Math.min(TREE_COUNT_MAX, Math.round(groupWidth / tree.diameter)),
                )
                onPatchTree({ groupWidth, treeCount: autoCount })
              }}
            />
            <SliderField
              id="in-tree-count"
              label="Number of trees in group"
              value={tree.treeCount}
              min={TREE_COUNT_MIN}
              max={TREE_COUNT_MAX}
              step={1}
              display={`${tree.treeCount}`}
              hint="Number of trees distributed along the row width."
              showHint={showHints}
              onChange={(treeCount) => onPatchTree({ treeCount })}
            />
            <SliderField
              id="in-tree-rot"
              label="Tree group orientation"
              value={tree.rotation}
              min={0}
              max={359}
              step={1}
              display={formatFacing(tree.rotation).label}
              hint="Orientation angle of the tree row (e.g. East-West hedge or North-South row)."
              showHint={showHints}
              onChange={(rotation) => onPatchTree({ rotation })}
            />
          </>
        ) : null}
        <SliderField
          id="in-trunk-height"
          label="Trunk clearance height"
          value={tree.trunkHeight}
          min={TRUNK_HEIGHT_MIN}
          max={TRUNK_HEIGHT_MAX}
          step={0.25}
          display={`${tree.trunkHeight.toFixed(2)} m`}
          hint="Height above ground before foliage begins."
          showHint={showHints}
          onChange={(trunkHeight) => onPatchTree({ trunkHeight })}
        />
      </div>

      {/* Vegie Garden Enclosure */}
      <div className="slider-group">
        <p className="group-title">Vegie Garden Enclosure</p>
        <SliderField
          id="in-garden-w"
          label="Garden width"
          value={garden.width}
          min={GARDEN_WIDTH_MIN}
          max={GARDEN_WIDTH_MAX}
          step={0.25}
          display={`${garden.width.toFixed(2)} m`}
          hint="Width of the garden enclosure bed."
          showHint={showHints}
          onChange={(width) => onPatchGarden({ width })}
        />
        <SliderField
          id="in-garden-l"
          label="Garden length"
          value={garden.length}
          min={GARDEN_LENGTH_MIN}
          max={GARDEN_LENGTH_MAX}
          step={0.25}
          display={`${garden.length.toFixed(2)} m`}
          hint="Length of the garden enclosure bed."
          showHint={showHints}
          onChange={(length) => onPatchGarden({ length })}
        />
        <SliderField
          id="in-garden-rot"
          label="Garden bed orientation"
          value={garden.rotation}
          min={0}
          max={359}
          step={1}
          display={formatFacing(garden.rotation).label}
          hint="Rotation angle of the enclosure (North-South beds often capture even daylight)."
          showHint={showHints}
          onChange={(rotation) => onPatchGarden({ rotation })}
        />
      </div>

      {/* Layout, Move & Rotate Controls */}
      <div className="slider-group">
        <p className="group-title">Layout &amp; Move Controls</p>
        <LayoutControls
          tree={tree}
          garden={garden}
          idPrefix="sidebar"
          onPatchTree={onPatchTree}
          onPatchGarden={onPatchGarden}
        />
      </div>
    </section>
  )
}
