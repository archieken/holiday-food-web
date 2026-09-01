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
        <template v-else>
          <GoogleSignInButton />
          <EmailAuthForm />
        </template>
      </div>
    </nav>
    <div class="azulejo-banner" aria-hidden="true" />
    <p v-if="authError" class="auth-error">{{ authError }}</p>

    <NuxtPage />
  </div>
</template>

<style>
/* One theme: blue and white. --portugal-red/--portugal-green keep their original names
   (touching every file that references them wasn't worth it) but now both resolve to
   shades of the azulejo tile blue - a primary and a secondary tone - instead of the
   red/green pair they used to hold, so headings, buttons, nav and banners all read as
   one consistent palette instead of competing accent colors. --danger and --success are
   the only non-blue colors left, reserved for the handful of places that need to mean
   something specific (errors, destructive actions, liked hearts, success confirmations)
   rather than just being decorative. */
:root {
  --portugal-red: #1b5e82;
  --portugal-green: #2f7fa4;
  --danger: #b8502a;
  --success: #2f7d6e;
  --ink: #1f2328;
  --muted: #5b6570;
  --border: #e2e5e8;
  --surface: #ffffff;
  --bg: #f7f7f5;
  --azulejo-blue: #1b5e82;
  --azulejo-bg: #eaf2f6;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
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

/* A thin strip of Portuguese "azulejo" tile pattern under the nav, on every page. */
.azulejo-banner {
  height: 18px;
  background-color: var(--azulejo-bg);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='18'%3E%3Cpath d='M12 1 L22 9 L12 17 L2 9 Z' fill='none' stroke='%231b5e82' stroke-width='1.3'/%3E%3Ccircle cx='12' cy='9' r='2' fill='%231b5e82'/%3E%3C/svg%3E");
  background-repeat: repeat-x;
  background-size: 24px 18px;
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
  color: var(--danger);
  font-size: 0.85rem;
  margin: 8px 0 0;
}
</style>
