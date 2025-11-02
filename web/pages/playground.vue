<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, inject } from 'vue'

useHead({
  title: 'Playground - Docle'
})

// Inject the snippets panel function
const openSnippetsPanel = inject<() => void>('openSnippetsPanel', () => {})

const route = useRoute()

// Check if this is a collab session
const sessionId = computed(() => route.query.session as string | undefined)
const isCollabMode = computed(() => !!sessionId.value)

// Check if user is authenticated
const isAuthenticated = ref(false)
const playgroundApiKey = ref<string | null>(null)
const config = useRuntimeConfig()

const checkAuth = async () => {
  try {
    // Always use Nuxt proxy for cookie management
    await $fetch('/api/dashboard', {
      credentials: 'include'
    })
    isAuthenticated.value = true

    // Fetch or create playground API key
    await getPlaygroundKey()
  } catch (error) {
    isAuthenticated.value = false
    playgroundApiKey.value = null

    // Redirect to login if not authenticated
    if (process.client) {
      window.location.href = '/login'
    }
  }
}

// Get or create playground API key
const getPlaygroundKey = async () => {
  try {
    // Always use Nuxt proxy
    const response: any = await $fetch('/api/playground/key', {
      method: 'POST',
      credentials: 'include'
    })

    if (response.apiKey) {
      // New key created, store it
      playgroundApiKey.value = response.apiKey
      localStorage.setItem('docle_playground_key', response.apiKey)
      // console.log('✅ Playground API key created')
    } else if (response.keyPrefix) {
      // Key exists but we can't get it, check localStorage
      const storedKey = localStorage.getItem('docle_playground_key')
      if (storedKey) {
        playgroundApiKey.value = storedKey
        // console.log('✅ Using stored playground API key')
      } else {
        // Key exists but not in localStorage - user needs to get it from project page
        console.warn('⚠️ Playground API key exists but not available. Check your Playground project.')
      }
    }
  } catch (error) {
    console.error('Failed to get playground API key:', error)
  }
}

// Toast notification
const { success: showSuccess, info: showInfo } = useToast()

// UI State
const activeTab = ref<'editor' | 'files' | 'packages' | 'settings' | 'history'>('editor')
const isMultiFile = ref(false)
const showSettings = ref(true)

// Files (for multi-file mode)
const files = ref([
  { name: 'main.py', content: 'print("Hello, Docle!")\nfor i in range(5):\n    print(f"Count: {i}")' }
])
const activeFileIdx = ref(0)

// Single code (for simple mode)
const code = computed({
  get: () => files.value[activeFileIdx.value]?.content || '',
  set: (val) => { if (files.value[activeFileIdx.value]) files.value[activeFileIdx.value].content = val }
})

// Settings
const lang = ref<'python' | 'node'>('python')
const timeout = ref(3000)

// NEW: GitHub Repo & Network Controls
const repoUrl = ref('')
const allowNetwork = ref(false)
const allowedHosts = ref('')
const maxOutputBytes = ref(1048576) // 1MB default

// Packages
const packages = ref<string[]>([])
const newPackage = ref('')

// Autosave functionality
const AUTOSAVE_KEY = 'docle_playground_draft'
const lastSaved = ref<Date | null>(null)

// Save current state to localStorage
const saveDraft = () => {
  if (typeof window === 'undefined') return

  const draft = {
    files: files.value,
    activeFileIdx: activeFileIdx.value,
    lang: lang.value,
    timeout: timeout.value,
    packages: packages.value,
    repoUrl: repoUrl.value,
    allowNetwork: allowNetwork.value,
    allowedHosts: allowedHosts.value,
    maxOutputBytes: maxOutputBytes.value,
    timestamp: new Date().toISOString()
  }

  localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(draft))
  lastSaved.value = new Date()
}

// Restore draft from localStorage
const restoreDraft = () => {
  if (typeof window === 'undefined') return false

  const savedDraft = localStorage.getItem(AUTOSAVE_KEY)
  if (!savedDraft) return false

  try {
    const draft = JSON.parse(savedDraft)
    // Only restore if draft is less than 7 days old
    const savedTime = new Date(draft.timestamp)
    const daysSinceLastSave = (Date.now() - savedTime.getTime()) / (1000 * 60 * 60 * 24)

    if (daysSinceLastSave < 7) {
      files.value = draft.files || files.value
      activeFileIdx.value = draft.activeFileIdx || 0
      lang.value = draft.lang || 'python'
      timeout.value = draft.timeout || 3000
      packages.value = draft.packages || []
      repoUrl.value = draft.repoUrl || ''
      allowNetwork.value = draft.allowNetwork || false
      allowedHosts.value = draft.allowedHosts || ''
      maxOutputBytes.value = draft.maxOutputBytes || 1048576
      lastSaved.value = savedTime
      return true
    }
  } catch (err) {
    console.error('Failed to restore draft:', err)
  }
  return false
}

// Debounced autosave (save 2 seconds after user stops typing)
let autosaveTimeout: NodeJS.Timeout | null = null
const debouncedSave = () => {
  if (autosaveTimeout) clearTimeout(autosaveTimeout)
  autosaveTimeout = setTimeout(() => {
    saveDraft()
  }, 2000)
}

// Watch for changes and autosave
watch([code, lang, timeout, packages, repoUrl, allowNetwork, allowedHosts, maxOutputBytes], () => {
  debouncedSave()
}, { deep: true })

// Output & History
const output = ref('')
const isRunning = ref(false)
const loadingMessage = ref('')
const retryCount = ref(0)
const maxRetries = 2
const history = ref<any[]>([])
const lastRunResult = ref<any>(null)

