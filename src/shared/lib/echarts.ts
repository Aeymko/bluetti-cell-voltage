import { BarChart, LineChart } from 'echarts/charts'
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  TooltipComponent,
} from 'echarts/components'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { computed } from 'vue'
import { isDark } from './theme'

use([
  BarChart,
  LineChart,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  TooltipComponent,
  CanvasRenderer,
])

export { default as VChart } from 'vue-echarts'

const LIGHT = {
  accent: '#f26b1d',
  accentSoft: 'rgba(242, 107, 29, 0.18)',
  neutral: '#8a8a8a',
  text: '#525252',
  axis: '#d4d4d4',
  split: '#ededed',
  tooltipBg: '#ffffff',
  tooltipBorder: '#e5e5e5',
  tooltipText: '#262626',
  cells: [
    '#f26b1d',
    '#404040',
    '#f59e0b',
    '#8a8a8a',
    '#c2410c',
    '#5c5c5c',
    '#fb923c',
    '#a3a3a3',
    '#ea580c',
    '#262626',
    '#fdba74',
    '#737373',
    '#b45309',
    '#bdbdbd',
    '#fcd34d',
    '#171717',
  ],
}

const DARK: typeof LIGHT = {
  accent: '#f7803a',
  accentSoft: 'rgba(247, 128, 58, 0.22)',
  neutral: '#8a8a8a',
  text: '#a3a3a3',
  axis: '#404040',
  split: '#2a2a2a',
  tooltipBg: '#1f1f1f',
  tooltipBorder: '#333333',
  tooltipText: '#f5f5f5',
  cells: [
    '#f7803a',
    '#d4d4d4',
    '#fbbf24',
    '#8a8a8a',
    '#ea580c',
    '#e5e5e5',
    '#fdba74',
    '#a3a3a3',
    '#c2410c',
    '#f5f5f5',
    '#fcd34d',
    '#737373',
    '#fb923c',
    '#bdbdbd',
    '#b45309',
    '#5c5c5c',
  ],
}

export type ChartPalette = typeof LIGHT

export const chartPalette = computed<ChartPalette>(() => (isDark.value ? DARK : LIGHT))

export function baseChartOptions(p: ChartPalette) {
  return {
    backgroundColor: 'transparent',
    textStyle: { fontFamily: 'inherit', color: p.text },
    animationDuration: 400,
    tooltip: {
      backgroundColor: p.tooltipBg,
      borderColor: p.tooltipBorder,
      textStyle: { color: p.tooltipText, fontSize: 12 },
      extraCssText: 'border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,.12);',
    },
  }
}

export function valueAxis(p: ChartPalette, extra: Record<string, unknown> = {}) {
  return {
    type: 'value',
    scale: true,
    axisLine: { show: false },
    axisLabel: { color: p.text },
    splitLine: { lineStyle: { color: p.split } },
    ...extra,
  }
}

export function timeAxis(p: ChartPalette) {
  return {
    type: 'time',
    axisLine: { lineStyle: { color: p.axis } },
    axisLabel: { color: p.text, hideOverlap: true },
    splitLine: { show: false },
  }
}
