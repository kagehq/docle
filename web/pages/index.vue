<script setup lang="ts">
import { inject } from 'vue'

useHead({
  title: 'Projects - Docle'
})

// Inject the snippets panel function
const openSnippetsPanel = inject<() => void>('openSnippetsPanel', () => {})

const config = useRuntimeConfig()
const router = useRouter()

// State
type DashboardResponse = {
  user: {
    id: string
    email: string
    created_at: string
  }
  projects: Array<Record<string, any>>
}

const user = ref<DashboardResponse['user'] | null>(null)
const projects = ref<DashboardResponse['projects']>([])
const loading = ref(true)
const showCreateModal = ref(false)
const newProjectName = ref('')
const creatingProject = ref(false)

// Load user and projects
onMounted(async () => {
  try {
    // Check auth - always use Nuxt proxy
    const response = await $fetch<DashboardResponse>('/api/dashboard', {
      credentials: 'include'
    })

    if (response?.user) {
      user.value = response.user
      projects.value = response.projects || []
      return
    } else {
      router.push('/login')
    }
  } catch (error) {
    router.push('/login')
  } finally {
    loading.value = false
  }
})

// Create project
const handleCreateProject = async () => {
  if (!newProjectName.value.trim()) return

  creatingProject.value = true

  try {
    // Always use Nuxt proxy
    const response = await $fetch('/api/projects', {
      method: 'POST',
      credentials: 'include',
      body: { name: newProjectName.value.trim() }
    })

    // Navigate to project page
    router.push(`/projects/${response.project.id}`)
  } catch (error: any) {
    const { error: showError } = useToast()
    showError(error.data?.error || 'Failed to create project')
  } finally {
    creatingProject.value = false
    showCreateModal.value = false
    newProjectName.value = ''
  }
}

</script>

