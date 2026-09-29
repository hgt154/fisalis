import { useEffect, useRef, useState } from 'react'

// Measures the width of an element and updates when it changes (window resize, rotation...).
// Charts draw at this real size, so their text stays the same size on phones and desktops.
//   const [ref, width] = useWidth<HTMLDivElement>(960)
//   <div ref={ref}>...</div>
export function useWidth<T extends HTMLElement>(fallback: number) {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(fallback)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width) || fallback))
    observer.observe(element)
    return () => observer.disconnect()
  }, [fallback])

  return [ref, width] as const
}
