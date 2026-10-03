<script setup lang="ts">
import { Zap } from '@lucide/vue'
import { ThemeToggle } from '@/features/toggle-theme'
import { APP_NAME, REPO_URL } from '@/shared/config'
import { Button } from '@/shared/ui/button'
</script>

<template>
  <header class="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-md">
    <div class="mx-auto flex h-14 max-w-[120rem] items-center gap-3 px-4 sm:px-6 lg:px-8">
      <div
        class="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm"
      >
        <Zap class="size-4.5" />
      </div>
      <div class="leading-tight">
        <div class="font-semibold tracking-tight">{{ APP_NAME }}</div>
        <div class="text-xs text-muted-foreground">Battery cell monitor over Bluetooth</div>
      </div>
      <div class="ml-auto flex items-center gap-1">
        <Button v-if="REPO_URL" variant="ghost" size="icon" as-child>
          <a :href="REPO_URL" target="_blank" rel="noopener noreferrer">
            <span class="sr-only">Source code on GitHub</span>
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path
                d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z"
              />
            </svg>
          </a>
        </Button>
        <ThemeToggle />
      </div>
    </div>
  </header>
</template>
