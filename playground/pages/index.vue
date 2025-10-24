<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const route = useRoute()

// Check if this is a collab session
const sessionId = computed(() => route.query.session as string | undefined)
const isCollabMode = computed(() => !!sessionId.value)

// UI State
const activeTab = ref<'editor' | 'files' | 'packages' | 'history'>('editor')
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
const memory = ref(256)
const allowNet = ref(false)

// Packages
const packages = ref<string[]>([])
const newPackage = ref('')

// Output & History
const output = ref('')
const isRunning = ref(false)
const history = ref<any[]>([])
const lastRunResult = ref<any>(null)

// Collab state
const users = ref<string[]>(['You'])
const isConnected = ref(false)

// Toast notification
const toast = ref({ show: false, message: '', type: 'success' as 'success' | 'error' })

// Load history
onMounted(() => {
  const stored = localStorage.getItem('docle_history')
  if (stored) history.value = JSON.parse(stored)
  
  if (isCollabMode.value) {
    setTimeout(() => { isConnected.value = true }, 1000)
  }
})

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

// Run code
const runCode = async () => {
  isRunning.value = true
  output.value = ''
  lastRunResult.value = null
  
  try {
    const payload: any = {
      lang: lang.value,
      policy: {
        timeoutMs: timeout.value,
        memoryMB: memory.value,
        allowNet: allowNet.value
      }
    }
    
    if (isMultiFile.value && files.value.length > 1) {
      payload.files = files.value.map(f => ({ path: f.name, content: f.content }))
      payload.entrypoint = files.value[0].name
    } else {
      payload.code = code.value
    }
    
    if (packages.value.length > 0) {
      payload.packages = { packages: packages.value }
    }
    
    // Use production API or local proxy
    const config = useRuntimeConfig()
    const apiUrl = process.client && window.location.hostname === 'localhost' 
      ? '/api/run'  // Use local proxy in development
      : `${config.public.apiBase}/api/run`  // Use production API
    
    const response = await $fetch(apiUrl, {
      method: 'POST',
      body: payload
    })
    
    lastRunResult.value = response
    output.value = response.stdout || response.stderr || JSON.stringify(response, null, 2)
    
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
    output.value = `Error: ${error.message || 'Failed to execute code'}`
    showToast(error.message || 'Failed to execute code', 'error')
  } finally {
    isRunning.value = false
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

// Collab operations
const startCollabSession = () => {
  const newSessionId = crypto.randomUUID()
  navigateTo(`/?session=${newSessionId}`)
  showToast('Collaborative session started', 'success')
}

const copyShareLink = () => {
  navigator.clipboard.writeText(window.location.href)
  showToast('Share link copied to clipboard!', 'success')
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
      <!-- Modern Header -->
      <div class="border-b border-gray-500/20 px-4 py-2 flex-shrink-0">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="relative flex items-center">
              <img src="/assets/img/logo.png" alt="Docle" class="w-7 h-7"></img>
            </div>
            <span class="text-gray-500/50 text-sm">/</span>
            <div class="flex items-center gap-2 border border-gray-500/20 rounded-xl p-0.5">
              <NuxtLink 
                to="/"
                class="px-2 py-1.5 text-xs rounded-lg border border-gray-500/15 bg-gray-500/15 text-white font-medium transition-all">
                <span class="flex items-center gap-2">
                  playground
                </span>
              </NuxtLink>
              <NuxtLink 
                to="/dashboard"
                class="px-2 py-1.5 text-xs rounded-lg border border-transparent bg-transparent text-gray-500 font-medium transition-all hover:bg-gray-500/10">
                <span class="flex items-center gap-2">
                  Dashboard
                </span>
              </NuxtLink>
              <NuxtLink 
                to="/demo"
                class="px-2 py-1.5 text-xs rounded-lg border border-transparent bg-transparent text-gray-500 font-medium transition-all hover:bg-gray-500/10">
                <span class="flex items-center gap-2">
                  Demo
                </span>
              </NuxtLink>
            </div>
          </div>

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
                    <div class="w-2 h-2 rounded-full bg-blue-300"></div>
                    <span>{{ user }}</span>
                  </div>
                </div>
                <span class="text-xs text-blue-300 font-mono">Session: {{ sessionId?.slice(0, 8) }}...</span>
              </div>
            </div>
          </Transition>
          
          <!-- Action buttons -->
          <div class="flex items-center gap-3">
            <button 
              v-if="!isCollabMode"
              @click="startCollabSession"
              class="group relative px-2.5 py-1.5 text-xs rounded-lg border border-blue-300 bg-blue-300 text-black font-medium transition-all overflow-hidden">
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
              class="px-2.5 py-1.5 text-xs rounded-lg border border-blue-300 bg-blue-300 text-black font-medium transition-all">
              <span class="flex items-center gap-2">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path>
                </svg>
                Share
              </span>
            </button>
            <div class="flex items-end">
              <button 
                @click="toggleMultiFile"
                :class="[
                  'w-full px-2.5 py-1.5 text-xs rounded-lg font-medium transition-all flex items-center justify-center gap-1.5',
                  isMultiFile 
                    ? 'bg-green-300 text-black' 
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
          </div>
        </div>
      </div>

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
              <div>
                <label class="block text-xs text-gray-400 mb-1.5 font-medium">Memory</label>
                <div class="relative">
                  <input 
                    v-model.number="memory"
                    type="number"
                    class="w-full px-3 py-2 bg-gray-500/10 text-white border border-gray-500/10 focus:border-gray-500/15 rounded-lg text-sm transition-all" />
                  <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">MB</span>
                </div>
              </div>
              <div>
                <label class="block text-xs text-gray-400 mb-1.5 font-medium">Network</label>
                <div class="relative">
                  <select 
                    v-model="allowNet"
                    class="w-full px-3 py-2 bg-gray-500/10 text-white border border-gray-500/10 focus:border-gray-500/15 rounded-lg text-sm transition-all appearance-none cursor-pointer hover:border-gray-500/20 focus:outline-none">
                    <option :value="false">Disabled</option>
                    <option :value="true">Enabled</option>
                  </select>
                  <svg class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </div>
              </div>
              <div class="flex items-end">
                <button 
                  @click="runCode"
                  :disabled="isRunning"
                  :class="[
                    'w-full px-3 py-2  text-sm rounded-lg font-semibold transition-all flex items-center justify-center gap-2',
                    isRunning
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-300 text-black'
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
            
            <textarea 
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
        <div class="w-80 border-l border-gray-500/20 flex flex-col overflow-hidden">
          <!-- Tab Navigation -->
          <div class="p-3 border-b border-gray-500/20 flex-shrink-0">
            <div class="grid grid-cols-3 gap-2">
              <button 
                @click="activeTab = isMultiFile ? 'files' : 'editor'"
                :class="[
                  'px-3 py-2 rounded-lg text-sm font-medium transition-all',
                  (activeTab === 'editor' || activeTab === 'files')
                    ? 'bg-gray-500/10 text-white border border-gray-500/10'
                    : 'text-gray-400 hover:text-white border border-transparent hover:bg-gray-500/10'
                ]">
                <span class="flex items-center gap-1.5">
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
                  'px-3 py-2 rounded-lg text-sm font-medium transition-all',
                  activeTab === 'packages'
                    ? 'bg-gray-500/10 text-white border border-gray-500/10'
                    : 'text-gray-400 hover:text-white border border-transparent hover:bg-gray-500/10'
                ]">
                <span class="flex items-center gap-1.5">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                  </svg>
                  Packages
                </span>
              </button>
              <button 
                @click="activeTab = 'history'"
                :class="[
                  'w-full px-3 py-2 rounded-lg text-sm font-medium transition-all',
                  activeTab === 'history'
                    ? 'bg-gray-500/10 text-white border border-gray-500/10'
                    : 'text-gray-400 hover:text-white border border-transparent hover:bg-gray-500/10'
                ]">
                <span class="flex items-center gap-1.5">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  History
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
              
              <div v-else class="space-y-2 max-h-[500px] overflow-y-auto pr-2">
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
