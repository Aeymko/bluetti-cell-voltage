<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import { AppHeader } from '@/widgets/app-header'
import { CellOverview } from '@/widgets/cell-overview'
import { DiagnosticsCard } from '@/widgets/diagnostics'
import { ReadingHistory } from '@/widgets/reading-history'
import { StationPanel } from '@/widgets/station-panel'

// ECharts is most of the bundle; load it separately.
const CellCharts = defineAsyncComponent(() => import('@/widgets/cell-charts').then((m) => m.CellCharts))
</script>

<template>
  <div class="min-h-svh">
    <AppHeader />
    <main class="mx-auto max-w-[120rem] space-y-4 px-4 py-6 sm:px-6 lg:px-8">
      <StationPanel />
      <CellOverview />
      <CellCharts />
      <ReadingHistory />
      <DiagnosticsCard />
      <footer class="space-y-1 pb-4 pt-2 text-center text-xs text-muted-foreground">
        <p>
          Linux: in Chrome, enable
          <code class="select-all rounded bg-muted px-1 py-0.5 font-mono text-foreground"
            >chrome://flags/#enable-experimental-web-platform-features</code
          >
          and restart the browser.
        </p>
        <p>Read-only: nothing is ever written to the station. Not affiliated with BLUETTI.</p>
      </footer>
    </main>
  </div>
</template>
