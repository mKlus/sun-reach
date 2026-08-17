import type { ThemePref } from '../lib/theme'

const OPTIONS: { id: ThemePref; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'dark', label: 'Dark' },
  { id: 'light', label: 'Light' },
]

type ThemeSwitchProps = {
  value: ThemePref
  onChange: (pref: ThemePref) => void
}

export function ThemeSwitch({ value, onChange }: ThemeSwitchProps) {
  return (
    <div className="theme-switch" role="radiogroup" aria-label="Colour theme">
      {OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          role="radio"
          aria-checked={value === opt.id}
          className={value === opt.id ? 'is-on' : undefined}
          onClick={() => onChange(opt.id)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
