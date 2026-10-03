import { ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { busy, profile, session } from '@/entities/station'
import { dumpRegisters } from '@/shared/api/bluetti'
import { downloadFile, fileStamp } from '@/shared/lib/download'

export const dumping = ref(false)
export const progress = ref(0)
export const progressText = ref('')

let controller: AbortController | null = null

export async function startDump(): Promise<void> {
  const s = session.value
  const p = profile.value
  if (!s || !p || dumping.value) return
  controller = new AbortController()
  dumping.value = true
  busy.value = true
  progress.value = 0
  try {
    const result = await dumpRegisters(s, p, {
      signal: controller.signal,
      onProgress: (done, total) => {
        progress.value = (done / total) * 100
        progressText.value = `Register ${done * 10} of ${total * 10}`
      },
    })
    const name = `bluetti-dump-${p.model.replace(/[^A-Za-z0-9]+/g, '_')}-${fileStamp()}.json`
    downloadFile(name, JSON.stringify({ tool: 'bluetti-cell-voltage', ...result }), 'application/json')
    progressText.value =
      'Done: ' +
      result.stats.read +
      ' blocks, serial number removed in ' +
      result.serialRedactedAt.length +
      ' places'
    toast.success('Register dump saved', { description: name })
  } catch (e) {
    const err = e as Error
    progressText.value = err.name === 'AbortError' ? 'Cancelled' : `Failed: ${err.message}`
    if (err.name !== 'AbortError') toast.error('Register dump failed', { description: err.message })
  } finally {
    controller = null
    dumping.value = false
    busy.value = false
  }
}

export function cancelDump(): void {
  controller?.abort()
}

watch(session, (s) => {
  if (!s) cancelDump()
})
