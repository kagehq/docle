// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-10-01',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss'],

  // Global CSS
  css: [
    '~/assets/css/main.css'
  ],

  // Runtime config for API endpoint
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'https://api.docle.co',
      demoApiKey: process.env.NUXT_PUBLIC_DEMO_API_KEY || ''
    }
  },

  // API proxy to your Worker (for local development)
  // Note: Don't proxy /api/* because Nuxt needs it for server routes
  nitro: {
    devProxy: {
      // Proxy specific backend endpoints only
      '/backend': {
        target: 'http://localhost:8787/api',
        changeOrigin: true,
        cookieDomainRewrite: 'localhost',
        headers: {
          'accept-encoding': 'identity'
        }
      }
    },
    // Security headers
    routeRules: {
      '/**': {
        headers: {
          'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.docle.co ws://localhost:* wss://*; frame-src 'self' https://api.docle.co;",
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'SAMEORIGIN',
          'Referrer-Policy': 'strict-origin-when-cross-origin'
        }
      }
    }
  },

  app: {
    head: {
      title: 'Docle Playground',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Run untrusted code safely with Docle' }
      ]
    }
  }
})
