<script setup lang="ts">
import type { Recipe } from '~~/shared/types/itinerary'
import { capitalize, COUNTRY, placeLabel } from '~~/composables/useItineraryPlanner'

useHead({ title: 'Explore Recipes - Tavira Recipe Maker' })

const { addingRecipeId, errorMessage, addExtraRecipe } = useItineraryPlanner()
const { user, authHeaders } = useAuth()

const { data: recipes, pending, error } = await useFetch<Recipe[]>('/api/recipes', {
  query: { country: COUNTRY },
  headers: authHeaders()
})

const deletingRecipeId = ref<string | null>(null)
const likingRecipeId = ref<string | null>(null)

async function deleteRecipe(recipe: Recipe) {
  if (!confirm(`Delete "${recipe.name}"? This can't be undone.`)) return

  deletingRecipeId.value = recipe.id
  errorMessage.value = ''

  try {
    await $fetch(`/api/recipes/${recipe.id}`, { method: 'DELETE', headers: authHeaders() })
    recipes.value = recipes.value?.filter((r) => r.id !== recipe.id) ?? null
  } catch (error: any) {
    errorMessage.value = error.data?.message ?? error.statusMessage ?? 'Something went wrong deleting that recipe.'
  } finally {
    deletingRecipeId.value = null
  }
}

function mealLabel(recipe: Recipe): string {
  return capitalize(recipe.course)
}

function uploaderLabel(recipe: Recipe): string {
  return recipe.createdByName ?? recipe.createdByEmail ?? 'Tavira Recipe Maker'
}

const typeFilter = ref('all')
const uploaderFilter = ref('all')
const sortBy = ref<'default' | 'mostLiked'>('default')

const typeOptions = computed(() => {
  const labels = new Set((recipes.value ?? []).map((recipe) => mealLabel(recipe)))
  return [...labels].sort()
})

const uploaderOptions = computed(() => {
  const labels = new Set((recipes.value ?? []).map((recipe) => uploaderLabel(recipe)))
  return [...labels].sort()
})

const visibleRecipes = computed(() => {
  let list = recipes.value ?? []

  if (typeFilter.value !== 'all') {
    list = list.filter((recipe) => mealLabel(recipe) === typeFilter.value)
  }
  if (uploaderFilter.value !== 'all') {
    list = list.filter((recipe) => uploaderLabel(recipe) === uploaderFilter.value)
  }
  if (sortBy.value === 'mostLiked') {
    list = [...list].sort((a, b) => b.likeCount - a.likeCount)
  }

  return list
})

async function toggleLike(recipe: Recipe) {
  if (!user.value) {
    errorMessage.value = 'Sign in to like a recipe.'
    return
  }

  likingRecipeId.value = recipe.id
  errorMessage.value = ''

  try {
    const status = await $fetch<{ likeCount: number; likedByMe: boolean }>(`/api/recipes/${recipe.id}/like`, {
      method: recipe.likedByMe ? 'DELETE' : 'POST',
      headers: authHeaders()
    })
    recipe.likeCount = status.likeCount
    recipe.likedByMe = status.likedByMe
  } catch (error: any) {
    errorMessage.value = error.data?.message ?? error.statusMessage ?? 'Something went wrong updating that like.'
  } finally {
    likingRecipeId.value = null
  }
}

const PLACEHOLDER_IMAGE = '/images/recipe-placeholder.svg'

// Every card starts on the placeholder and only switches to the real photo once mounted,
// so each @error listener below is guaranteed to be attached before the browser can
// finish (or fail) loading it - attaching it any earlier risks losing a fast 404 to the
// SSR/hydration race, since the server-rendered <img> would otherwise start loading
// immediately. Not every recipe necessarily has a photo, so some stay on the placeholder.
const imageSrcs = ref<Record<string, string>>({})

function imageSrcFor(recipeId: string): string {
  return imageSrcs.value[recipeId] ?? PLACEHOLDER_IMAGE
}

function onImageError(recipeId: string) {
  imageSrcs.value[recipeId] = PLACEHOLDER_IMAGE
}

onMounted(() => {
  for (const recipe of recipes.value ?? []) {
    imageSrcs.value[recipe.id] = `/api/recipes/${recipe.id}/image`
  }
})

const printingRecipeId = ref<string | null>(null)
const printingAllRecipes = ref(false)

/** Admin-only: every recipe in the catalogue as one PDF, with a numbered index up front. */
async function printAllRecipes() {
  const pdfWindow = window.open('', '_blank')

  printingAllRecipes.value = true
  errorMessage.value = ''

  try {
    const blob = await $fetch<Blob>('/api/recipes/pdf', {
      query: { country: COUNTRY },
      headers: authHeaders(),
      responseType: 'blob'
    })
    const url = URL.createObjectURL(blob)
    if (pdfWindow) {
      pdfWindow.location.href = url
    } else {
      window.location.href = url
    }
  } catch (error: any) {
    pdfWindow?.close()
    errorMessage.value = error.data?.message ?? error.statusMessage ?? 'Something went wrong generating the recipe catalogue PDF.'
  } finally {
    printingAllRecipes.value = false
  }
}

