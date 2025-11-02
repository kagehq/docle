<script setup lang="ts">
const apiStatus = ref<'operational' | 'degraded' | 'down'>('operational')
const checking = ref(false)
const config = useRuntimeConfig()

const checkStatus = async () => {
  checking.value = true
  try {
    const apiUrl = process.client && window.location.hostname === 'localhost'
      ? 'http://localhost:8787/'
      : `${config.public.apiBase}/`

    const response = await fetch(apiUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    })
    apiStatus.value = response.ok ? 'operational' : 'degraded'
  } catch (error) {
    apiStatus.value = 'down'
  } finally {
    checking.value = false
  }
}

const getStatusColor = () => {
  switch (apiStatus.value) {
    case 'operational':
      return 'bg-green-400'
    case 'degraded':
      return 'bg-yellow-400'
    case 'down':
      return 'bg-red-400'
  }
}

const getStatusText = () => {
  switch (apiStatus.value) {
    case 'operational':
      return 'All systems operational'
    case 'degraded':
      return 'Degraded performance'
    case 'down':
      return 'API unavailable'
  }
}

// Check status on mount and every 30 seconds
onMounted(() => {
  checkStatus()
  setInterval(checkStatus, 30000)
})
</script>

<template>
  <div class="flex items-center gap-2">
    <div
      :class="[
        'w-2 h-2 rounded-full',
        getStatusColor(),
        apiStatus === 'operational' ? 'animate-pulse' : ''
      ]">
    </div>
    <span class="text-xs text-gray-400">{{ getStatusText() }}</span>
  </div>
</template>

