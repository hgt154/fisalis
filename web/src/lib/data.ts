import { useEffect, useState } from 'react'

// Files already downloaded are kept here, so each file is fetched only once.
const cache = new Map<string, unknown>()

export async function loadJson<T>(path: string): Promise<T> {
  if (cache.has(path)) return cache.get(path) as T
  const response = await fetch(`${import.meta.env.BASE_URL}data/${path}`)
  if (!response.ok) throw new Error(`Could not load ${path} (${response.status})`)
  const json = (await response.json()) as T
  cache.set(path, json)
  return json
}

interface State<T> {
  path: string | null
  data: T | null
  error: Error | null
}

// React hook: const { data, loading, error } = useJson<Country[]>('countries.json')
export function useJson<T>(path: string) {
  const [state, setState] = useState<State<T>>({ path: null, data: null, error: null })

  useEffect(() => {
    let cancelled = false
    loadJson<T>(path)
      .then((data) => { if (!cancelled) setState({ path, data, error: null }) })
      .catch((error: Error) => { if (!cancelled) setState({ path, data: null, error }) })
    return () => { cancelled = true }
  }, [path])

  const current = state.path === path
  return {
    data: current ? state.data : null,
    error: current ? state.error : null,
    loading: !current,
  }
}