async function printRecipe(recipe: Recipe) {
  // Open the tab synchronously, inside the click's user gesture, so the
  // browser doesn't treat it as a popup once we redirect it after the
  // (async) PDF fetch below resolves.
  const pdfWindow = window.open('', '_blank')

  printingRecipeId.value = recipe.id
  errorMessage.value = ''

  try {
    const blob = await $fetch<Blob>(`/api/recipes/${recipe.id}/pdf`, { responseType: 'blob' })
    const url = URL.createObjectURL(blob)
    if (pdfWindow) {
      pdfWindow.location.href = url
    } else {
      window.location.href = url
    }
  } catch (error: any) {
    pdfWindow?.close()
    errorMessage.value = error.data?.message ?? error.statusMessage ?? 'Something went wrong generating the recipe PDF.'
  } finally {
    printingRecipeId.value = null
  }
}
</script>

<template>
  <div class="page">
    <NuxtRouteAnnouncer />

    <header class="hero">
      <h1>Explore Recipes</h1>
      <p>Browse every recipe in the catalogue and add any of them straight into your itinerary.</p>
    </header>

    <p v-if="pending" class="status">Loading recipes…</p>
    <p v-else-if="error" class="error">Something went wrong loading the recipes.</p>
    <p v-else-if="errorMessage" class="error">{{ errorMessage }}</p>

    <div v-if="recipes" class="filters">
      <label class="filter">
        <span>Type</span>
        <select v-model="typeFilter">
          <option value="all">All</option>
          <option v-for="option in typeOptions" :key="option" :value="option">{{ option }}</option>
        </select>
      </label>

      <label class="filter">
        <span>Uploaded by</span>
        <select v-model="uploaderFilter">
          <option value="all">Anyone</option>
          <option v-for="option in uploaderOptions" :key="option" :value="option">{{ option }}</option>
        </select>
      </label>

      <label class="filter">
        <span>Sort</span>
        <select v-model="sortBy">
          <option value="default">Default order</option>
          <option value="mostLiked">Most liked</option>
        </select>
      </label>

      <button
        v-if="user?.admin"
        type="button" class="print-all-button"
        :disabled="printingAllRecipes"
        @click="printAllRecipes"
      >
        {{ printingAllRecipes ? 'Preparing…' : 'Print all recipes' }}
      </button>
    </div>

    <div v-if="recipes" class="recipes">
      <article v-for="recipe in visibleRecipes" :key="recipe.id" class="recipe-card">
        <NuxtLink :to="`/recipes/${recipe.id}`" class="recipe-link">
          <div class="recipe-image-wrap">
            <img
              :src="imageSrcFor(recipe.id)"
              :alt="recipe.name"
              class="recipe-image"
              @error="onImageError(recipe.id)"
            >
          </div>
        </NuxtLink>

        <div class="title-row">
          <h3><NuxtLink :to="`/recipes/${recipe.id}`" class="recipe-link">{{ recipe.name }}</NuxtLink></h3>
          <button
            type="button" class="like-button" :class="{ liked: recipe.likedByMe }"
            :disabled="likingRecipeId === recipe.id"
            @click="toggleLike(recipe)"
          >
            {{ recipe.likedByMe ? '♥' : '♡' }} {{ recipe.likeCount }}
          </button>
        </div>
        <p class="recipe-meta">
          {{ mealLabel(recipe) }}
          <template v-if="placeLabel(recipe)"> &middot; {{ placeLabel(recipe) }}</template>
          <template v-if="recipe.difficulty"> &middot; {{ capitalize(recipe.difficulty) }}</template>
          &middot; Prep {{ recipe.prepTime }}m / Cook {{ recipe.cookTime }}m &middot; Serves {{ recipe.servings }}
        </p>
        <p class="recipe-uploader">Uploaded by {{ uploaderLabel(recipe) }}</p>
        <p v-if="recipe.localContext" class="recipe-context">{{ recipe.localContext }}</p>

        <details class="recipe-details">
          <summary>Ingredients &amp; instructions</summary>
          <ul class="recipe-ingredients">
            <li v-for="ingredient in recipe.ingredients" :key="ingredient.name">
              {{ ingredient.quantity }} {{ ingredient.unit }} {{ ingredient.name }}
              <span v-if="ingredient.translatedName" class="ingredient-translation">({{ ingredient.translatedName }})</span>
            </li>
          </ul>
          <ol class="recipe-instructions">
            <li v-for="(step, index) in recipe.instructions" :key="index">{{ step }}</li>
          </ol>
        </details>

        <div class="print-row">
          <button type="button" class="print-button" :disabled="printingRecipeId === recipe.id" @click="printRecipe(recipe)">
            {{ printingRecipeId === recipe.id ? 'Preparing…' : 'Print recipe' }}
          </button>
        </div>

        <button
          type="button" class="add-extra-button"
          :disabled="addingRecipeId === recipe.id"
          @click="addExtraRecipe(recipe)"
        >
          {{ addingRecipeId === recipe.id ? 'Adding…' : 'Add to Itinerary' }}
        </button>

        <button
          v-if="user?.admin"
          type="button" class="delete-button"
          :disabled="deletingRecipeId === recipe.id"
          @click="deleteRecipe(recipe)"
        >
          {{ deletingRecipeId === recipe.id ? 'Deleting…' : 'Delete recipe' }}
        </button>
      </article>
    </div>
  </div>
