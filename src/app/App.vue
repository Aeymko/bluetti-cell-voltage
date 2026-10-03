<script setup lang="ts">
import { DashboardPage } from '@/pages/dashboard'
import { isDark } from '@/shared/lib/theme'
import { Toaster } from '@/shared/ui/sonner'
</script>

<template>
  <DashboardPage />
  <Toaster :theme="isDark ? 'dark' : 'light'" position="bottom-right" rich-colors close-button />
</template>
