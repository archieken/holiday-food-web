<script setup lang="ts">
import type { Recipe } from '~~/shared/types/itinerary'
import { capitalize, COUNTRY, placeLabel } from '~~/composables/useItineraryPlanner'

useHead({ title: 'Explore Recipes - Tavira Recipe Maker' })

const { daySelections, addingRecipeId, errorMessage, addRecipe } = useItineraryPlanner()

const { data: recipes, pending, error } = await useFetch<Recipe[]>('/api/recipes', {
  query: { country: COUNTRY }
})

const selectedDay = ref<Record<string, number>>({})

function dayFor(recipe: Recipe): number {
  return selectedDay.value[recipe.id] ?? 1
}

function setDayFor(recipe: Recipe, day: number) {
  selectedDay.value[recipe.id] = day
}

function mealLabel(recipe: Recipe): string {
  const meal = capitalize(recipe.mealType)
  return recipe.course ? `${meal} - ${capitalize(recipe.course)}` : meal
}

async function handleAdd(recipe: Recipe) {
  await addRecipe(dayFor(recipe), recipe.mealType, recipe.course, recipe)
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

        <div class="add-row">
          <label>
            Day
            <select :value="dayFor(recipe)" @change="setDayFor(recipe, Number(($event.target as HTMLSelectElement).value))">
              <option v-for="(_, index) in daySelections" :key="index" :value="index + 1">{{ index + 1 }}</option>
            </select>
          </label>
          <button type="button" class="add-button" :disabled="addingRecipeId === recipe.id" @click="handleAdd(recipe)">
            {{ addingRecipeId === recipe.id ? 'Adding…' : `Add to Day ${dayFor(recipe)}` }}
          </button>
        </div>
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

.add-row {
  margin-top: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border);
}

.add-row label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  color: var(--muted);
}

.add-row select {
  padding: 4px 6px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 0.85rem;
}

.add-button {
  margin-left: auto;
  background: var(--portugal-green);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 6px 14px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
}

.add-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