<template>
  <div class="min-h-screen bg-black text-white flex flex-col">
    <!-- Header -->
    <AppHeader active-page="dashboard" @open-snippets="openSnippetsPanel" />

    <!-- Main Content -->
    <div class="flex-1 overflow-y-auto px-6 py-6 max-w-7xl mx-auto w-full">
      <!-- Header with Gradient Accent -->
      <div class="mb-10 flex items-center justify-between">
        <div class="">
          <div class="inline-block">
            <h1 class="text-3xl font-bold text-white mb-1 flex items-center gap-3">
              Projects
              <!-- <span class="text-xs px-2.5 py-1 rounded-full bg-gray-500/10">
              {{ projects.length }}
              </span> -->
            </h1>
          </div>
          <p class="text-gray-500 text-sm">Manage your API keys and projects</p>
        </div>
        <button
          @click="showCreateModal = true"
          class="group/btn relative overflow-hidden bg-blue-300 text-black px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 flex items-center gap-2">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          New Project
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="space-y-4">
        <LoadingSkeleton type="card" :count="3" />
      </div>

      <!-- Projects Section -->
      <div v-else class="space-y-6">
        <!-- Projects Card -->
        <div class="relative group">
          <div class="relative">
            <!-- Projects List -->
            <div v-if="projects.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <NuxtLink
                v-for="project in projects"
                :key="project.id"
                :to="`/projects/${project.id}`"
                class="group/card relative bg-gray-500/10 hover:bg-gray-500/15 border border-gray-500/10 hover:border-gray-500/10 rounded-xl p-6 transition-all duration-300">
                <div class="flex items-center justify-between">
                  <div class="flex-1">
                    <h3 class="text-lg font-semibold text-white mb-1 group-hover/card:text-blue-300 transition-colors">
                      {{ project.name }}
                    </h3>
                    <p class="text-xs text-gray-500 font-mono">{{ project.id }}</p>
                    <div class="mt-3">
                      <p class="text-xs text-gray-500">Created on {{ new Date(project.created_at).toLocaleDateString() }}</p>
                    </div>
                  </div>
                </div>
              </NuxtLink>
            </div>

            <!-- Empty State -->
            <div v-else class="text-center py-16 px-4">
              <!-- Icon with gradient background -->
              <div class="mb-6 flex justify-center">
                <div class="bg-gray-500/5 border border-gray-500/10 p-4 rounded-xl"><svg class="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 0 0-1.883 2.542l.857 6a2.25 2.25 0 0 0 2.227 1.932H19.05a2.25 2.25 0 0 0 2.227-1.932l.857-6a2.25 2.25 0 0 0-1.883-2.542m-16.5 0V6A2.25 2.25 0 0 1 6 3.75h3.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 0 1.06.44H18A2.25 2.25 0 0 1 20.25 9v.776"></path></svg></div>
              </div>
              <h3 class="text-xl font-semibold text-white mb-2">No projects yet</h3>
              <p class="text-gray-400 mb-6 max-w-xs mx-auto text-sm">Create your first project to get started with Docle's secure code execution</p>
              <div class="space-y-3 max-w-sm mx-auto text-left">
                <button @click="showCreateModal = true" class="flex w-full items-start text-left gap-4 border bg-gray-500/10 hover:bg-gray-500/20 transition-all duration-300 border-gray-500/10 rounded-lg p-4">
                  <span class="bg-gray-500/10 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 font-bold text-xs">
                    1
                  </span>
                  <div>
                    <p class="text-blue-300 text-sm font-medium">Create a project</p>
                    <p class="text-gray-400 text-xs">Projects help you manage multiple applications</p>
                  </div>
                </button>
                <div class="flex items-start gap-4 border border-gray-500/10 rounded-lg p-4">
                  <span class="bg-gray-500/10 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 font-bold text-xs">
                    2
                  </span>
                  <div>
                    <p class="text-white text-sm font-medium">Generate an API key</p>
                    <p class="text-gray-400 text-xs">Secure keys for authenticated code execution</p>
                  </div>
                </div>
                <div class="flex items-start gap-4 border border-gray-500/10 rounded-lg p-4">
                  <span class="bg-gray-500/10 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 font-bold text-xs">
                    3
                  </span>
                  <div>
                    <p class="text-white text-sm font-medium">Execute code securely</p>
                    <p class="text-gray-400 text-xs">Run untrusted code in isolated sandboxes</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Project Modal -->
    <Transition name="modal">
      <div v-if="showCreateModal"
           @click.self="showCreateModal = false"
           class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div class="relative bg-black border border-gray-500/30 max-w-md w-full rounded-lg p-8">
            <!-- Header -->
            <div class="mb-6">
              <h3 class="text-2xl font-bold text-white mb-2">Create a project</h3>
              <p class="text-gray-400 text-sm">Give your project a memorable name</p>
            </div>

            <form @submit.prevent="handleCreateProject">
              <div class="mb-6">
                <label class="block text-sm font-semibold text-gray-300 mb-3">
                  Project Name
                </label>
                <input
                  v-model="newProjectName"
                  type="text"
                  required
                  placeholder="Acme"
                  class="w-full px-3 py-2 text-sm bg-gray-500/10 border border-gray-500/10 text-white rounded-lg focus:ring-0 focus:border-gray-500/20 outline-none focus-visible:outline-none focus-visible:rounded-lg placeholder-gray-500 transition-all"
                  autofocus
                />
              </div>

              <div class="flex gap-3">
                <button
                  type="submit"
                  :disabled="creatingProject"
                  class="flex-1 bg-blue-300 hover:bg-blue-400 text-black py-2 text-sm rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  <span v-if="creatingProject" class="flex items-center justify-center gap-2">
                    <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </span>
                  <span v-else>Create</span>
                </button>
                <button
                  type="button"
                  @click="showCreateModal = false"
                  class="flex-1 bg-gray-500/10 hover:bg-gray-500/20 text-white border border-gray-500/10 py-2 text-sm rounded-lg font-semibold transition-all">
                  Cancel
                </button>
              </div>
            </form>
          </div>
      </div>
    </Transition>
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
