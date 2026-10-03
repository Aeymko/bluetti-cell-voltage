<script setup lang="ts">
import { BadgeCheck, CircleHelp, Lock, LockOpen } from '@lucide/vue'
import { Badge } from '@/shared/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip'
import { detected, profile, session } from '../model/station'
</script>

<template>
  <div v-if="profile && session" class="flex flex-wrap items-center gap-2">
    <Badge variant="secondary" class="text-sm font-semibold">
      {{ detected?.model ?? `Unknown model${detected?.raw ? ` (${detected.raw})` : ''}` }}
    </Badge>
    <Badge variant="outline" class="gap-1">
      <Lock v-if="session.encrypted" class="size-3" />
      <LockOpen v-else class="size-3" />
      Protocol V{{ profile.protocol }}
      · {{ session.encrypted ? 'encrypted' : 'plain' }}
    </Badge>
    <TooltipProvider :delay-duration="150">
      <Tooltip>
        <TooltipTrigger as-child>
          <Badge
            :variant="profile.verified ? 'default' : 'outline'"
            :class="profile.verified ? 'gap-1' : 'gap-1 border-primary/50 text-primary'"
          >
            <BadgeCheck v-if="profile.verified" class="size-3" />
            <CircleHelp v-else class="size-3" />
            {{ profile.verified ? 'Verified profile' : 'Unverified profile' }}
          </Badge>
        </TooltipTrigger>
        <TooltipContent class="max-w-xs">
          <template v-if="profile.verified">Register map confirmed on a real {{ profile.model }}.</template>
          <template v-else>
            Register map is borrowed from similar models and may be wrong. A register dump from the
            Diagnostics section helps add proper support.
          </template>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
    <Badge v-if="profile.protocol === 1" variant="outline">Shows the pack selected on the station</Badge>
  </div>
</template>
