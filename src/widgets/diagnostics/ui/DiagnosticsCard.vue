<script setup lang="ts">
import { RegisterDumpControl } from '@/features/dump-registers'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Diagnostics</CardTitle>
      <CardDescription class="max-w-3xl">
        For models without a verified profile: reads every register (read-only, takes a few minutes) and saves
        a JSON file you can attach to a GitHub issue. The serial number is replaced with zeros; the device
        name and MAC address are not included. Two dumps help most — one at rest and one while charging.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <RegisterDumpControl />
    </CardContent>
  </Card>
</template>
