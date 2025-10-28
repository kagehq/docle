<script setup lang="ts">
import { inject } from 'vue'

const route = useRoute()
const router = useRouter()
const config = useRuntimeConfig()

// Inject the snippets panel function
const openSnippetsPanel = inject<() => void>('openSnippetsPanel', () => {})

const projectId = route.params.id as string

// State
const project = ref<any>(null)
const apiKeys = ref([])
const loading = ref(true)
const showCreateKeyModal = ref(false)
const showGeneratedKey = ref(false)
const generatedKey = ref('')
const newKeyName = ref('')
const newKeyDomains = ref<string[]>([])
const newKeyRateLimit = ref(60) // Default: 60 requests per minute
const creatingKey = ref(false)
const activeTab = ref('keys') // 'keys' or 'usage'
const usageStats = ref<any>({
  total_runs: 0,
  python_runs: 0,
  nodejs_runs: 0,
  success_rate: 0,
  history: []
})
const loadingUsage = ref(false)

// Computed project name
const projectName = computed(() => {
  return project.value?.name || 'My Project'
})

// Set page title
useHead({
  title: computed(() => `${projectName.value} - Docle`)
})

// Load project data
onMounted(async () => {
  try {
    const apiUrl = process.client && window.location.hostname === 'localhost'
      ? `/api/projects/${projectId}`
      : `${config.public.apiBase}/api/projects/${projectId}`

    const response = await $fetch(apiUrl, {
      credentials: 'include'
    })

    project.value = response.project
    apiKeys.value = response.apiKeys || []
  } catch (error) {
    console.error('Failed to load project:', error)
    router.push('/')
  } finally {
    loading.value = false
  }
})

// Generate API key
const handleCreateKey = async () => {
  creatingKey.value = true

  try {
    const apiUrl = process.client && window.location.hostname === 'localhost'
      ? `/api/projects/${projectId}/keys`
      : `${config.public.apiBase}/api/projects/${projectId}/keys`

    // Filter out empty domains
    const allowedDomains = newKeyDomains.value.filter(d => d.trim() !== '')

    const response = await $fetch(apiUrl, {
      method: 'POST',
      credentials: 'include',
      body: {
        name: newKeyName.value,
        allowedDomains: allowedDomains.length > 0 ? allowedDomains : undefined,
        rateLimitPerMinute: newKeyRateLimit.value
      }
    })

    generatedKey.value = response.key
    showCreateKeyModal.value = false
    showGeneratedKey.value = true
    newKeyName.value = ''
    newKeyDomains.value = []
    newKeyRateLimit.value = 60 // Reset to default

    // Reload the project data to get updated keys
    const reloadUrl = process.client && window.location.hostname === 'localhost'
      ? `/api/projects/${projectId}`
      : `${config.public.apiBase}/api/projects/${projectId}`

    const updatedData = await $fetch(reloadUrl, {
      credentials: 'include'
    })
    apiKeys.value = updatedData.apiKeys || []
    success('API key generated successfully!')
  } catch (error: any) {
    console.error('Failed to generate key:', error)
    const errorMessage = error.data?.error || error.message || 'Failed to generate key'
    showError(errorMessage)
  } finally {
    creatingKey.value = false
  }
}

// Toast and copy composables
const { success, error: showError } = useToast()
const { copy } = useCopyToClipboard()

// Confirmation dialog state
const showRevokeDialog = ref(false)
const keyToRevoke = ref<string | null>(null)

// Copy key to clipboard
const copyKey = () => {
  copy(generatedKey.value, 'API key copied to clipboard!')
}

// Show revoke confirmation
const confirmRevokeKey = (keyId: string) => {
  keyToRevoke.value = keyId
  showRevokeDialog.value = true
}

