<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { DoclePlayground } from '@doclehq/vue'

useHead({
  title: 'Live Demo - Docle'
})

const route = useRoute()

// Get API key from URL parameter or use default demo key
const apiKey = computed(() => {
  return route.query.key as string || ''
})

// Demo code examples for different languages
const pythonExample = `# Calculate Fibonacci sequence
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

# Print first 10 Fibonacci numbers
print("Fibonacci sequence:")
for i in range(10):
    print(f"F({i}) = {fibonacci(i)}")

# Simple data analysis
numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
print(f"\\nSum: {sum(numbers)}")
print(f"Average: {sum(numbers) / len(numbers)}")
print(f"Max: {max(numbers)}")
print(f"Min: {min(numbers)}")`

const nodeExample = `// Array manipulation and functional programming
const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// Map, filter, reduce examples
const doubled = numbers.map(n => n * 2);
const evens = numbers.filter(n => n % 2 === 0);
const sum = numbers.reduce((acc, n) => acc + n, 0);

console.log("Original:", numbers);
console.log("Doubled:", doubled);
console.log("Evens only:", evens);
console.log("Sum:", sum);

// Object manipulation
const user = {
  name: "Alice",
  age: 30,
  skills: ["JavaScript", "Python", "Go"]
};

console.log("\\nUser info:");
console.log(\`Name: \${user.name}\`);
console.log(\`Age: \${user.age}\`);
console.log(\`Skills: \${user.skills.join(", ")}\`);`

const currentLang = ref<'python' | 'node'>('python')
const currentCode = ref(pythonExample)

const switchLanguage = (lang: 'python' | 'node') => {
  currentLang.value = lang
  currentCode.value = lang === 'python' ? pythonExample : nodeExample
}

// Show API key warning if not provided
const showApiKeyWarning = computed(() => !apiKey.value)

// Handle execution events
const handleRun = (result: any) => {
  console.log('Execution result:', result)
}

const handleError = (error: any) => {
  console.error('Execution error:', error)
}
</script>

