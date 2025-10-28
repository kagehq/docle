<template>
  <div class="min-h-screen bg-black text-white">
    <AppHeader active-page="instant-api" />

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div v-if="loading" class="text-center py-20">
        <LoadingSkeleton />
      </div>

      <div v-else-if="error" class="text-center py-20">
        <p class="text-red-400">{{ error }}</p>
        <button
          @click="navigateTo('/instant-api')"
          class="mt-4 text-blue-300 hover:text-blue-400"
        >
          ← Back to Instant API
        </button>
      </div>

      <div v-else-if="endpoint">
        <!-- Breadcrumbs -->
        <nav class="flex items-center gap-2 text-sm mb-6">
          <NuxtLink to="/" class="text-gray-500 hover:text-gray-400 transition">
            Dashboard
          </NuxtLink>
          <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
          </svg>
          <NuxtLink to="/instant-api" class="text-gray-500 hover:text-gray-400 transition">
            Instant API
          </NuxtLink>
          <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
          </svg>
          <span class="text-white font-medium">{{ endpoint.name }}</span>
        </nav>

        <!-- Header -->
        <div class="mb-8">
          <div class="flex items-start justify-between">
            <div>
              <h1 class="text-3xl font-bold text-white mb-1">{{ endpoint.name }}</h1>
              <p v-if="endpoint.description" class="text-gray-500 text-sm">{{ endpoint.description }}</p>
            </div>
            <div class="flex gap-2">
              <button
                @click="showEditModal = true"
                class="px-4 py-2 bg-gray-500/10 border border-gray-500/10 hover:bg-gray-500/20 text-white font-semibold rounded-lg transition"
              >
                Edit
              </button>
              <button
                @click="confirmDelete"
                class="px-4 py-2 bg-red-400/10 border border-red-400/10 hover:bg-red-400/20 text-red-400 font-semibold rounded-lg transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>

        <!-- Stats -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div class="bg-gray-500/10 border border-gray-500/10 rounded-lg p-6">
            <p class="text-sm text-gray-400 mb-1">Total Calls</p>
            <p class="text-3xl font-bold">{{ endpoint.callCount || 0 }}</p>
          </div>
          <div class="bg-gray-500/10 border border-gray-500/10 rounded-lg p-6">
            <p class="text-sm text-gray-400 mb-1">Language</p>
            <p class="text-2xl font-bold">{{ endpoint.lang === 'node' ? 'JavaScript' : 'Python' }}</p>
          </div>
          <div class="bg-gray-500/10 border border-gray-500/10 rounded-lg p-6">
            <p class="text-sm text-gray-400 mb-1">Created</p>
            <p class="text-lg font-bold">{{ formatDate(endpoint.createdAt) }}</p>
          </div>
          <div class="bg-gray-500/10 border border-gray-500/10 rounded-lg p-6">
            <p class="text-sm text-gray-400 mb-1">Last Called</p>
            <p class="text-lg font-bold">{{ endpoint.lastCalledAt ? formatDate(endpoint.lastCalledAt) : 'Never' }}</p>
          </div>
        </div>

        <!-- Tabs -->
        <div class="border-b border-gray-500/10 mb-6">
          <div class="flex gap-8">
            <button
              @click="activeTab = 'test'"
              :class="[
                'pb-4 border-b-2 transition',
                activeTab === 'test' ? 'border-blue-300 text-blue-300' : 'border-transparent text-gray-400 hover:text-gray-300'
              ]"
            >
              Test
            </button>
            <button
              @click="activeTab = 'code'"
              :class="[
                'pb-4 border-b-2 transition',
                activeTab === 'code' ? 'border-blue-300 text-blue-300' : 'border-transparent text-gray-400 hover:text-gray-300'
              ]"
            >
              Code
            </button>
            <button
              @click="activeTab = 'logs'"
              :class="[
                'pb-4 border-b-2 transition',
                activeTab === 'logs' ? 'border-blue-300 text-blue-300' : 'border-transparent text-gray-400 hover:text-gray-300'
              ]"
            >
              Logs
            </button>
            <button
              @click="activeTab = 'embed'"
              :class="[
                'pb-4 border-b-2 transition',
                activeTab === 'embed' ? 'border-blue-300 text-blue-300' : 'border-transparent text-gray-400 hover:text-gray-300'
              ]"
            >
              Embed
            </button>
          </div>
        </div>

        <!-- Tab Content -->
        <div v-if="activeTab === 'test'" class="space-y-6">
          <div class="bg-gray-500/10 rounded-lg border border-gray-500/10 p-6">
            <h2 class="text-xl font-semibold mb-4">Test Your Endpoint</h2>

            <!-- URL Display -->
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-300 mb-2">Endpoint URL</label>
              <div class="flex gap-2">
                <input
                  :value="endpoint.url"
                  readonly
                  class="flex-1 px-4 py-2 bg-gray-500/5 border border-gray-500/10 rounded-lg"
                />
                <button
                  @click="copyUrl(endpoint.url)"
                  class="px-4 py-2 bg-gray-500/10 border border-gray-500/10 hover:bg-gray-500/20 text-white font-semibold rounded-lg transition"
                >
                  Copy
                </button>
              </div>
            </div>

            <!-- Request Config -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">Method</label>
                <div class="relative">
                  <select
                    v-model="testRequest.method"
                    class="w-full px-4 py-2 bg-gray-500/5 border border-gray-500/10 rounded-lg focus:border-gray-500/10 focus:outline-none appearance-none cursor-pointer text-white hover:bg-gray-500/10 transition-colors pr-10"
                  >
                    <option>GET</option>
                    <option>POST</option>
                    <option>PUT</option>
                    <option>DELETE</option>
                  </select>
                  <svg class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">Query Parameters</label>
                <input
                  v-model="testRequest.query"
                  placeholder="?name=value"
                  class="w-full px-4 py-2 bg-gray-500/5 border border-gray-500/10 rounded-lg focus:border-gray-500/10 focus:outline-none"
                />
              </div>
            </div>

            <div v-if="testRequest.method !== 'GET'" class="mb-4">
              <label class="block text-sm font-medium text-gray-300 mb-2">Request Body (JSON)</label>
              <textarea
                v-model="testRequest.body"
                rows="6"
                placeholder='{ "key": "value" }'
                class="w-full px-4 py-2 bg-gray-500/5 border border-gray-500/10 rounded-lg focus:border-gray-500/10 focus:outline-none font-mono text-sm"
              ></textarea>
            </div>

            <button
              @click="sendTestRequest"
              :disabled="testing"
              class="w-full py-3 bg-blue-300 hover:bg-blue-400 disabled:bg-gray-500/10 disabled:cursor-not-allowed text-black font-semibold rounded-lg transition"
            >
              {{ testing ? 'Sending...' : 'Send Request' }}
            </button>

            <!-- Response -->
            <div v-if="testResponse" class="mt-6">
              <div class="flex items-center justify-between mb-2">
                <h3 class="text-lg font-semibold">Response</h3>
                <span
                  :class="[
                    'px-3 py-1 rounded text-sm font-medium',
                    testResponse.ok ? 'bg-green-300/10 text-green-300' : 'bg-red-400/10 text-red-300'
                  ]"
                >
                  {{ testResponse.status }}
                </span>
              </div>
              <pre class="bg-black border border-gray-500/10 rounded-lg p-4 overflow-x-auto text-sm">{{ testResponse.data }}</pre>
            </div>
          </div>
        </div>

        <div v-else-if="activeTab === 'code'" class="space-y-6">
          <div class="bg-gray-500/10 rounded-lg border border-gray-500/10 p-6">
            <h2 class="text-xl font-semibold mb-4">Source Code</h2>
            <div class="bg-black border border-gray-500/20 rounded-lg p-4">
              <pre class="text-sm overflow-x-auto">{{ endpoint.code }}</pre>
            </div>
          </div>
        </div>

        <div v-else-if="activeTab === 'logs'" class="space-y-6">
          <div class="bg-gray-500/10 rounded-lg border border-gray-500/10 p-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-xl font-semibold">Execution Logs</h2>
              <button
                @click="loadEndpoint(true)"
                :disabled="refreshing"
                class="px-3 py-1 text-sm bg-gray-500/10 border border-gray-500/10 hover:bg-gray-500/20 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ refreshing ? 'Refreshing...' : 'Refresh' }}
              </button>
            </div>

            <div v-if="endpoint.logs && endpoint.logs.length > 0" class="space-y-2">
              <div
                v-for="(log, index) in endpoint.logs.slice().reverse()"
                :key="index"
                class="bg-black border border-gray-500/20 rounded-lg p-4"
              >
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <div class="flex items-center gap-3">
                      <span class="font-mono text-sm text-blue-300">{{ log.method }}</span>
                      <span
                        :class="[
                          'px-2 py-0.5 rounded text-xs font-medium',
                          log.status === 'success' ? 'bg-green-300/10 text-green-300' : 'bg-red-400/10 text-red-300'
                        ]"
                      >
                        {{ log.status }}
                      </span>
                      <span class="text-xs text-gray-400">{{ log.executionTime }}ms</span>
                    </div>
                    <div v-if="Object.keys(log.query).length > 0" class="text-sm text-gray-400 mt-2">
                      Query: {{ JSON.stringify(log.query) }}
                    </div>
                  </div>
                  <span class="text-xs text-gray-500">{{ formatTimestamp(log.timestamp) }}</span>
                </div>
              </div>
            </div>

            <div v-else class="text-center py-12 text-gray-400">
              <p>No logs yet. Try calling your endpoint!</p>
            </div>
          </div>
        </div>

        <div v-else-if="activeTab === 'embed'" class="space-y-6">
          <div class="bg-gray-500/10 rounded-lg border border-gray-500/10 p-6">
            <h2 class="text-xl font-semibold mb-4">Integration Examples</h2>

            <div class="space-y-6">
              <!-- cURL -->
              <div>
                <div class="flex items-center justify-between mb-2">
                  <h3 class="text-base font-medium text-gray-300">cURL</h3>
                  <button
                    @click="copyCode(curlExample)"
                    class="text-sm text-blue-300 hover:text-blue-400"
                  >
                    Copy
                  </button>
                </div>
                <pre class="bg-black border border-gray-500/20 rounded-lg p-4 overflow-x-auto text-sm">{{ curlExample }}</pre>
              </div>

              <!-- JavaScript -->
              <div>
                <div class="flex items-center justify-between mb-2">
                  <h3 class="text-base font-medium text-gray-300">JavaScript (fetch)</h3>
                  <button
                    @click="copyCode(jsExample)"
                    class="text-sm text-blue-300 hover:text-blue-400"
                  >
                    Copy
                  </button>
                </div>
                <pre class="bg-black border border-gray-500/20 rounded-lg p-4 overflow-x-auto text-sm">{{ jsExample }}</pre>
              </div>

              <!-- Python -->
              <div>
                <div class="flex items-center justify-between mb-2">
                  <h3 class="text-base font-medium text-gray-300">Python (requests)</h3>
                  <button
                    @click="copyCode(pythonExample)"
                    class="text-sm text-blue-300 hover:text-blue-400"
                  >
                    Copy
                  </button>
                </div>
                <pre class="bg-black border border-gray-500/20 rounded-lg p-4 overflow-x-auto text-sm">{{ pythonExample }}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Modal -->
    <div v-if="showEditModal" class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div class="bg-black border border-gray-500/30 rounded-lg p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <h2 class="text-2xl font-bold mb-6">Edit Endpoint</h2>

        <div class="space-y-4 mb-6">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Name</label>
            <input
              v-model="editForm.name"
              type="text"
              class="w-full px-4 py-2 bg-gray-500/10 border border-gray-500/10 rounded-lg focus:border-gray-500/10 focus:outline-none"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Description</label>
            <input
              v-model="editForm.description"
              type="text"
              class="w-full px-4 py-2 bg-gray-500/10 border border-gray-500/10 rounded-lg focus:border-gray-500/10 focus:outline-none"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Code</label>
            <textarea
              v-model="editForm.code"
              rows="15"
              class="w-full px-4 py-2 bg-gray-500/10 border border-gray-500/10 rounded-lg focus:border-gray-500/10 focus:outline-none font-mono text-sm"
            ></textarea>
          </div>
        </div>

        <div class="flex gap-4">
          <button
            @click="saveEdit"
            :disabled="saving"
            class="flex-1 py-3 bg-blue-300 hover:bg-blue-400 disabled:bg-gray-500/10 text-black font-semibold rounded-lg transition"
          >
            {{ saving ? 'Saving...' : 'Save Changes' }}
          </button>
          <button
            @click="showEditModal = false"
            class="flex-1 py-3 bg-gray-500/10 border border-gray-500/10 hover:bg-gray-500/20 text-white font-semibold rounded-lg transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation -->
    <ConfirmDialog
      v-if="showDeleteDialog"
      title="Delete Endpoint"
      message="Are you sure you want to delete this endpoint? This action cannot be undone."
      confirm-text="Delete"
      @confirm="deleteEndpoint"
      @cancel="showDeleteDialog = false"
    />

    <ToastContainer />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useCopyToClipboard } from '../../composables/useCopyToClipboard';
