<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/shared/lib/utils'

const props = defineProps<{
  label: string
  value: string | number
  hint?: string
  accent?: boolean
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <div
    :class="
      cn(
        'rounded-xl border bg-card/60 px-4 py-3 transition-colors',
        props.accent && 'border-primary/40 bg-primary/8',
        props.class,
      )
    "
  >
    <div class="text-xs font-medium uppercase tracking-wider text-muted-foreground">{{ label }}</div>
    <div
      :class="cn('mt-1 text-2xl font-semibold tabular-nums tracking-tight', props.accent && 'text-primary')"
    >
      {{ value }}
    </div>
    <div v-if="hint" class="mt-0.5 text-xs text-muted-foreground">{{ hint }}</div>
  </div>
</template>
