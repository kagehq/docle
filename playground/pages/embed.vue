<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

useHead({
  title: 'Embedded Playground - Docle'
})

// Get params from URL
const route = useRoute()
const lang = ref<'python' | 'node'>(route.query.lang as any || 'python')
const code = ref(decodeURIComponent((route.query.code as string) || ''))
const theme = ref(route.query.theme || 'dark')
const readonly = ref(route.query.readonly === 'true')
const showOutput = ref(route.query.showOutput !== 'false')
const autorun = ref(route.query.autorun === 'true')

// State
const output = ref('')
const isRunning = ref(false)
const lastRunResult = ref<any>(null)
const apiKey = ref<string | null>(null)
const parentOrigin = ref<string>('*')

// Initialize code if empty
if (!code.value) {
  code.value = lang.value === 'python'
    ? 'print("Hello from embedded Docle!")'
    : 'console.log("Hello from embedded Docle!");'
}

// Run code
// Helper: Get friendly error message
const getFriendlyError = (message: string): string => {
  if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
    return 'Execution timed out. Try increasing the timeout or optimizing your code.'
  }
  if (message.includes('fetch failed') || message.includes('NetworkError')) {
    return 'Connection failed. The API may be temporarily unavailable.'
  }
  if (message.includes('HTTP 50')) {
    return 'Server error. The execution environment may be starting up (takes 5-10 seconds).'
  }
  return `❌ ${message}`
}

