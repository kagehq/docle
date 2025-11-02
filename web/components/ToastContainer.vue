<script setup lang="ts">
const { toasts, remove } = useToast()

const getIcon = (type: string) => {
  switch (type) {
    case 'success':
      return `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>`
    case 'error':
      return `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>`
    case 'warning':
      return `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>`
    default:
      return `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>`
  }
}

const getColorClasses = (type: string) => {
  switch (type) {
    case 'success':
      return 'bg-black border-gray-500/20 text-green-300'
    case 'error':
      return 'bg-black border-gray-500/20 text-red-400'
    case 'warning':
      return 'bg-black border-gray-500/20 text-yellow-300'
    default:
      return 'bg-black border-gray-500/20 text-blue-300'
  }
}
</script>

<template>
  <div class="fixed top-4 right-4 z-[9999] space-y-2 pointer-events-none">
    <TransitionGroup
      name="toast"
      tag="div"
      class="space-y-2">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        :class="[
          'pointer-events-auto flex items-start gap-3 min-w-[320px] max-w-md p-3 rounded-lg border backdrop-blur-sm',
          getColorClasses(toast.type)
        ]">
        <svg
          class="w-4 h-4 flex-shrink-0 mt-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          v-html="getIcon(toast.type)">
        </svg>
        <p class="flex-1 text-sm font-medium">{{ toast.message }}</p>
        <button
          @click="remove(toast.id)"
          class="flex-shrink-0 text-current opacity-50 hover:opacity-100 transition-opacity mt-0.5">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active {
  transition: all 0.3s ease-out;
}

.toast-leave-active {
  transition: all 0.2s ease-in;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(30px) scale(0.95);
}
</style>

