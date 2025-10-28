<template>
  <div class="min-h-screen bg-black text-white">
    <AppHeader active-page="instant-api" />

    <div class="max-w-7xl mx-auto px-6 py-6">
      <!-- Breadcrumbs -->
      <nav class="flex items-center gap-2 text-sm mb-6">
        <NuxtLink to="/" class="text-gray-500 hover:text-gray-400 transition">
          Dashboard
        </NuxtLink>
        <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
        </svg>
        <span class="text-white font-medium">Instant API</span>
      </nav>

      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-white mb-1 flex items-center gap-3">Instant API</h1>
        <p class="text-gray-500 text-sm">Deploy code as an API endpoint in seconds.</p>
      </div>

      <!-- Main Content -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Left: Editor and Config -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Endpoint Config -->
          <div class="bg-gray-500/10 rounded-lg border border-gray-500/10 p-6">
            <h2 class="text-xl font-semibold mb-4">Endpoint Configuration</h2>

            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">Name</label>
                <input
                  v-model="endpointName"
                  type="text"
                  placeholder="My API Endpoint"
                  class="w-full px-4 py-2 bg-gray-500/5 border border-gray-500/10 rounded-lg focus:border-gray-500/10 focus:outline-none"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">Description (optional)</label>
                <input
                  v-model="endpointDescription"
                  type="text"
                  placeholder="What does this endpoint do?"
                  class="w-full px-4 py-2 bg-gray-500/5 border border-gray-500/10 rounded-lg focus:border-gray-500/10 focus:outline-none"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">Language</label>
                <div class="relative">
                  <select
                    v-model="selectedLang"
                    class="w-full px-4 py-2 bg-gray-500/5 border border-gray-500/10 rounded-lg focus:border-blue-500/50 focus:outline-none appearance-none cursor-pointer text-white hover:bg-gray-500/10 transition-colors pr-10"
                  >
                    <option value="node">JavaScript (Node.js)</option>
                    <option value="python">Python</option>
                  </select>
                  <svg class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <!-- Code Editor -->
          <div class="bg-gray-500/10 rounded-lg border border-gray-500/10 overflow-hidden">
            <div class="flex items-center justify-between px-4 py-3 border-b border-gray-500/10">
              <h2 class="text-lg font-semibold">Code Editor</h2>
              <div class="flex items-center gap-2">
                <button
                  v-for="template in templates"
                  :key="template.id"
                  @click="loadTemplate(template)"
                  class="px-3 py-1 text-sm bg-gray-500/5 border border-gray-500/10 hover:bg-gray-500/10 rounded-lg transition"
                >
                  {{ template.name }}
                </button>
              </div>
            </div>

            <div class="relative">
              <textarea
                v-model="code"
                class="w-full h-96 p-4 bg-black rounded-lg font-mono text-sm focus:outline-none resize-none scrollbar-thin scrollbar-track-black scrollbar-thumb-gray-700 hover:scrollbar-thumb-gray-600"
                :placeholder="placeholderCode"
                spellcheck="false"
              ></textarea>
            </div>
          </div>

          <!-- Deploy Button -->
          <button
            @click="deployEndpoint"
            :disabled="deploying || !code.trim()"
            class="w-full py-4 text-base bg-blue-300 hover:bg-blue-400 disabled:bg-gray-500/10 disabled:cursor-not-allowed text-black font-semibold rounded-lg transition"
          >
            {{ deploying ? 'Deploying...' : 'Deploy' }}
          </button>

          <!-- Error Message -->
          <div v-if="error" class="bg-red-400/10 border border-red-400/10 rounded-lg p-4">
            <p class="text-red-400">{{ error }}</p>
          </div>
        </div>

        <!-- Right: My Endpoints -->
        <div class="lg:col-span-1">
          <div class="bg-gray-500/10 rounded-lg border border-gray-500/10 p-6 sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto">
            <h2 class="text-xl font-semibold mb-4">My Endpoints</h2>

            <div v-if="loadingEndpoints" class="text-center py-8">
              <LoadingSkeleton />
            </div>

            <div v-else-if="endpoints.length === 0" class="text-center py-12">
              <div class="mb-4 flex justify-center">
                <div class="w-16 h-16 rounded-full bg-gray-500/10 border border-gray-500/10 flex items-center justify-center">
                  <svg class="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                  </svg>
                </div>
              </div>
              <h3 class="text-base font-semibold text-white mb-1">No endpoints yet</h3>
              <p class="text-sm text-gray-500 mb-4">Create your first API endpoint<br />in seconds</p>
              <div class="flex items-center justify-center gap-2 text-xs text-gray-600">
                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                </svg>
                <span>Write code & click Deploy</span>
              </div>
            </div>

            <div v-else class="space-y-3">
              <div
                v-for="endpoint in endpoints"
                :key="endpoint.id"
                class="bg-black border border-gray-500/20 rounded-lg p-4 hover:border-gray-500/20 transition cursor-pointer"
                @click="navigateTo(`/endpoints/${endpoint.id}`)"
              >
                <div class="flex items-start justify-between mb-2">
                  <h3 class="font-semibold truncate flex-1">{{ endpoint.name }}</h3>
                  <span class="text-xs px-2 py-1 bg-gray-500/5 border border-gray-500/10 rounded-lg">{{ endpoint.lang }}</span>
                </div>
                <p class="text-xs text-gray-400 mb-2">{{ endpoint.callCount || 0 }} calls</p>
                <button
                  @click.stop="copyUrl(endpoint.url)"
                  class="text-xs text-blue-300 hover:text-blue-400"
                >
                  Copy URL
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Success Modal -->
      <div v-if="deployedEndpoint" class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <div class="bg-black border border-gray-500/30 rounded-lg p-8 max-w-2xl w-full">
          <div class="text-center mb-6">
            <div class="text-6xl mb-4">🎉</div>
            <h2 class="text-3xl font-bold mb-2">Endpoint Deployed!</h2>
            <p class="text-gray-400">Your API is live and ready to use</p>
          </div>

          <div class="bg-gray-500/10 border border-gray-500/10 rounded-lg p-4 mb-6">
            <div class="flex items-center justify-between mb-2">
              <label class="text-sm font-medium text-gray-400">Endpoint URL</label>
              <button
                @click="copyUrl(deployedEndpoint.url)"
                class="text-sm text-blue-300 hover:text-blue-400"
              >
                Copy
              </button>
            </div>
            <code class="block text-sm text-green-300 break-all">{{ deployedEndpoint.url }}</code>
          </div>

          <div class="bg-gray-500/10 border border-gray-500/10 rounded-lg p-4 mb-6">
            <p class="text-sm text-gray-300 mb-2">Test it now:</p>
            <code class="block text-xs text-gray-400 break-all">
              curl {{ deployedEndpoint.url }}
            </code>
          </div>

          <div class="flex gap-4">
            <button
              @click="navigateTo(`/endpoints/${deployedEndpoint.id}`)"
              class="flex-1 py-3 bg-blue-300 hover:bg-blue-400 text-black font-semibold rounded-lg transition"
            >
              View Endpoint Details
            </button>
            <button
              @click="closeModal"
              class="flex-1 py-3 bg-gray-500/10 border border-gray-500/10 hover:bg-gray-500/20 text-white font-semibold rounded-lg transition"
            >
              Deploy Another
            </button>
          </div>
        </div>
      </div>
    </div>

    <ToastContainer />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useCopyToClipboard } from '../composables/useCopyToClipboard';