// Collab state
const myUserId = ref<string>('')
const users = ref<{id: string, name: string, color?: string}[]>([])
const isConnected = ref(false)
const ws = ref<WebSocket | null>(null)
const reconnectAttempts = ref(0)
const maxReconnectAttempts = 5

// Toast notification
const toast = ref({ show: false, message: '', type: 'success' as 'success' | 'error' })

// Generate or get user ID
const getUserId = () => {
  let userId = localStorage.getItem('docle_user_id')
  if (!userId) {
    userId = `User-${Math.random().toString(36).substr(2, 6)}`
    localStorage.setItem('docle_user_id', userId)
  }
  return userId
}

// WebSocket connection for collaboration
const connectWebSocket = () => {
  if (!sessionId.value) return

  const config = useRuntimeConfig()
  const isLocal = process.client && window.location.hostname === 'localhost'
  const wsProtocol = isLocal ? 'ws' : 'wss'
  const wsHost = isLocal ? 'localhost:8787' : config.public.apiBase.replace(/^https?:\/\//, '')
  const wsUrl = `${wsProtocol}://${wsHost}/collab/${sessionId.value}/websocket`

  try {
    ws.value = new WebSocket(wsUrl)

    ws.value.onopen = () => {
      isConnected.value = true
      reconnectAttempts.value = 0
      // console.log('✅ Connected to collaboration session')
    }

    ws.value.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        handleWebSocketMessage(msg)
      } catch (e) {
        console.error('Failed to parse message:', e)
      }
    }

    ws.value.onclose = () => {
      isConnected.value = false
      // console.log('❌ Disconnected from collaboration session')

      // Try to reconnect
      if (reconnectAttempts.value < maxReconnectAttempts) {
        reconnectAttempts.value++
        setTimeout(() => {
          console.log(`🔄 Reconnecting (attempt ${reconnectAttempts.value})...`)
          connectWebSocket()
        }, 1000 * reconnectAttempts.value)
      }
    }

    ws.value.onerror = (error) => {
      console.error('WebSocket error:', error)
      showToast('Connection error. Retrying...', 'error')
    }
  } catch (e) {
    console.error('Failed to create WebSocket:', e)
    showToast('Failed to connect to collaboration session', 'error')
  }
}

// Handle incoming WebSocket messages
const handleWebSocketMessage = (msg: any) => {
  switch (msg.type) {
    case 'init':
      // Initial state from server
      myUserId.value = msg.userId
      code.value = msg.data.code || code.value
      lang.value = msg.data.lang || lang.value
      users.value = msg.data.users.map((u: any) =>
        u.id === msg.userId ? { ...u, name: 'You' } : u
      )
      break

    case 'join':
      // New user joined (don't add yourself)
      if (msg.userId !== myUserId.value) {
        const existingUser = users.value.find(u => u.id === msg.userId)
        if (!existingUser) {
          users.value.push({
            id: msg.userId,
            name: msg.data.name,
            color: msg.data.color
          })
          showToast(`${msg.data.name} joined`, 'success')
        }
      }
      break

    case 'leave':
      // User left
      const leftUser = users.value.find(u => u.id === msg.userId)
      if (leftUser && leftUser.name !== 'You') {
        users.value = users.value.filter(u => u.id !== msg.userId)
        showToast(`${leftUser.name} left the session`, 'error')

        // If you're now alone, show a message
        const otherUsers = users.value.filter(u => u.name !== 'You')
        if (otherUsers.length === 0) {
          showToast('You are now alone. Session will end in 10 seconds...', 'error')
          setTimeout(() => {
            if (isCollabMode.value && users.value.filter(u => u.name !== 'You').length === 0) {
              leaveCollaboration()
            }
          }, 10000)
        }
      }
      break

    case 'update':
      // Code updated by another user
      if (msg.userId !== myUserId.value) {
        code.value = msg.data.code || code.value
        lang.value = msg.data.lang || lang.value

        const user = users.value.find(u => u.id === msg.userId)
        if (user && user.name !== 'You') {
          showToast(`Code updated by ${user.name}`, 'success')
        }
      }
      break

    case 'run':
      // Code executed by another user - update output in real-time
      if (msg.userId !== myUserId.value) {
        lastRunResult.value = msg.data.result
        output.value = msg.data.result.stdout || msg.data.result.stderr || JSON.stringify(msg.data.result, null, 2)

        const user = users.value.find(u => u.id === msg.userId)
        if (user && user.name !== 'You') {
          showToast(`${user.name} ran the code`, 'success')
        }
      }
      break

    case 'cursor':
      // Cursor position update (for future implementation)
      // You could highlight where other users are typing
      break
  }
}

// Send code update via WebSocket
const sendCodeUpdate = () => {
  if (ws.value && ws.value.readyState === WebSocket.OPEN && isCollabMode.value) {
    ws.value.send(JSON.stringify({
      type: 'update',
      userId: myUserId.value,
      data: {
        code: code.value,
        lang: lang.value
      }
    }))
  }
}

// Send run result via WebSocket
const sendRunResult = (result: any) => {
  if (ws.value && ws.value.readyState === WebSocket.OPEN && isCollabMode.value) {
    ws.value.send(JSON.stringify({
      type: 'run',
      userId: myUserId.value,
      data: {
        result
      }
    }))
  }
}

