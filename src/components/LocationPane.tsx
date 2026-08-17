import { formatFacing } from '../lib/solar'
import { ExpandButton } from './ExpandButton'
import { PlaceSearch } from './PlaceSearch'
import { SiteMap, type RecenterTarget } from './SiteMap'
import { SliderField } from './SliderField'

type LocationPaneProps = {
  ready: boolean
  placeLabel: string
  lat: number
  lon: number
  facing: number
  roomDepth: number
  recenter: RecenterTarget
  locateLabel: string
  /** Mount Leaflet only here — one map at a time. */
  active: boolean
  large?: boolean
  showFacing?: boolean
  showHints?: boolean
  onUserEdit: () => void
  onPick: (lat: number, lon: number, label: string) => void
  onLocation: (lat: number, lon: number) => void
  onLocate: () => void
  onFacing?: (facing: number) => void
  onExpand?: () => void
}

export function LocationPane({
  ready,
  placeLabel,
  lat,
  lon,
  facing,
  roomDepth,
  recenter,
  locateLabel,
  active,
  large = false,
  showFacing = false,
  showHints = false,
  onUserEdit,
  onPick,
  onLocation,
  onLocate,
  onFacing,
  onExpand,
}: LocationPaneProps) {
  return (
    <div className={`location-pane${large ? ' is-large' : ''}`}>
      <div className={`map-frame${large ? ' is-large' : ''}`}>
        <PlaceSearch value={placeLabel} onUserEdit={onUserEdit} onPick={onPick} />
        {ready && active ? (
          <SiteMap
            lat={lat}
            lon={lon}
            facing={facing}
            roomDepth={roomDepth}
            recenter={recenter}
            onLocation={onLocation}
          />
        ) : (
          <div className="map-el" />
        )}
        <div className="compass">
          <span className="north-arrow" style={{ transform: `rotate(${-facing}deg)` }} aria-hidden>
            ↑
          </span>
          <span>N</span>
        </div>
        <button type="button" className="locate-btn" onClick={onLocate}>
          {locateLabel}
        </button>
        {onExpand ? <ExpandButton className="expand-btn" onClick={onExpand} /> : null}
      </div>
      {showFacing && onFacing ? (
        <SliderField
          id={large ? 'in-facing-pop' : 'in-facing'}
          label="Glass door faces"
          value={facing}
          min={0}
          max={359}
          step={1}
          display={formatFacing(facing).label}
          hint="Turn the slider until your glass door faces up on the map. The copper house’s cyan edge is the glass. Click or drag the pin to set the site."
          showHint={showHints}
          onChange={onFacing}
        />
      ) : null}
    </div>
  )
}