import { useToast } from '../composables/useToast';

const { copy } = useCopyToClipboard();
const { showToast } = useToast();

const endpointName = ref('');
const endpointDescription = ref('');
const selectedLang = ref('node');
const code = ref('');
const deploying = ref(false);
const error = ref('');
const deployedEndpoint = ref(null);
const endpoints = ref([]);
const loadingEndpoints = ref(true);

// Templates
const templates = computed(() => {
  if (selectedLang.value === 'node') {
    return [
      { id: 'hello', name: 'Hello World' },
      { id: 'webhook', name: 'Webhook' },
      { id: 'api', name: 'REST API' }
    ];
  } else {
    return [
      { id: 'hello', name: 'Hello World' },
      { id: 'webhook', name: 'Webhook' },
      { id: 'json', name: 'JSON API' }
    ];
  }
});

const placeholderCode = computed(() => {
  if (selectedLang.value === 'node') {
    return `export default function handler(request) {
  const { name } = request.query;
  return {
    message: \`Hello \${name || 'World'}!\`,
    timestamp: Date.now()
  };
}`;
  } else {
    return `def handler(request):
    name = request.get('query', {}).get('name', 'World')
    return {
        'message': f'Hello {name}!',
        'timestamp': time.time()
    }`;
  }
});

// Template code
const templateCode = {
  node: {
    hello: `export default function handler(request) {
  const { name } = request.query;
  return {
    message: \`Hello \${name || 'World'}!\`,
    timestamp: Date.now()
  };
}`,
    webhook: `export default function handler(request) {
  // Log webhook data
  console.log('Webhook received:', request.body);

  // Process webhook
  const { type, data } = request.body;

  if (type === 'payment.success') {
    // Handle payment success
    return { received: true, status: 'processed' };
  }

  return { received: true };
}`,
    api: `// Simple REST API with multiple routes
export default function handler(request) {
  const users = [
    { id: 1, name: 'Alice', email: 'alice@example.com' },
    { id: 2, name: 'Bob', email: 'bob@example.com' }
  ];

  const { id } = request.query;

  if (id) {
    const user = users.find(u => u.id == id);
    return user || { error: 'User not found' };
  }

  return { users, total: users.length };
}`
  },
  python: {
    hello: `import time

def handler(request):
    name = request.get('query', {}).get('name', 'World')
    return {
        'message': f'Hello {name}!',
        'timestamp': time.time()
    }`,
    webhook: `import json

def handler(request):
    # Log webhook data
    print('Webhook received:', request.get('body'))

    # Process webhook
    body = request.get('body', {})
    event_type = body.get('type', '')

    if event_type == 'payment.success':
        # Handle payment success
        return {'received': True, 'status': 'processed'}

    return {'received': True}`,
    json: `import json

def handler(request):
    users = [
        {'id': 1, 'name': 'Alice', 'email': 'alice@example.com'},
        {'id': 2, 'name': 'Bob', 'email': 'bob@example.com'}
    ]

    user_id = request.get('query', {}).get('id')

    if user_id:
        user = next((u for u in users if u['id'] == int(user_id)), None)
        return user or {'error': 'User not found'}

    return {'users': users, 'total': len(users)}`
  }
};

