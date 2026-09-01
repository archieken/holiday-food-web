<script setup lang="ts">
const open = ref(false)
const { authError } = useAuth()

function toggle() {
  open.value = !open.value
  authError.value = ''
}
</script>

<template>
  <div class="auth-menu">
    <button type="button" class="auth-toggle" @click="toggle">
      {{ open ? 'Cancel' : 'Sign in' }}
    </button>

    <div v-if="open" class="auth-panel">
      <GoogleSignInButton />
      <div class="divider"><span>or</span></div>
      <EmailAuthForm @success="open = false" />
    </div>
  </div>
</template>

<style scoped>
.auth-menu {
  position: relative;
}

.auth-toggle {
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

.auth-toggle:hover {
  background: var(--bg);
}

.auth-panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: 220px;
  padding: 14px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.divider {
  display: flex;
  align-items: center;
  width: 100%;
  color: var(--muted);
  font-size: 0.72rem;
  text-transform: uppercase;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border);
}

.divider span {
  padding: 0 8px;
}
</style>
