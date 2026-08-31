<script setup lang="ts">
const { loginWithEmail, registerWithEmail, authError } = useAuth()

const open = ref(false)
const mode = ref<'login' | 'register'>('login')
const email = ref('')
const password = ref('')
const name = ref('')
const submitting = ref(false)

function toggleOpen() {
  open.value = !open.value
  authError.value = ''
}

async function submit() {
  submitting.value = true
  authError.value = ''

  try {
    if (mode.value === 'login') {
      await loginWithEmail(email.value.trim(), password.value)
    } else {
      await registerWithEmail(email.value.trim(), password.value, name.value.trim())
    }
    open.value = false
    email.value = ''
    password.value = ''
    name.value = ''
  } catch (error: any) {
    authError.value = error.data?.message ?? error.statusMessage ?? 'Something went wrong signing in.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="email-auth">
    <button type="button" class="email-toggle" @click="toggleOpen">
      {{ open ? 'Cancel' : 'Sign in with email' }}
    </button>

    <form v-if="open" class="email-panel" @submit.prevent="submit">
      <div class="mode-switch">
        <button type="button" :class="{ active: mode === 'login' }" @click="mode = 'login'">Sign in</button>
        <button type="button" :class="{ active: mode === 'register' }" @click="mode = 'register'">Create account</button>
      </div>

      <input v-if="mode === 'register'" v-model="name" type="text" placeholder="Name" required autocomplete="name">
      <input v-model="email" type="email" placeholder="Email" required autocomplete="email">
      <input
        v-model="password" type="password" placeholder="Password" minlength="8" required
        :autocomplete="mode === 'register' ? 'new-password' : 'current-password'"
      >

      <button type="submit" class="submit-button" :disabled="submitting">
        {{ submitting ? 'Please wait…' : (mode === 'login' ? 'Sign in' : 'Create account') }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.email-auth {
  position: relative;
}

.email-toggle {
  background: none;
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--ink);
  cursor: pointer;
  white-space: nowrap;
}

.email-toggle:hover {
  background: var(--bg);
}

.email-panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 220px;
  padding: 14px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.mode-switch {
  display: flex;
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 4px;
}

.mode-switch button {
  flex: 1;
  background: none;
  border: none;
  padding: 6px 0;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--muted);
  cursor: pointer;
}

.mode-switch button.active {
  background: var(--portugal-red);
  color: white;
}

.email-panel input {
  padding: 7px 9px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 0.85rem;
  font-family: inherit;
}

.submit-button {
  background: var(--portugal-red);
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
}

.submit-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
