<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'

const runs = ref<any[]>([])
const loading = ref(true)
const error = ref('')
const searchQuery = ref('')
const filterLang = ref<'all' | 'python' | 'node'>('all')

// Load execution history
onMounted(async () => {
  try {
    const history = localStorage.getItem('docle_history')
    if (history) {
      const parsed = JSON.parse(history)
      runs.value = parsed.slice(0, 100)
    }
    loading.value = false
  } catch (e: any) {
    error.value = e.message
    loading.value = false
  }
})

// Filtered runs
const filteredRuns = computed(() => {
  let filtered = runs.value

  if (filterLang.value !== 'all') {
    filtered = filtered.filter(r => r.lang === filterLang.value)
  }

  if (searchQuery.value) {
    filtered = filtered.filter(r => 
      r.code.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
  }

  return filtered
})

// Stats
const stats = computed(() => {
  const total = runs.value.length
  const python = runs.value.filter(r => r.lang === 'python').length
  const node = runs.value.filter(r => r.lang === 'node').length
  const successful = runs.value.filter(r => r.result?.ok).length

  return { total, python, node, successful }
})

// Clear history
const clearHistory = () => {
  if (confirm('Clear all execution history? This cannot be undone.')) {
    localStorage.removeItem('docle_history')
    runs.value = []
  }
}

// Format timestamp
const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleString()
}

// Format relative time
const formatRelativeTime = (timestamp: number) => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}
</script>

