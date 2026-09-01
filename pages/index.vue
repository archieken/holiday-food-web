<script setup lang="ts">
import type { MealSlot, Recipe } from '~~/shared/types/itinerary'
import { capitalize, COUNTRY, type MealEntry, mealEntries, placeLabel, recipeForSlot, slotKey, targetSlotsFor } from '~~/composables/useItineraryPlanner'

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

// Whether assigning this extra to its currently-picked day/slot would bump an existing
// meal out to the extras list, rather than just filling an empty one.
function willSwap(recipe: Recipe): boolean {
  const day = itinerary.value?.itinerary.find((d) => d.day === dayForExtra(recipe))
  const slot = slotForExtra(recipe)
  if (!day || !slot) return false

  const occupant = recipeForSlot(day, slot)
  return occupant !== null && occupant.id !== recipe.id
}

const PLACEHOLDER_IMAGE = '/images/recipe-placeholder.svg'

// The itinerary is only ever populated client-side (in response to a button click), so
// unlike the recipe browsing pages there's no SSR/hydration race to guard against here -
// it's safe to point straight at the real photo and only fall back once it 404s.
const mealImageSrcs = ref<Record<string, string>>({})

function mealImageSrcFor(recipeId: string): string {
  return mealImageSrcs.value[recipeId] ?? `/api/recipes/${recipeId}/image`
}

function onMealImageError(recipeId: string) {
  mealImageSrcs.value[recipeId] = PLACEHOLDER_IMAGE
}

/** Every (day, slot) a recipe id currently fills, keyed by recipe id - used to flag when
 * the same dish has been planned more than once across the trip. */
const recipeOccurrences = computed(() => {
  const map: Record<string, { day: number, label: string }[]> = {}
  if (!itinerary.value) return map

  for (const day of itinerary.value.itinerary) {
    for (const entry of mealEntries(day)) {
      const occurrences = map[entry.recipe.id] ?? (map[entry.recipe.id] = [])
      occurrences.push({ day: day.day, label: entry.label })
    }
  }
  return map
})

/** A human-readable "also planned for Day X, <meal>" note, or null if this meal's recipe is unique to the trip. */
function duplicateNote(day: number, entry: MealEntry): string | null {
  const others = (recipeOccurrences.value[entry.recipe.id] ?? [])
    .filter((occurrence) => !(occurrence.day === day && occurrence.label === entry.label))
  if (others.length === 0) return null
  return others.map((occurrence) => `Day ${occurrence.day} ${occurrence.label.toLowerCase()}`).join(', ')
}

const openIngredients = ref<Record<string, boolean>>({})

function toggleIngredients(key: string) {
  openIngredients.value[key] = !openIngredients.value[key]
}

const SERVINGS_OPTIONS = [2, 4, 6]

