import type { ThemeResolved } from './theme'

export type SectionPalette = {
  sky0: string
  sky1: string
  sky2: string
  glow: string
  dirt: string
  floor: string
  plank: string
  groundLine: string
  indoor: string
  wall: string
  wallEdge: string
  wallLite: string
  roof: string
  roofEdge: string
  roofLite: string
  awning: string
  awningTop: string
  awningShadow: string
  post: string
  glass0: string
  glass1: string
  glassLite: string
  dim: string
  dimText: string
  label: string
  chip: string
  chipText: string
  ray: string
  wash0: string
  wash1: string
  enter: string
}

/** One map for the house-section paint and for CSS custom properties. */
export const SECTION_PALETTE: Record<ThemeResolved, SectionPalette> = {
  light: {
    sky0: '#8fb8c8',
    sky1: '#d5e4e8',
    sky2: '#f0dcc4',
    glow: 'rgba(255, 186, 90, 0.38)',
    dirt: '#c4ae86',
    floor: '#efe4cf',
    plank: 'rgba(92, 74, 48, 0.16)',
    groundLine: 'rgba(58, 46, 32, 0.35)',
    indoor: '#f4ead8',
    wall: '#e8ddd0',
    wallEdge: '#2a241e',
    wallLite: 'rgba(255, 244, 230, 0.55)',
    roof: '#9a3412',
    roofEdge: '#7c2d12',
    roofLite: '#c2410c',
    awning: '#c2410c',
    awningTop: '#ea580c',
    awningShadow: 'rgba(28, 20, 14, 0.18)',
    post: '#44403c',
    glass0: '#7ad7e6',
    glass1: '#168aa0',
    glassLite: 'rgba(255,255,255,0.32)',
    dim: '#7a7166',
    dimText: '#5c564e',
    label: '#6b6258',
    chip: 'rgba(243, 234, 216, 0.92)',
    chipText: '#7c2d12',
    ray: 'rgba(194, 65, 12, 0.82)',
    wash0: 'rgba(251, 191, 36, 0.1)',
    wash1: 'rgba(251, 191, 36, 0.32)',
    enter: 'rgba(234, 88, 12, 0.78)',
  },
  dark: {
    sky0: '#10161c',
    sky1: '#171e24',
    sky2: '#2a2218',
    glow: 'rgba(255, 138, 60, 0.22)',
    dirt: '#2a241c',
    floor: '#261f18',
    plank: 'rgba(255, 228, 196, 0.07)',
    groundLine: 'rgba(255, 228, 196, 0.16)',
    indoor: '#2e2820',
    wall: '#3f3932',
    wallEdge: '#0e0c0a',
    wallLite: 'rgba(255, 228, 196, 0.12)',
    roof: '#5c2a14',
    roofEdge: '#3d1a0c',
    roofLite: '#8a3d18',
    awning: '#c2410c',
    awningTop: '#ff8a3c',
    awningShadow: 'rgba(0, 0, 0, 0.35)',
    post: '#1a1612',
    glass0: '#3ec8d8',
    glass1: '#0e5f6c',
    glassLite: 'rgba(255,255,255,0.18)',
    dim: '#8a8278',
    dimText: '#9a9086',
    label: '#9a9086',
    chip: 'rgba(18, 16, 14, 0.88)',
    chipText: '#f4ece2',
    ray: 'rgba(255, 138, 60, 0.85)',
    wash0: 'rgba(255, 138, 60, 0.08)',
    wash1: 'rgba(255, 160, 60, 0.24)',
    enter: 'rgba(255, 138, 60, 0.85)',
  },
}

export function applySectionTokens(theme: ThemeResolved, root: CSSStyleDeclaration): void {
  const pal = SECTION_PALETTE[theme]
  for (const [key, value] of Object.entries(pal)) {
    root.setProperty(`--section-${key}`, value)
  }
}
