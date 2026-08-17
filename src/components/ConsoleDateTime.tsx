import { YEAR, type CalcModel, type Inputs } from '../lib/model'
import type { DatePreset } from '../lib/useStudioSession'
import { formatDate, formatTime } from '../lib/solar'
import { SliderField } from './SliderField'

type ConsoleDateTimeProps = {
  inputs: Inputs
  model: CalcModel
  dayMax: number
  showHints: boolean
  onDay: (dayOfYear: number) => void
  onTime: (timeMinutes: number) => void
  onPreset: (kind: DatePreset) => void
}

export function ConsoleDateTime({
  inputs,
  model,
  dayMax,
  showHints,
  onDay,
  onTime,
  onPreset,
}: ConsoleDateTimeProps) {
  return (
    <section className="block">
      <h2>
        <span className="idx">02</span> Date &amp; time
      </h2>
      <SliderField
        id="in-date"
        label="Day of year"
        value={inputs.dayOfYear}
        min={1}
        max={dayMax}
        step={1}
        display={formatDate(YEAR, inputs.dayOfYear).label}
        onChange={onDay}
      />
      <SliderField
        id="in-time"
        label="Clock time"
        value={inputs.timeMinutes}
        min={model.daylight.polar === 'night' ? 0 : model.daylight.sunriseMin}
        max={model.daylight.polar === 'night' ? 0 : model.daylight.sunsetMin}
        step={1}
        display={formatTime(inputs.timeMinutes).label}
        disabled={model.daylight.polar === 'night'}
        hint={
          model.daylight.polar === 'night'
            ? 'Sun does not rise on this date at this site.'
            : model.daylight.polar === 'day'
              ? 'Sun does not set — the slider covers the whole day.'
              : `Sunrise ${formatTime(model.daylight.sunriseMin).label} – sunset ${formatTime(model.daylight.sunsetMin).label}`
        }
        showHint={showHints}
        onChange={onTime}
      />
      <div className="presets">
        <button type="button" onClick={() => onPreset('today')}>
          Today
        </button>
        <button type="button" onClick={() => onPreset('winter')}>
          Winter solstice
        </button>
        <button type="button" onClick={() => onPreset('summer')}>
          Summer solstice
        </button>
        <button type="button" onClick={() => onPreset('noon')}>
          Noon
        </button>
      </div>
    </section>
  )
}
