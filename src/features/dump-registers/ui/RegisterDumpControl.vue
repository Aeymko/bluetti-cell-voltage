<script setup lang="ts">
import { HardDriveDownload, X } from '@lucide/vue'
import { isConnected } from '@/entities/station'
import { Button } from '@/shared/ui/button'
import { Progress } from '@/shared/ui/progress'
import { cancelDump, dumping, progress, progressText, startDump } from '../model/dump'
</script>

<template>
  <div class="space-y-3">
    <div class="flex flex-wrap items-center gap-2">
      <Button variant="secondary" :disabled="!isConnected || dumping" @click="startDump">
        <HardDriveDownload />
        Dump registers
      </Button>
      <Button v-if="dumping" variant="ghost" @click="cancelDump">
        <X />
        Cancel
      </Button>
    </div>
    <div v-if="dumping" class="max-w-md space-y-1.5">
      <Progress :model-value="progress" class="h-1.5" />
    </div>
    <p v-if="progressText" class="text-sm tabular-nums text-muted-foreground">{{ progressText }}</p>
  </div>
</template>
