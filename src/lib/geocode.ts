import { OPERA_HOUSE } from './model'

export type PlaceHit = {
  display_name: string
  lat: number
  lon: number
}

type EsriCandidate = {
  address?: string
  score?: number
  location?: { x?: number; y?: number }
}

type EsriResponse = {
  candidates?: EsriCandidate[]
}

type NominatimHit = {
  display_name?: string
  lat?: string
  lon?: string
}

/** OSM wants an identifying UA. Browsers may strip User-Agent; still send it. */
export const NOMINATIM_HEADERS: HeadersInit = {
  Accept: 'application/json',
  'Accept-Language': 'en',
  'User-Agent': 'sun-reach/1.2 (https://github.com/mKlus/sun-reach)',
}

const OPERA_HINT: PlaceHit = {
  display_name: 'Sydney Opera House',
  lat: OPERA_HOUSE.lat,
  lon: OPERA_HOUSE.lon,
}

/** Offline hint for the documented fallback site. */
export function localPlaceHints(query: string): PlaceHit[] {
  const q = query.trim().toLowerCase()
  if (q.length < 3) return []
  if (/opera house/.test(q) || /\bbennelong\b/.test(q)) return [OPERA_HINT]
  return []
}

export function parseEsriCandidates(data: unknown): PlaceHit[] {
  const candidates = (data as EsriResponse | null)?.candidates
  if (!Array.isArray(candidates)) return []
  const hits: PlaceHit[] = []
  const seen = new Set<string>()
  for (const item of candidates) {
    const lat = Number(item.location?.y)
    const lon = Number(item.location?.x)
    const label = item.address?.trim()
    if (!label || !Number.isFinite(lat) || !Number.isFinite(lon)) continue
    if ((item.score ?? 0) < 50) continue
    const key = `${label.toLowerCase()}|${lat.toFixed(5)}|${lon.toFixed(5)}`
    if (seen.has(key)) continue
    seen.add(key)
    hits.push({ display_name: label, lat, lon })
  }
  return hits
}

export function parseNominatimHits(data: unknown): PlaceHit[] {
  if (!Array.isArray(data)) return []
  const hits: PlaceHit[] = []
  const seen = new Set<string>()
  for (const raw of data as NominatimHit[]) {
    const lat = Number.parseFloat(String(raw.lat ?? ''))
    const lon = Number.parseFloat(String(raw.lon ?? ''))
    const label = raw.display_name?.trim()
    if (!label || !Number.isFinite(lat) || !Number.isFinite(lon)) continue
    const key = `${lat.toFixed(5)}|${lon.toFixed(5)}`
    if (seen.has(key)) continue
    seen.add(key)
    hits.push({ display_name: label, lat, lon })
  }
  return hits
}

export function mergePlaceHits(...lists: PlaceHit[][]): PlaceHit[] {
  const out: PlaceHit[] = []
  const seen = new Set<string>()
  for (const list of lists) {
    for (const hit of list) {
      const key = `${hit.lat.toFixed(5)}|${hit.lon.toFixed(5)}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push(hit)
    }
  }
  return out.slice(0, 6)
}

async function searchEsri(query: string, signal?: AbortSignal): Promise<PlaceHit[]> {
  const url =
    'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates' +
    `?f=json&outSR=4326&maxLocations=8&SingleLine=${encodeURIComponent(query)}`
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error('search failed')
  return parseEsriCandidates(await res.json())
}

async function searchNominatim(query: string, signal?: AbortSignal): Promise<PlaceHit[]> {
  const url =
    'https://nominatim.openstreetmap.org/search?format=json&limit=6&addressdetails=0' +
    `&q=${encodeURIComponent(query)}`
  const res = await fetch(url, {
    signal,
    headers: NOMINATIM_HEADERS,
  })
  if (!res.ok) throw new Error('search failed')
  return parseNominatimHits(await res.json())
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<PlaceHit[]> {
  const hints = localPlaceHints(query)
  let remote: PlaceHit[] = []
  try {
    remote = await searchEsri(query, signal)
    if (remote.length === 0) remote = await searchNominatim(query, signal)
  } catch {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    try {
      remote = await searchNominatim(query, signal)
    } catch {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      if (hints.length === 0) throw new Error('search failed')
    }
  }
  return mergePlaceHits(hints, remote)
}
