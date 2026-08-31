<script setup lang="ts">
const { user, authError, restoreFromStorage, refreshUser, signOut } = useAuth()

onMounted(async () => {
  restoreFromStorage()
  await refreshUser()
})
</script>

<template>
  <div>
    <nav class="top-nav">
      <div class="nav-links">
        <NuxtLink to="/" class="nav-link">Plan Trip</NuxtLink>
        <NuxtLink to="/recipes" class="nav-link">Explore Recipes</NuxtLink>
        <NuxtLink to="/import-recipe" class="nav-link">Import Recipe</NuxtLink>
      </div>

      <div class="account">
        <template v-if="user">
          <img v-if="user.picture" :src="user.picture" :alt="user.name ?? user.email" class="avatar">
          <span class="account-name">{{ user.name ?? user.email }}<span v-if="user.admin" class="admin-badge">Admin</span></span>
          <button type="button" class="sign-out-button" @click="signOut">Sign out</button>
        </template>
        <GoogleSignInButton v-else />
      </div>
    </nav>
    <p v-if="authError" class="auth-error">{{ authError }}</p>

    <NuxtPage />
  </div>
</template>

<style>
:root {
  --portugal-red: #da291c;
  --portugal-green: #046a38;
  --ink: #1f2328;
  --muted: #5b6570;
  --border: #e2e5e8;
  --surface: #ffffff;
  --bg: #f7f7f5;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.top-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding: 12px 20px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
}

.nav-links {
  display: flex;
  justify-content: center;
  gap: 24px;
  flex: 1;
}

.nav-link {
  color: var(--muted);
  text-decoration: none;
  font-weight: 600;
  font-size: 0.9rem;
  padding: 4px 2px;
  border-bottom: 2px solid transparent;
}

.nav-link:hover {
  color: var(--portugal-red);
}

.nav-link.router-link-exact-active {
  color: var(--portugal-red);
  border-bottom-color: var(--portugal-red);
}

.account {
  display: flex;
  align-items: center;
  gap: 8px;
}

.avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
}

.account-name {
  font-size: 0.85rem;
  color: var(--ink);
  display: flex;
  align-items: center;
  gap: 6px;
}

.admin-badge {
  background: var(--portugal-red);
  color: white;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 999px;
}

.sign-out-button {
  background: none;
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 0.78rem;
  color: var(--muted);
  cursor: pointer;
}

.sign-out-button:hover {
  background: var(--bg);
}

.auth-error {
  text-align: center;
  color: var(--portugal-red);
  font-size: 0.85rem;
  margin: 8px 0 0;
}
</style>
