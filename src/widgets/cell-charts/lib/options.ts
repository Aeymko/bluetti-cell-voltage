import { cellStats, type Reading } from '@/entities/reading'
import { baseChartOptions, type ChartPalette, timeAxis, valueAxis } from '@/shared/lib/echarts'

const GRID = { left: 4, right: 12, top: 28, bottom: 8, containLabel: true }

const showSymbols = (readings: Reading[]) => readings.length < 40

export function voltageOptions(readings: Reading[], p: ChartPalette) {
  const base = baseChartOptions(p)
  const cellCount = Math.max(...readings.map((r) => r.cells.length))
  return {
    ...base,
    color: p.cells,
    grid: { ...GRID, bottom: 40 },
    tooltip: {
      ...base.tooltip,
      trigger: 'axis',
      order: 'valueDesc',
      valueFormatter: (v: number) => `${v} mV`,
    },
    legend: {
      type: 'scroll',
      bottom: 0,
      icon: 'roundRect',
      itemWidth: 12,
      itemHeight: 4,
      textStyle: { color: p.text },
      pageTextStyle: { color: p.text },
    },
    xAxis: timeAxis(p),
    yAxis: valueAxis(p, { name: 'mV', nameTextStyle: { color: p.text } }),
    dataZoom: [{ type: 'inside' }],
    series: Array.from({ length: cellCount }, (_, i) => ({
      name: `Cell ${i + 1}`,
      type: 'line',
      showSymbol: showSymbols(readings),
      symbolSize: 5,
      lineStyle: { width: 1.75 },
      emphasis: { focus: 'series', lineStyle: { width: 3 } },
      data: readings.map((r) => [r.ts, r.cells[i] ?? null]),
    })),
  }
}

export function deltaOptions(readings: Reading[], p: ChartPalette) {
  const base = baseChartOptions(p)
  return {
    ...base,
    grid: GRID,
    tooltip: { ...base.tooltip, trigger: 'axis' },
    legend: {
      top: 0,
      right: 0,
      icon: 'roundRect',
      itemWidth: 12,
      itemHeight: 4,
      textStyle: { color: p.text },
    },
    xAxis: timeAxis(p),
    yAxis: [
      valueAxis(p, { min: 0, name: 'mV', nameTextStyle: { color: p.text } }),
      valueAxis(p, {
        min: 0,
        max: 100,
        position: 'right',
        splitLine: { show: false },
        axisLabel: { color: p.text, formatter: '{value}%' },
      }),
    ],
    dataZoom: [{ type: 'inside' }],
    series: [
      {
        name: 'Delta',
        type: 'line',
        showSymbol: showSymbols(readings),
        symbolSize: 5,
        itemStyle: { color: p.accent },
        lineStyle: { width: 2.25, color: p.accent },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: p.accentSoft },
              { offset: 1, color: 'rgba(0,0,0,0)' },
            ],
          },
        },
        tooltip: { valueFormatter: (v: number) => `${v} mV` },
        data: readings.map((r) => [r.ts, cellStats(r.cells).delta]),
      },
      {
        name: 'SOC',
        type: 'line',
        yAxisIndex: 1,
        showSymbol: false,
        itemStyle: { color: p.neutral },
        lineStyle: { width: 1.5, type: 'dashed', color: p.neutral },
        tooltip: { valueFormatter: (v: number) => `${v}%` },
        data: readings.map((r) => [r.ts, r.soc]),
      },
    ],
  }
}

export function deviationOptions(reading: Reading, p: ChartPalette) {
  const base = baseChartOptions(p)
  const { avg } = cellStats(reading.cells)
  const deviation = reading.cells.map((v) => Math.round((v - avg) * 10) / 10)
  return {
    ...base,
    grid: GRID,
    tooltip: {
      ...base.tooltip,
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (items: { dataIndex: number }[]) => {
        const i = items[0].dataIndex
        const d = deviation[i]
        return `Cell ${i + 1}<br/><b>${reading.cells[i]} mV</b> (${d > 0 ? '+' : ''}${d})`
      },
    },
    xAxis: {
      type: 'category',
      data: reading.cells.map((_, i) => String(i + 1)),
      axisLine: { lineStyle: { color: p.axis } },
      axisTick: { show: false },
      axisLabel: { color: p.text },
    },
    yAxis: valueAxis(p, { scale: false, name: 'mV vs avg', nameTextStyle: { color: p.text } }),
    series: [
      {
        type: 'bar',
        barMaxWidth: 28,
        data: deviation.map((d) => ({
          value: d,
          label: { position: d >= 0 ? 'top' : 'bottom' },
          itemStyle: {
            color: d >= 0 ? p.accent : p.neutral,
            borderRadius: d >= 0 ? [6, 6, 0, 0] : [0, 0, 6, 6],
          },
        })),
        label: {
          show: true,
          color: p.text,
          fontSize: 11,
          formatter: ({ value }: { value: number }) => (value > 0 ? '+' : '') + value,
        },
      },
    ],
  }
}
