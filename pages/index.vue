<script setup lang="ts">
import type { MealSlot, Recipe } from '~~/shared/types/itinerary'
import { capitalize, COUNTRY, mealEntries, placeLabel, slotKey, targetSlotsFor } from '~~/composables/useItineraryPlanner'

useHead({ title: 'Tavira Recipe Maker' })

const { authHeaders } = useAuth()

const {
  days,
  tripServings,
  daySelections,
  extraRecipes,
  itinerary,
  loading,
  shoppingListLoading,
  errorMessage,
  refreshingSlot,
  addingRecipeId,
  generate,
  openShoppingList,
  refreshRecipe,
  removeRecipe,
  changeServings,
  addExtraRecipe,
  removeExtraRecipe,
  assignExtraToDay
} = useItineraryPlanner()

// Catalogue used to power the "add a recipe" autofill in the extras section - fetched once,
// filtered client-side as the user types.
const { data: allRecipes } = await useFetch<Recipe[]>('/api/recipes', {
  query: { country: COUNTRY },
  headers: authHeaders()
})

const extraSearchQuery = ref('')

const extraSearchResults = computed(() => {
  const query = extraSearchQuery.value.trim().toLowerCase()
  if (!query) return []

  const alreadyExtra = new Set(extraRecipes.value.map((extra) => extra.recipeId))
  return (allRecipes.value ?? [])
    .filter((recipe) => recipe.name.toLowerCase().includes(query) && !alreadyExtra.has(recipe.id))
    .slice(0, 8)
})

function pickExtraSearchResult(recipe: Recipe) {
  addExtraRecipe(recipe)
  extraSearchQuery.value = ''
}

// Which day an extra recipe's "Add to Day" selector is currently pointed at.
const extraRecipeDay = ref<Record<string, number>>({})

function dayForExtra(recipe: Recipe): number {
  return extraRecipeDay.value[recipe.id] ?? 1
}

function setDayForExtra(recipe: Recipe, day: number) {
  extraRecipeDay.value[recipe.id] = day
}

// Which meal slot an extra recipe's selector is pointed at - only meaningful for a
// Main-course recipe, since it can go into either Lunch or Dinner.
const extraRecipeSlot = ref<Record<string, MealSlot>>({})

function slotForExtra(recipe: Recipe): MealSlot | null {
  const options = targetSlotsFor(recipe)
  if (options.length === 0) return null
  return extraRecipeSlot.value[recipe.id] ?? options[0]
}

function setSlotForExtra(recipe: Recipe, slot: MealSlot) {
  extraRecipeSlot.value[recipe.id] = slot
}
</script>

