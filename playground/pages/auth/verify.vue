<script setup lang="ts">
useHead({
  title: 'Verifying - Docle'
})

const route = useRoute();
const router = useRouter();
const config = useRuntimeConfig();

// Get the token from URL
const token = route.query.token as string;

// Verify immediately on mount
onMounted(async () => {
  if (!token) {
    router.push('/login?error=notoken');
    return;
  }

  try {
    // Call backend API directly
    const apiUrl = process.client && window.location.hostname === 'localhost'
      ? `/api/auth/verify-token`  // Use Nuxt proxy in local dev
      : `${config.public.apiBase}/auth/verify?token=${encodeURIComponent(token)}`;  // Direct backend call in production

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'accept-encoding': 'identity',
        'x-nuxt-api': 'true'  // Tell backend this is an API call
      },
      credentials: 'include',
    });

    const data = await response.json();

    if (response.ok && data.success) {
      // Cookie is set by backend, redirect immediately
      router.push('/');
    } else {
      router.push('/login?error=' + (data.error || 'invalid'));
    }
  } catch (error) {
    console.error('Verification error:', error);
    router.push('/login?error=failed');
  }
});
</script>

<template>
  <div class="min-h-screen bg-black flex items-center justify-center">
    <div class="text-center">
      <div class="inline-block w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p class="text-white text-lg">Verifying your magic link...</p>
    </div>
  </div>
</template>