<template>
  <div class="h-screen bg-black text-white flex flex-col overflow-hidden">

    <div class="relative flex-1 flex flex-col overflow-hidden">
      <!-- Header -->
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
                class="px-2.5 py-1.5 text-xs rounded-lg border border-transparent bg-transparent text-gray-500 font-medium transition-all hover:bg-gray-500/10">
                <span class="flex items-center gap-2">
                  playground
                </span>
              </NuxtLink>
              
              <NuxtLink 
                to="/dashboard"
                class="px-2.5 py-1.5 text-xs rounded-lg border border-gray-500/15 bg-gray-500/15 text-white font-medium transition-all hover:bg-gray-500/10">
                <span class="flex items-center gap-2">
                  Dashboard
                </span>
              </NuxtLink>
              
              <NuxtLink 
                to="/demo"
                class="px-2.5 py-1.5 text-xs rounded-lg border border-transparent bg-transparent text-gray-500 font-medium transition-all hover:bg-gray-500/10">
                <span class="flex items-center gap-2">
                  Demo
                </span>
              </NuxtLink>
            </div>
          </div>
          
          <div class="flex items-center gap-3">
            <button 
              v-if="runs.length > 0"
              @click="clearHistory"
              class="px-2.5 py-1.5 text-xs rounded-lg bg-red-500/10 border border-red-500/10 text-red-500 hover:bg-red-500/15 font-medium transition-all flex items-center gap-2">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
              Clear All
            </button>
          </div>
        </div>
      </div>

      <!-- Content Area -->
      <div class="flex-1 overflow-y-auto px-4 py-4">

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="p-4 rounded-xl bg-gray-500/10 border border-gray-500/10">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm text-gray-400">Total Runs</span>
            <div class="w-8 h-8 rounded-lg bg-green-300/10 flex items-center justify-center">
              <svg class="w-4 h-4 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
              </svg>
            </div>
          </div>
          <div class="text-2xl font-bold text-white">{{ stats.total }}</div>
        </div>

        <div class="p-4 rounded-xl bg-gray-500/10 border border-gray-500/10">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm text-gray-400">Python</span>
            <div class="w-8 h-8 rounded-lg bg-blue-300/10 flex items-center justify-center">
              <svg class="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>
              </svg>
            </div>
          </div>
          <div class="text-2xl font-bold text-white">{{ stats.python }}</div>
        </div>

        <div class="p-4 rounded-xl bg-gray-500/10 border border-gray-500/10">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm text-gray-400">Node.js</span>
            <div class="w-8 h-8 rounded-lg bg-green-300/10 flex items-center justify-center">
              <svg class="w-5 h-5 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path>
              </svg>
            </div>
          </div>
          <div class="text-2xl font-bold text-white">{{ stats.node }}</div>
        </div>

        <div class="p-4 rounded-xl bg-gray-500/10 border border-gray-500/10">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm text-gray-400">Success Rate</span>
            <div class="w-8 h-8 rounded-lg bg-green-300/10 flex items-center justify-center">
              <svg class="w-4 h-4 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
          </div>
          <div class="text-2xl font-bold text-white">
            {{ stats.total > 0 ? Math.round((stats.successful / stats.total) * 100) : 0 }}%
          </div>
        </div>
      </div>

      <!-- Search & Filters -->
      <div class="flex items-center gap-3 p-4 px-0">
        <div class="flex-1 relative">
          <svg class="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
          <input 
            v-model="searchQuery"
            type="text"
            placeholder="Search code..."
            class="w-full pl-10 pr-4 py-2.5 bg-gray-500/10 text-white border border-gray-500/10 focus:border-gray-500/15 rounded-lg text-sm placeholder-gray-500 transition-all" />
        </div>

        <div class="flex gap-2">
          <button 
            @click="filterLang = 'all'"
            :class="[
              'px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
              filterLang === 'all' 
                ? 'bg-blue-300 text-black' 
                : 'bg-gray-500/10 text-gray-400 hover:text-white border border-gray-500/10'
            ]">
            All
          </button>
          <button 
            @click="filterLang = 'python'"
            :class="[
              'px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
              filterLang === 'python' 
                ? 'bg-blue-300/20 text-blue-300 border border-blue-300/30' 
                : 'bg-gray-500/10 text-gray-400 hover:text-white border border-gray-500/10'
            ]">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>
            </svg>
            Python
          </button>
          <button 
            @click="filterLang = 'node'"
            :class="[
              'px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
              filterLang === 'node' 
                ? 'bg-green-300/20 text-green-300 border border-green-300/30' 
                : 'bg-gray-500/10 text-gray-400 hover:text-white border border-gray-500/10'
            ]">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path>
            </svg>
            Node.js
          </button>
        </div>
      </div>
      
      <!-- Loading -->
      <div v-if="loading" class="p-12 rounded-lg bg-gray-500/10 border border-gray-500/10 text-center">
        <svg class="w-8 h-8 mx-auto mb-4 animate-spin text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
        </svg>
        <p class="text-gray-400">Loading history...</p>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="p-8 rounded-lg bg-gray-500/10 border border-gray-500/10 text-center">
        <svg class="w-12 h-12 mx-auto mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <p class="text-red-500 text-lg font-semibold mb-2">Error loading history</p>
        <p class="text-red-500/60">{{ error }}</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredRuns.length === 0 && runs.length === 0" class="p-12 rounded-lg bg-gray-500/10 border border-gray-500/10 text-center">
        <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-500/5 flex items-center justify-center">
          <svg class="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
          </svg>
        </div>
        <p class="text-gray-300 text-lg font-semibold mb-2">No execution history yet</p>
        <p class="text-gray-500 mb-6">Run some code in the playground to see it here!</p>
          <NuxtLink 
            to="/"
            class="inline-flex items-center gap-2 text-sm px-6 py-3 rounded-lg bg-blue-300 text-black font-semibold transition-all">
          Go to Playground
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
          </svg>
        </NuxtLink>
      </div>

      <!-- No Search Results -->
      <div v-else-if="filteredRuns.length === 0" class="p-12 rounded-xl bg-gray-500/10 border border-gray-500/10 text-center">
        <svg class="w-12 h-12 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
        </svg>
        <p class="text-gray-400">No results found for "{{ searchQuery }}"</p>
      </div>

      <!-- History Table -->
      <div v-else class="rounded-xl bg-gray-500/10 border border-gray-500/10 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-black border-b border-gray-500/10">
              <tr>
                <th class="text-left p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">#</th>
                <th class="text-left p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Language</th>
                <th class="text-left p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Code</th>
                <th class="text-left p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th class="text-left p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Time</th>
              </tr>
            </thead>
            <tbody>
              <tr 
                v-for="(run, idx) in filteredRuns" 
                :key="idx"
                class="border-b border-gray-500/10 hover:bg-gray-500/5 transition-all group">
                <td class="p-4 text-gray-500 text-sm font-mono">{{ idx + 1 }}</td>
                <td class="p-4">
                  <span 
                    :class="[
                      'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold',
                      run.lang === 'python' 
                        ? 'bg-blue-300/10 text-blue-300 border border-blue-300/10' 
                        : 'bg-green-300/10 text-green-300 border border-green-300/10'
                    ]">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path v-if="run.lang === 'python'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>
                      <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path>
                    </svg>
                    {{ run.lang === 'python' ? 'Python' : 'Node.js' }}
                  </span>
                </td>
                <td class="p-4 max-w-md">
                  <code class="text-sm text-gray-300 line-clamp-2 font-mono">{{ run.code }}</code>
                </td>
                <td class="p-4">
                  <span 
                    v-if="run.result"
                    :class="[
                      'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold',
                      run.result.ok 
                        ? 'bg-green-300/10 text-green-300 border border-green-300/10' 
                        : 'bg-red-500/10 text-red-500 border border-red-500/10'
                    ]">
                    <div 
                      :class="[
                        'w-1.5 h-1.5 rounded-full',
                        run.result.ok ? 'bg-green-300' : 'bg-red-500'
                      ]"></div>
                    {{ run.result.ok ? 'Success' : 'Failed' }}
                  </span>
                  <span v-else class="text-gray-500 text-xs">—</span>
                </td>
                <td class="p-4">
                  <div class="text-sm text-gray-400">
                    <div>{{ formatRelativeTime(run.timestamp) }}</div>
                    <div class="text-xs text-gray-600">{{ formatTime(run.timestamp) }}</div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Footer -->
        <div class="p-4 bg-black border-t border-gray-500/10 text-sm text-gray-500 text-center">
          Showing {{ filteredRuns.length }} of {{ runs.length }} execution{{ runs.length !== 1 ? 's' : '' }}
        </div>
      </div>
      
      </div>
    </div>
  </div>
</template>
