import { useEffect, useRef, useState } from 'react'
import { type RecenterTarget } from '../components/SiteMap'
import {
  DEFAULT_INPUTS,
  YEAR,
  applyDaylightClamp,
  clampInputs,
  hasStoredInputs,
  loadInputs,
  resetInputs,
  saveInputs,
  setHeightEnd,
  setHeightWall,
  type Inputs,
} from './model'
import { NOMINATIM_HEADERS } from './geocode'
import { mergeScene, parseSceneSearch, replaceSceneUrl } from './scene'
import { dayOfYearOn, siteCivilNow } from './solar'

export type DatePreset = 'today' | 'winter' | 'summer' | 'noon'

export function useStudioSession() {
  const [inputs, setInputs] = useState<Inputs>(DEFAULT_INPUTS)
  const [ready, setReady] = useState(false)
  const [recenter, setRecenter] = useState<RecenterTarget>({
    id: 0,
    lat: DEFAULT_INPUTS.lat,
    lon: DEFAULT_INPUTS.lon,
  })
  const [locateLabel, setLocateLabel] = useState('Use my location')
  const placeTouchedRef = useRef(false)
  const locateAbortRef = useRef<AbortController | null>(null)

  function patch(partial: Partial<Inputs>) {
    setInputs((s) => clampInputs({ ...s, ...partial }))
  }

  function setLocation(
    lat: number,
    lon: number,
    shouldRecenter: boolean,
    label?: string,
    extra?: Partial<Inputs>,
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
    const next = resetInputs()
    setInputs(next)
    setRecenter((prev) => ({
      id: prev.id + 1,
      lat: next.lat,
      lon: next.lon,
    }))
    locateDevice({ announce: false, stampNow: true })
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
    patch({ timeMinutes: 720 })
  }

  function changeWallHeight(heightWall: number) {
    setInputs((s) => applyDaylightClamp(setHeightWall(s, heightWall)))
  }

  function changeEndHeight(heightEnd: number) {
    setInputs((s) => applyDaylightClamp(setHeightEnd(s, heightEnd)))
  }

  useEffect(() => {
    const hadStore = hasStoredInputs()
    const fromUrl = parseSceneSearch(window.location.search)
    const stored = loadInputs()
    const start = fromUrl ? mergeScene(hadStore ? stored : DEFAULT_INPUTS, fromUrl) : stored
    setInputs(start)
    setRecenter({ id: 0, lat: start.lat, lon: start.lon })
    setReady(true)
    if (!hadStore && !fromUrl) locateDevice({ announce: false })
  }, [])

  useEffect(() => {
    if (ready) saveInputs(inputs)
  }, [inputs, ready])

  useEffect(() => {
    if (!ready) return
    const t = window.setTimeout(() => replaceSceneUrl(inputs), 350)
    return () => window.clearTimeout(t)
  }, [inputs, ready])

  return {
    inputs,
    setInputs,
    patch,
    ready,
    recenter,
    locateLabel,
    markPlaceTouched,
    setLocation,
    locateDevice,
    resetDefaults,
    applyPreset,
    changeWallHeight,
    changeEndHeight,
  }
}