<template>
  <div class="page">
    <NuxtRouteAnnouncer />

    <header class="hero">
      <h1>Tavira Recipe Maker</h1>
      <p>Pick how many days you're staying and how many people you're cooking for, then choose which meals you want each day.</p>
    </header>

    <form class="planner" @submit.prevent="generate">
      <div class="planner-top">
        <div class="field">
          <label for="days">Days</label>
          <input id="days" v-model.number="days" type="number" min="1" max="60" required>
        </div>

        <div class="field">
          <label for="servings">Servings</label>
          <select id="servings" v-model.number="tripServings" required>
            <option :value="2">2</option>
            <option :value="4">4</option>
            <option :value="6">6</option>
          </select>
        </div>
      </div>
      <p class="servings-trip-hint">Sets Breakfast, Lunch and Dinner for every day - you can adjust or remove individual meals once your itinerary is generated.</p>

      <button type="submit" :disabled="loading">
        {{ loading ? 'Generating…' : 'Generate itinerary' }}
      </button>
    </form>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

    <section v-if="itinerary" class="results">
      <div class="results-header">
        <h2>{{ itinerary.days }}-day trip</h2>
        <button type="button" class="pdf-button" :disabled="shoppingListLoading" @click="openShoppingList">
          {{ shoppingListLoading ? 'Preparing…' : 'Open shopping list' }}
        </button>
      </div>

      <div class="days">
        <article v-for="day in itinerary.itinerary" :key="day.day" class="day-card">
          <h3>Day {{ day.day }}</h3>

          <p v-if="mealEntries(day).length === 0" class="meal-context">No meals selected for this day.</p>

          <div v-for="entry in mealEntries(day)" :key="entry.label" class="meal">
            <div class="meal-heading-row">
              <h4>{{ entry.label }}: {{ entry.recipe.name }}</h4>
              <div class="meal-actions">
                <button
                  type="button" class="refresh-button"
                  :disabled="refreshingSlot === slotKey(day.day, entry.slot)"
                  @click="refreshRecipe(day.day, entry)"
                >
                  {{ refreshingSlot === slotKey(day.day, entry.slot) ? 'Refreshing…' : 'Try another' }}
                </button>
                <button
                  type="button" class="remove-button"
                  :disabled="refreshingSlot === slotKey(day.day, entry.slot)"
                  @click="removeRecipe(day.day, entry)"
                >
                  Remove
                </button>
              </div>
            </div>
            <p class="meal-meta">
              <template v-if="placeLabel(entry.recipe)">{{ placeLabel(entry.recipe) }} &middot; </template>
              <template v-if="entry.recipe.difficulty">{{ capitalize(entry.recipe.difficulty) }} &middot; </template>
              Prep {{ entry.recipe.prepTime }}m / Cook {{ entry.recipe.cookTime }}m &middot;
              Serves
              <select
                class="meal-servings-select"
                :value="entry.recipe.servings"
                :disabled="refreshingSlot === slotKey(day.day, entry.slot)"
                @change="changeServings(day.day, entry, Number(($event.target as HTMLSelectElement).value))"
              >
                <option :value="2">2</option>
                <option :value="4">4</option>
                <option :value="6">6</option>
              </select>
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

      <div class="extras">
        <h3>Extra recipes <span class="extras-hint">(added without a day)</span></h3>

        <div class="extra-search">
          <input
            v-model="extraSearchQuery" type="text" placeholder="Add a recipe by name…"
            class="extra-search-input"
          >
          <ul v-if="extraSearchResults.length" class="extra-search-results">
            <li v-for="recipe in extraSearchResults" :key="recipe.id">
              <button type="button" class="extra-search-result" @click="pickExtraSearchResult(recipe)">
                {{ recipe.name }}
              </button>
            </li>
          </ul>
          <p v-else-if="extraSearchQuery.trim()" class="empty-hint">No recipes match "{{ extraSearchQuery }}".</p>
        </div>

        <p v-if="itinerary.extras.length === 0" class="meal-context">No extra recipes yet - search above to add one.</p>
        <ul v-else>
          <li v-for="recipe in itinerary.extras" :key="recipe.id" class="extra-item">
            <span>{{ recipe.name }} <span class="meal-meta">&middot; Serves {{ recipe.servings }}</span></span>
            <div class="extra-actions">
              <template v-if="targetSlotsFor(recipe).length > 0">
                <label class="day-picker">
                  Day
                  <select
                    :value="dayForExtra(recipe)"
                    @change="setDayForExtra(recipe, Number(($event.target as HTMLSelectElement).value))"
                  >
                    <option v-for="(_, index) in daySelections" :key="index" :value="index + 1">{{ index + 1 }}</option>
                  </select>
                </label>
                <label v-if="targetSlotsFor(recipe).length > 1" class="day-picker">
                  Meal
                  <select
                    :value="slotForExtra(recipe)"
                    @change="setSlotForExtra(recipe, ($event.target as HTMLSelectElement).value as MealSlot)"
                  >
                    <option v-for="slot in targetSlotsFor(recipe)" :key="slot" :value="slot">{{ capitalize(slot) }}</option>
                  </select>
                </label>
                <button
                  type="button" class="assign-button"
                  :disabled="addingRecipeId === recipe.id"
                  @click="assignExtraToDay(recipe, dayForExtra(recipe), slotForExtra(recipe)!)"
                >
                  {{ addingRecipeId === recipe.id ? 'Adding…' : `Add to Day ${dayForExtra(recipe)}` }}
                </button>
              </template>
              <span v-else class="meal-meta">Starters aren't scheduled into a day.</span>
              <button
                type="button" class="remove-extra-button"
                :disabled="addingRecipeId === recipe.id"
                @click="removeExtraRecipe(recipe.id)"
              >
                Remove
              </button>
            </div>
          </li>
        </ul>
      </div>

    </section>
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
  margin-bottom: 8px;
}

