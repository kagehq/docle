<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface Props {
  activePage?: 'playground' | 'dashboard' | 'snippets'
  hideActions?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  activePage: 'playground',
  hideActions: false
})

// Emit event for snippets panel
const emit = defineEmits<{
  openSnippets: []
}>()

// Check if user is authenticated
const isAuthenticated = ref(false)
const userEmail = ref<string>('')
const showUserMenu = ref(false)
const userMenuRef = ref<HTMLElement | null>(null)

const checkAuth = async () => {
  if (typeof window === 'undefined') return
  try {
    const config = useRuntimeConfig()
    const apiUrl = process.client && window.location.hostname === 'localhost'
      ? '/api/dashboard'
      : `${config.public.apiBase}/api/dashboard`

    const response = await fetch(apiUrl, {
      credentials: 'include'
    })
    if (!response.ok) {
      isAuthenticated.value = false
      userEmail.value = ''
      return
    }
    const data = await response.json()
    if (data.user && data.user.email) {
      isAuthenticated.value = true
      userEmail.value = data.user.email
    } else {
      isAuthenticated.value = false
      userEmail.value = ''
    }
  } catch (error) {
    isAuthenticated.value = false
    userEmail.value = ''
  }
}

// Handle logout
const handleLogout = async () => {
  showUserMenu.value = false
  try {
    const config = useRuntimeConfig()
    const apiUrl = process.client && window.location.hostname === 'localhost'
      ? '/api/logout'
      : `${config.public.apiBase}/api/logout`

    await fetch(apiUrl, {
      method: 'POST',
      credentials: 'include'
    })
    // Redirect to login page
    window.location.href = '/login'
  } catch (error) {
    console.error('Logout failed:', error)
  }
}

// Close dropdown when clicking outside
const handleClickOutside = (event: MouseEvent) => {
  if (userMenuRef.value && !userMenuRef.value.contains(event.target as Node)) {
    showUserMenu.value = false
  }
}

// Get user initials for avatar
const getUserInitials = () => {
  if (!userEmail.value) return 'U'
  const parts = userEmail.value.split('@')[0].split(/[._-]/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return userEmail.value[0].toUpperCase()
}

onMounted(() => {
  checkAuth()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="border-b border-gray-500/20 px-4 py-2 flex-shrink-0">
    <div class="flex items-center justify-between">
      <!-- Logo & Navigation -->
      <div class="flex items-center gap-2">
        <NuxtLink to="/" class="relative flex items-center">
          <img src="/assets/img/logo.png" alt="Docle" class="w-7 h-7">
        </NuxtLink>
        <span class="text-gray-500/50 text-sm">/</span>

        <ClientOnly>
          <div class="flex items-center gap-2 border border-gray-500/20 rounded-xl p-0.5">
            <NuxtLink
              v-if="isAuthenticated"
              to="/"
              :class="[
                'px-2 py-1.5 text-xs rounded-lg font-medium transition-all',
                activePage === 'dashboard'
                  ? 'border border-gray-500/15 bg-gray-500/15 text-white'
                  : 'border border-transparent bg-transparent text-gray-500 hover:bg-gray-500/10'
              ]">
              <span class="flex items-center gap-2">
                Dashboard
              </span>
            </NuxtLink>

            <NuxtLink
              to="/playground"
              :class="[
                'px-2 py-1.5 text-xs rounded-lg font-medium transition-all',
                activePage === 'playground'
                  ? 'border border-gray-500/15 bg-gray-500/15 text-white'
                  : 'border border-transparent bg-transparent text-gray-500 hover:bg-gray-500/10'
              ]">
              <span class="flex items-center gap-2">
                Playground
              </span>
            </NuxtLink>

            <!-- <NuxtLink
              to="/snippets"
              :class="[
                'px-2 py-1.5 text-xs rounded-lg font-medium transition-all',
                activePage === 'snippets'
                  ? 'border border-gray-500/15 bg-gray-500/15 text-white'
                  : 'border border-transparent bg-transparent text-gray-500 hover:bg-gray-500/10'
              ]">
              <span class="flex items-center gap-2">
                Snippets
              </span>
            </NuxtLink> -->
          </div>
        </ClientOnly>
      </div>

      <!-- Action buttons (can be hidden on some pages) -->
      <ClientOnly>
        <div v-if="!hideActions" class="flex items-center gap-3">
          <!-- Custom action buttons from slot -->
          <slot name="actions"></slot>

          <!-- Separator only shown when both actions exist -->
          <span v-if="$slots.actions" class="text-gray-500/50 text-sm">|</span>

          <!-- Snippets button -->
          <button
            @click="emit('openSnippets')"
            class="px-2.5 py-1.5 text-xs rounded-lg border border-gray-500/20 bg-gray-500/10 text-gray-300 font-medium transition-all hover:bg-gray-500/20 hover:text-white hover:border-gray-500/30"
            title="View Integration Snippets">
            <span class="flex items-center gap-2">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>
              </svg>
              Snippets
            </span>
          </button>

          <!-- Separator only shown when user is authenticated -->
          <span v-if="isAuthenticated" class="text-gray-500/50 text-sm">|</span>

          <!-- Show user menu if authenticated -->
          <template v-if="isAuthenticated">
            <div ref="userMenuRef" class="relative">
              <button
                @click="showUserMenu = !showUserMenu"
                class="w-7 h-7 rounded-full bg-amber-300/50 flex items-center border border-amber-300/10 justify-center text-white text-xs font-semibold hover:bg-amber-300/60 transition-all cursor-pointer">
                {{ getUserInitials() }}
              </button>

              <!-- Dropdown Menu -->
              <Transition
                enter-active-class="transition ease-out duration-100"
                enter-from-class="opacity-0 scale-95"
                enter-to-class="opacity-100 scale-100"
                leave-active-class="transition ease-in duration-75"
                leave-from-class="opacity-100 scale-100"
                leave-to-class="opacity-0 scale-95">
                <div
                  v-if="showUserMenu"
                  class="absolute right-0 mt-2 w-64 bg-black border border-gray-500/20 rounded-lg overflow-hidden z-50">
                  <!-- User Info -->
                  <div class="px-4 py-3 border-b border-gray-500/20">
                    <p class="text-xs text-gray-500 mb-1">Signed in as</p>
                    <p class="text-sm text-white font-medium truncate">{{ userEmail }}</p>
                  </div>

                  <!-- Sign Out -->
                  <button
                    @click="handleLogout"
                    class="w-full px-4 py-3 text-left text-xs text-gray-300 hover:bg-gray-500/10 hover:text-red-400 transition-colors flex items-center gap-3">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                    </svg>
                    Sign out
                  </button>
                </div>
              </Transition>
            </div>
          </template>

          <!-- Show login button if not authenticated -->
          <NuxtLink
            v-else
            to="/login"
            class="px-2.5 py-1.5 text-xs rounded-lg border border-blue-300 bg-blue-300 text-black font-medium transition-all hover:bg-blue-400">
            <span class="flex items-center gap-2">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path>
              </svg>
              Login / Sign Up
            </span>
          </NuxtLink>
        </div>
      </ClientOnly>
    </div>
  </div>
</template>

