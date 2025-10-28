<script setup lang="ts">
interface Props {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info'
  requireInput?: boolean
  requiredValue?: string
}

const props = withDefaults(defineProps<Props>(), {
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  type: 'danger',
  requireInput: false,
  requiredValue: ''
})

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const inputValue = ref('')
const canConfirm = computed(() => {
  if (!props.requireInput) return true
  return inputValue.value === props.requiredValue
})

const handleConfirm = () => {
  if (canConfirm.value) {
    emit('confirm')
  }
}

const handleCancel = () => {
  emit('cancel')
}

const getButtonClasses = () => {
  switch (props.type) {
    case 'danger':
      return 'bg-red-400 hover:bg-red-500 text-white'
    case 'warning':
      return 'bg-yellow-300 hover:bg-yellow-400 text-black'
    default:
      return 'bg-blue-300 hover:bg-blue-400 text-black'
  }
}
</script>

<template>
  <div
    @click.self="handleCancel"
    class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[9998]">
    <div class="relative bg-black border border-gray-500/30 max-w-md w-full rounded-lg p-6">
      <!-- Icon -->
      <div class="mb-4 flex items-center justify-center">
        <div
          :class="[
            'w-12 h-12 rounded-full flex items-center justify-center',
            type === 'danger' ? 'bg-red-400/10 text-red-400' :
            type === 'warning' ? 'bg-yellow-300/10 text-yellow-300' :
            'bg-blue-300/10 text-blue-300'
          ]">
          <svg v-if="type === 'danger'" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
          <svg v-else-if="type === 'warning'" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <svg v-else class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
      </div>

      <!-- Title -->
      <h3 class="text-xl font-bold text-white mb-2 text-center">{{ title }}</h3>

      <!-- Message -->
      <p class="text-gray-400 text-sm mb-6 text-center">{{ message }}</p>

      <!-- Input (if required) -->
      <div v-if="requireInput" class="mb-6">
        <label class="block text-xs font-medium text-gray-400 mb-2">
          Type <span class="font-mono text-white">{{ requiredValue }}</span> to confirm
        </label>
        <input
          v-model="inputValue"
          type="text"
          class="w-full px-3 py-2 text-sm bg-gray-500/10 border border-gray-500/10 text-white rounded-lg focus:ring-0 focus:border-gray-500/20 outline-none placeholder-gray-500"
          :placeholder="requiredValue"
          @keydown.enter="handleConfirm"
        />
      </div>

      <!-- Actions -->
      <div class="flex gap-3">
        <button
          @click="handleCancel"
          class="flex-1 bg-gray-500/10 hover:bg-gray-500/20 text-white border border-gray-500/10 py-2.5 text-sm rounded-lg font-semibold transition-all">
          {{ cancelText }}
        </button>
        <button
          @click="handleConfirm"
          :disabled="!canConfirm"
          :class="[
            'flex-1 py-2.5 text-sm rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed',
            getButtonClasses()
          ]">
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

