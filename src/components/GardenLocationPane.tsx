import type { GardenConfig, TreeConfig, TreeItem } from '../lib/gardenModel'
import type { GardenInstantSun } from '../lib/gardenSolar'
import { ExpandButton } from './ExpandButton'
import { GardenMap } from './GardenMap'
import { PlaceSearch } from './PlaceSearch'
import type { RecenterTarget } from './SiteMap'

type GardenLocationPaneProps = {
  ready: boolean
  placeLabel: string
  lat: number
  lon: number
  trees: TreeItem[]
  garden: GardenConfig | null
  instant: GardenInstantSun
  sunAlt: number
  sunAz: number
  recenter: RecenterTarget
  locateLabel: string
  active: boolean
  large?: boolean
  selectedTreeId: string | null
  isGardenSelected: boolean
  onSelectTree: (id: string | null) => void
  onSelectGarden: (selected: boolean) => void
  onAddTree: (lat?: number, lon?: number) => void
  onDeleteTree: (id: string) => void
  onMoveTree: (id: string, lat: number, lon: number) => void
  onUpdateTree: (id: string, partial: Partial<TreeItem>) => void
  onAddGarden: (lat?: number, lon?: number) => void
  onDeleteGarden: () => void
  onGardenOffset: (offsetEast: number, offsetNorth: number) => void
  onGardenPatch: (partial: Partial<GardenConfig>) => void
  onUserEdit: () => void
  onPick: (lat: number, lon: number, label: string) => void
  onLocate: () => void
  onExpand?: () => void
  // Legacy
  tree?: TreeConfig
}

export function GardenLocationPane({
  ready,
  placeLabel,
  lat,
  lon,
  trees,
  garden,
  instant,
  sunAlt,
  sunAz,
  recenter,
  locateLabel,
  active,
  large = false,
  selectedTreeId,
  isGardenSelected,
  onSelectTree,
  onSelectGarden,
  onAddTree,
  onDeleteTree,
  onMoveTree,
  onUpdateTree,
  onAddGarden,
  onDeleteGarden,
  onGardenOffset,
  onGardenPatch,
  onUserEdit,
  onPick,
  onLocate,
  onExpand,
}: GardenLocationPaneProps) {
  return (
    <div className={`location-pane${large ? ' is-large' : ''}`}>
      <div className={`map-frame${large ? ' is-large' : ''}`}>
        <PlaceSearch value={placeLabel} onUserEdit={onUserEdit} onPick={onPick} />
        {ready && active ? (
          <GardenMap
            lat={lat}
            lon={lon}
            trees={trees}
            garden={garden}
            instant={instant}
            sunAlt={sunAlt}
            sunAz={sunAz}
            recenter={recenter}
            selectedTreeId={selectedTreeId}
            isGardenSelected={isGardenSelected}
            onSelectTree={onSelectTree}
            onSelectGarden={onSelectGarden}
            onAddTree={onAddTree}
            onDeleteTree={onDeleteTree}
            onMoveTree={onMoveTree}
            onUpdateTree={onUpdateTree}
            onAddGarden={onAddGarden}
            onDeleteGarden={onDeleteGarden}
            onGardenOffset={onGardenOffset}
            onGardenPatch={onGardenPatch}
            onPickLocation={(clickLat, clickLon) => onPick(clickLat, clickLon, `${clickLat.toFixed(4)}, ${clickLon.toFixed(4)}`)}
          />
        ) : (
          <div className="map-el" />
        )}
        <div className="compass">
          <span className="north-arrow" style={{ transform: 'rotate(0deg)' }} aria-hidden>
            ↑
          </span>
          <span>N</span>
        </div>
        <button type="button" className="locate-btn" onClick={onLocate}>
          {locateLabel}
        </button>
        {onExpand ? <ExpandButton className="expand-btn" onClick={onExpand} /> : null}
      </div>
    </div>
  )
}
