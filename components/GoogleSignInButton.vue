<script setup lang="ts">
const { handleCredentialResponse, authError } = useAuth()
const config = useRuntimeConfig()
const buttonEl = ref<HTMLElement | null>(null)

let pollTimer: ReturnType<typeof setInterval> | undefined

function initialize() {
  const google = (window as any).google
  if (!google?.accounts?.id || !buttonEl.value) return

  if (!config.public.googleClientId) {
    authError.value = 'Sign-in is not configured (missing Google client id).'
    return
  }

  google.accounts.id.initialize({
    client_id: config.public.googleClientId,
    callback: (response: { credential: string }) => handleCredentialResponse(response)
  })
  google.accounts.id.renderButton(buttonEl.value, { theme: 'outline', size: 'medium', text: 'signin' })
}

onMounted(() => {
  const google = (window as any).google
  if (google?.accounts?.id) {
    initialize()
    return
  }

  // The GSI script loads with `defer`, so it may not be ready yet on first mount.
  pollTimer = setInterval(() => {
    if ((window as any).google?.accounts?.id) {
      clearInterval(pollTimer)
      initialize()
    }
  }, 200)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})
</script>

<template>
  <div ref="buttonEl" class="google-signin-button" />
</template>

<style scoped>
.google-signin-button {
  line-height: 0;
}
</style>