// Revoke key
const revokeKey = async () => {
  if (!keyToRevoke.value) return

  try {
    const apiUrl = process.client && window.location.hostname === 'localhost'
      ? `/api/keys/${keyToRevoke.value}`
      : `${config.public.apiBase}/api/keys/${keyToRevoke.value}`

    await $fetch(apiUrl, {
      method: 'DELETE',
      credentials: 'include'
    })

    success('API key revoked successfully')
    showRevokeDialog.value = false
    keyToRevoke.value = null

    // Reload the project data
    const reloadUrl = process.client && window.location.hostname === 'localhost'
      ? `/api/projects/${projectId}`
      : `${config.public.apiBase}/api/projects/${projectId}`

    const updatedData = await $fetch(reloadUrl, {
      credentials: 'include'
    })
    apiKeys.value = updatedData.apiKeys || []
  } catch (error: any) {
    showError('Failed to revoke key: ' + (error.data?.error || 'Unknown error'))
  }
}

const cancelRevoke = () => {
  showRevokeDialog.value = false
  keyToRevoke.value = null
}

// Fetch usage data
const fetchUsageData = async () => {
  if (loadingUsage.value) return

  loadingUsage.value = true
  try {
    const apiUrl = process.client && window.location.hostname === 'localhost'
      ? `/api/projects/${projectId}/usage`
      : `${config.public.apiBase}/api/projects/${projectId}/usage`

    const response = await $fetch(apiUrl, {
      credentials: 'include'
    })

    usageStats.value = response || {
      total_runs: 0,
      python_runs: 0,
      nodejs_runs: 0,
      success_rate: 0,
      history: []
    }
  } catch (error) {
    console.error('Failed to load usage data:', error)
  } finally {
    loadingUsage.value = false
  }
}

// Watch tab changes to load usage data
watch(activeTab, (newTab) => {
  if (newTab === 'usage' && usageStats.value.total_runs === 0) {
    fetchUsageData()
  }
})
</script>

