<script setup lang="ts">
useHead({
  title: 'Sign In - Docle'
})

const email = ref('')
const loading = ref(false)
const message = ref('')
const config = useRuntimeConfig()

const handleLogin = async () => {
  if (!email.value) return

  loading.value = true
  message.value = ''

  try {
    const apiUrl = process.client && window.location.hostname === 'localhost'
      ? '/api/auth/request'
      : `${config.public.apiBase}/auth/request`

    const response = await $fetch(apiUrl, {
      method: 'POST',
      body: { email: email.value }
    })

    message.value = 'Check your email! We sent you a magic link to sign in.'
    email.value = ''
  } catch (error: any) {
    message.value = '❌ ' + (error.data?.error || 'Failed to send magic link')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col bg-black text-white">
    <!-- Main Content -->
    <div class="flex items-center justify-center px-4 py-16 flex-1">
      <div class="max-w-md w-full">
        <!-- Logo & Branding -->
        <div class="text-center mb-6">
          <img src="~/assets/img/logo.png" alt="Brail" class="w-14 h-14 mx-auto mb-4" />
          <h1 class="text-3xl font-bold text-white mb-2">Welcome to Docle</h1>
          <p class="text-gray-400 text-sm">Sign in with your email to continue</p>
        </div>

         <!-- Alert Message -->
         <div v-if="message"
              :class="[
                'mb-6 p-4 rounded-lg border text-sm',
                message.startsWith('Check your email')
                  ? 'bg-green-300/10 border-green-300/10 text-green-300'
                  : 'bg-red-400/10 border-red-400/10 text-red-400'
              ]">
          {{ message }}
        </div>

        <!-- Login Card -->
        <div class="bg-gray-500/10 border border-gray-500/10 rounded-lg p-8">


          <!-- Login Form -->
          <form @submit.prevent="handleLogin" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <input
                v-model="email"
                type="email"
                required
                placeholder="you@example.com"
                class="w-full px-3 py-2.5 bg-gray-500/10 focus-visible:outline-none focus-visible:rounded-lg focus-visible:ring-gray-500/10 outline-none focus:ring-1 focus:ring-gray-500/10 border border-gray-500/10 rounded-lg text-white placeholder-gray-500 focus:border-gray-500/10 transition-all"
              />
            </div>

            <button
              type="submit"
              :disabled="loading"
              class="w-full bg-blue-300 hover:bg-blue-400 text-black py-3 text-sm rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              {{ loading ? 'Sending...' : 'Send magic link' }}
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
