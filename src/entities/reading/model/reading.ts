import type { Snapshot } from '@/shared/api/bluetti'

export interface Reading extends Snapshot {
  label?: string
}

export interface CellStats {
  min: number
  max: number
  sum: number
  avg: number
  delta: number
}

export function cellStats(cells: number[]): CellStats {
  const min = Math.min(...cells)
  const max = Math.max(...cells)
  const sum = cells.reduce((a, b) => a + b, 0)
  return { min, max, sum, avg: sum / cells.length, delta: max - min }
}

const MODE_LABELS: Record<number, string> = { 0: 'Idle', 1: 'Charging', 2: 'Discharging' }

export function modeLabel(mode: number | null | undefined): string {
  if (mode === null || mode === undefined) return '—'
  return MODE_LABELS[mode] ?? `Code ${mode}`
}
