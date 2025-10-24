// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-10-01',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss'],
  
  // API proxy to your Worker
  nitro: {
    devProxy: {
      '/api': {
        target: 'http://localhost:8787/api',
        changeOrigin: true,
        headers: {
          // Prevent gzip/br compression so the dev proxy doesn't strip encoding metadata
          'accept-encoding': 'identity'
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
