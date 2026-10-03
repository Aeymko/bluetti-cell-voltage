import { computed, shallowRef } from 'vue'
import type { Reading } from './reading'

const MAX_LIVE = 5000

const live = shallowRef<Reading[]>([])

/** Readings taken since the page was opened; not persisted. */
export const liveReadings = computed(() => live.value)
export const latestReading = computed<Reading | null>(() => live.value.at(-1) ?? null)

export function pushLiveReading(reading: Reading): void {
  const next = [...live.value, reading]
  live.value = next.length > MAX_LIVE ? next.slice(-MAX_LIVE) : next
}
