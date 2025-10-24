<template>
  <iframe
    ref="iframeRef"
    :src="iframeSrc"
    :style="{
      width: '100%',
      height: height,
      border: 'none',
      borderRadius: '8px'
    }"
    title="Docle Playground"
    sandbox="allow-scripts allow-same-origin allow-popups"
  />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import type { DoclePlaygroundProps, DocleEmitEvents } from './types';

const props = withDefaults(defineProps<DoclePlaygroundProps>(), {
  lang: 'python',
  code: 'print("Hello, Docle!")',
  theme: 'dark',
  readonly: false,
  showOutput: true,
  autorun: false,
  height: '400px'
});

const emit = defineEmits<DocleEmitEvents>();

const iframeRef = ref<HTMLIFrameElement | null>(null);
const currentCode = ref(props.code);

// Compute iframe src URL
const iframeSrc = computed(() => {
  const baseUrl = props.endpoint || window.location.origin;
  const params = new URLSearchParams({
    lang: props.lang,
    theme: props.theme,
    code: encodeURIComponent(currentCode.value || ''),
    readonly: String(props.readonly),
    showOutput: String(props.showOutput),
    autorun: String(props.autorun)
  });
  return `${baseUrl}/embed?${params.toString()}`;
});

// Handle postMessage events
const handleMessage = (event: MessageEvent) => {
  if (iframeRef.value && event.source !== iframeRef.value.contentWindow) {
    return;
  }

  const { type, data } = event.data;
  
  if (type === 'docle-ready') {
    emit('ready', data);
  } else if (type === 'docle-result') {
    emit('run', data);
  } else if (type === 'docle-error') {
    emit('error', data);
  }
};

// Run code
const run = () => {
  iframeRef.value?.contentWindow?.postMessage({ type: 'docle-run' }, '*');
};

// Set code
const setCode = (newCode: string) => {
  currentCode.value = newCode;
  iframeRef.value?.contentWindow?.postMessage({ type: 'docle-set-code', code: newCode }, '*');
};

// Expose methods
defineExpose({
  run,
  setCode
});

// Watch for prop changes
watch(() => props.code, (newCode) => {
  currentCode.value = newCode || '';
});

// Lifecycle
onMounted(() => {
  window.addEventListener('message', handleMessage);
});

onUnmounted(() => {
  window.removeEventListener('message', handleMessage);
});
</script>