.servings-trip-hint {
  margin: 0 0 16px;
  font-size: 0.78rem;
  color: var(--muted);
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

.field input,
.field select {
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 1rem;
  min-width: 160px;
}

.field input[type='number'],
.field select {
  min-width: 90px;
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
  margin: 0;
}

.meal-heading-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin: 0 0 4px;
}

.meal-actions {
  display: flex;
  flex-shrink: 0;
  gap: 6px;
}

.remove-button {
  flex-shrink: 0;
  background: none;
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 2px 8px;
  font-size: 0.7rem;
  color: var(--portugal-red);
  cursor: pointer;
}

.remove-button:hover:not(:disabled) {
  background: var(--bg);
}

.remove-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.refresh-button {
  flex-shrink: 0;
  background: none;
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 2px 8px;
  font-size: 0.7rem;
  color: var(--portugal-green);
  cursor: pointer;
}

.refresh-button:hover:not(:disabled) {
  background: var(--bg);
}

.refresh-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.meal-meta {
  font-size: 0.78rem;
  color: var(--muted);
  margin: 0 0 4px;
}

.meal-servings-select {
  padding: 1px 4px;
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 0.78rem;
  color: var(--muted);
  background: var(--surface);
}

.meal-servings-select:disabled {
  opacity: 0.6;
}

.meal-context {
  font-size: 0.82rem;
  font-style: italic;
  color: var(--muted);
  margin: 0 0 8px;
}

.meal ul {
  margin: 0;
  padding-left: 18px;
  color: var(--ink);
}

.meal li {
  font-size: 0.9rem;
  margin-bottom: 2px;
}

.extras {
  margin-top: 24px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
}

.extras h3 {
  color: var(--portugal-red);
  margin: 0 0 12px;
}

.extras-hint {
  color: var(--muted);
  font-weight: 400;
  font-size: 0.8rem;
}

.extra-search {
  position: relative;
  margin-bottom: 16px;
}

.extra-search-input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 0.9rem;
}

.extra-search-results {
  position: absolute;
  z-index: 1;
  top: 100%;
  left: 0;
  right: 0;
  margin: 4px 0 0;
  padding: 4px;
  list-style: none;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  max-height: 220px;
  overflow-y: auto;
}

.extra-search-result {
  display: block;
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 0.85rem;
  color: var(--ink);
  cursor: pointer;
}

.extra-search-result:hover {
  background: var(--bg);
}

.empty-hint {
  font-size: 0.82rem;
  color: var(--muted);
  font-style: italic;
  margin: 0;
}

.extras ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.extra-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
  font-size: 0.9rem;
}

.extra-item:last-child {
  border-bottom: none;
}

.extra-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.day-picker {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  color: var(--muted);
}

.day-picker select {
  padding: 4px 6px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 0.85rem;
}

.assign-button {
  background: var(--portugal-green);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 6px 14px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
}

.assign-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.remove-extra-button {
  flex-shrink: 0;
  background: none;
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 2px 10px;
  font-size: 0.78rem;
  color: var(--portugal-red);
  cursor: pointer;
}

.remove-extra-button:hover:not(:disabled) {
  background: var(--bg);
}

.remove-extra-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
