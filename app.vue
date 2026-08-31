<script setup lang="ts">
import type { DayPlan, ItineraryResponse, MealSelection, Recipe } from '~~/shared/types/itinerary'

const { data: countries } = await useFetch<string[]>('/api/countries')

const country = ref(countries.value?.[0] ?? '')
const town = ref('')
const days = ref(3)

const { data: towns } = await useFetch<string[]>('/api/towns', { query: { country } })

watch(towns, (available) => {
  if (town.value && !available?.includes(town.value)) town.value = ''
})

function defaultSelection(): MealSelection {
  return {
    breakfast: true,
    lunch: { starter: false, main: true, dessert: false },
    dinner: { starter: false, main: true, dessert: false }
  }
}

const daySelections = ref<MealSelection[]>(Array.from({ length: days.value }, defaultSelection))

watch(days, (count) => {
  const clamped = Math.min(Math.max(Math.round(count) || 1, 1), 60)
  if (clamped !== count) {
    days.value = clamped
    return
  }

  const current = daySelections.value
  if (clamped > current.length) {
    for (let i = current.length; i < clamped; i++) current.push(defaultSelection())
  } else {
    current.length = clamped
  }
})

const itinerary = ref<ItineraryResponse | null>(null)
const loading = ref(false)
const pdfLoading = ref(false)
const errorMessage = ref('')

async function generate() {
  if (!country.value) return

  loading.value = true
  errorMessage.value = ''
  itinerary.value = null

  try {
    itinerary.value = await $fetch<ItineraryResponse>('/api/itinerary', {
      method: 'POST',
      body: { country: country.value, town: town.value || null, days: daySelections.value }
    })
  } catch (error: any) {
    errorMessage.value = error.data?.message ?? error.statusMessage ?? 'Something went wrong generating the itinerary.'
  } finally {
    loading.value = false
  }
}

