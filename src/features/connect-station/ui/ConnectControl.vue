<script setup lang="ts">
import { Bluetooth, BluetoothOff, Loader2 } from '@lucide/vue'
import { useStorage } from '@vueuse/core'
import { computed, onMounted } from 'vue'
import { connectionStatus, isConnected } from '@/entities/station'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/label'
import { Switch } from '@/shared/ui/switch'
import { connectStation, disconnectStation, reconnectRememberedStation } from '../model/connect'

const showAll = useStorage('bcv-show-all-devices', false)

onMounted(reconnectRememberedStation)

const STEP_LABELS: Record<string, string> = {
  searching: 'Looking for station…',
  connecting: 'Connecting…',
  waiting: 'Waiting for station…',
  handshake: 'Exchanging keys…',
  detecting: 'Detecting model…',
}
const pendingLabel = computed(() => STEP_LABELS[connectionStatus.value])
</script>

<template>
  <div class="flex flex-wrap items-center gap-3">
    <Button v-if="isConnected" variant="outline" @click="disconnectStation">
      <BluetoothOff />
      Disconnect
    </Button>
    <Button v-else :disabled="!!pendingLabel" @click="connectStation(showAll)">
      <Loader2 v-if="pendingLabel" class="animate-spin" />
      <Bluetooth v-else />
      {{ pendingLabel ?? 'Connect' }}
    </Button>
    <div v-if="!isConnected" class="flex items-center gap-2">
      <Switch id="show-all" v-model="showAll" :disabled="!!pendingLabel" />
      <Label for="show-all" class="text-muted-foreground">Show all Bluetooth devices</Label>
    </div>
  </div>
</template>
