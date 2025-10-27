<script setup lang="ts">
interface Props {
  type?: 'card' | 'text' | 'circle' | 'table' | 'list'
  count?: number
}

const props = withDefaults(defineProps<Props>(), {
  type: 'card',
  count: 1
})
</script>

<template>
  <!-- Card Skeleton -->
  <template v-if="type === 'card'">
    <div
      v-for="i in count"
      :key="i"
      class="bg-gray-500/10 border border-gray-500/10 rounded-xl p-6 animate-pulse">
      <div class="h-6 bg-gray-500/20 rounded w-3/4 mb-3"></div>
      <div class="h-4 bg-gray-500/20 rounded w-1/2 mb-4"></div>
      <div class="h-4 bg-gray-500/20 rounded w-1/3"></div>
    </div>
  </template>

  <!-- Text Skeleton -->
  <template v-else-if="type === 'text'">
    <div
      v-for="i in count"
      :key="i"
      class="space-y-2 animate-pulse">
      <div class="h-4 bg-gray-500/20 rounded w-full"></div>
      <div class="h-4 bg-gray-500/20 rounded w-5/6"></div>
      <div class="h-4 bg-gray-500/20 rounded w-4/6"></div>
    </div>
  </template>

  <!-- Circle Skeleton (for avatars) -->
  <template v-else-if="type === 'circle'">
    <div
      v-for="i in count"
      :key="i"
      class="w-10 h-10 bg-gray-500/20 rounded-full animate-pulse">
    </div>
  </template>

  <!-- Table Skeleton -->
  <template v-else-if="type === 'table'">
    <div class="space-y-3">
      <div
        v-for="i in count"
        :key="i"
        class="flex items-center gap-4 p-4 bg-gray-500/10 border border-gray-500/10 rounded-lg animate-pulse">
        <div class="h-4 bg-gray-500/20 rounded flex-1"></div>
        <div class="h-4 bg-gray-500/20 rounded w-24"></div>
        <div class="h-4 bg-gray-500/20 rounded w-16"></div>
      </div>
    </div>
  </template>

  <!-- List Skeleton -->
  <template v-else-if="type === 'list'">
    <div class="space-y-2">
      <div
        v-for="i in count"
        :key="i"
        class="flex items-center gap-3 animate-pulse">
        <div class="w-8 h-8 bg-gray-500/20 rounded"></div>
        <div class="flex-1 space-y-2">
          <div class="h-4 bg-gray-500/20 rounded w-3/4"></div>
          <div class="h-3 bg-gray-500/20 rounded w-1/2"></div>
        </div>
      </div>
    </div>
  </template>
</template>

