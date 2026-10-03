<script setup lang="ts">
import { ChartLine } from '@lucide/vue'
import { computed, ref } from 'vue'
import { history, latestReading, liveReadings } from '@/entities/reading'
import { chartPalette, VChart } from '@/shared/lib/echarts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { deltaOptions, deviationOptions, voltageOptions } from '../lib/options'

type Source = 'session' | 'saved'

const source = ref<Source>(liveReadings.value.length === 0 && history.value.length > 1 ? 'saved' : 'session')
const readings = computed(() => (source.value === 'session' ? liveReadings.value : history.value))
const hasSeries = computed(() => readings.value.length >= 2)

const voltage = computed(() => (hasSeries.value ? voltageOptions(readings.value, chartPalette.value) : null))
const delta = computed(() => (hasSeries.value ? deltaOptions(readings.value, chartPalette.value) : null))
const deviationReading = computed(() =>
  source.value === 'session' ? latestReading.value : history.value.at(-1),
)
const deviation = computed(() =>
  deviationReading.value ? deviationOptions(deviationReading.value, chartPalette.value) : null,
)
</script>

<template>
  <div class="grid gap-4 lg:grid-cols-5">
    <Card class="lg:col-span-5">
      <CardHeader class="flex flex-row flex-wrap items-start justify-between gap-3">
        <div class="space-y-1.5">
          <CardTitle>Cell voltages over time</CardTitle>
          <CardDescription>Scroll to zoom, click a legend entry to hide a cell.</CardDescription>
        </div>
        <Tabs v-model="source">
          <TabsList>
            <TabsTrigger value="session">This session · {{ liveReadings.length }}</TabsTrigger>
            <TabsTrigger value="saved">Saved · {{ history.length }}</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        <div v-if="voltage" class="h-80">
          <VChart :option="voltage" autoresize />
        </div>
        <div
          v-else
          class="flex h-80 flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-center"
        >
          <ChartLine class="size-6 text-muted-foreground" />
          <p class="text-sm text-muted-foreground">
            {{
              source === 'session'
                ? 'Collecting data — the chart appears after two readings.'
                : 'Save at least two readings to see their history.'
            }}
          </p>
        </div>
      </CardContent>
    </Card>

    <Card class="lg:col-span-3">
      <CardHeader>
        <CardTitle>Delta and SOC</CardTitle>
        <CardDescription>Spread between the highest and lowest cell.</CardDescription>
      </CardHeader>
      <CardContent>
        <div v-if="delta" class="h-64">
          <VChart :option="delta" autoresize />
        </div>
        <div
          v-else
          class="flex h-64 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground"
        >
          Not enough data yet
        </div>
      </CardContent>
    </Card>

    <Card class="lg:col-span-2">
      <CardHeader>
        <CardTitle>Deviation from average</CardTitle>
        <CardDescription>{{
          source === 'session' ? 'Latest reading' : 'Latest saved reading'
        }}</CardDescription>
      </CardHeader>
      <CardContent>
        <div v-if="deviation" class="h-64">
          <VChart :option="deviation" autoresize />
        </div>
        <div
          v-else
          class="flex h-64 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground"
        >
          No reading yet
        </div>
      </CardContent>
    </Card>
  </div>
</template>
