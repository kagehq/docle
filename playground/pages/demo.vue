<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { DoclePlayground } from '@doclehq/vue'

useHead({
  title: 'Live Demo - Docle'
})

// For this demo, we're using the DoclePlayground component
// which is an iframe-based playground component
// This is perfect for quickly embedding a playground in any app

// Get demo API key on mount
const demoApiKey = ref<string | null>(null)
const isLoadingKey = ref(true)

onMounted(async () => {
  try {
    // Get demo API key from public endpoint
    const response = await $fetch('/api/demo-key')
    demoApiKey.value = response.apiKey
  } catch (error) {
    console.error('Failed to get demo API key:', error)
  } finally {
    isLoadingKey.value = false
  }
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

// Handle execution events
const handleRun = (result: any) => {
  console.log('✅ Execution result:', result)
}

const handleError = (error: any) => {
  console.error('❌ Execution error:', error)
}
</script>

<template>
  <div class="min-h-screen bg-black text-white flex flex-col">
    <!-- Main Content -->
    <div class="flex-1">
			<div class="max-w-8xl mx-auto">
				<!-- Loading State -->
				<div v-if="isLoadingKey" class="bg-gray-500/10 border border-gray-500/20 rounded-lg p-12 text-center">
					<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
					<p class="text-gray-400">Loading playground...</p>
				</div>

				<!-- Playground -->
				<DoclePlayground
					v-else-if="demoApiKey"
					:lang="currentLang"
					:code="currentCode"
					:api-key="demoApiKey"
					height="900px"
					@run="handleRun"
					@error="handleError"
				/>

        <!-- Error State -->
        <div v-else class="bg-gray-500/10 border border-gray-500/20 rounded-lg p-12 text-center">
          <svg class="w-16 h-16 mx-auto mb-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <h3 class="text-xl font-semibold text-white mb-2">Failed to Load Playground</h3>
          <p class="text-gray-400 mb-4">Demo API key is not configured. Please contact support.</p>
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