function stepServings(dayNumber: number, entry: MealEntry, direction: 1 | -1) {
  const currentIndex = SERVINGS_OPTIONS.indexOf(entry.recipe.servings)
  const nextIndex = Math.min(Math.max((currentIndex === -1 ? 0 : currentIndex) + direction, 0), SERVINGS_OPTIONS.length - 1)
  const nextServings = SERVINGS_OPTIONS[nextIndex]
  if (nextServings !== entry.recipe.servings) {
    changeServings(dayNumber, entry, nextServings)
  }
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
          <label for="servings">People</label>
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
        <article v-for="day in itinerary.itinerary" :key="day.day" class="day-band">
          <div class="day-banner">
            <h3>Day {{ day.day }}</h3>
          </div>

          <p v-if="mealEntries(day).length === 0" class="meal-context day-empty">No meals selected for this day.</p>

          <div v-for="entry in mealEntries(day)" :key="entry.label" class="meal-strip">
            <div class="meal-photo">
              <img
                :src="mealImageSrcFor(entry.recipe.id)"
                :alt="entry.recipe.name"
                @error="onMealImageError(entry.recipe.id)"
              >
            </div>

            <div class="meal-main">
              <span class="meal-slot">{{ entry.label }}</span>
              <NuxtLink :to="`/recipes/${entry.recipe.id}`" class="meal-name">{{ entry.recipe.name }}</NuxtLink>
              <p class="meal-meta">
                <template v-if="placeLabel(entry.recipe)">{{ placeLabel(entry.recipe) }} &middot; </template>
                <template v-if="entry.recipe.difficulty">{{ capitalize(entry.recipe.difficulty) }} &middot; </template>
                Prep {{ entry.recipe.prepTime }}m / Cook {{ entry.recipe.cookTime }}m
              </p>
              <p v-if="duplicateNote(day.day, entry)" class="dup-note">&#8635; Also planned for {{ duplicateNote(day.day, entry) }}</p>
              <p v-if="entry.recipe.localContext" class="meal-blurb">{{ entry.recipe.localContext }}</p>
              <button type="button" class="ing-toggle" @click="toggleIngredients(slotKey(day.day, entry.slot))">
                {{ openIngredients[slotKey(day.day, entry.slot)] ? '▾ Hide' : '▸ View' }} ingredients ({{ entry.recipe.ingredients.length }})
              </button>
              <ul v-if="openIngredients[slotKey(day.day, entry.slot)]" class="ing-list">
                <li v-for="ingredient in entry.recipe.ingredients" :key="ingredient.name">
                  {{ ingredient.quantity }} {{ ingredient.unit }} {{ ingredient.name }}
                </li>
              </ul>
            </div>

            <div class="meal-side">
              <div class="stepper">
                <button
                  type="button"
                  :disabled="refreshingSlot === slotKey(day.day, entry.slot) || entry.recipe.servings <= SERVINGS_OPTIONS[0]"
                  @click="stepServings(day.day, entry, -1)"
                >
                  &minus;
                </button>
                <span class="stepper-val">Serves {{ entry.recipe.servings }}</span>
                <button
                  type="button"
                  :disabled="refreshingSlot === slotKey(day.day, entry.slot) || entry.recipe.servings >= SERVINGS_OPTIONS[SERVINGS_OPTIONS.length - 1]"
                  @click="stepServings(day.day, entry, 1)"
                >
                  +
                </button>
              </div>

              <div class="icon-actions">
                <button
                  type="button" class="icon-btn"
                  :class="{ spinning: refreshingSlot === slotKey(day.day, entry.slot) }"
                  :disabled="refreshingSlot === slotKey(day.day, entry.slot)"
                  :aria-label="refreshingSlot === slotKey(day.day, entry.slot) ? 'Refreshing…' : 'Try another recipe'"
                  :title="refreshingSlot === slotKey(day.day, entry.slot) ? 'Refreshing…' : 'Try another'"
                  @click="refreshRecipe(day.day, entry)"
                >
                  &#8635;
                </button>
                <button
                  type="button" class="icon-btn danger"
                  :disabled="refreshingSlot === slotKey(day.day, entry.slot)"
                  aria-label="Remove meal"
                  title="Remove"
                  @click="removeRecipe(day.day, entry)"
                >
                  &#10005;
                </button>
              </div>
            </div>
          </div>
        </article>
      </div>

      <div class="extras">
        <h3>Extras <span class="extras-hint">&middot; unscheduled</span></h3>

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
              <span v-if="targetSlotsFor(recipe).length > 0" class="sentence-pill">
                {{ willSwap(recipe) ? 'Switch' : 'Add to' }}
                <select
                  :value="dayForExtra(recipe)"
                  aria-label="Day"
                  @change="setDayForExtra(recipe, Number(($event.target as HTMLSelectElement).value))"
                >
                  <option v-for="(_, index) in daySelections" :key="index" :value="index + 1">Day {{ index + 1 }}</option>
                </select>
                <select
                  v-if="targetSlotsFor(recipe).length > 1"
                  :value="slotForExtra(recipe)"
                  aria-label="Meal"
                  @change="setSlotForExtra(recipe, ($event.target as HTMLSelectElement).value as MealSlot)"
                >
                  <option v-for="slot in targetSlotsFor(recipe)" :key="slot" :value="slot">{{ capitalize(slot) }}</option>
                </select>
                <button
                  type="button" class="pill-confirm"
                  :disabled="addingRecipeId === recipe.id"
                  :aria-label="`${willSwap(recipe) ? 'Switch with' : 'Add to'} Day ${dayForExtra(recipe)}`"
                  :title="willSwap(recipe) ? 'Switch' : 'Add'"
                  @click="assignExtraToDay(recipe, dayForExtra(recipe), slotForExtra(recipe)!)"
                >
                  {{ addingRecipeId === recipe.id ? '…' : (willSwap(recipe) ? '⇄' : '→') }}
                </button>
              </span>
              <span v-else class="meal-meta">Not tied to a day</span>
              <button
                type="button" class="remove-extra-button"
                :disabled="addingRecipeId === recipe.id"
                :aria-label="`Remove ${recipe.name}`"
                title="Remove"
                @click="removeExtraRecipe(recipe.id)"
              >
                &#10005;
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
  color: var(--danger);
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
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.day-band {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
}

.day-banner {
  background: linear-gradient(120deg, var(--azulejo-blue), #24799e);
  color: white;
  padding: 10px 16px;
}

.day-banner h3 {
  margin: 0;
  font-size: 1.05rem;
}

.day-empty {
  padding: 16px;
}

.meal-strip {
  display: flex;
  gap: 16px;
  padding: 16px;
}

.meal-strip + .meal-strip {
  border-top: 1px solid var(--border);
}

.meal-photo {
  flex: 0 0 96px;
  width: 96px;
  height: 96px;
  border-radius: 10px;
  overflow: hidden;
  background: var(--azulejo-bg);
}

.meal-photo img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.meal-main {
  flex: 1;
  min-width: 0;
}

.meal-slot {
  display: block;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--portugal-green);
  font-weight: 700;
}

.meal-name {
  display: block;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--ink);
  text-decoration: none;
  margin: 2px 0 1px;
}

