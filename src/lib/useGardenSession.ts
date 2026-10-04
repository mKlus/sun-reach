import { useEffect, useRef, useState } from 'react'
import type { RecenterTarget } from '../components/SiteMap'
import { NOMINATIM_HEADERS } from './geocode'
import {
  clampGardenInputs,
  DEFAULT_GARDEN_INPUTS,
  loadGardenInputs,
  saveGardenInputs,
  type GardenConfig,
  type GardenInputs,
  type TreeConfig,
} from './gardenModel'
import { YEAR } from './model'
import { dayOfYearOn, getDaylight, getTimezone, siteCivilNow } from './solar'
import type { DatePreset } from './useStudioSession'

export function useGardenSession(initialInputs?: Partial<GardenInputs>) {
  const [inputs, setInputs] = useState<GardenInputs>(() => {
    const loaded = loadGardenInputs()
    return initialInputs ? clampGardenInputs({ ...loaded, ...initialInputs }) : loaded
  })
  const [ready, setReady] = useState(false)
  const [recenter, setRecenter] = useState<RecenterTarget>({
    id: 0,
    lat: DEFAULT_GARDEN_INPUTS.lat,
    lon: DEFAULT_GARDEN_INPUTS.lon,
  })
  const [locateLabel, setLocateLabel] = useState('Use my location')
  const placeTouchedRef = useRef(false)
  const locateAbortRef = useRef<AbortController | null>(null)

  function patch(partial: Partial<GardenInputs>) {
    setInputs((prev) => clampGardenInputs({ ...prev, ...partial }))
  }

  function patchTree(partial: Partial<TreeConfig>) {
    setInputs((prev) =>
      clampGardenInputs({
        ...prev,
        tree: { ...prev.tree, ...partial },
      }),
    )
  }

  function patchGarden(partial: Partial<GardenConfig>) {
    setInputs((prev) =>
      clampGardenInputs({
        ...prev,
        garden: { ...prev.garden, ...partial },
      }),
    )
  }

  function setLocation(
    lat: number,
    lon: number,
    shouldRecenter: boolean,
    label?: string,
    extra?: Partial<GardenInputs>,
  ) {
    patch({
      lat,
      lon,
      placeLabel: label ?? `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
      ...extra,
    })
    if (shouldRecenter) {
      setRecenter((prev) => ({ id: prev.id + 1, lat, lon }))
    }
  }

  function markPlaceTouched() {
    placeTouchedRef.current = true
    locateAbortRef.current?.abort()
  }

  function locateDevice(opts?: { announce?: boolean; stampNow?: boolean }) {
    const announce = opts?.announce !== false
    if (!navigator.geolocation) {
      if (announce) {
        setLocateLabel('Location blocked')
        window.setTimeout(() => setLocateLabel('Use my location'), 1800)
      }
      return
    }
    if (announce) setLocateLabel('Locating…')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (placeTouchedRef.current && !announce) return
        const lat = pos.coords.latitude
        const lon = pos.coords.longitude
        setLocateLabel('Use my location')
        setLocation(
          lat,
          lon,
          true,
          'Current location',
          opts?.stampNow ? siteCivilNow(lat, lon) : undefined,
        )
        locateAbortRef.current?.abort()
        const ac = new AbortController()
        locateAbortRef.current = ac
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
        fetch(url, {
          signal: ac.signal,
          headers: NOMINATIM_HEADERS,
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((data: { display_name?: string } | null) => {
            if (placeTouchedRef.current || ac.signal.aborted) return
            if (data?.display_name) patch({ placeLabel: data.display_name })
          })
          .catch(() => {
            /* keep Current location */
          })
      },
      () => {
        if (announce) {
          setLocateLabel('Location blocked')
          window.setTimeout(() => setLocateLabel('Use my location'), 1800)
        }
      },
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }

  function resetDefaults() {
    placeTouchedRef.current = false
    const now = new Date()
    const civil = siteCivilNow(DEFAULT_GARDEN_INPUTS.lat, DEFAULT_GARDEN_INPUTS.lon, now)
    const next = clampGardenInputs({
      ...DEFAULT_GARDEN_INPUTS,
      ...civil,
    })
    setInputs(next)
    setRecenter((prev) => ({
      id: prev.id + 1,
      lat: next.lat,
      lon: next.lon,
    }))
  }

  function applyPreset(kind: DatePreset) {
    if (kind === 'today') {
      patch(siteCivilNow(inputs.lat, inputs.lon))
      return
    }
    if (kind === 'winter') {
      patch({
        dayOfYear: inputs.lat < 0 ? dayOfYearOn(YEAR, 6, 21) : dayOfYearOn(YEAR, 12, 21),
      })
      return
    }
    if (kind === 'summer') {
      patch({
        dayOfYear: inputs.lat < 0 ? dayOfYearOn(YEAR, 12, 21) : dayOfYearOn(YEAR, 6, 21),
      })
      return
    }
    // Noon
    patch({ timeMinutes: 720 })
  }

  // Daylight clamp
  function setClock(timeMinutes: number) {
    const tz = getTimezone(inputs.lat, inputs.lon, YEAR, 1, 1)
    const daylight = getDaylight(inputs.lat, inputs.lon, YEAR, 1, 1, tz.hours)
    const min = daylight.polar === 'night' ? 0 : daylight.sunriseMin
    const max = daylight.polar === 'night' ? 0 : daylight.sunsetMin
    patch({
      timeMinutes: Math.min(max, Math.max(min, timeMinutes)),
    })
  }

  useEffect(() => {
    setReady(true)
  }, [])

  useEffect(() => {
    if (ready) saveGardenInputs(inputs)
  }, [inputs, ready])

  return {
    inputs,
    setInputs,
    patch,
    patchTree,
    patchGarden,
    ready,
    recenter,
    locateLabel,
    markPlaceTouched,
    setLocation,
    locateDevice,
    resetDefaults,
    applyPreset,
    setClock,
  }
}