</template>

<style scoped>
.page {
  max-width: 960px;
  margin: 0 auto;
  padding: 40px 20px 80px;
}

.hero {
  text-align: center;
  margin-bottom: 32px;
}

.hero h1 {
  color: var(--portugal-red);
  font-size: 2rem;
  margin-bottom: 8px;
}

.hero p {
  color: var(--muted);
  margin: 0;
}

.status {
  color: var(--muted);
}

.error {
  color: var(--danger);
  font-weight: 600;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 24px;
  padding: 12px 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
}

.filter {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: var(--muted);
}

.filter select {
  padding: 5px 8px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 0.85rem;
  color: var(--ink);
}

.print-all-button {
  margin-left: auto;
  align-self: center;
  background: none;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 6px 14px;
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--portugal-green);
  cursor: pointer;
}

.print-all-button:hover:not(:disabled) {
  background: var(--bg);
}

.print-all-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.recipes {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.recipe-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.recipe-image-wrap {
  margin: -16px -16px 12px;
  border-radius: 12px 12px 0 0;
  overflow: hidden;
}

.recipe-image {
  display: block;
  width: 100%;
  height: 160px;
  object-fit: cover;
}

.title-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin: 0 0 4px;
}

.recipe-card h3 {
  color: var(--portugal-red);
  margin: 0;
}

.recipe-link {
  display: block;
  color: inherit;
  text-decoration: none;
}

.recipe-link:hover {
  text-decoration: underline;
}

.like-button {
  flex-shrink: 0;
  background: none;
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 2px 10px;
  font-size: 0.8rem;
  color: var(--muted);
  cursor: pointer;
}

.like-button.liked {
  color: var(--danger);
  border-color: var(--danger);
}

.like-button:hover:not(:disabled) {
  background: var(--bg);
}

.like-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.recipe-meta {
  font-size: 0.78rem;
  color: var(--muted);
  margin: 0 0 4px;
}

.recipe-uploader {
  font-size: 0.75rem;
  color: var(--muted);
  margin: 0 0 8px;
}

.recipe-context {
  font-size: 0.82rem;
  font-style: italic;
  color: var(--muted);
  margin: 0 0 8px;
}

.recipe-details {
  margin-bottom: 12px;
}

.recipe-details summary {
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--portugal-green);
}

.recipe-ingredients {
  margin: 8px 0;
  padding-left: 18px;
  color: var(--ink);
}

.recipe-ingredients li,
.recipe-instructions li {
  font-size: 0.85rem;
  margin-bottom: 2px;
}

.recipe-instructions {
  margin: 8px 0 0;
  padding-left: 18px;
  color: var(--ink);
}

.ingredient-translation {
  color: var(--muted);
  font-style: italic;
}

.print-row {
  margin-top: auto;
  padding-top: 8px;
}

.print-button {
  width: 100%;
  background: none;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 6px 14px;
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--portugal-green);
  cursor: pointer;
}

.print-button:hover:not(:disabled) {
  background: var(--bg);
}

.print-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.add-extra-button {
  width: 100%;
  margin-top: 8px;
  background: none;
  border: 1px dashed var(--border);
  border-radius: 8px;
  padding: 6px 14px;
  font-weight: 600;
  font-size: 0.8rem;
  color: var(--muted);
  cursor: pointer;
}

.add-extra-button:hover:not(:disabled) {
  background: var(--bg);
  color: var(--portugal-green);
}

.add-extra-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.delete-button {
  width: 100%;
  margin-top: 8px;
  background: none;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 6px 14px;
  font-weight: 600;
  font-size: 0.8rem;
  color: var(--portugal-red);
  cursor: pointer;
}

.delete-button:hover:not(:disabled) {
  background: var(--bg);
}

.delete-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
