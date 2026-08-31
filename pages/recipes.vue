<script setup lang="ts">
import type { Recipe } from '~~/shared/types/itinerary'
import { capitalize, COUNTRY, placeLabel } from '~~/composables/useItineraryPlanner'

useHead({ title: 'Explore Recipes - Tavira Recipe Maker' })

const { addingRecipeId, errorMessage, addExtraRecipe } = useItineraryPlanner()

const { data: recipes, pending, error } = await useFetch<Recipe[]>('/api/recipes', {
  query: { country: COUNTRY }
})

function mealLabel(recipe: Recipe): string {
  const meal = capitalize(recipe.mealType)
  return recipe.course ? `${meal} - ${capitalize(recipe.course)}` : meal
}

// Not every recipe necessarily has a photo - hide the image area for any that 404 rather
// than showing a broken-image icon.
const brokenImages = ref<Record<string, boolean>>({})

const printingRecipeId = ref<string | null>(null)

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

    <div v-if="recipes" class="recipes">
      <article v-for="recipe in recipes" :key="recipe.id" class="recipe-card">
        <div v-if="!brokenImages[recipe.id]" class="recipe-image-wrap">
          <img
            :src="`/api/recipes/${recipe.id}/image`"
            :alt="recipe.name"
            class="recipe-image"
            @error="brokenImages[recipe.id] = true"
          >
        </div>

        <h3>{{ recipe.name }}</h3>
        <p class="recipe-meta">
          {{ mealLabel(recipe) }}
          <template v-if="placeLabel(recipe)"> &middot; {{ placeLabel(recipe) }}</template>
          <template v-if="recipe.difficulty"> &middot; {{ capitalize(recipe.difficulty) }}</template>
          &middot; Prep {{ recipe.prepTime }}m / Cook {{ recipe.cookTime }}m &middot; Serves {{ recipe.servings }}
        </p>
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
          {{ addingRecipeId === recipe.id ? 'Adding…' : 'Add without a day' }}
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
  color: var(--portugal-red);
  font-weight: 600;
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

.recipe-card h3 {
  color: var(--portugal-red);
  margin: 0 0 4px;
}

.recipe-meta {
  font-size: 0.78rem;
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
</style>
