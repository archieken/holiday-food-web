// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  runtimeConfig: {
    // Server-only: the browser never sees this, it only talks to our own /api/* routes.
    apiBase: process.env.NUXT_API_BASE || 'http://localhost:8080'
  }
})
