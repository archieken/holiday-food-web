// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  app: {
    head: {
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
      script: [{ src: 'https://accounts.google.com/gsi/client', defer: true }]
    }
  },
  runtimeConfig: {
    // Server-only: the browser never sees this, it only talks to our own /api/* routes.
    apiBase: process.env.NUXT_API_BASE || 'http://localhost:8080',
    public: {
      // Public: sent to the browser, needed for the "Sign in with Google" button.
      googleClientId: process.env.NUXT_PUBLIC_GOOGLE_CLIENT_ID || ''
    }
  }
})
