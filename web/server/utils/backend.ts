// Get backend URL based on environment
export function getBackendUrl(): string {
  // In production (Cloudflare Pages), use the production API
  // In development, use localhost
  if (process.env.NODE_ENV === 'production' || process.env.NUXT_PUBLIC_API_BASE) {
    return process.env.NUXT_PUBLIC_API_BASE || 'https://api.docle.co';
  }

  return 'http://localhost:8787';
}