import { useToast } from '../../composables/useToast';

const route = useRoute();
const { copy } = useCopyToClipboard();
const { showToast } = useToast();

const loading = ref(true);
const refreshing = ref(false);
const error = ref('');
const endpoint = ref(null);
const activeTab = ref('test');
const showEditModal = ref(false);
const showDeleteDialog = ref(false);
const saving = ref(false);

// Test request state
const testing = ref(false);
const testRequest = ref({
  method: 'GET',
  query: '',
  body: ''
});
const testResponse = ref(null);

// Edit form
const editForm = ref({
  name: '',
  description: '',
  code: ''
});

// Integration examples
const curlExample = computed(() => {
  return `curl ${endpoint.value?.url}`;
});

const jsExample = computed(() => {
  return `const response = await fetch('${endpoint.value?.url}');
const data = await response.json();
console.log(data);`;
});

const pythonExample = computed(() => {
  return `import requests

response = requests.get('${endpoint.value?.url}')
data = response.json()
print(data)`;
});

async function loadEndpoint(isRefresh = false) {
  if (isRefresh) {
    refreshing.value = true;
  }

  try {
    const data = await $fetch(`/api/endpoints/${route.params.id}`);
    endpoint.value = data;

    // Populate edit form
    editForm.value = {
      name: data.name,
      description: data.description || '',
      code: data.code
    };

    if (isRefresh) {
      showToast('Logs refreshed', 'success');
    }
  } catch (e) {
    error.value = e.data?.error || 'Failed to load endpoint';
  } finally {
    loading.value = false;
    refreshing.value = false;
  }
}