// Load history
onMounted(() => {
  // Try to restore draft
  const restored = restoreDraft()
  if (restored && lastSaved.value) {
    const minutes = Math.floor((Date.now() - lastSaved.value.getTime()) / (1000 * 60))
    if (minutes < 60) {
      showInfo(`Draft restored from ${minutes} minute${minutes === 1 ? '' : 's'} ago`)
    }
  }

  const stored = localStorage.getItem('docle_history')
  if (stored) history.value = JSON.parse(stored)

  // Initialize user ID
  myUserId.value = getUserId()

  // Check authentication status
  checkAuth()

  if (isCollabMode.value) {
    // Connect via WebSocket for real collaboration
    connectWebSocket()
  }
})

// Cleanup on unmount
onUnmounted(() => {
  if (ws.value && ws.value.readyState === WebSocket.OPEN) {
    // WebSocket will trigger 'close' event which notifies server
    ws.value.close()
  }
})

// Handle browser close/refresh to properly disconnect
if (process.client) {
  window.addEventListener('beforeunload', () => {
    if (ws.value && ws.value.readyState === WebSocket.OPEN) {
      ws.value.close()
    }
  })
}

// Show toast notification
const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  toast.value = { show: true, message, type }
  setTimeout(() => { toast.value.show = false }, 3000)
}

// File operations
const addFile = () => {
  const name = prompt('Enter file name (e.g. utils.py):')
  if (!name) return
  files.value.push({ name, content: '' })
  activeFileIdx.value = files.value.length - 1
  showToast(`File "${name}" created`, 'success')
}

const removeFile = (idx: number) => {
  if (files.value.length === 1) {
    showToast('Cannot remove the last file', 'error')
    return
  }
  const fileName = files.value[idx].name
  files.value.splice(idx, 1)
  if (activeFileIdx.value >= files.value.length) activeFileIdx.value = files.value.length - 1
  showToast(`File "${fileName}" removed`, 'success')
}

// Package operations
const addPackage = () => {
  if (!newPackage.value.trim()) return
  packages.value.push(newPackage.value.trim())
  showToast(`Package "${newPackage.value}" added`, 'success')
  newPackage.value = ''
}

const removePackage = (idx: number) => {
  const pkg = packages.value[idx]
  packages.value.splice(idx, 1)
  showToast(`Package "${pkg}" removed`, 'success')
}

// Helper: Get friendly error message
const getFriendlyError = (error: any): string => {
  const message = error.message || error.data?.message || String(error)

  // Timeout errors
  if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
    return `Execution timed out\n\nYour code took longer than ${timeout.value}ms to execute.\nTry:\n• Increasing the timeout limit\n• Optimizing your code\n• Reducing data processing`
  }

  // Network errors
  if (message.includes('fetch failed') || message.includes('ECONNREFUSED')) {
    return `Connection failed\n\nCouldn't reach the execution server.\nThis usually means:\n• The API is temporarily down\n• Network connectivity issue\n• Check your internet connection`
  }

  // Cold start (takes 5-10s)
  if (message.includes('Headers Timeout')) {
    return `Server is waking up...\n\nThe execution environment is initializing (takes 5-10 seconds on first run).\nRetrying automatically...`
  }

  // Memory errors
  if (message.includes('memory') || message.includes('OOM')) {
    return `Out of memory\n\nYour code used too much memory.\nTry:\n• Processing data in smaller chunks\n• Reducing variable sizes\n• Optimizing data structures`
  }

  // Syntax errors
  if (message.includes('SyntaxError')) {
    return `Syntax Error\n\n${message}\n\nCheck your code for:\n• Missing parentheses or brackets\n• Incorrect indentation (Python)\n• Missing semicolons (JavaScript)`
  }

  // Default error
  return `Execution Error\n\n${message}`
}

