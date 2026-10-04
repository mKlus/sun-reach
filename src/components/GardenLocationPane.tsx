import type { GardenConfig, TreeConfig } from '../lib/gardenModel'
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
  tree: TreeConfig
  garden: GardenConfig
  instant: GardenInstantSun
  sunAlt: number
  sunAz: number
  recenter: RecenterTarget
  locateLabel: string
  active: boolean
  large?: boolean
  onUserEdit: () => void
  onPick: (lat: number, lon: number, label: string) => void
  onTreeLocation: (lat: number, lon: number) => void
  onGardenOffset: (offsetEast: number, offsetNorth: number) => void
  onLocate: () => void
  onExpand?: () => void
}

export function GardenLocationPane({
  ready,
  placeLabel,
  lat,
  lon,
  tree,
  garden,
  instant,
  sunAlt,
  sunAz,
  recenter,
  locateLabel,
  active,
  large = false,
  onUserEdit,
  onPick,
  onTreeLocation,
  onGardenOffset,
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
            tree={tree}
            garden={garden}
            instant={instant}
            sunAlt={sunAlt}
            sunAz={sunAz}
            recenter={recenter}
            onTreeLocation={onTreeLocation}
            onGardenOffset={onGardenOffset}
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
