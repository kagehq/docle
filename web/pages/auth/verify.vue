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
    // Always use Nuxt proxy for cookie management
    const response = await fetch(`/api/auth/verify-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ token })
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

