<script setup lang="ts">
import { ref, provide } from 'vue'

const isSnippetsPanelOpen = ref(false)

const openSnippetsPanel = () => {
  isSnippetsPanelOpen.value = true
}

const closeSnippetsPanel = () => {
  isSnippetsPanelOpen.value = false
}

// Provide the function to children components
provide('openSnippetsPanel', openSnippetsPanel)
</script>

<template>
  <div>
    <NuxtPage />
    <ToastContainer />
    <SnippetsPanel :is-open="isSnippetsPanelOpen" @close="closeSnippetsPanel" />
  </div>
</template>

<style>
/* Modern font stack - Vercel/Linear style */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

* {
  /* font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; */
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Custom scrollbar - sleek and minimal */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  transition: background 0.2s;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* Smooth focus outlines */
*:focus-visible {
  outline: 2px solid #93c5fd;
  outline-offset: 2px;
  border-radius: 4px;
}

/* Selection color */
/* ::selection {
  background-color: rgba(0, 220, 130, 0.3);
  color: inherit;
} */

/* Global transitions */
* {
  transition-property: background-color, border-color, color, fill, stroke, opacity, box-shadow, transform;
  transition-duration: 150ms;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

/* Code elements */
code, pre {
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  font-size: 0.9em;
}
</style>
