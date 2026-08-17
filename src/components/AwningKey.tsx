import type { Inputs } from '../lib/model'
import { hasCompare } from '../lib/scene'
import { awningEndHeight } from '../lib/solar'

function spec(projection: number, heightWall: number, slope: number): string {
  const end = awningEndHeight(heightWall, projection, slope)
  return `${projection.toFixed(1)} m proj · ${heightWall.toFixed(2)} m wall · ${end.toFixed(2)} m end · ${slope.toFixed(1)}°`
}

export function AwningKey({ inputs }: { inputs: Inputs }) {
  const compareOn = hasCompare(inputs)
  return (
    <ul className="awning-key">
      <li>
        <span className="leg-this">This</span>
        {spec(inputs.projection, inputs.heightWall, inputs.slope)}
      </li>
      <li>
        <span className="leg-eave">Eave</span>
        {spec(inputs.eaveProjection, inputs.eaveHeightWall, 0)}
      </li>
      {compareOn ? (
        <li>
          <span className="leg-compare">Compare</span>
          {spec(
            inputs.compareProjection ?? 0,
            inputs.compareHeightWall ?? inputs.heightWall,
            inputs.compareSlope ?? 0,
          )}
        </li>
      ) : null}
    </ul>
  )
}
