<script setup lang="ts">
interface Props {
  content: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}

const props = withDefaults(defineProps<Props>(), {
  position: 'top'
})

const showTooltip = ref(false)

const positionClasses = computed(() => {
  switch (props.position) {
    case 'bottom':
      return 'top-full left-1/2 -translate-x-1/2 mt-2'
    case 'left':
      return 'right-full top-1/2 -translate-y-1/2 mr-2'
    case 'right':
      return 'left-full top-1/2 -translate-y-1/2 ml-2'
    default: // top
      return 'bottom-full left-1/2 -translate-x-1/2 mb-2'
  }
})
</script>

<template>
  <div class="relative inline-block">
    <div
      @mouseenter="showTooltip = true"
      @mouseleave="showTooltip = false"
      @focus="showTooltip = true"
      @blur="showTooltip = false">
      <slot>
        <svg class="w-4 h-4 text-gray-400 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
      </slot>
    </div>

    <Transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95">
      <div
        v-if="showTooltip"
        :class="[
          'absolute z-50 px-3 py-2 text-xs text-white bg-gray-900 border border-gray-700 rounded-lg shadow-lg whitespace-nowrap pointer-events-none',
          positionClasses
        ]">
        {{ content }}
        <!-- Arrow -->
        <div
          :class="[
            'absolute w-2 h-2 bg-gray-900 border-gray-700 transform rotate-45',
            position === 'top' ? 'top-full left-1/2 -translate-x-1/2 -mt-1 border-r border-b' :
            position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 -mb-1 border-l border-t' :
            position === 'left' ? 'left-full top-1/2 -translate-y-1/2 -ml-1 border-t border-r' :
            'right-full top-1/2 -translate-y-1/2 -mr-1 border-b border-l'
          ]">
        </div>
      </div>
    </Transition>
  </div>
</template>