<template>
  <div class="min-h-screen bg-black text-white flex flex-col">
    <!-- Header -->
    <AppHeader active-page="dashboard" @open-snippets="openSnippetsPanel" />

    <!-- Main Content -->
    <div class="flex-1 overflow-y-auto px-6 py-6 max-w-7xl mx-auto w-full">
      <!-- Loading -->
      <div v-if="loading" class="text-center py-20">
        <div class="relative inline-flex">
          <div class="animate-spin rounded-full h-10 w-10 border-4 border-gray-800 border-t-blue-300"></div>
          <div class="animate-spin rounded-full h-10 w-10 border-4 border-transparent border-t-blue-300 absolute top-0 left-0" style="animation-delay: -0.15s;"></div>
        </div>
        <p class="text-gray-400 mt-6 text-base">Loading project...</p>
      </div>

       <!-- Project Content -->
       <div v-else class="space-y-6">
         <!-- Breadcrumbs & Header -->
         <div class="mb-10 flex items-center justify-between">
           <div class="flex flex-col gap-4">
             <!-- Breadcrumbs -->
             <nav class="flex items-center gap-2 text-xs">
               <NuxtLink to="/" class="text-gray-400 hover:text-white transition-colors">
                 Dashboard
               </NuxtLink>
               <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
               </svg>
               <span class="text-white font-medium">{{ projectName }}</span>
             </nav>

             <!-- Project Title & ID -->
             <div>
               <h1 class="text-3xl font-bold text-white mb-2">{{ projectName }}</h1>
               <p class="text-gray-500 text-xs font-mono">{{ projectId }}</p>
             </div>
           </div>
          <button
            v-if="activeTab === 'keys'"
            @click="showCreateKeyModal = true"
            class="group/btn relative overflow-hidden bg-blue-300 text-black px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 flex items-center gap-2">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
            Generate Key
          </button>
        </div>

        <!-- Tabs -->
        <div class="border-b border-gray-500/20">
          <nav class="flex gap-6">
            <button
              @click="activeTab = 'keys'"
              :class="[
                'pb-3 px-1 border-b-2 font-medium text-sm transition-colors',
                activeTab === 'keys'
                  ? 'border-blue-300 text-blue-300'
                  : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
              ]">
              API Keys
            </button>
            <button
              @click="activeTab = 'usage'"
              :class="[
                'pb-3 px-1 border-b-2 font-medium text-sm transition-colors',
                activeTab === 'usage'
                  ? 'border-blue-300 text-blue-300'
                  : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
              ]">
              Usage
            </button>
          </nav>
        </div>

       <!-- API Keys Section -->
       <div v-show="activeTab === 'keys'">
        <div class="relative group">
          <div class="relative">
            <!-- API Keys List -->
            <div v-if="apiKeys.length > 0" class="space-y-3">
              <div
                v-for="key in apiKeys"
                :key="key.id"
                class="flex items-center justify-between p-4 bg-gray-500/10 border border-gray-500/10 rounded-lg transition-colors">
                <div class="flex-1">
                  <div class="flex items-center gap-3 mb-1">
                    <h4 class="text-sm font-semibold text-white">{{ key.name || 'Unnamed Key' }}</h4>
                    <span
                      v-if="key.is_active"
                      class="px-2 py-0.5 text-xs bg-green-300/10 text-green-300 border border-green-300/10 rounded-full">
                      Active
                    </span>
                    <span
                      v-else
                      class="px-2 py-0.5 text-xs bg-gray-500/10 text-gray-500 border border-gray-500/20 rounded-full">
                      Revoked
                    </span>
                  </div>
                  <p class="text-xs text-gray-500 font-mono">{{ key.key_prefix }}••••••••••••</p>
                  <div class="flex items-center gap-3 mt-1">
                    <p class="text-xs text-gray-500">Created {{ new Date(key.created_at).toLocaleDateString() }}</p>
                    <span class="text-xs text-gray-500">•</span>
                    <p class="text-xs text-blue-300">{{ key.rate_limit_per_minute || 60 }} req/min</p>
                  </div>
                </div>
                <button
                  v-if="key.is_active"
                  @click="confirmRevokeKey(key.id)"
                  class="px-3 py-1.5 text-xs bg-red-400/10 hover:bg-red-400/15 text-red-400 border border-red-400/10 rounded-lg font-medium transition-colors">
                  Revoke
                </button>
              </div>
            </div>

            <!-- Empty State -->
            <div v-else class="text-center py-16 px-4">
              <div class="relative inline-flex mb-6">
                <div class="relative bg-gray-500/5 border border-gray-500/10 p-4 rounded-xl">
                  <svg class="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path>
                  </svg>
                </div>
              </div>
              <h3 class="text-lg font-semibold text-white mb-2">No API keys yet</h3>
              <p class="text-gray-400 text-sm mb-6">Generate your first key to start using the API</p>
              <!-- Usage Example -->
              <div class="relative text-left mx-auto max-w-sm">
                <div class="bg-gray-500/10 rounded-lg p-4 font-mono text-sm border border-gray-500/10">
                  <pre class="text-amber-300 overflow-x-auto"><code>curl -X POST https://api.docle.co/api/run \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "print(\"Hello, Docle!\")",
    "lang": "python"
  }'</code></pre>
                </div>
              </div>
							<NuxtLink to="/snippets" class="text-gray-400 hover:text-white text-xs mt-4 block text-center font-medium">Check out other snippets &rarr;</NuxtLink>
            </div>
          </div>
        </div>
       </div>

       <!-- Usage & Analytics Section -->
       <div v-show="activeTab === 'usage'">
        <div class="relative">
          <!-- Loading State -->
          <div v-if="loadingUsage" class="py-8">
            <LoadingSkeleton type="table" :count="5" />
          </div>

          <!-- Usage Stats -->
          <div v-else>
            <!-- Stats Cards -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div class="bg-gray-500/10 border border-gray-500/10 rounded-lg p-6">
                <div class="flex items-center gap-3 mb-2">
                  <svg class="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                  </svg>
                  <h3 class="text-sm font-semibold text-gray-400">Total Runs</h3>
                </div>
                <p class="text-3xl font-bold text-white">{{ usageStats.total_runs.toLocaleString() }}</p>
              </div>

              <div class="bg-gray-500/10 border border-gray-500/10 rounded-lg p-6">
                <div class="flex items-center gap-3 mb-2">
                  <svg class="w-5 h-5 text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path>
                  </svg>
                  <h3 class="text-sm font-semibold text-gray-400">Python</h3>
                </div>
                <p class="text-3xl font-bold text-white">{{ usageStats.python_runs.toLocaleString() }}</p>
              </div>

              <div class="bg-gray-500/10 border border-gray-500/10 rounded-lg p-6">
                <div class="flex items-center gap-3 mb-2">
                  <svg class="w-5 h-5 text-green-300" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 1.5c-5.79 0-10.5 4.71-10.5 10.5s4.71 10.5 10.5 10.5 10.5-4.71 10.5-10.5S17.79 1.5 12 1.5zm0 19c-4.69 0-8.5-3.81-8.5-8.5S7.31 3.5 12 3.5s8.5 3.81 8.5 8.5-3.81 8.5-8.5 8.5z"></path>
                    <circle cx="12" cy="12" r="4"></circle>
                  </svg>
                  <h3 class="text-sm font-semibold text-gray-400">Node.js</h3>
                </div>
                <p class="text-3xl font-bold text-white">{{ usageStats.nodejs_runs.toLocaleString() }}</p>
              </div>

              <div class="bg-gray-500/10 border border-gray-500/10 rounded-lg p-6">
                <div class="flex items-center gap-3 mb-2">
                  <svg class="w-5 h-5 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <h3 class="text-sm font-semibold text-gray-400">Success Rate</h3>
                </div>
                <p class="text-3xl font-bold text-white">{{ usageStats.success_rate }}%</p>
              </div>
            </div>

            <!-- Usage History Table -->
            <div class="bg-gray-500/10 border border-gray-500/10 rounded-lg overflow-hidden">
              <div class="p-4 border-b border-gray-500/10">
                <h3 class="text-base font-semibold text-white">
                  Execution History
                </h3>
              </div>

              <!-- Empty State -->
              <div v-if="usageStats.history.length === 0" class="text-center py-12 px-4">
                <p class="text-gray-400 text-sm">No execution history yet. Start making API calls to see your logs!</p>
              </div>

              <!-- History Table -->
              <div v-else class="overflow-x-auto">
                <table class="w-full">
                  <thead class="bg-gray-500/5 border-b border-gray-500/10">
                    <tr>
                      <th class="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-3">Time</th>
                      <th class="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-3">Language</th>
                      <th class="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-3">Code</th>
                      <th class="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-3">Status</th>
                      <th class="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-3">Duration</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-500/10">
                    <tr
                      v-for="run in usageStats.history"
                      :key="run.id"
                      class="hover:bg-gray-500/5 transition-colors">
                      <td class="px-6 py-4 whitespace-nowrap">
                        <span class="text-xs text-gray-400 font-mono">
                          {{ new Date(run.created_at).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) }}
                        </span>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap">
                        <span
                          :class="[
                            'px-2 py-1 text-xs font-medium rounded-md',
                            run.language === 'python' ? 'bg-yellow-300/10 text-yellow-300 border border-yellow-300/20' :
                            run.language === 'javascript' || run.language === 'typescript' ? 'bg-green-300/10 text-green-300 border border-green-300/20' :
                            'bg-blue-300/10 text-blue-300 border border-blue-300/20'
                          ]">
                          {{ run.language }}
                        </span>
                      </td>
                      <td class="px-6 py-4 max-w-xs">
                        <code class="text-xs text-gray-300 font-mono truncate block">{{ run.code_snippet }}</code>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap">
                        <span
                          :class="[
                            'px-2 py-1 text-xs font-medium rounded-md flex items-center gap-1 w-fit',
                            run.status === 'success' ? 'bg-green-300/10 text-green-300 border border-green-300/20' :
                            'bg-red-300/10 text-red-300 border border-red-300/20'
                          ]">
                          <svg v-if="run.status === 'success'" class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                          </svg>
                          <svg v-else class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
                          </svg>
                          {{ run.status }}
                        </span>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap">
                        <span class="text-xs text-gray-400">{{ run.execution_time_ms }}ms</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
       </div>
      </div>
    </div>

    <!-- Create Key Modal -->
    <Transition name="modal">
      <div v-if="showCreateKeyModal"
           @click.self="showCreateKeyModal = false"
           class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div class="relative bg-black border border-gray-500/30 rounded-xl max-w-md w-full p-8">
            <div class="mb-6">
              <h3 class="text-2xl font-bold text-white mb-2">Generate API Key</h3>
              <p class="text-gray-400 text-sm">Create a new key for your project</p>
            </div>

            <form @submit.prevent="handleCreateKey">
              <div class="mb-6">
                <label class="block text-sm font-semibold text-gray-300 mb-3">
                  Key Name
                </label>
                <input
                  v-model="newKeyName"
                  type="text"
                  placeholder="Production, Development, etc."
                  class="w-full px-4 py-3 text-sm bg-gray-500/10 border border-gray-500/10 text-white rounded-lg outline-none focus:ring-0 focus:border-gray-500/10 focus-visible:outline-none focus-visible:rounded-lg placeholder-gray-500 transition-all"
                />
              </div>

              <!-- Domain Restrictions (Optional) -->
              <div class="mb-6">
                <div class="flex items-center justify-between mb-3">
                  <label class="block text-sm font-semibold text-gray-300">
                    Allowed Domains (Optional)
                  </label>
                  <button
                    type="button"
                    @click="newKeyDomains.push('')"
                    class="text-xs text-blue-300 hover:text-blue-400 flex items-center gap-1 transition-colors">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                    </svg>
                    Add Domain
                  </button>
                </div>
                <p class="text-xs text-gray-500 mb-3">
                  Restrict this key to specific domains. Leave empty to allow all domains.
                  Supports wildcards like *.example.com
                </p>

                <div v-if="newKeyDomains.length > 0" class="space-y-2 mb-3">
                  <div v-for="(domain, index) in newKeyDomains" :key="index" class="flex gap-2">
                    <input
                      v-model="newKeyDomains[index]"
                      type="text"
                      placeholder="example.com or *.example.com"
                      class="flex-1 px-3 py-2 text-sm bg-gray-500/10 border border-gray-500/10 text-white rounded-lg outline-none focus:border-gray-500/20 placeholder-gray-500 transition-all"
                    />
                    <button
                      type="button"
                      @click="newKeyDomains.splice(index, 1)"
                      class="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/10 rounded-lg transition-all">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                      </svg>
                    </button>
                  </div>
                </div>

                <button
                  v-if="newKeyDomains.length === 0"
                  type="button"
                  @click="newKeyDomains.push('')"
                  class="w-full px-3 py-2 text-xs bg-gray-500/10 hover:bg-gray-500/15 text-gray-400 border border-gray-500/10 border-dashed rounded-lg transition-all flex items-center justify-center gap-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                  </svg>
                  Add domain restriction for extra security
                </button>
              </div>

              <!-- Rate Limit -->
              <div class="mb-6">
                <label class="block text-sm font-semibold text-gray-300 mb-3">
                  Rate Limit (Requests per Minute)
                </label>
                <div class="flex items-center gap-3">
                  <input
                    v-model.number="newKeyRateLimit"
                    type="number"
                    min="1"
                    max="10000"
                    placeholder="60"
                    class="flex-1 px-4 py-3 text-sm bg-gray-500/10 border border-gray-500/10 text-white rounded-lg outline-none focus:ring-0 focus:border-gray-500/10 focus-visible:outline-none focus-visible:rounded-lg placeholder-gray-500 transition-all"
                  />
                  <span class="text-sm text-gray-400">req/min</span>
                </div>
                <p class="text-xs text-gray-500 mt-2">
                  Limits how many API calls can be made with this key per minute. Default: 60 req/min.
                </p>
                <div class="mt-2 flex gap-2">
                  <button type="button" @click="newKeyRateLimit = 10" class="px-2 py-1 text-xs bg-gray-500/10 hover:bg-gray-500/20 text-gray-400 rounded transition-colors">10/min</button>
                  <button type="button" @click="newKeyRateLimit = 60" class="px-2 py-1 text-xs bg-gray-500/10 hover:bg-gray-500/20 text-gray-400 rounded transition-colors">60/min</button>
                  <button type="button" @click="newKeyRateLimit = 300" class="px-2 py-1 text-xs bg-gray-500/10 hover:bg-gray-500/20 text-gray-400 rounded transition-colors">300/min</button>
                  <button type="button" @click="newKeyRateLimit = 1000" class="px-2 py-1 text-xs bg-gray-500/10 hover:bg-gray-500/20 text-gray-400 rounded transition-colors">1000/min</button>
                </div>
              </div>

              <div class="flex gap-3">
                <button
                  type="submit"
                  :disabled="creatingKey"
                  class="flex-1 bg-blue-300 text-black py-2 text-sm rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  <span v-if="creatingKey" class="flex items-center justify-center gap-2">
                    <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </span>
                  <span v-else>Generate Key</span>
                </button>
                <button
                  type="button"
                  @click="showCreateKeyModal = false"
                  class="flex-1 bg-gray-500/10 hover:bg-gray-500/20 text-white border border-gray-500/10 py-2 text-sm rounded-lg font-semibold transition-all">
                  Cancel
                </button>
              </div>
            </form>
          </div>
      </div>
    </Transition>

    <!-- Show Generated Key Modal -->
    <Transition name="modal">
      <div v-if="showGeneratedKey"
           class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div class="relative group/modal">
          <div class="relative bg-black border border-gray-500/30 rounded-xl max-w-lg w-full p-8">
            <h3 class="text-2xl font-bold text-white mb-6">
              Save Your API Key
            </h3>

            <div class="mb-6 p-4 bg-amber-500/5 border border-amber-500/10 rounded-lg">
              <p class="text-amber-300 text-xs font-medium">
                This is the only time you'll see this key. Copy it now and store it securely!
              </p>
            </div>

            <div class="mb-6">
              <input
                :value="generatedKey"
                readonly
                class="w-full px-4 py-3 text-sm bg-gray-500/10 border border-gray-500/10 text-white rounded-lg font-mono"
              />
            </div>

            <div class="flex gap-3">
              <button
                @click="copyKey"
                class="flex-1 bg-blue-300 text-black py-2 text-sm rounded-lg font-semibold transition-all flex items-center justify-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                </svg>
                Copy Key
              </button>
              <button
                @click="showGeneratedKey = false; window.location.reload()"
                class="flex-1 bg-gray-500/10 hover:bg-gray-500/20 text-white border border-gray-500/10 py-2 text-sm rounded-lg font-semibold transition-all">
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Revoke Key Confirmation Dialog -->
    <ConfirmDialog
      v-if="showRevokeDialog"
      title="Revoke API Key?"
      message="This action cannot be undone. All requests using this key will fail immediately."
      confirm-text="Revoke Key"
      cancel-text="Cancel"
      type="danger"
      @confirm="revokeKey"
      @cancel="cancelRevoke"
    />
  </div>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>

