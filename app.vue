<template>
  <div>
    <nav class="top-nav">
      <NuxtLink to="/" class="nav-link">Plan Trip</NuxtLink>
      <NuxtLink to="/recipes" class="nav-link">Explore Recipes</NuxtLink>
      <NuxtLink to="/import-recipe" class="nav-link">Import Recipe</NuxtLink>
    </nav>
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
  justify-content: center;
  gap: 24px;
  padding: 16px 20px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
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
</style>
