<script setup lang="ts">
import { Download, FileJson, Trash2, Upload } from '@lucide/vue'
import { useFileDialog } from '@vueuse/core'
import { toast } from 'vue-sonner'
import { clearHistory, history, mergeReadings } from '@/entities/reading'
import { downloadFile, fileStamp } from '@/shared/lib/download'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/ui/alert-dialog'
import { Button } from '@/shared/ui/button'
import { readingsToCsv } from '../lib/csv'

const { open, onChange, reset } = useFileDialog({ accept: 'application/json,.json', multiple: false })

onChange(async (files) => {
  const file = files?.[0]
  reset()
  if (!file) return
  try {
    const data: unknown = JSON.parse(await file.text())
    if (!Array.isArray(data)) throw new Error('Expected an array of readings')
    const count = mergeReadings(data)
    toast.success(`Imported ${count} readings`, {
      description: count < data.length ? `${data.length - count} invalid entries skipped` : undefined,
    })
  } catch (e) {
    toast.error('Import failed', { description: (e as Error).message })
  }
})

const exportCsv = () =>
  downloadFile(`bluetti-cells-${fileStamp()}.csv`, readingsToCsv(history.value), 'text/csv')
const exportJson = () =>
  downloadFile(
    `bluetti-cells-${fileStamp()}.json`,
    JSON.stringify(history.value, null, 1),
    'application/json',
  )
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <Button variant="outline" size="sm" :disabled="!history.length" @click="exportCsv">
      <Download />
      CSV
    </Button>
    <Button variant="outline" size="sm" :disabled="!history.length" @click="exportJson">
      <FileJson />
      JSON
    </Button>
    <Button variant="outline" size="sm" @click="open()">
      <Upload />
      Import
    </Button>
    <AlertDialog>
      <AlertDialogTrigger as-child>
        <Button
          variant="ghost"
          size="sm"
          class="text-muted-foreground hover:text-destructive"
          :disabled="!history.length"
        >
          <Trash2 />
          Clear
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete all saved readings?</AlertDialogTitle>
          <AlertDialogDescription>
            {{ history.length }}
            readings will be removed from this browser. Export them first if you need a backup.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction class="bg-destructive text-white hover:bg-destructive/90" @click="clearHistory">
            Delete all
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
