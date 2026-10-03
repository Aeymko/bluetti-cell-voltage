<script setup lang="ts">
import { BatteryCharging } from '@lucide/vue'
import { computed } from 'vue'
import { CellVoltageGrid, cellStats, latestReading, modeLabel } from '@/entities/reading'
import { SaveReadingForm } from '@/features/save-reading'
import { formatVolts } from '@/shared/lib/format'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { StatTile } from '@/shared/ui/stat-tile'

const stats = computed(() => (latestReading.value ? cellStats(latestReading.value.cells) : null))
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Cells</CardTitle>
      <CardDescription>
        Values under heavy charge current read a few to tens of millivolts high; compare readings taken at
        rest.
      </CardDescription>
    </CardHeader>
    <CardContent v-if="latestReading && stats" class="space-y-5">
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile label="Delta" :value="stats.delta + ' mV'" hint="max − min" accent />
        <StatTile label="Average" :value="stats.avg.toFixed(1) + ' mV'" />
        <StatTile label="Min / max" :value="stats.min + ' / ' + stats.max" hint="mV" />
        <StatTile
          label="Pack"
          :value="formatVolts(stats.sum, 2)"
          :hint="latestReading.cells.length + ' cells in series'"
        />
        <StatTile label="SOC" :value="latestReading.soc === null ? '—' : latestReading.soc + '%'" />
        <StatTile
          label="Mode"
          :value="modeLabel(latestReading.mode)"
          :hint="latestReading.current === null ? undefined : 'Raw current ' + latestReading.current"
        />
      </div>
      <CellVoltageGrid :cells="latestReading.cells" />
      <SaveReadingForm :reading="latestReading" />
    </CardContent>
    <CardContent v-else>
      <div class="flex flex-col items-center gap-3 rounded-xl border border-dashed py-12 text-center">
        <div class="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <BatteryCharging class="size-6" />
        </div>
        <div class="font-medium">No reading yet</div>
        <p class="max-w-sm text-sm text-muted-foreground">
          Turn the station on, close the Bluetti app on your phone (only one connection is allowed) and press
          Connect.
        </p>
      </div>
    </CardContent>
  </Card>
</template>
