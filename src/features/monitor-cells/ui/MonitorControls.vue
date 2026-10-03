<script setup lang="ts">
import { RefreshCw } from '@lucide/vue'
import { computed } from 'vue'
import { isConnected } from '@/entities/station'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Switch } from '@/shared/ui/switch'
import { autosave, INTERVALS, intervalSec, liveEnabled, reading, readNow } from '../model/monitor'

const intervalLabel = (s: number) => (s < 60 ? `${s} s` : `${s / 60} min`)

const intervalModel = computed({
  get: () => String(intervalSec.value),
  set: (v: string) => {
    intervalSec.value = Number(v)
  },
})
</script>

<template>
  <div class="flex flex-wrap items-center gap-x-5 gap-y-3">
    <Button variant="secondary" :disabled="!isConnected || reading" @click="readNow">
      <RefreshCw :class="reading && 'animate-spin'" />
      Read now
    </Button>
    <div class="flex items-center gap-2">
      <Switch id="live" v-model="liveEnabled" />
      <Label for="live">Refresh every</Label>
      <Select v-model="intervalModel">
        <SelectTrigger size="sm" class="w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="s in INTERVALS" :key="s" :value="String(s)">{{ intervalLabel(s) }}</SelectItem>
        </SelectContent>
      </Select>
    </div>
    <div class="flex items-center gap-2">
      <Switch id="autosave" v-model="autosave" />
      <Label for="autosave">Save every reading</Label>
    </div>
  </div>
</template>