async function openPdf() {
  if (!country.value) return

  // Open the tab synchronously, inside the click's user gesture, so the
  // browser doesn't treat it as a popup once we redirect it after the
  // (async) PDF fetch below resolves.
  const pdfWindow = window.open('', '_blank')

  pdfLoading.value = true
  errorMessage.value = ''

  try {
    const blob = await $fetch<Blob>('/api/itinerary/pdf', {
      method: 'POST',
      body: { country: country.value, town: town.value || null, days: daySelections.value },
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
    errorMessage.value = error.data?.message ?? error.statusMessage ?? 'Something went wrong generating the PDF.'
  } finally {
    pdfLoading.value = false
  }
}

interface MealEntry {
  label: string
  recipe: Recipe
}

function mealEntries(day: DayPlan): MealEntry[] {
  const candidates: { label: string; recipe: Recipe | null }[] = [
    { label: 'Breakfast', recipe: day.breakfast },
    { label: 'Lunch - Starter', recipe: day.lunch.starter },
    { label: 'Lunch - Main', recipe: day.lunch.main },
    { label: 'Lunch - Dessert', recipe: day.lunch.dessert },
    { label: 'Dinner - Starter', recipe: day.dinner.starter },
    { label: 'Dinner - Main', recipe: day.dinner.main },
    { label: 'Dinner - Dessert', recipe: day.dinner.dessert }
  ]
  return candidates.filter((entry): entry is MealEntry => entry.recipe !== null)
}

function placeLabel(recipe: Recipe): string | null {
  if (recipe.location && recipe.region) return `${recipe.location}, ${recipe.region}`
  return recipe.region ?? recipe.location
}

function capitalize(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase()
}
</script>

<template>
  <div class="page">
    <NuxtRouteAnnouncer />

    <header class="hero">
      <h1>Holiday Food Itinerary</h1>
      <p>Pick a country, optionally a town for a mix of regional and national dishes, how many days you're staying, and which meals and courses you want each day.</p>
    </header>

    <form class="planner" @submit.prevent="generate">
      <div class="planner-top">
        <div class="field">
          <label for="country">Country</label>
          <select id="country" v-model="country">
            <option v-for="c in countries" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>

        <div class="field">
          <label for="town">Town</label>
          <select id="town" v-model="town">
            <option value="">Any (nationwide)</option>
            <option v-for="t in towns" :key="t" :value="t">{{ t }}</option>
          </select>
        </div>

        <div class="field">
          <label for="days">Days</label>
          <input id="days" v-model.number="days" type="number" min="1" max="60" required>
        </div>
      </div>

      <div class="day-selectors">
        <div v-for="(selection, index) in daySelections" :key="index" class="day-selector">
          <h4>Day {{ index + 1 }}</h4>

          <label class="checkbox-row">
            <input v-model="selection.breakfast" type="checkbox">
            Breakfast
          </label>

          <div class="course-group">
            <span class="course-group-label">Lunch</span>
            <label class="checkbox-row"><input v-model="selection.lunch.starter" type="checkbox"> Starter</label>
            <label class="checkbox-row"><input v-model="selection.lunch.main" type="checkbox"> Main</label>
            <label class="checkbox-row"><input v-model="selection.lunch.dessert" type="checkbox"> Dessert</label>
          </div>

          <div class="course-group">
            <span class="course-group-label">Dinner</span>
            <label class="checkbox-row"><input v-model="selection.dinner.starter" type="checkbox"> Starter</label>
            <label class="checkbox-row"><input v-model="selection.dinner.main" type="checkbox"> Main</label>
            <label class="checkbox-row"><input v-model="selection.dinner.dessert" type="checkbox"> Dessert</label>
          </div>
        </div>
      </div>

      <button type="submit" :disabled="loading">
        {{ loading ? 'Generating…' : 'Generate itinerary' }}
      </button>
    </form>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

    <section v-if="itinerary" class="results">
      <div class="results-header">
        <h2>{{ itinerary.town ? `${itinerary.town}, ${itinerary.country}` : itinerary.country }} — {{ itinerary.days }}-day trip</h2>
        <button type="button" class="pdf-button" :disabled="pdfLoading" @click="openPdf">
          {{ pdfLoading ? 'Preparing PDF…' : 'View / print PDF' }}
        </button>
      </div>

      <div class="days">
        <article v-for="day in itinerary.itinerary" :key="day.day" class="day-card">
          <h3>Day {{ day.day }}</h3>

          <p v-if="mealEntries(day).length === 0" class="meal-context">No meals selected for this day.</p>

          <div v-for="entry in mealEntries(day)" :key="entry.label" class="meal">
            <h4>{{ entry.label }}: {{ entry.recipe.name }}</h4>
            <p class="meal-meta">
              <template v-if="placeLabel(entry.recipe)">{{ placeLabel(entry.recipe) }} &middot; </template>
              <template v-if="entry.recipe.difficulty">{{ capitalize(entry.recipe.difficulty) }} &middot; </template>
              Prep {{ entry.recipe.prepTime }}m / Cook {{ entry.recipe.cookTime }}m &middot; Serves {{ entry.recipe.servings }}
            </p>
            <p v-if="entry.recipe.localContext" class="meal-context">{{ entry.recipe.localContext }}</p>
            <ul>
              <li v-for="ingredient in entry.recipe.ingredients" :key="ingredient.name">
                {{ ingredient.quantity }} {{ ingredient.unit }} {{ ingredient.name }}
              </li>
            </ul>
          </div>
        </article>
      </div>

      <div class="shopping-list">
        <h3>Shopping list</h3>
        <ul>
          <li v-for="ingredient in itinerary.shoppingList" :key="ingredient.name">
            {{ ingredient.quantity }} {{ ingredient.unit }} {{ ingredient.name }}
            <span v-if="ingredient.translatedName" class="ingredient-translation">({{ ingredient.translatedName }})</span>
          </li>
        </ul>
      </div>
    </section>
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
</style>

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

.planner {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
}

.planner-top {
  display: flex;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--muted);
}

.field select,
.field input {
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 1rem;
  min-width: 160px;
}

.field input[type='number'] {
  min-width: 90px;
}

.day-selectors {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.day-selector {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px;
  background: var(--bg);
}

.day-selector h4 {
  margin: 0 0 8px;
  color: var(--portugal-red);
  font-size: 0.9rem;
}

.checkbox-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  margin-bottom: 4px;
  cursor: pointer;
}

.course-group {
  margin-top: 8px;
  padding-left: 8px;
  border-left: 2px solid var(--border);
}

.course-group-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--portugal-green);
  margin-bottom: 4px;
}

button[type='submit'] {
  background: var(--portugal-red);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
}

button[type='submit']:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error {
  color: var(--portugal-red);
  font-weight: 600;
  margin-top: 16px;
}

.results {
  margin-top: 40px;
}

.results-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.results-header h2 {
  color: var(--portugal-red);
  margin: 0;
}

.pdf-button {
  background: var(--portugal-green);
  color: white;
  border: none;
  text-decoration: none;
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 1rem;
  white-space: nowrap;
  cursor: pointer;
}

.pdf-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.days {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}

.day-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
}

.day-card h3 {
  color: var(--portugal-red);
  margin: 0 0 12px;
}

.meal {
  margin-bottom: 12px;
}

.meal:last-child {
  margin-bottom: 0;
}

.meal h4 {
  color: var(--portugal-green);
  font-size: 0.95rem;
  margin: 0 0 4px;
}

.meal-meta {
  font-size: 0.78rem;
  color: var(--muted);
  margin: 0 0 4px;
}

.meal-context {
  font-size: 0.82rem;
  font-style: italic;
  color: var(--muted);
  margin: 0 0 8px;
}

.meal ul,
.shopping-list ul {
  margin: 0;
  padding-left: 18px;
  color: var(--ink);
}

.meal li,
.shopping-list li {
  font-size: 0.9rem;
  margin-bottom: 2px;
}

.ingredient-translation {
  color: var(--muted);
  font-style: italic;
}

.shopping-list {
  margin-top: 24px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
}

.shopping-list h3 {
  color: var(--portugal-red);
  margin: 0 0 12px;
}

.shopping-list ul {
  columns: 2;
}

@media (max-width: 480px) {
  .shopping-list ul {
    columns: 1;
  }
}
</style>