async function sendTestRequest() {
  testing.value = true;
  testResponse.value = null;

  try {
    const url = endpoint.value.url + (testRequest.value.query || '');
    const options = {
      method: testRequest.value.method
    };

    if (testRequest.value.method !== 'GET' && testRequest.value.body) {
      options.headers = { 'Content-Type': 'application/json' };
      options.body = testRequest.value.body;
    }

    const response = await fetch(url, options);
    const data = await response.json();

    testResponse.value = {
      ok: response.ok,
      status: response.status,
      data: JSON.stringify(data, null, 2)
    };

    // Reload endpoint to update stats
    await loadEndpoint();
  } catch (e) {
    testResponse.value = {
      ok: false,
      status: 'Error',
      data: e.message
    };
  } finally {
    testing.value = false;
  }
}

async function saveEdit() {
  saving.value = true;

  try {
    await $fetch(`/api/endpoints/${route.params.id}`, {
      method: 'PUT',
      body: editForm.value
    });

    showToast('Endpoint updated successfully!', 'success');
    showEditModal.value = false;
    await loadEndpoint();
  } catch (e) {
    showToast(e.data?.error || 'Failed to update endpoint', 'error');
  } finally {
    saving.value = false;
  }
}

function confirmDelete() {
  showDeleteDialog.value = true;
}

async function deleteEndpoint() {
  try {
    await $fetch(`/api/endpoints/${route.params.id}`, {
      method: 'DELETE'
    });

    showToast('Endpoint deleted successfully!', 'success');
    navigateTo('/instant-api');
  } catch (e) {
    showToast(e.data?.error || 'Failed to delete endpoint', 'error');
  } finally {
    showDeleteDialog.value = false;
  }
}

function copyUrl(url) {
  copy(url);
  showToast('URL copied to clipboard!', 'success');
}

function copyCode(code) {
  copy(code);
  showToast('Code copied to clipboard!', 'success');
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTimestamp(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return `${seconds}s ago`;
}

onMounted(() => {
  loadEndpoint();
});
</script>