<template>
  <div class="min-h-screen bg-black text-white flex flex-col">
    <!-- Header -->
    <div class="border-b border-gray-500/20 px-4 py-3 flex-shrink-0">
      <div class="max-w-7xl mx-auto flex items-center justify-between">
        <div class="flex items-center gap-3">
          <NuxtLink to="/" class="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img src="/assets/img/logo.png" alt="Docle" class="w-7 h-7">
            <span class="text-xl font-bold">Docle</span>
          </NuxtLink>
          <span class="text-gray-500/50">/</span>
          <span class="text-gray-400 text-sm">Live Demo</span>
        </div>
        <NuxtLink
          to="/login"
          class="px-3 py-1.5 text-xs rounded-lg border border-blue-300 bg-blue-300 text-black font-medium transition-all hover:bg-blue-400">
          Get Started Free
        </NuxtLink>
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex-1 overflow-y-auto px-4 py-8">
      <div class="max-w-7xl mx-auto">
        <!-- Hero Section -->
        <div class="text-center mb-8">
          <h1 class="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Run Code Safely in Your App
          </h1>
          <p class="text-lg text-gray-400 mb-6 max-w-2xl mx-auto">
            Execute Python and Node.js code in secure sandboxes at the edge. Try it live below!
          </p>
          
          <!-- API Key Warning -->
          <div v-if="showApiKeyWarning" class="max-w-2xl mx-auto mb-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div class="flex items-start gap-3">
              <svg class="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
              <div class="text-left flex-1">
                <p class="text-sm text-amber-300 font-medium mb-1">Demo Mode - Limited Functionality</p>
                <p class="text-xs text-amber-400/80">
                  This demo requires an API key to execute code. 
                  <NuxtLink to="/login" class="underline hover:text-amber-300">Sign up free</NuxtLink> to get your API key, then add <code class="px-1.5 py-0.5 rounded bg-amber-500/20">?key=YOUR_API_KEY</code> to the URL.
                </p>
              </div>
            </div>
          </div>

          <!-- Language Switcher -->
          <div class="flex items-center justify-center gap-2 mb-8">
            <button
              @click="switchLanguage('python')"
              :class="[
                'px-4 py-2 text-sm rounded-lg font-medium transition-all',
                currentLang === 'python'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-500/10 text-gray-400 hover:bg-gray-500/20 hover:text-white'
              ]">
              <span class="flex items-center gap-2">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14.25.18l.9.2.73.26.59.3.45.32.34.34.25.34.16.33.1.3.04.26.02.2-.01.13V8.5l-.05.63-.13.55-.21.46-.26.38-.3.31-.33.25-.35.19-.35.14-.33.1-.3.07-.26.04-.21.02H8.77l-.69.05-.59.14-.5.22-.41.27-.33.32-.27.35-.2.36-.15.37-.1.35-.07.32-.04.27-.02.21v3.06H3.17l-.21-.03-.28-.07-.32-.12-.35-.18-.36-.26-.36-.36-.35-.46-.32-.59-.28-.73-.21-.88-.14-1.05-.05-1.23.06-1.22.16-1.04.24-.87.32-.71.36-.57.4-.44.42-.33.42-.24.4-.16.36-.1.32-.05.24-.01h.16l.06.01h8.16v-.83H6.18l-.01-2.75-.02-.37.05-.34.11-.31.17-.28.25-.26.31-.23.38-.2.44-.18.51-.15.58-.12.64-.1.71-.06.77-.04.84-.02 1.27.05zm-6.3 1.98l-.23.33-.08.41.08.41.23.34.33.22.41.09.41-.09.33-.22.23-.34.08-.41-.08-.41-.23-.33-.33-.22-.41-.09-.41.09zm13.09 3.95l.28.06.32.12.35.18.36.27.36.35.35.47.32.59.28.73.21.88.14 1.04.05 1.23-.06 1.23-.16 1.04-.24.86-.32.71-.36.57-.4.45-.42.33-.42.24-.4.16-.36.09-.32.05-.24.02-.16-.01h-8.22v.82h5.84l.01 2.76.02.36-.05.34-.11.31-.17.29-.25.25-.31.24-.38.2-.44.17-.51.15-.58.13-.64.09-.71.07-.77.04-.84.01-1.27-.04-1.07-.14-.9-.2-.73-.25-.59-.3-.45-.33-.34-.34-.25-.34-.16-.33-.1-.3-.04-.25-.02-.2.01-.13v-5.34l.05-.64.13-.54.21-.46.26-.38.3-.32.33-.24.35-.2.35-.14.33-.1.3-.06.26-.04.21-.02.13-.01h5.84l.69-.05.59-.14.5-.21.41-.28.33-.32.27-.35.2-.36.15-.36.1-.35.07-.32.04-.28.02-.21V6.07h2.09l.14.01zm-6.47 14.25l-.23.33-.08.41.08.41.23.33.33.23.41.08.41-.08.33-.23.23-.33.08-.41-.08-.41-.23-.33-.33-.23-.41-.08-.41.08z"/>
                </svg>
                Python
              </span>
            </button>
            <button
              @click="switchLanguage('node')"
              :class="[
                'px-4 py-2 text-sm rounded-lg font-medium transition-all',
                currentLang === 'node'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-500/10 text-gray-400 hover:bg-gray-500/20 hover:text-white'
              ]">
              <span class="flex items-center gap-2">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.998,24c-0.321,0-0.641-0.084-0.922-0.247l-2.936-1.737c-0.438-0.245-0.224-0.332-0.08-0.383 c0.585-0.203,0.703-0.25,1.328-0.604c0.065-0.037,0.151-0.023,0.218,0.017l2.256,1.339c0.082,0.045,0.197,0.045,0.272,0l8.795-5.076 c0.082-0.047,0.134-0.141,0.134-0.238V6.921c0-0.099-0.053-0.192-0.137-0.242l-8.791-5.072c-0.081-0.047-0.189-0.047-0.271,0 L3.075,6.68C2.99,6.729,2.936,6.825,2.936,6.921v10.15c0,0.097,0.054,0.189,0.139,0.235l2.409,1.392 c1.307,0.654,2.108-0.116,2.108-0.89V7.787c0-0.142,0.114-0.253,0.256-0.253h1.115c0.139,0,0.255,0.112,0.255,0.253v10.021 c0,1.745-0.95,2.745-2.604,2.745c-0.508,0-0.909,0-2.026-0.551L2.28,18.675c-0.57-0.329-0.922-0.945-0.922-1.604V6.921 c0-0.659,0.353-1.275,0.922-1.603l8.795-5.082c0.557-0.315,1.296-0.315,1.848,0l8.794,5.082c0.57,0.329,0.924,0.944,0.924,1.603 v10.15c0,0.659-0.354,1.273-0.924,1.604l-8.794,5.078C12.643,23.916,12.324,24,11.998,24z M19.099,13.993 c0-1.9-1.284-2.406-3.987-2.763c-2.731-0.361-3.009-0.548-3.009-1.187c0-0.528,0.235-1.233,2.258-1.233 c1.807,0,2.473,0.389,2.747,1.607c0.024,0.115,0.129,0.199,0.247,0.199h1.141c0.071,0,0.138-0.031,0.186-0.081 c0.048-0.054,0.074-0.123,0.067-0.196c-0.177-2.098-1.571-3.076-4.388-3.076c-2.508,0-4.004,1.058-4.004,2.833 c0,1.925,1.488,2.457,3.895,2.695c2.88,0.282,3.103,0.703,3.103,1.269c0,0.983-0.789,1.402-2.642,1.402 c-2.327,0-2.839-0.584-3.011-1.742c-0.02-0.124-0.126-0.215-0.253-0.215h-1.137c-0.141,0-0.254,0.112-0.254,0.253 c0,1.482,0.806,3.248,4.655,3.248C17.501,17.007,19.099,15.91,19.099,13.993z"/>
                </svg>
                Node.js
              </span>
            </button>
          </div>
        </div>

        <!-- Playground -->
        <div class="max-w-5xl mx-auto">
          <DoclePlayground
            v-if="apiKey"
            :lang="currentLang"
            :code="currentCode"
            :api-key="apiKey"
            theme="dark"
            height="500px"
            @run="handleRun"
            @error="handleError"
          />
          <div v-else class="bg-gray-500/10 border border-gray-500/20 rounded-lg p-12 text-center">
            <svg class="w-16 h-16 mx-auto mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
            </svg>
            <h3 class="text-xl font-semibold text-white mb-2">API Key Required</h3>
            <p class="text-gray-400 mb-4">Sign up for free to get your API key and try the playground</p>
            <NuxtLink
              to="/login"
              class="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-blue-300 bg-blue-300 text-black font-medium transition-all hover:bg-blue-400">
              Get API Key Free
            </NuxtLink>
          </div>
        </div>

        <!-- Features Section -->
        <div class="mt-16 grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <div class="p-6 rounded-lg bg-gray-500/5 border border-gray-500/10">
            <div class="w-12 h-12 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
              <svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-white mb-2">Secure Sandbox</h3>
            <p class="text-sm text-gray-400">Isolated V8 environments with no access to your infrastructure</p>
          </div>

          <div class="p-6 rounded-lg bg-gray-500/5 border border-gray-500/10">
            <div class="w-12 h-12 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4">
              <svg class="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-white mb-2">Edge Performance</h3>
            <p class="text-sm text-gray-400">Runs on Cloudflare's global network with &lt;50ms latency</p>
          </div>

          <div class="p-6 rounded-lg bg-gray-500/5 border border-gray-500/10">
            <div class="w-12 h-12 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-4">
              <svg class="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-white mb-2">Easy Integration</h3>
            <p class="text-sm text-gray-400">React, Vue, vanilla JS, or REST API - works everywhere</p>
          </div>
        </div>

        <!-- CTA Section -->
        <div class="mt-16 p-8 rounded-lg bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 border border-gray-500/20 text-center max-w-3xl mx-auto">
          <h2 class="text-2xl font-bold text-white mb-3">Ready to add code execution to your app?</h2>
          <p class="text-gray-400 mb-6">Sign up for free and get 100 executions per minute</p>
          <div class="flex items-center justify-center gap-4">
            <NuxtLink
              to="/login"
              class="px-6 py-3 text-sm rounded-lg border border-blue-300 bg-blue-300 text-black font-semibold transition-all hover:bg-blue-400">
              Get Started Free
            </NuxtLink>
            <NuxtLink
              to="/playground"
              class="px-6 py-3 text-sm rounded-lg border border-gray-500/20 bg-gray-500/10 text-white font-semibold transition-all hover:bg-gray-500/20">
              Try Playground
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="border-t border-gray-500/20 px-4 py-6 mt-16">
      <div class="max-w-7xl mx-auto flex items-center justify-between text-sm text-gray-500">
        <div>
          Built with ❤️ using <a href="https://workers.cloudflare.com/" target="_blank" class="hover:text-white transition-colors underline">Cloudflare Workers</a>
        </div>
        <div class="flex items-center gap-6">
          <NuxtLink to="/" class="hover:text-white transition-colors">Dashboard</NuxtLink>
          <a href="https://github.com/kagehq/docle" target="_blank" class="hover:text-white transition-colors">GitHub</a>
          <NuxtLink to="/snippets" class="hover:text-white transition-colors">Docs</NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
code {
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
}
</style>

