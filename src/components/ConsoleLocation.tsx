import { formatFacing } from '../lib/solar'
import type { CalcModel, Inputs } from '../lib/model'
import { LocationPane } from './LocationPane'
import { SliderField } from './SliderField'
import type { RecenterTarget } from './SiteMap'

type ConsoleLocationProps = {
  ready: boolean
  inputs: Inputs
  model: CalcModel
  recenter: RecenterTarget
  locateLabel: string
  mapActive: boolean
  showHints: boolean
  onUserEdit: () => void
  onPick: (lat: number, lon: number, label: string) => void
  onLocation: (lat: number, lon: number) => void
  onLocate: () => void
  onExpand: () => void
  onFacing: (facing: number) => void
}

export function ConsoleLocation({
  ready,
  inputs,
  model,
  recenter,
  locateLabel,
  mapActive,
  showHints,
  onUserEdit,
  onPick,
  onLocation,
  onLocate,
  onExpand,
  onFacing,
}: ConsoleLocationProps) {
  return (
    <section className="block">
      <h2>
        <span className="idx">01</span> Location
      </h2>
      <LocationPane
        ready={ready}
        placeLabel={inputs.placeLabel}
        lat={inputs.lat}
        lon={inputs.lon}
        facing={inputs.facing}
        roomDepth={inputs.roomDepth}
        recenter={recenter}
        locateLabel={locateLabel}
        active={mapActive}
        showHints={showHints}
        onUserEdit={onUserEdit}
        onPick={onPick}
        onLocation={onLocation}
        onLocate={onLocate}
        onExpand={onExpand}
      />
      <div className="meta-row">
        <span>
          Lat {inputs.lat.toFixed(4)}, Lon {inputs.lon.toFixed(4)}
        </span>
        <span>{model.tz.label}</span>
      </div>
      {showHints ? (
        <p className="hint">
          Search worldwide, or click the map. First visit uses your location if the browser
          allows it; otherwise Sydney Opera House. Larger opens a wide map with search and the
          facing slider.
        </p>
      ) : null}
      <SliderField
        id="in-facing"
        label="Glass door faces"
        value={inputs.facing}
        min={0}
        max={359}
        step={1}
        display={formatFacing(inputs.facing).label}
        hint="Turn the slider until your glass door faces up on the map. The copper house’s cyan edge is the glass. Click or drag the pin to set the site."
        showHint={showHints}
        onChange={onFacing}
      />
    </section>
  )
}