.meal-name:hover {
  color: var(--portugal-red);
}

.meal-meta {
  font-size: 0.8rem;
  color: var(--muted);
  margin: 0;
}

.dup-note {
  font-size: 0.75rem;
  color: var(--portugal-red);
  font-weight: 600;
  margin: 4px 0 0;
}

.meal-blurb {
  font-size: 0.8rem;
  color: var(--muted);
  font-style: italic;
  margin: 6px 0 0;
  line-height: 1.4;
}

.ing-toggle {
  display: block;
  margin: 8px 0 0;
  padding: 0;
  background: none;
  border: none;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--azulejo-blue);
  cursor: pointer;
}

.ing-list {
  margin: 6px 0 0;
  padding: 8px 10px;
  background: var(--bg);
  border-radius: 6px;
  list-style-position: inside;
  color: var(--ink);
}

.ing-list li {
  font-size: 0.85rem;
  margin-bottom: 2px;
}

.meal-context {
  font-size: 0.82rem;
  font-style: italic;
  color: var(--muted);
  margin: 0;
}

.meal-side {
  flex: 0 0 150px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.stepper {
  display: flex;
  align-items: center;
  border: 1px solid var(--border);
  border-radius: 999px;
  overflow: hidden;
}

.stepper button {
  width: 24px;
  height: 24px;
  border: none;
  background: var(--bg);
  color: var(--ink);
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
}

.stepper button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.stepper-val {
  padding: 0 8px;
  font-size: 0.78rem;
  font-weight: 600;
  white-space: nowrap;
}

.icon-actions {
  display: flex;
  gap: 6px;
}

.icon-btn {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  color: var(--azulejo-blue);
  font-size: 0.85rem;
  line-height: 1;
  cursor: pointer;
}

.icon-btn:hover:not(:disabled) {
  background: var(--bg);
}

.icon-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.icon-btn.spinning {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.icon-btn.danger {
  color: var(--danger);
}

@media (max-width: 560px) {
  .meal-strip {
    flex-wrap: wrap;
  }

  .meal-side {
    flex: 1 1 100%;
    align-items: flex-start;
  }

  .icon-actions {
    justify-content: flex-start;
    align-items: flex-start;
  }
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

.sentence-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 3px 4px 3px 12px;
  font-size: 0.85rem;
  color: var(--muted);
}

.sentence-pill select {
  border: none;
  background: var(--surface);
  border-radius: 999px;
  padding: 3px 10px;
  font-size: 0.85rem;
  color: var(--ink);
}

.pill-confirm {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--portugal-green);
  color: white;
  border: none;
  font-size: 0.85rem;
  line-height: 1;
  cursor: pointer;
}

.pill-confirm:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.remove-extra-button {
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: 1px solid var(--border);
  border-radius: 50%;
  padding: 0;
  font-size: 0.72rem;
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
