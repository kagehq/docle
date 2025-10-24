<script setup lang="ts">
import { ref } from 'vue'

const pythonCode = ref(`print("Hello from Vue Component!")
for i in range(5):
    print(f"Count: {i}")`)

const nodejsCode = ref(`console.log("Hello from Vue Component!");
for(let i=0; i<5; i++) {
    console.log(\`Count: \${i}\`);
}`)

const selectedLang = ref<'python' | 'node'>('python')
const selectedCode = ref(pythonCode.value)
const readonly = ref(false)
const showOutput = ref(true)
const autorun = ref(false)

// Handle language change
const handleLangChange = () => {
  selectedCode.value = selectedLang.value === 'python' ? pythonCode.value : nodejsCode.value
}

// Event handlers
const handleReady = (data: any) => {
  console.log('Playground ready:', data)
}

const handleRun = (result: any) => {
  console.log('Execution result:', result)
}

const handleError = (error: any) => {
  console.error('Execution error:', error)
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
                class="px-2.5 py-1.5 text-xs rounded-lg border border-transparent bg-transparent text-gray-500 font-medium transition-all hover:bg-gray-500/10">
                <span class="flex items-center gap-2">
                  Dashboard
                </span>
              </NuxtLink>
              
              <NuxtLink 
                to="/demo"
                class="px-2.5 py-1.5 text-xs rounded-lg border border-gray-500/15 bg-gray-500/15 text-white font-medium transition-all hover:bg-gray-500/10">
                <span class="flex items-center gap-2">
                  Demo
                </span>
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Content Area -->
      <div class="flex-1 overflow-y-auto px-4 py-4">

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Controls -->
        <div class="lg:col-span-1 space-y-4">
          <div class="p-4 rounded-xl bg-gray-500/10 border border-gray-500/10">
            <h2 class="text-lg font-semibold mb-4">Component Props</h2>
            
            <div class="space-y-0.5">
              <!-- Language -->
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">Language</label>
                <div class="relative">
                  <select 
                    v-model="selectedLang"
                    @change="handleLangChange"
                    class="w-full px-3 py-2.5 rounded-lg bg-gray-500/5 border border-gray-500/5 text-white text-sm appearance-none cursor-pointer hover:border-gray-500/20 focus:border-gray-500/30 focus:outline-none transition-all">
                    <option value="python">Python</option>
                    <option value="node">Node.js</option>
                  </select>
                  <svg class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </div>
              </div>
              
              <!-- Code -->
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">Code</label>
                <textarea 
                  v-model="selectedCode"
                  class="w-full px-3 py-2.5 rounded-lg bg-gray-500/5 border border-gray-500/5 text-white text-sm font-mono resize-none hover:border-gray-500/20 focus:border-gray-500/30 focus:outline-none transition-all"
                  rows="6"
                ></textarea>
              </div>
              
              <!-- Readonly -->
              <div class="flex items-center justify-between py-1">
                <label class="text-sm font-medium text-gray-300">Readonly</label>
                <button
                  @click="readonly = !readonly"
                  :class="[
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    readonly ? 'bg-blue-300' : 'bg-gray-500/10'
                  ]">
                  <span
                    :class="[
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      readonly ? 'translate-x-6' : 'translate-x-1'
                    ]"
                  />
                </button>
              </div>
              
              <!-- Show Output -->
              <div class="flex items-center justify-between py-1">
                <label class="text-sm font-medium text-gray-300">Show Output</label>
                <button
                  @click="showOutput = !showOutput"
                  :class="[
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    showOutput ? 'bg-blue-300' : 'bg-gray-500/10'
                  ]">
                  <span
                    :class="[
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      showOutput ? 'translate-x-6' : 'translate-x-1'
                    ]"
                  />
                </button>
              </div>
              
              <!-- Autorun -->
              <div class="flex items-center justify-between py-1">
                <label class="text-sm font-medium text-gray-300">Autorun</label>
                <button
                  @click="autorun = !autorun"
                  :class="[
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    autorun ? 'bg-blue-300' : 'bg-gray-500/10'
                  ]">
                  <span
                    :class="[
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      autorun ? 'translate-x-6' : 'translate-x-1'
                    ]"
                  />
                </button>
              </div>
            </div>
          </div>
          
          <!-- Usage Example -->
          <div class="p-4 rounded-xl bg-gray-500/10 border border-gray-500/10">
            <h3 class="text-sm font-semibold mb-2 flex items-center gap-2">
              <!-- <svg class="w-4 h-4 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>
              </svg> -->
              Vue Component Usage
            </h3>
            <pre class="text-xs overflow-x-auto font-mono"><code><span class="text-gray-500">&lt;</span><span class="text-purple-400">DoclePlayground</span>
  <span class="text-blue-300">lang</span><span class="text-gray-500">=</span><span class="text-yellow-300">"{{ selectedLang }}"</span>
  <span class="text-blue-300">code</span><span class="text-gray-500">=</span><span class="text-yellow-300">"{{ selectedCode.slice(0, 20) }}..."</span>
  <span class="text-blue-300">:readonly</span><span class="text-gray-500">=</span><span class="text-yellow-300">"{{ readonly }}"</span>
  <span class="text-blue-300">:showOutput</span><span class="text-gray-500">=</span><span class="text-yellow-300">"{{ showOutput }}"</span>
  <span class="text-blue-300">:autorun</span><span class="text-gray-500">=</span><span class="text-yellow-300">"{{ autorun }}"</span>
  <span class="text-green-400">@ready</span><span class="text-gray-500">=</span><span class="text-yellow-300">"handleReady"</span>
  <span class="text-green-400">@run</span><span class="text-gray-500">=</span><span class="text-yellow-300">"handleRun"</span>
  <span class="text-green-400">@error</span><span class="text-gray-500">=</span><span class="text-yellow-300">"handleError"</span>
<span class="text-gray-500">/&gt;</span></code></pre>
          </div>
        </div>

        <!-- Component Preview -->
        <div class="lg:col-span-2">
          <div class="p-4 rounded-xl bg-gray-500/10 border border-gray-500/10">
            <h2 class="text-lg font-semibold mb-4">Live Preview</h2>
            
            <!-- Component iframe (simulated) -->
            <div class="border border-gray-500/20 rounded-lg overflow-hidden">
              <iframe
                :src="`/embed?lang=${selectedLang}&code=${encodeURIComponent(selectedCode)}&readonly=${readonly}&showOutput=${showOutput}&autorun=${autorun}`"
                class="w-full h-[600px] border-none"
                title="Docle Component Preview"
              />
            </div>
          </div>
          
          <!-- Event Log -->
          <div class="mt-4 p-4 rounded-xl bg-gray-500/10 border border-gray-500/10">
            <h3 class="text-sm font-semibold mb-2">Event Log</h3>
            <p class="text-xs text-gray-500">Check browser console for event logs</p>
          </div>
        </div>
      </div>
      
      </div>
    </div>
  </div>
</template>

