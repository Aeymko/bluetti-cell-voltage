<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/shared/lib/utils'
import { cellStats } from '../model/reading'

const props = defineProps<{ cells: number[] }>()

const stats = computed(() => cellStats(props.cells))

// Bars are scaled to the spread so a few millivolts are still visible.
const fill = (v: number) => {
  const { min, max } = stats.value
  return max === min ? 60 : 20 + ((v - min) / (max - min)) * 80
}
</script>

<template>
  <div class="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-2">
    <div
      v-for="(v, i) in cells"
      :key="i"
      :class="
        cn(
          'relative overflow-hidden rounded-xl border bg-card/60 px-3 pb-3 pt-2.5',
          v === stats.max && 'border-primary/50',
        )
      "
    >
      <div class="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
        <span>#{{ i + 1 }}</span>
        <span v-if="v === stats.max" class="text-primary">max</span>
        <span v-else-if="v === stats.min">min</span>
      </div>
      <div
        :class="
          cn(
            'mt-1 text-lg font-semibold tabular-nums tracking-tight',
            v === stats.max && 'text-primary',
            v === stats.min && 'text-muted-foreground',
          )
        "
      >
        {{ v }}<span class="ml-0.5 text-xs font-normal text-muted-foreground">mV</span>
      </div>
      <div class="mt-2 h-1.5 rounded-full bg-muted">
        <div
          :class="cn('h-full rounded-full transition-all duration-500', v === stats.max ? 'bg-primary' : 'bg-foreground/35')"
          :style="{ width: fill(v) + '%' }"
        />
      </div>
    </div>
  </div>
</template>
