import { useEffect, useState, type RefObject } from 'react'

/** SVG user-units so text paints at `screenPx` CSS pixels after viewBox scale. */
export function useSvgScreenFont(
  svgRef: RefObject<SVGSVGElement | null>,
  viewBoxW: number,
  screenPx = 12,
): number {
  const [userPx, setUserPx] = useState(screenPx)

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const sync = () => {
      const w = svg.getBoundingClientRect().width
      if (w > 0) setUserPx(screenPx * (viewBoxW / w))
    }
    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(svg)
    return () => ro.disconnect()
  }, [screenPx, svgRef, viewBoxW])

  return userPx
}
