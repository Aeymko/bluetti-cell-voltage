<script setup lang="ts">
import { TriangleAlert } from '@lucide/vue'
import { latestReading } from '@/entities/reading'
import { isConnected, StationBadges } from '@/entities/station'
import { bluetoothSupported, ConnectControl } from '@/features/connect-station'
import { lastError, MonitorControls } from '@/features/monitor-cells'
import { formatTime } from '@/shared/lib/format'
import { Card, CardContent } from '@/shared/ui/card'
import { Separator } from '@/shared/ui/separator'
</script>

<template>
  <Card>
    <CardContent class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <ConnectControl />
        <StationBadges />
      </div>
      <template v-if="isConnected">
        <Separator />
        <div class="flex flex-wrap items-center justify-between gap-3">
          <MonitorControls />
          <span v-if="latestReading" class="text-sm tabular-nums text-muted-foreground">
            Last reading {{ formatTime(latestReading.ts) }}
          </span>
        </div>
        <p v-if="lastError" class="flex items-start gap-2 text-sm text-destructive">
          <TriangleAlert class="mt-0.5 size-4 shrink-0" />
          {{ lastError }}
        </p>
      </template>
      <p v-else-if="!bluetoothSupported" class="flex items-start gap-2 text-sm text-primary">
        <TriangleAlert class="mt-0.5 size-4 shrink-0" />
        This browser has no Web Bluetooth. Use Chrome or Edge; on Linux enable
        chrome://flags/#enable-experimental-web-platform-features.
      </p>
    </CardContent>
  </Card>
</template>
