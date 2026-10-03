import { cellStats, type Reading } from '@/entities/reading'

const esc = (v: string) => `"${v.replace(/"/g, '""')}"`

export function readingsToCsv(list: Reading[]): string {
  const maxCells = Math.max(0, ...list.map((r) => r.cells.length))
  const cellCols = Array.from({ length: maxCells }, (_, i) => `cell${i + 1}`)
  const lines = [
    ['time', 'model', 'label', ...cellCols, 'avg', 'delta', 'soc', 'mode', 'current_raw'].join(','),
  ]
  for (const r of list) {
    const s = cellStats(r.cells)
    lines.push(
      [
        new Date(r.ts).toISOString(),
        esc(r.model ?? ''),
        esc(r.label ?? ''),
        ...r.cells,
        ...Array(maxCells - r.cells.length).fill(''),
        s.avg.toFixed(1),
        s.delta,
        r.soc ?? '',
        r.mode ?? '',
        r.current ?? '',
      ].join(','),
    )
  }
  return lines.join('\n')
}
