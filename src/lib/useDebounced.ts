import { useEffect, useState } from 'react'

/** Debounce by value contents, not object identity. */
export function useDebounced<T>(value: T, ms: number): T {
  const key = JSON.stringify(value)
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const next = JSON.parse(key) as T
    const t = window.setTimeout(() => setDebounced(next), ms)
    return () => window.clearTimeout(t)
  }, [key, ms])

  return debounced
}
