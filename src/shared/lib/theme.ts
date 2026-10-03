import { useColorMode } from '@vueuse/core'
import { computed } from 'vue'

export const colorMode = useColorMode({ initialValue: 'auto' })
export const isDark = computed(() => colorMode.state.value === 'dark')
