import type { CSSProperties } from 'react'

type SliderFieldProps = {
  id: string
  label: string
  value: number
  min: number
  max: number
  step: number
  display: string
  hint?: string
  showHint?: boolean
  disabled?: boolean
  onChange: (value: number) => void
}

export function SliderField({
  id,
  label,
  value,
  min,
  max,
  step,
  display,
  hint,
  showHint = true,
  disabled = false,
  onChange,
}: SliderFieldProps) {
  const span = max - min
  const fill = span === 0 ? 0 : ((value - min) / span) * 100

  return (
    <div className={`field${disabled ? ' is-disabled' : ''}`}>
      <label className="ctrl" htmlFor={id}>
        {label}
        <span className="value">{display}</span>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        style={{ '--fill': `${fill}%` } as CSSProperties}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {hint && showHint ? <p className="hint">{hint}</p> : null}
    </div>
  )
}
