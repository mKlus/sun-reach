import { useEffect, useState } from 'react'
import { applySectionTokens } from './tokens'

export type ThemePref = 'auto' | 'dark' | 'light'
export type ThemeResolved = 'dark' | 'light'

export const THEME_KEY = 'sun-reach-theme'
const LEGACY_THEME_KEY = 'sun-penetration-theme'
export const THEME_COLOR = {
  dark: '#0b0907',
  light: '#efe8dc',
} as const

export function parseThemePref(raw: unknown): ThemePref {
  return raw === 'dark' || raw === 'light' || raw === 'auto' ? raw : 'auto'
}

export function loadThemePref(): ThemePref {
  try {
    return parseThemePref(localStorage.getItem(THEME_KEY) ?? localStorage.getItem(LEGACY_THEME_KEY))
  } catch {
    return 'auto'
  }
}

export function saveThemePref(pref: ThemePref): void {
  try {
    localStorage.setItem(THEME_KEY, pref)
  } catch {
    /* quota / private mode */
  }
}

export function systemTheme(): ThemeResolved {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function resolveTheme(pref: ThemePref): ThemeResolved {
  return pref === 'auto' ? systemTheme() : pref
}

export function applyTheme(pref: ThemePref): ThemeResolved {
  const resolved = resolveTheme(pref)
  if (typeof document === 'undefined') return resolved
  const root = document.documentElement
  root.dataset.theme = pref
  root.style.colorScheme = resolved
  applySectionTokens(resolved, root.style)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', THEME_COLOR[resolved])
  return resolved
}

export function resolvedThemeFromDom(): ThemeResolved {
  if (typeof document === 'undefined') return 'dark'
  return resolveTheme(parseThemePref(document.documentElement.dataset.theme))
}

export function useResolvedTheme(): ThemeResolved {
  const [resolved, setResolved] = useState<ThemeResolved>(resolvedThemeFromDom)

  useEffect(() => {
    const sync = () => setResolved(resolvedThemeFromDom())
    sync()
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', sync)
    const obs = new MutationObserver(sync)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => {
      mq.removeEventListener('change', sync)
      obs.disconnect()
    }
  }, [])

  return resolved
}

export function useThemePref(): [ThemePref, (pref: ThemePref) => void] {
  const [pref, setPref] = useState<ThemePref>(() => {
    if (typeof document === 'undefined') return 'auto'
    return parseThemePref(document.documentElement.dataset.theme)
  })

  useEffect(() => {
    const stored = loadThemePref()
    setPref(stored)
    applyTheme(stored)
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      if (loadThemePref() === 'auto') applyTheme('auto')
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  function choose(next: ThemePref) {
    setPref(next)
    saveThemePref(next)
    applyTheme(next)
  }

  return [pref, choose]
}
