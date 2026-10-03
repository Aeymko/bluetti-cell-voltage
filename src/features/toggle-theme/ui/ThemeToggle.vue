<script setup lang="ts">
import { Monitor, Moon, Sun } from '@lucide/vue'
import { colorMode } from '@/shared/lib/theme'
import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'

const { store } = colorMode
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="ghost" size="icon" aria-label="Theme">
        <Sun class="scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
        <Moon class="absolute scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuRadioGroup v-model="store">
        <DropdownMenuRadioItem value="light"><Sun />Light</DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="dark"><Moon />Dark</DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="auto"><Monitor />System</DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
