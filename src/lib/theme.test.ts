import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  THEME_KEY,
  loadThemePref,
  parseThemePref,
  resolveTheme,
  saveThemePref,
} from './theme'

const memory = new Map<string, string>()

function mockStorage() {
  memory.clear()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value)
      },
      removeItem: (key: string) => {
        memory.delete(key)
      },
    },
  })
}

afterEach(() => {
  memory.clear()
  vi.unstubAllGlobals()
})

describe('theme preference', () => {
  it('parses only auto, dark, and light', () => {
    expect(parseThemePref('auto')).toBe('auto')
    expect(parseThemePref('dark')).toBe('dark')
    expect(parseThemePref('light')).toBe('light')
    expect(parseThemePref('sepia')).toBe('auto')
    expect(parseThemePref(null)).toBe('auto')
  })

  it('round-trips through localStorage and defaults to auto', () => {
    mockStorage()
    expect(loadThemePref()).toBe('auto')
    saveThemePref('light')
    expect(memory.get(THEME_KEY)).toBe('light')
    expect(loadThemePref()).toBe('light')
  })

  it('resolves auto from the system scheme', () => {
    vi.stubGlobal('window', {
      matchMedia: (query: string) => ({
        matches: query.includes('prefers-color-scheme: dark'),
        media: query,
      }),
    })
    expect(resolveTheme('auto')).toBe('dark')
    expect(resolveTheme('light')).toBe('light')
    expect(resolveTheme('dark')).toBe('dark')
  })
})
