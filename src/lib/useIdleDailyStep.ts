import { useEffect, useRef, useState } from 'react'

/** Coarse 5-minute walk while sliders move; 1-minute walk after idle. */
export function useIdleDailyStep(depsKey: string, delayMs = 280): number {
  const prevKey = useRef(depsKey)
  const [step, setStep] = useState(1)
  const first = useRef(true)
  const moved = prevKey.current !== depsKey
  if (moved) prevKey.current = depsKey

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    setStep(5)
    const t = window.setTimeout(() => setStep(1), delayMs)
    return () => window.clearTimeout(t)
  }, [depsKey, delayMs])

  return moved ? 5 : step
}
