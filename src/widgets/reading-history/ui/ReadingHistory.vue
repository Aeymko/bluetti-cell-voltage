<script setup lang="ts">
import { X } from '@lucide/vue'
import { computed } from 'vue'
import { cellStats, history, modeLabel, removeReading } from '@/entities/reading'
import { HistoryActions } from '@/features/manage-history'
import { formatDateTime } from '@/shared/lib/format'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

const rows = computed(() =>
  [...history.value].reverse().map((r) => ({ reading: r, stats: cellStats(r.cells) })),
)
const maxCells = computed(() => Math.max(0, ...history.value.map((r) => r.cells.length)))
</script>

<template>
  <Card>
    <CardHeader class="flex flex-row flex-wrap items-start justify-between gap-3">
      <div class="space-y-1.5">
        <CardTitle>Saved readings</CardTitle>
        <CardDescription
          >Stored in this browser only. Export to keep a backup or move to another device.</CardDescription
        >
      </div>
      <HistoryActions />
    </CardHeader>
    <CardContent>
      <div v-if="rows.length" class="overflow-x-auto rounded-xl border">
        <Table class="tabular-nums">
          <TableHeader>
            <TableRow class="bg-muted/40 hover:bg-muted/40">
              <TableHead>Time</TableHead>
              <TableHead>Label</TableHead>
              <TableHead v-for="i in maxCells" :key="i" class="text-right">{{ i }}</TableHead>
              <TableHead class="text-right">Avg</TableHead>
              <TableHead class="text-right">Δ</TableHead>
              <TableHead class="text-right">SOC</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead class="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="{ reading, stats } in rows" :key="reading.ts" class="group">
              <TableCell class="whitespace-nowrap text-muted-foreground">{{
                formatDateTime(reading.ts)
              }}</TableCell>
              <TableCell class="max-w-48 truncate" :title="reading.label">{{ reading.label }}</TableCell>
              <TableCell
                v-for="i in maxCells"
                :key="i"
                :class="
                  cn(
                    'text-right',
                    reading.cells[i - 1] === stats.max && 'font-semibold text-primary',
                    reading.cells[i - 1] === stats.min && 'text-muted-foreground',
                  )
                "
              >
                {{ reading.cells[i - 1] ?? '' }}
              </TableCell>
              <TableCell class="text-right">{{ stats.avg.toFixed(1) }}</TableCell>
              <TableCell class="text-right font-semibold">{{ stats.delta }}</TableCell>
              <TableCell class="text-right">{{ reading.soc ?? '' }}</TableCell>
              <TableCell class="text-muted-foreground">{{ modeLabel(reading.mode) }}</TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  class="size-7 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                  aria-label="Delete reading"
                  @click="removeReading(reading.ts)"
                >
                  <X />
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
      <p v-else class="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">
        No saved readings yet
      </p>
    </CardContent>
  </Card>
</template>
