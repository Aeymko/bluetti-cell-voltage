import { computed, ref, shallowRef } from 'vue'
import type { BluettiSession, DetectedModel, StationProfile } from '@/shared/api/bluetti'

export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'waiting'
  | 'handshake'
  | 'detecting'
  | 'connected'

export const connectionStatus = ref<ConnectionStatus>('disconnected')
export const session = shallowRef<BluettiSession | null>(null)
export const profile = shallowRef<StationProfile | null>(null)
export const detected = ref<DetectedModel | null>(null)
/** Set while a long operation (register dump) owns the link, so polling pauses. */
export const busy = ref(false)

export const isConnected = computed(() => connectionStatus.value === 'connected' && session.value !== null)

export function setConnected(s: BluettiSession, d: DetectedModel, p: StationProfile): void {
  session.value = s
  detected.value = d
  profile.value = p
  connectionStatus.value = 'connected'
}

export function resetStation(): void {
  session.value = null
  profile.value = null
  detected.value = null
  busy.value = false
  connectionStatus.value = 'disconnected'
}