function loadTemplate(template) {
  code.value = templateCode[selectedLang.value][template.id];
}

async function deployEndpoint() {
  if (!code.value.trim()) {
    error.value = 'Code cannot be empty';
    return;
  }

  deploying.value = true;
  error.value = '';

  try {
    const response = await $fetch('/api/endpoints', {
      method: 'POST',
      body: {
        code: code.value,
        lang: selectedLang.value,
        name: endpointName.value || 'Untitled Endpoint',
        description: endpointDescription.value
      }
    });

    deployedEndpoint.value = response;
    await loadEndpoints();

    // Reset form
    code.value = '';
    endpointName.value = '';
    endpointDescription.value = '';
  } catch (e) {
    error.value = e.data?.error || 'Failed to deploy endpoint';
  } finally {
    deploying.value = false;
  }
}

async function loadEndpoints() {
  try {
    const response = await $fetch('/api/endpoints');
    endpoints.value = response.endpoints || [];
  } catch (e) {
    console.error('Failed to load endpoints:', e);
  } finally {
    loadingEndpoints.value = false;
  }
}

function copyUrl(url) {
  copy(url);
  showToast('URL copied to clipboard!', 'success');
}

function closeModal() {
  deployedEndpoint.value = null;
}

onMounted(async () => {
  // Check authentication
  try {
    await $fetch('/api/dashboard');
  } catch (e) {
    // Not authenticated, redirect to login
    navigateTo('/login');
    return;
  }

  loadEndpoints();
  // Load default template
  loadTemplate({ id: 'hello' });
});
</script>

