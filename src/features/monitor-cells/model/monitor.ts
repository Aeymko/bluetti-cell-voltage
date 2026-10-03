import { useStorage } from '@vueuse/core'
import { ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { addReading, pushLiveReading } from '@/entities/reading'
import { busy, isConnected, profile, session } from '@/entities/station'
import { readSnapshot } from '@/shared/api/bluetti'

export const INTERVALS = [5, 15, 30, 60, 300, 600]

export const liveEnabled = useStorage('bcv-live', true)
export const intervalSec = useStorage('bcv-interval', 15)
export const autosave = useStorage('bcv-autosave', false)
export const reading = ref(false)
export const lastError = ref<string | null>(null)

let timer: ReturnType<typeof setTimeout> | undefined

export async function readNow(): Promise<void> {
  const s = session.value
  const p = profile.value
  if (!s || !p || reading.value || busy.value) return
  reading.value = true
  try {
    const snap = await readSnapshot(s, p)
    pushLiveReading(snap)
    lastError.value = null
    if (autosave.value) addReading(snap)
  } catch (e) {
    const message = (e as Error).message || String(e)
    // Report each new problem once instead of every polling tick.
    if (message !== lastError.value) toast.error('Read failed', { description: message })
    lastError.value = message
  } finally {
    reading.value = false
  }
}

function schedule() {
  clearTimeout(timer)
  if (!isConnected.value || !liveEnabled.value) return
  timer = setTimeout(async () => {
    await readNow()
    schedule()
  }, intervalSec.value * 1000)
}

watch(isConnected, (connected) => {
  lastError.value = null
  if (connected) readNow()
})
watch([isConnected, liveEnabled, intervalSec], schedule)
