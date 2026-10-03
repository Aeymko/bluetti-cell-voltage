import { useStorage } from '@vueuse/core'
import { computed } from 'vue'
import type { Reading } from './reading'

// Same key as the original single-page version, so existing history carries over.
const STORAGE_KEY = 'bluetti-cells-history-v1'

const finiteOrNull = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

/** Validates untrusted input (localStorage or an imported file) and keeps only known fields. */
export function sanitizeReading(r: unknown): Reading | null {
  if (!r || typeof r !== 'object') return null
  const o = r as Record<string, unknown>
  const cells = o.cells
  if (typeof o.ts !== 'number' || !Number.isFinite(o.ts)) return null
  if (!Array.isArray(cells) || cells.length === 0 || cells.length > 32) return null
  if (!cells.every((v) => Number.isInteger(v) && v >= 0 && v < 10000)) return null
  return {
    ts: o.ts,
    model: typeof o.model === 'string' ? o.model.slice(0, 40) : '',
    cells: cells as number[],
    soc: finiteOrNull(o.soc),
    current: finiteOrNull(o.current),
    mode: finiteOrNull(o.mode),
    label: typeof o.label === 'string' ? o.label.slice(0, 200) : '',
  }
}

function parse(raw: string): Reading[] {
  try {
    const data: unknown = JSON.parse(raw)
    if (!Array.isArray(data)) return []
    return data.map(sanitizeReading).filter((r): r is Reading => r !== null)
  } catch {
    return []
  }
}

const stored = useStorage<Reading[]>(STORAGE_KEY, [], localStorage, {
  serializer: { read: parse, write: (v) => JSON.stringify(v) },
})

const sortByTime = (list: Reading[]) => [...list].sort((a, b) => a.ts - b.ts)

export const history = computed(() => stored.value)

export function addReading(reading: Reading, label = ''): void {
  stored.value = sortByTime([...stored.value.filter((r) => r.ts !== reading.ts), { ...reading, label }])
}

export function removeReading(ts: number): void {
  stored.value = stored.value.filter((r) => r.ts !== ts)
}

export function clearHistory(): void {
  stored.value = []
}

/** Merges readings by timestamp; returns how many were accepted. */
export function mergeReadings(incoming: unknown[]): number {
  const valid = incoming.map(sanitizeReading).filter((r): r is Reading => r !== null)
  const byTs = new Map(stored.value.map((r) => [r.ts, r]))
  for (const r of valid) byTs.set(r.ts, r)
  stored.value = sortByTime([...byTs.values()])
  return valid.length
}
