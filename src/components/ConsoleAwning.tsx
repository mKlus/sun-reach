import type { CalcModel, Inputs } from '../lib/model'
import {
  DOOR_HEIGHT_MAX,
  DOOR_HEIGHT_MIN,
  END_HEIGHT_MAX,
  END_HEIGHT_MIN,
  HOUSE_ROOF_SLOPE_MAX,
  HOUSE_ROOF_SLOPE_MIN,
  PROJECTION_MAX,
  PROJECTION_MIN,
  ROOM_DEPTH_MAX,
  ROOM_DEPTH_MIN,
  SLOPE_MAX,
  SLOPE_MIN,
  WALL_HEIGHT_MAX,
  WALL_HEIGHT_MIN,
} from '../lib/model'
import { SliderField } from './SliderField'

type ConsoleAwningProps = {
  inputs: Inputs
  model: CalcModel
  showHints: boolean
  onProjection: (projection: number) => void
  onWallHeight: (heightWall: number) => void
  onEndHeight: (heightEnd: number) => void
  onSlope: (slope: number) => void
  onDoorHeight: (doorHeight: number) => void
  onRoomDepth: (roomDepth: number) => void
  onEaveProjection: (eaveProjection: number) => void
  onEaveHeight: (eaveHeightWall: number) => void
  onHouseRoofSlope: (houseRoofSlope: number) => void
}

export function ConsoleAwning({
  inputs,
  model,
  showHints,
  onProjection,
  onWallHeight,
  onEndHeight,
  onSlope,
  onDoorHeight,
  onRoomDepth,
  onEaveProjection,
  onEaveHeight,
  onHouseRoofSlope,
}: ConsoleAwningProps) {
  return (
    <section className="block">
      <h2>
        <span className="idx">03</span> Awning &amp; door
      </h2>
      <SliderField
        id="in-al"
        label="Awning projection"
        value={inputs.projection}
        min={PROJECTION_MIN}
        max={PROJECTION_MAX}
        step={0.1}
        display={`${inputs.projection.toFixed(1)} m`}
        hint="Horizontal distance from the wall to the outer edge — not the rafter length."
        showHint={showHints}
        onChange={onProjection}
      />
      <div className="slider-group">
        <p className="group-title">Awning heights</p>
        <SliderField
          id="in-ah"
          label="Awning height at wall"
          value={inputs.heightWall}
          min={WALL_HEIGHT_MIN}
          max={WALL_HEIGHT_MAX}
          step={0.05}
          display={`${inputs.heightWall.toFixed(2)} m`}
          hint="Underside where the roof meets the house."
          showHint={showHints}
          onChange={onWallHeight}
        />
        <SliderField
          id="in-ae"
          label="Awning height at end"
          value={Math.max(END_HEIGHT_MIN, Math.min(END_HEIGHT_MAX, model.reach.heightEnd))}
          min={END_HEIGHT_MIN}
          max={END_HEIGHT_MAX}
          step={0.05}
          display={model.reach.heightEnd > 0 ? `${model.reach.heightEnd.toFixed(2)} m` : 'Below ground'}
          hint="Outer edge above the floor. Move either height — the other follows from the slope."
          showHint={showHints}
          onChange={onEndHeight}
        />
      </div>
      <SliderField
        id="in-slope"
        label="Awning roof slope"
        value={inputs.slope}
        min={SLOPE_MIN}
        max={SLOPE_MAX}
        step={0.5}
        display={`${inputs.slope.toFixed(1)}°`}
        hint="Fall away from the wall, in degrees. 0° is flat. Changing slope drops or lifts the outer end."
        showHint={showHints}
        onChange={onSlope}
      />
      <SliderField
        id="in-dh"
        label="Door / glass height"
        value={inputs.doorHeight}
        min={DOOR_HEIGHT_MIN}
        max={DOOR_HEIGHT_MAX}
        step={0.05}
        display={`${inputs.doorHeight.toFixed(2)} m`}
        onChange={onDoorHeight}
      />
      <div className="slider-group">
        <p className="group-title">House</p>
        <SliderField
          id="in-rd"
          label="House width"
          value={inputs.roomDepth}
          min={ROOM_DEPTH_MIN}
          max={ROOM_DEPTH_MAX}
          step={0.1}
          display={`${inputs.roomDepth.toFixed(1)} m`}
          hint="Front wall to back wall. Sun that reaches this far climbs the end wall — that wall height still counts. Also sets the house-roof span."
          showHint={showHints}
          onChange={onRoomDepth}
        />
        <SliderField
          id="in-ep"
          label="Eave projection"
          value={inputs.eaveProjection}
          min={PROJECTION_MIN}
          max={PROJECTION_MAX}
          step={0.05}
          display={`${inputs.eaveProjection.toFixed(2)} m`}
          hint="Typical eave past the wall. Default 0.60 m. Dashed year-chart curve."
          showHint={showHints}
          onChange={onEaveProjection}
        />
        <SliderField
          id="in-eh"
          label="Eave height at wall"
          value={inputs.eaveHeightWall}
          min={WALL_HEIGHT_MIN}
          max={WALL_HEIGHT_MAX}
          step={0.05}
          display={`${inputs.eaveHeightWall.toFixed(2)} m`}
          hint="Underside of the eave at the wall. Default 2.30 m — often lower than a patio roof."
          showHint={showHints}
          onChange={onEaveHeight}
        />
        <SliderField
          id="in-hrs"
          label="House roof slope"
          value={inputs.houseRoofSlope}
          min={HOUSE_ROOF_SLOPE_MIN}
          max={HOUSE_ROOF_SLOPE_MAX}
          step={0.5}
          display={`${inputs.houseRoofSlope.toFixed(1)}°`}
          hint="Pitch from the eave to the ridge. Default 15°."
          showHint={showHints}
          onChange={onHouseRoofSlope}
        />
      </div>
    </section>
  )
}
