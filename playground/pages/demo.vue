<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { DoclePlayground } from '@doclehq/vue'

useHead({
  title: 'Live Demo - Docle'
})

// For this demo, we're using the DoclePlayground component
// which is an iframe-based playground component
// This is perfect for quickly embedding a playground in any app

// Demo API key - you can pass it via URL parameter or set default
const route = useRoute()
const demoApiKey = ref<string | null>(route.query.key as string || null)
const isLoadingKey = ref(false)

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
				<!-- Playground -->
				<DoclePlayground
					v-if="demoApiKey"
					:lang="currentLang"
					:code="currentCode"
					:api-key="demoApiKey"
					height="900px"
					@run="handleRun"
					@error="handleError"
				/>

        <!-- Error State / No API Key -->
        <div v-else class="bg-gray-500/10 border border-gray-500/20 rounded-lg p-12 text-center">
          <svg class="w-16 h-16 mx-auto mb-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path>
          </svg>
          <h3 class="text-xl font-semibold text-white mb-2">API Key Required</h3>
          <p class="text-gray-400 mb-4">
            To use the demo, add your API key to the URL:
          </p>
          <code class="block bg-black/50 text-blue-300 px-4 py-2 rounded text-sm mb-4">
            ?key=YOUR_API_KEY
          </code>
          <p class="text-xs text-gray-500">
            Don't have an API key? <a href="/login" class="text-blue-300 hover:text-blue-400 underline">Sign up for free</a>
          </p>
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

