import { useEffect, useState } from 'react'

// Measures the width of an element and updates when it changes (window resize, rotation...).
// Charts draw at this real size, so their text stays the same size on phones and desktops.
//   const [ref, width] = useWidth<HTMLDivElement>(960)
//   <div ref={ref}>...</div>
//
// The ref is a callback that stores the element in state, so measuring also starts when the
// element appears later (e.g. a chart that first renders "—" and gets its data afterwards).
export function useWidth<T extends HTMLElement>(fallback: number) {
  const [element, setElement] = useState<T | null>(null)
  const [width, setWidth] = useState(fallback)

  useEffect(() => {
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width) || fallback))
    observer.observe(element)
    return () => observer.disconnect()
  }, [element, fallback])

  return [setElement, width] as const
}