const runCode = async (retryCount = 0) => {
  if (isRunning.value) return

  isRunning.value = true
  output.value = retryCount > 0
    ? `Retrying... (attempt ${retryCount + 1}/3)`
    : 'Executing code...'

  try {
    console.log('Running code:', { lang: lang.value, code: code.value })

    // Check if API key is available
    if (!apiKey.value) {
      throw new Error('API key required. Parent window must provide an API key via postMessage.')
    }

    // Use production API or local proxy
    const apiUrl = window.location.hostname === 'localhost'
      ? '/api/run'  // Use local proxy in development
      : 'https://api.docle.co/api/run'  // Production API

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    // Add Authorization header if API key is provided
    if (apiKey.value) {
      headers['Authorization'] = `Bearer ${apiKey.value}`
    }

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        lang: lang.value,
        code: code.value,
        policy: { timeoutMs: 10000 }
      })
    })

    console.log('Response status:', res.status)

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`)
    }

    const result = await res.json()
    console.log('Result:', result)

    lastRunResult.value = result

    // Extract output from result (API returns stdout/stderr)
    const combinedOutput = [result.stdout, result.stderr]
      .filter(Boolean)
      .join('\n')
      .trim()

    output.value = combinedOutput || '(no output)'

    // Post message to parent (using validated origin)
    window.parent.postMessage({
      type: 'docle-result',
      data: result
    }, parentOrigin.value)

  } catch (error: any) {
    console.error('Error running code:', error)

    const friendlyError = getFriendlyError(error.message || String(error))

    // Auto-retry on timeout/server errors
    const shouldRetry = (
      (error.message?.includes('timeout') ||
       error.message?.includes('HTTP 50') ||
       error.message?.includes('fetch failed')) &&
      retryCount < 2
    )

    if (shouldRetry) {
      console.log(`Retrying... (${retryCount + 1}/2)`)
      // Wait 2 seconds before retry
      await new Promise(resolve => setTimeout(resolve, 2000))
      return runCode(retryCount + 1)
    }

    output.value = friendlyError
    window.parent.postMessage({
      type: 'docle-error',
      data: { error: friendlyError }
    }, parentOrigin.value)
  } finally {
    isRunning.value = false
  }
}

// Listen for messages from parent
onMounted(() => {
  // Notify parent that iframe is ready
  window.parent.postMessage({ type: 'docle-ready', data: {} }, '*')

  // Listen for commands
  window.addEventListener('message', (event) => {
    // Security: Validate and store parent origin on first message
    if (parentOrigin.value === '*' && event.origin) {
      // Store the origin of the first message as the trusted parent
      parentOrigin.value = event.origin
      console.log('🔒 Parent origin validated:', event.origin)
    } else if (parentOrigin.value !== '*' && event.origin !== parentOrigin.value) {
      // Reject messages from untrusted origins
      console.warn('⚠️ Rejected message from untrusted origin:', event.origin, 'Expected:', parentOrigin.value)
      return
    }

    const { type, code: newCode, apiKey: newApiKey } = event.data

    if (type === 'docle-set-apikey' && newApiKey) {
      // Parent provides API key
      apiKey.value = newApiKey
      console.log('API key received from parent')
    } else if (type === 'docle-run') {
      runCode()
    } else if (type === 'docle-set-code' && newCode) {
      code.value = newCode
    }
  })

  // Autorun if requested (but only if API key is set)
  if (autorun.value) {
    // Wait a bit for API key to be set by parent
    setTimeout(() => {
      if (apiKey.value) {
        runCode()
      } else {
        console.warn('⚠️ Autorun requested but no API key provided')
        output.value = '⚠️ API key required. Parent window must send API key via postMessage.'
      }
    }, 500)
  }
})
</script>

<template>
  <div class="h-screen bg-black text-white flex flex-col overflow-hidden">
    <!-- Minimal Header -->
    <div class="border-b border-gray-500/20 px-3 py-2 flex items-center justify-between flex-shrink-0">
      <div class="flex items-center gap-2">
        <div class="relative flex items-center">
          <img src="/assets/img/logo.png" alt="Docle" class="w-5 h-5">
        </div>
        <span class="text-xs text-gray-500">Embedded Playground</span>
      </div>

      <div class="flex items-center gap-2">
        <div v-if="!readonly" class="relative">
          <select
            v-model="lang"
            class="pl-3 pr-8 py-1.5 text-xs rounded-lg bg-gray-500/10 border border-gray-500/10 text-white appearance-none cursor-pointer hover:border-gray-500/20 focus:border-gray-500/30 focus:outline-none transition-all">
            <option value="python">Python</option>
            <option value="node">Node.js</option>
          </select>
          <svg class="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </div>

        <div v-else class="text-xs text-gray-500 px-3 py-1.5">
          Read-only
        </div>

        <button
          v-if="!readonly"
          @click="runCode"
          :disabled="isRunning"
          class="px-3 py-1.5 text-xs rounded-lg bg-blue-300 text-black font-medium hover:bg-blue-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
          {{ isRunning ? 'Running...' : 'Run' }}
        </button>
      </div>
    </div>

    <!-- Editor -->
    <div class="flex-1 overflow-hidden">
      <textarea
        v-model="code"
        :readonly="readonly"
        class="w-full h-full p-4 bg-black text-white font-mono text-sm resize-none focus:outline-none"
        :class="readonly ? 'cursor-not-allowed opacity-75' : ''"
        spellcheck="false"
      ></textarea>
    </div>

    <!-- Output -->
    <div v-if="showOutput" class="h-48 bg-gray-500/10 border-t border-gray-500/10 overflow-hidden flex flex-col flex-shrink-0">
      <div class="px-3 py-2 border-b border-gray-500/10 flex items-center justify-between">
        <span class="text-xs font-semibold text-white">Output</span>
        <div v-if="lastRunResult" class="flex items-center gap-3 text-xs">
          <span class="text-gray-500">Exit: <span :class="lastRunResult.ok ? 'text-green-400' : 'text-red-400'">{{ lastRunResult.exitCode }}</span></span>
          <span class="text-gray-500">Time: <span class="text-gray-300">{{ lastRunResult.usage?.durationMs || 0 }}ms</span></span>
        </div>
      </div>
      <pre :class="[
        'flex-1 p-3 overflow-auto text-xs font-mono',
        output ? 'text-gray-300' : 'text-gray-600'
      ]">{{ output || '— Run your code to see output' }}</pre>
    </div>
  </div>
</template>

