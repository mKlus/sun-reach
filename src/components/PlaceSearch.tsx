import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { searchPlaces, type PlaceHit } from '../lib/geocode'

export type { PlaceHit }

type PlaceSearchProps = {
  value: string
  onPick: (lat: number, lon: number, label: string) => void
  onUserEdit?: () => void
}

export function PlaceSearch({ value, onPick, onUserEdit }: PlaceSearchProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const focusedRef = useRef(false)
  const [query, setQuery] = useState(value)
  const [engaged, setEngaged] = useState(false)
  const [hits, setHits] = useState<PlaceHit[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!focusedRef.current) setQuery(value)
  }, [value])

  useEffect(() => {
    const q = query.trim()
    if (!engaged || q.length < 3) {
      setHits([])
      setOpen(false)
      setError(null)
      return
    }

    const ac = new AbortController()
    const timer = window.setTimeout(() => {
      searchPlaces(q, ac.signal)
        .then((data) => {
          setHits(data)
          setError(null)
          setActive(data.length > 0 ? 0 : -1)
          setOpen(true)
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === 'AbortError') return
          setHits([])
          setError('Search unavailable — click the map instead')
          setOpen(true)
        })
    }, 280)

    return () => {
      ac.abort()
      window.clearTimeout(timer)
    }
  }, [query, engaged])

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false)
        focusedRef.current = false
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  function choose(item: PlaceHit) {
    focusedRef.current = false
    setEngaged(false)
    setQuery(item.display_name)
    setOpen(false)
    setHits([])
    onPick(item.lat, item.lon, item.display_name)
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setOpen(false)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open && hits.length) setOpen(true)
      setActive((i) => Math.min(hits.length - 1, i + 1))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(0, i - 1))
      return
    }
    if (e.key === 'Enter') {
      const item = (active >= 0 ? hits[active] : hits[0]) ?? null
      if (item) {
        e.preventDefault()
        choose(item)
      }
    }
  }

  return (
    <div className="search-container" ref={rootRef}>
      <input
        type="search"
        value={query}
        placeholder="Sydney Opera House"
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="search"
        aria-label="Search location"
        aria-expanded={open}
        aria-controls="search-results"
        onFocus={() => {
          focusedRef.current = true
          setEngaged(true)
        }}
        onChange={(e) => {
          focusedRef.current = true
          setEngaged(true)
          setQuery(e.target.value)
          onUserEdit?.()
        }}
        onKeyDown={onKeyDown}
      />
      {open ? (
        <div id="search-results" className="search-results" role="listbox">
          {error ? <div className="search-empty">{error}</div> : null}
          {!error && hits.length === 0 ? <div className="search-empty">No matches</div> : null}
          {hits.map((item, i) => (
            <div
              key={`${item.lat},${item.lon},${item.display_name}`}
              className={`search-result-item${i === active ? ' active' : ''}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(ev) => {
                ev.preventDefault()
                choose(item)
              }}
            >
              {item.display_name}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