// Run code with retry logic
const runCode = async (isRetry = false) => {
  if (!isRetry) {
    retryCount.value = 0
  }

  isRunning.value = true
  loadingMessage.value = retryCount.value > 0
    ? `Retrying... (attempt ${retryCount.value + 1}/${maxRetries + 1})`
    : 'Executing code...'
  output.value = ''
  lastRunResult.value = null

  try {
    const payload: any = {
      lang: lang.value,
      policy: {
        timeoutMs: timeout.value
      }
    }

    // GitHub Repo Mode
    if (repoUrl.value.trim()) {
      payload.repo = repoUrl.value.trim()
      // Language is auto-detected when repo is provided
      delete payload.lang
    } else {
      // Regular code mode
      if (isMultiFile.value && files.value.length > 1) {
        payload.files = files.value.map(f => ({ path: f.name, content: f.content }))
        payload.entrypoint = files.value[0].name
      } else {
        payload.code = code.value
      }
    }

    if (packages.value.length > 0) {
      payload.packages = { packages: packages.value }
    }

    // Network Access Controls
    if (allowNetwork.value) {
      payload.policy.allowNetwork = true
      if (allowedHosts.value.trim()) {
        const hosts = allowedHosts.value.split('\n').map(h => h.trim()).filter(h => h.length > 0)
        if (hosts.length > 0) {
          payload.policy.allowedHosts = hosts
        }
      }
    }

    // Output Size Limit
    if (maxOutputBytes.value && maxOutputBytes.value !== 1048576) {
      payload.policy.maxOutputBytes = maxOutputBytes.value
    }

    // Always use Nuxt proxy
    const apiUrl = '/api/run'

    // Show cold start message for first-time users
    if (retryCount.value === 0 && !history.value.length) {
      loadingMessage.value = 'Starting execution environment... (first run takes ~10 seconds)'
    }

    // Check if API key is available
    if (!playgroundApiKey.value) {
      throw new Error('API key required. Please sign in to use the playground.')
    }

    const response = await $fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${playgroundApiKey.value}`
      },
      body: payload,
      timeout: timeout.value + 10000  // Add buffer to API timeout
    })

    lastRunResult.value = response
    output.value = response.stdout || response.stderr || JSON.stringify(response, null, 2)
    retryCount.value = 0  // Reset retry count on success

    // Broadcast execution result to collaborators in real-time
    if (isCollabMode.value) {
      sendRunResult(response)
    }

    // Save to history
    const newHistory = [
      { code: code.value, lang: lang.value, timestamp: Date.now(), result: response },
      ...history.value
    ].slice(0, 50)
    history.value = newHistory
    localStorage.setItem('docle_history', JSON.stringify(newHistory))

    if (response.ok) {
      showToast('Code executed successfully', 'success')
    } else {
      showToast('Execution completed with errors', 'error')
    }

  } catch (error: any) {
    console.error('Execution error:', error)

    const friendlyError = getFriendlyError(error)
    output.value = friendlyError

    // Auto-retry on timeout/connection errors
    const shouldRetry = (
      (error.message?.includes('timeout') ||
       error.message?.includes('Headers Timeout') ||
       error.message?.includes('fetch failed')) &&
      retryCount.value < maxRetries
    )

    if (shouldRetry) {
      retryCount.value++
      showToast(`⏳ Retrying... (${retryCount.value}/${maxRetries})`, 'error')
      // Wait 2 seconds before retry
      await new Promise(resolve => setTimeout(resolve, 2000))
      return runCode(true)
    }

    // Show error toast
    const shortError = error.message?.includes('timeout')
      ? 'Execution timed out'
      : error.message?.includes('fetch failed')
      ? 'Connection failed'
      : 'Execution failed'

    showToast(`${shortError}`, 'error')
  } finally {
    isRunning.value = false
    loadingMessage.value = ''
  }
}

// Clear operations
const clearCode = () => {
  code.value = ''
  showToast('Code cleared', 'success')
}

const clearHistory = () => {
  if (confirm('Clear all execution history?')) {
    history.value = []
    localStorage.removeItem('docle_history')
    showToast('History cleared', 'success')
  }
}

// History operations
const loadFromHistory = (item: any) => {
  code.value = item.code
  lang.value = item.lang
  activeTab.value = 'editor'
  showToast('Code loaded from history', 'success')
}

// Language change
const changeLang = (newLang: 'python' | 'node') => {
  lang.value = newLang
  if (!code.value || code.value.includes('Hello, Docle!')) {
    code.value = newLang === 'python'
      ? 'print("Hello, Docle!")\nfor i in range(5):\n    print(f"Count: {i}")'
      : 'console.log("Hello, Docle!");\nfor(let i=0; i<5; i++) {\n    console.log(`Count: ${i}`);\n}'
  }
}

// Toggle multi-file mode
const toggleMultiFile = () => {
  if (!isAuthenticated.value && !isMultiFile.value) {
    showToast('Please login to use multi-file mode', 'error')
    setTimeout(() => navigateTo('/login'), 1500)
    return
  }
  isMultiFile.value = !isMultiFile.value
  if (isMultiFile.value) {
    // Switching to multi-file mode
    if (files.value.length === 1) {
      files.value.push({ name: 'utils.py', content: '# Add your utilities here' })
    }
    activeTab.value = 'files'
  } else {
    // Switching to single-file mode
    activeTab.value = 'editor'
  }
  showToast(isMultiFile.value ? 'Multi-file mode enabled' : 'Single-file mode enabled', 'success')
}

// Watch for session ID changes to auto-connect
watch(sessionId, (newSessionId, oldSessionId) => {
  if (newSessionId && newSessionId !== oldSessionId) {
    // New collaboration session started
    myUserId.value = getUserId()
    connectWebSocket()
  } else if (!newSessionId && oldSessionId) {
    // Session ended, disconnect
    if (ws.value) {
      ws.value.close()
      ws.value = null
    }
    isConnected.value = false
    users.value = []
  }
})

// Watch for code changes and sync via WebSocket
let sendUpdateTimeout: NodeJS.Timeout | null = null
watch([() => files.value[activeFileIdx.value]?.content, lang], () => {
  if (isCollabMode.value && isConnected.value) {
    // Debounce updates to avoid flooding the server
    if (sendUpdateTimeout) clearTimeout(sendUpdateTimeout)
    sendUpdateTimeout = setTimeout(() => {
      sendCodeUpdate()
    }, 300) // Send update 300ms after user stops typing
  }
})

// Collab operations
const startCollabSession = () => {
  if (!isAuthenticated.value) {
    showToast('Please login to use collaboration features', 'error')
    setTimeout(() => navigateTo('/login'), 1500)
    return
  }
  const newSessionId = crypto.randomUUID()
  navigateTo(`/?session=${newSessionId}`)
  showToast('Collaborative session started', 'success')
}

const copyShareLink = () => {
  navigator.clipboard.writeText(window.location.href)
  showToast('Share link copied to clipboard!', 'success')
}

const leaveCollaboration = () => {
  // Close WebSocket connection (this triggers 'leave' broadcast on server)
  if (ws.value) {
    if (ws.value.readyState === WebSocket.OPEN) {
      ws.value.close()
    }
    ws.value = null
  }

  // Reset state
  isConnected.value = false
  users.value = []
  reconnectAttempts.value = maxReconnectAttempts // Prevent reconnection attempts

  // Navigate back to regular playground
  navigateTo('/')
  showToast('Left collaboration session', 'success')
}

// Get status color
const getStatusColor = () => {
  if (!lastRunResult.value) return 'bg-gray-500'
  return lastRunResult.value.ok ? 'bg-green-500' : 'bg-red-500'
}
</script>

<template>
  <div class="h-screen bg-black text-white flex flex-col overflow-hidden">
    <!-- Background gradient mesh -->
    <div class="fixed inset-0 bg-gradient-mesh opacity-30 pointer-events-none"></div>

    <!-- Toast Notification -->
    <Transition name="slide-down">
      <div
        v-if="toast.show"
        class="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-slide-down">
        <div
          :class="[
            'px-4 py-2 rounded-lg border',
            toast.type === 'success'
              ? 'bg-black border-green-300/10 text-green-300'
              : 'bg-black border-red-500/10 text-red-500'
          ]">
          <div class="flex items-center text-sm gap-2">
            <span v-if="toast.type === 'success'">✓</span>
            <span v-else>✕</span>
            <span class="font-medium">{{ toast.message }}</span>
          </div>
        </div>
      </div>
    </Transition>

    <div class="relative flex-1 flex flex-col overflow-hidden">
      <!-- Header -->
      <AppHeader active-page="playground" @open-snippets="openSnippetsPanel">
        <template #actions>
          <!-- Collab Status Banner -->
          <Transition name="slide-down">
            <div v-if="isCollabMode" class="p-2 py-1 rounded-lg bg-blue-300/10 border border-blue-300/10">
              <div class="flex items-center justify-between gap-4">
                <div class="flex items-center gap-4">
                  <div class="flex items-center gap-2">
                    <div
                      class="w-2 h-2 rounded-full"
                      :class="isConnected ? 'bg-green-300 animate-pulse-glow' : 'bg-yellow-300 animate-pulse'"></div>
                    <span class="text-xs text-gray-300 font-medium">
                      {{ isConnected ? 'Connected' : 'Connecting...' }}
                    </span>
                  </div>
                  <div
                    v-for="(user, idx) in users"
                    :key="idx"
                    class="flex items-center gap-2 px-2 py-0.5 rounded-full bg-gray-500/10 text-xs">
                    <div
                      class="w-2 h-2 rounded-full"
                      :class="user.id === myUserId ? 'bg-green-300' : 'bg-blue-300'"></div>
                    <span :class="user.id === myUserId ? 'text-green-300 font-medium' : 'text-gray-300'">
                      {{ user.name }}
                    </span>
                  </div>
                </div>
                <span class="text-xs text-blue-300 font-mono">Session: {{ sessionId?.slice(0, 8) }}...</span>
              </div>
            </div>
          </Transition>

          <!-- Collab & Multi-file buttons -->
          <button
            v-if="!isCollabMode && isAuthenticated"
            @click="startCollabSession"
            class="group relative px-2.5 py-1.5 text-xs rounded-lg border border-blue-300/10 bg-blue-300/10 text-blue-300 font-medium transition-all overflow-hidden">
            <span class="relative flex items-center gap-2">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
              </svg>
              Collab
            </span>
          </button>
          <button
            v-if="isCollabMode"
            @click="copyShareLink"
            class="px-2.5 py-1.5 text-xs rounded-lg border border-blue-300/10 bg-blue-300/10 text-blue-300 font-medium transition-all hover:bg-blue-300/15">
            <span class="flex items-center gap-2">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path>
              </svg>
              Share
            </span>
          </button>
          <button
            v-if="isCollabMode"
            @click="leaveCollaboration"
            class="px-2.5 py-1.5 text-xs rounded-lg border border-red-500/10 bg-red-500/10 text-red-400 font-medium transition-all hover:bg-red-500/20">
            <span class="flex items-center gap-2">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
              </svg>
              Leave
            </span>
          </button>
          <div v-if="isAuthenticated" class="flex items-end">
            <button
              @click="toggleMultiFile"
              :class="[
                'w-full px-2.5 py-1.5 text-xs rounded-lg font-medium transition-all flex items-center justify-center gap-1.5',
                isMultiFile
                  ? 'bg-green-300/10 text-green-300 border border-green-300/10 hover:bg-green-300/15'
                  : 'bg-gray-500/10 text-white border border-gray-500/10 hover:bg-gray-500/15'
              ]">
              <svg v-if="isMultiFile" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
              </svg>
              <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
              </svg>
              {{ isMultiFile ? 'Files' : 'Editor' }}
            </button>
          </div>
        </template>
      </AppHeader>

      <!-- Main Layout -->
      <div class="flex-1 flex overflow-hidden">
        <!-- Main Content -->
        <div class="flex-1 flex flex-col overflow-hidden">
          <!-- Settings Bar -->
          <div class="py-4 px-4 border-b border-gray-500/20 flex-shrink-0">
            <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <label class="block text-xs text-gray-400 mb-1.5 font-medium">Language</label>
                <div class="relative">
                  <select
                    v-model="lang"
                    @change="changeLang(lang)"
                    class="w-full px-3 py-2 bg-gray-500/10 text-white border border-gray-500/10 focus:border-gray-500/15 rounded-lg text-sm transition-all appearance-none cursor-pointer hover:border-gray-500/20 focus:outline-none">
                    <option value="python">Python</option>
                    <option value="node">Node.js</option>
                  </select>
                  <svg class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </div>
              </div>
              <div>
                <label class="block text-xs text-gray-400 mb-1.5 font-medium">Timeout</label>
                <div class="relative">
                  <input
                    v-model.number="timeout"
                    type="number"
                    class="w-full px-3 py-2 bg-gray-500/10 text-white border border-gray-500/10 focus:border-gray-500/15 rounded-lg text-sm transition-all" />
                  <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">ms</span>
                </div>
              </div>
              <div class="flex flex-col gap-2">
                <!-- Loading message -->
                <div v-if="loadingMessage" class="text-xs text-blue-300 animate-pulse flex items-center gap-2">
                  <svg class="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {{ loadingMessage }}
                </div>
                <button
                  @click="runCode"
                  :disabled="isRunning"
                  :class="[
                    'w-full px-3 py-2 mt-6 text-sm rounded-lg font-semibold transition-all flex items-center justify-center gap-2',
                    isRunning
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-300 text-black hover:bg-blue-400'
                  ]">
                  <svg v-if="!isRunning" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                  <svg v-else class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                  </svg>
                  {{ isRunning ? 'Running...' : 'Run Code' }}
                </button>
              </div>
            </div>
          </div>

          <!-- Editor -->
          <div class="flex-1 bg-black overflow-hidden flex flex-col">
            <div class="flex items-center justify-between px-4 py-4 bg-gray-500/10 border-b border-gray-500/10 flex-shrink-0">
              <div class="flex items-center gap-3">
                <h2 class="text-sm font-semibold text-white flex items-center gap-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>
                  </svg>
                  {{ isMultiFile ? files[activeFileIdx]?.name : 'Code Editor' }}
                </h2>
                <div v-if="lastRunResult"
                     :class="['w-2 h-2 rounded-full', getStatusColor()]"></div>
              </div>
              <button
                @click="clearCode"
                class="text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
                Clear
              </button>
            </div>

            <!-- GitHub Repo Mode Notice -->
            <div v-if="repoUrl.trim()" class="flex-1 flex items-center justify-center bg-black p-8">
              <div class="text-center max-w-md">
                <svg class="w-16 h-16 mx-auto mb-4 text-blue-300" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                </svg>
                <h3 class="text-lg font-semibold text-white mb-2">GitHub Repository Mode</h3>
                <p class="text-sm text-gray-400 mb-3">Ready to execute:</p>
                <code class="px-3 py-1.5 bg-gray-500/20 border border-gray-500/20 rounded text-blue-300 text-sm">{{ repoUrl }}</code>
                <p class="text-xs text-gray-500 mt-4">
                  Click <strong class="text-white">Run Code</strong> above to execute this repository
                </p>
                <button
                  @click="repoUrl = ''"
                  class="mt-4 text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1 mx-auto">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                  Clear & use code editor
                </button>
              </div>
            </div>

            <!-- Code Editor -->
            <textarea
              v-else
              v-model="code"
              :class="[
                'flex-1 w-full p-4 bg-black text-white',
                'font-mono text-sm resize-none',
                'focus:outline-none',
                'placeholder-gray-600'
              ]"
              :placeholder="`Write your ${lang === 'python' ? 'Python' : 'Node.js'} code here...`"
              spellcheck="false"></textarea>
          </div>

          <!-- Output -->
          <div class="h-64 bg-gray-500/10 border-t border-gray-500/10 overflow-hidden flex flex-col flex-shrink-0">
            <div class="flex items-center justify-between px-4 py-4 border-b border-gray-500/10 flex-shrink-0">
              <h2 class="text-sm font-semibold text-white flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                Output
              </h2>
              <div v-if="lastRunResult" class="flex items-center gap-4 text-xs">
                <span class="text-gray-500">Exit: <span :class="lastRunResult.ok ? 'text-green-400' : 'text-red-400'">{{ lastRunResult.exitCode }}</span></span>
                <span class="text-gray-500">Time: <span class="text-gray-300">{{ lastRunResult.usage?.durationMs || 0 }}ms</span></span>
              </div>
            </div>
            <pre :class="[
              'flex-1 p-4 overflow-auto text-sm font-mono',
              output ? 'text-gray-300' : 'text-gray-600'
            ]">{{ output || '— Run your code to see output' }}</pre>
          </div>
        </div>
        <!-- Sidebar -->
        <div class="w-100 border-l border-gray-500/20 flex flex-col overflow-hidden">
          <!-- Tab Navigation -->
          <div class="p-3 border-b border-gray-500/20 flex-shrink-0">
            <div class="grid grid-cols-4 gap-2">
              <button
                @click="activeTab = isMultiFile ? 'files' : 'editor'"
                :class="[
                  'px-3 py-2 rounded-lg text-xs font-medium transition-all',
                  (activeTab === 'editor' || activeTab === 'files')
                    ? 'bg-gray-500/10 text-white border border-gray-500/10'
                    : 'text-gray-400 hover:text-white border border-transparent hover:border-gray-500/10 hover:bg-gray-500/10'
                ]">
                <span class="flex items-center gap-1.5 justify-center">
                  <svg v-if="isMultiFile" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
                  </svg>
                  <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                  </svg>
                  {{ isMultiFile ? 'Files' : 'Editor' }}
                </span>
              </button>
              <button
                @click="activeTab = 'packages'"
                :class="[
                  'px-3 py-2 rounded-lg text-xs font-medium transition-all',
                  activeTab === 'packages'
                    ? 'bg-gray-500/10 text-white border border-gray-500/10'
                    : 'text-gray-400 hover:text-white border border-transparent hover:border-gray-500/10 hover:bg-gray-500/10'
                ]">
                <span class="flex items-center gap-1.5 justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3.5 h-3.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                  </svg>
                  <span>Packages</span>
                </span>
              </button>
              <button
                @click="activeTab = 'history'"
                :class="[
                  'w-full px-3 py-2 rounded-lg text-xs font-medium transition-all',
                  activeTab === 'history'
                    ? 'bg-gray-500/10 text-white border border-gray-500/10'
                    : 'text-gray-400 hover:text-white border border-transparent hover:border-gray-500/10 hover:bg-gray-500/10'
                ]">
                <span class="flex items-center gap-1.5 justify-center">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  History
                </span>
              </button>
							<button
                @click="activeTab = 'settings'"
                :class="[
                  'px-3 py-2 rounded-lg text-xs font-medium transition-all',
                  activeTab === 'settings'
                    ? 'bg-gray-500/10 text-white border border-gray-500/10'
                    : 'text-gray-400 hover:text-white border border-transparent hover:border-gray-500/10 hover:bg-gray-500/10'
                ]">
                <span class="flex items-center gap-1.5 justify-center">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  </svg>
                  Settings
                </span>
              </button>
            </div>
          </div>

          <!-- Dynamic Panel -->
          <Transition name="fade" mode="out-in">
            <!-- Editor Panel (Single File Mode) -->
            <div v-if="!isMultiFile && activeTab === 'editor'"
                 key="editor"
                 class="flex-1 p-4 overflow-y-auto animate-fade-in">
              <h3 class="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
                Editor
              </h3>

              <div class="space-y-4">
                <!-- File Info -->
                <div class="p-3 rounded-lg bg-gray-500/10 border border-gray-500/10">
                  <div class="text-xs text-gray-400 mb-1">Current File</div>
                  <div class="text-sm text-white font-mono">main.{{ lang === 'python' ? 'py' : 'js' }}</div>
                </div>

                <!-- Quick Info -->
                <div class="space-y-2">
                  <div class="flex items-start gap-2 text-sm text-gray-400">
                    <svg class="w-4 h-4 mt-0.5 text-green-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                    </svg>
                    <span>Press <kbd class="px-1.5 py-0.5 bg-gray-500/20 rounded text-xs font-mono">Cmd+Enter</kbd> to run</span>
                  </div>
                  <div class="flex items-start gap-2 text-sm text-gray-400">
                    <svg class="w-4 h-4 mt-0.5 text-blue-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
                    </svg>
                    <span>Enable multi-file mode for projects</span>
                  </div>
                  <div class="flex items-start gap-2 text-sm text-gray-400">
                    <svg class="w-4 h-4 mt-0.5 text-purple-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                    </svg>
                    <span>Add packages in the Packages tab</span>
                  </div>
                </div>

                <!-- Stats -->
                <div class="pt-3 border-t border-gray-500/10">
                  <div class="text-xs text-gray-500 mb-2">Editor Info</div>
                  <div class="grid grid-cols-2 gap-2 text-xs">
                    <div class="p-2 rounded bg-gray-500/5 border border-gray-500/10">
                      <div class="text-gray-500">Language</div>
                      <div class="text-white font-medium capitalize">{{ lang }}</div>
                    </div>
                    <div class="p-2 rounded bg-gray-500/5 border border-gray-500/10">
                      <div class="text-gray-500">Mode</div>
                      <div class="text-white font-medium">Single File</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Files Panel (Multi File Mode) -->
            <div v-else-if="isMultiFile && activeTab === 'files'"
                 key="files"
                 class="flex-1 p-4 overflow-y-auto animate-fade-in">
              <h3 class="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
                </svg>
                Project Files
              </h3>
              <div class="space-y-1 mb-3">
                <div
                  v-for="(file, idx) in files"
                  :key="idx"
                  @click="activeFileIdx = idx"
                  :class="[
                    'group flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all',
                    activeFileIdx === idx
                      ? 'bg-green-300/10 border border-green-300/10 text-green-300'
                      : 'hover:bg-gray-500/10 border border-transparent'
                  ]">
                  <span class="text-sm font-mono">{{ file.name }}</span>
                  <button
                    v-if="files.length > 1"
                    @click.stop="removeFile(idx)"
                    class="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
              </div>
              <button
                @click="addFile"
                class="w-full px-2.5 py-2.5 text-xs rounded-lg bg-gray-500/10 text-white border border-gray-500/10 hover:bg-gray-500/15 font-medium transition-all flex items-center justify-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                </svg>
                Add File
              </button>
            </div>

            <!-- Packages Panel -->
            <div v-else-if="activeTab === 'packages'"
                 key="packages"
                 class="flex-1 p-4 overflow-y-auto animate-fade-in">
              <h3 class="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                </svg>
                Dependencies
              </h3>
              <div class="space-y-2 mb-3">
                <div
                  v-for="(pkg, idx) in packages"
                  :key="idx"
                  class="group flex items-center justify-between p-2.5 bg-gray-500/10 rounded-lg border border-gray-500/10 hover:border-gray-500/20 transition-all">
                  <code class="text-sm text-gray-300">{{ pkg }}</code>
                  <button
                    @click="removePackage(idx)"
                    class="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
              </div>
              <div class="flex gap-2">
                <input
                  v-model="newPackage"
                  @keyup.enter="addPackage"
                  placeholder="requests, axios..."
                  class="flex-1 px-3 py-2 bg-gray-500/10 text-white border border-gray-500/10 focus:border-gray-500/20 rounded-lg text-sm placeholder-gray-500 transition-all" />
                <button
                  @click="addPackage"
                  class="px-2.5 py-2.5 text-xs rounded-lg bg-blue-300 text-black border border-blue-300 hover:bg-blue-300 font-medium transition-all">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                  </svg>
                </button>
              </div>
              <p class="text-xs text-gray-500 mt-3">
                Python: pip • Node.js: npm
              </p>
            </div>

            <!-- History Panel -->
            <div v-else-if="activeTab === 'history'"
                 key="history"
                 class="flex-1 p-4 overflow-y-auto animate-fade-in">
              <div class="flex justify-between items-center mb-3">
                <h3 class="text-sm font-semibold text-white flex items-center gap-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  Execution History
                </h3>
                <button
                  v-if="history.length > 0"
                  @click="clearHistory"
                  class="text-xs text-gray-400 hover:text-red-400 transition-colors">
                  Clear
                </button>
              </div>

              <div v-if="history.length === 0" class="text-sm text-gray-500 text-center py-12">
                <svg class="w-12 h-12 mx-auto mb-2 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                No runs yet
              </div>

              <div v-else class="space-y-2 max-h-[800px] overflow-y-auto pr-2">
                <div
                  v-for="(item, idx) in history.slice(0, 20)"
                  :key="idx"
                  @click="loadFromHistory(item)"
                  class="group p-3 bg-gray-500/10 hover:bg-gray-500/15 border border-gray-500/10 hover:border-gray-500/20 rounded-lg cursor-pointer transition-all">
                  <div class="flex items-center justify-between mb-2">
                    <span
                      :class="[
                        'text-xs font-semibold px-2 py-0.5 rounded',
                        item.lang === 'python' ? 'bg-blue-300/10 text-blue-300' : 'bg-green-300/10 text-green-300'
                      ]">
                      {{ item.lang }}
                    </span>
                    <span class="text-xs text-gray-500">
                      {{ new Date(item.timestamp).toLocaleTimeString() }}
                    </span>
                  </div>
                  <code class="text-xs text-gray-400 line-clamp-2 font-mono">{{ item.code }}</code>
                </div>
              </div>
            </div>

						<!-- Settings Panel -->
            <div v-else-if="activeTab === 'settings'"
                 key="settings"
                 class="flex-1 p-4 overflow-y-auto animate-fade-in">
              <h3 class="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
                Advanced Settings
              </h3>

              <!-- GitHub Repository -->
              <div class="mb-6">
                <label class="text-sm text-gray-300 mb-2 flex items-center gap-2">
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                  </svg>
                  GitHub Repository
                  <span class="inline-flex items-center px-2 py-0.5 text-xs rounded-lg bg-blue-300/10 text-blue-300 border border-blue-300/20">Beta</span>
                </label>
                <input
                  v-model="repoUrl"
                  type="text"
                  placeholder="octocat/Hello-World or full URL"
                  class="w-full px-3 py-2 bg-gray-500/10 text-white border border-gray-500/10 focus:border-gray-500/20 rounded-lg text-sm placeholder-gray-500 transition-all" />
                <div v-if="repoUrl.trim()" class="mt-2 p-2 bg-blue-300/5 border border-blue-300/20 rounded-lg flex items-start gap-2">
                  <svg class="w-4 h-4 text-blue-300 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <p class="text-xs text-blue-300">
                    Click <strong>Run Code</strong> to execute this repository
                  </p>
                </div>
                <p v-else class="text-xs text-gray-500 mt-2">
                  Runs scripts from any public repo (e.g., Python/Node.js files). Shows console output, not a live deployment.
                </p>
              </div>

              <!-- Network Access -->
              <div class="mb-6">
                <div class="flex items-center justify-between mb-2">
                  <label class="text-sm text-gray-300 flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path>
                    </svg>
                    Network Access
                    <!-- <span class="inline-flex items-center px-2 py-0.5 text-xs rounded bg-blue-300/10 text-blue-300 border border-blue-300/20"></span> -->
                  </label>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input
                      v-model="allowNetwork"
                      type="checkbox"
                      class="sr-only peer">
                    <div class="w-9 h-5 bg-gray-500/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-300"></div>
                  </label>
                </div>

                <div v-if="allowNetwork" class="mt-3 space-y-2 animate-fade-in">
                  <label class="block text-xs text-gray-400">
                    Allowed Hosts (one per line, supports wildcards)
                  </label>
                  <textarea
                    v-model="allowedHosts"
                    rows="4"
                    placeholder="api.github.com&#10;*.example.com&#10;httpbin.org"
                    class="w-full px-3 py-2 bg-gray-500/10 text-white border border-gray-500/10 focus:border-gray-500/20 rounded-lg text-sm placeholder-gray-500 font-mono transition-all resize-none"></textarea>
                  <p class="text-xs text-gray-500">
                    Leave empty to allow all hosts. Use <code class="text-blue-300">*</code> for wildcards.
                  </p>
                </div>
              </div>

              <!-- Output Size Limit -->
              <div class="mb-6">
                <label class="text-sm text-gray-300 mb-2 flex items-center gap-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                  Max Output Size
                </label>
                <div class="space-y-2">
                  <input
                    v-model.number="maxOutputBytes"
                    type="range"
                    min="1024"
                    max="10485760"
                    step="1024"
                    class="w-full h-2 bg-gray-500/20 rounded-lg appearance-none cursor-pointer accent-blue-300">
                  <div class="flex justify-between text-xs text-gray-400">
                    <span>1 KB</span>
                    <span class="text-white font-medium">{{ (maxOutputBytes / 1024 / 1024).toFixed(2) }} MB</span>
                    <span>10 MB</span>
                  </div>
                </div>
                <p class="text-xs text-gray-500 mt-2">
                  Limits combined stdout + stderr output
                </p>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Smooth transitions */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Custom select dropdown arrow */
select {
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239CA3AF' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 0.5rem center;
  background-repeat: no-repeat;
  background-size: 1.5em 1.5em;
  padding-right: 2.5rem;
}
</style>
