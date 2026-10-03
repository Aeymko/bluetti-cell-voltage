<script setup lang="ts">
import { Save } from '@lucide/vue'
import { ref } from 'vue'
import { toast } from 'vue-sonner'
import { addReading, type Reading } from '@/entities/reading'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'

const props = defineProps<{ reading: Reading | null }>()

const label = ref('')

function save() {
  if (!props.reading) return
  addReading(props.reading, label.value.trim())
  toast.success('Reading saved', { description: label.value.trim() || undefined })
  label.value = ''
}
</script>

<template>
  <form class="flex w-full max-w-md gap-2" @submit.prevent="save">
    <Input v-model="label" placeholder="Label, e.g. “rest after full charge”" maxlength="200" />
    <Button type="submit" :disabled="!reading">
      <Save />
      Save
    </Button>
  </form>
</template>
