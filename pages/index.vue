<script setup lang="ts">
import type { CourseSelection, Recipe } from '~~/shared/types/itinerary'
import { capitalize, mealEntries, placeLabel, slotKey, toServings } from '~~/composables/useItineraryPlanner'

useHead({ title: 'Tavira Recipe Maker' })

const {
  days,
  tripServings,
  daySelections,
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
  removeExtraRecipe,
  assignExtraToDay
} = useItineraryPlanner()

interface ServingsField {
  label: string
  value: number | null
  set: (value: number | null) => void
}

function servingsFields(mealLabel: string, courses: CourseSelection): ServingsField[] {
  return [
    { label: `${mealLabel} - Starter`, value: courses.starter, set: (v) => { courses.starter = v } },
    { label: `${mealLabel} - Main`, value: courses.main, set: (v) => { courses.main = v } },
    { label: `${mealLabel} - Dessert`, value: courses.dessert, set: (v) => { courses.dessert = v } }
  ]
}

// Which day an extra recipe's "Add to Day" selector is currently pointed at.
const extraRecipeDay = ref<Record<string, number>>({})

function dayForExtra(recipe: Recipe): number {
  return extraRecipeDay.value[recipe.id] ?? 1
}

function setDayForExtra(recipe: Recipe, day: number) {
  extraRecipeDay.value[recipe.id] = day
}

</script>

<template>
  <div class="page">
    <NuxtRouteAnnouncer />

    <header class="hero">
      <h1>Tavira Recipe Maker</h1>
      <p>Pick how many days you're staying and how many people you're cooking for, then choose which meals and courses you want each day.</p>
    </header>

    <form class="planner" @submit.prevent="generate">
      <div class="planner-top">
        <div class="field">
          <label for="days">Days</label>
          <input id="days" v-model.number="days" type="number" min="1" max="60" required>
        </div>

        <div class="field">
          <label for="servings">Servings</label>
          <input id="servings" v-model.number="tripServings" type="number" min="1" max="50" required>
        </div>
      </div>
      <p class="servings-trip-hint">Sets breakfast and every main course below - override any meal individually if needed.</p>

      <div class="day-selectors">
        <div v-for="(selection, index) in daySelections" :key="index" class="day-selector">
          <h4>Day {{ index + 1 }}</h4>
          <p class="servings-hint">Enter servings, or leave blank to skip</p>

          <label class="servings-row">
            <span>Breakfast</span>
            <input
              type="number" min="1" max="50" placeholder="—" class="servings-input"
              :value="selection.breakfast ?? ''"
              @input="selection.breakfast = toServings(($event.target as HTMLInputElement).value)"
            >
          </label>

          <div class="course-group">
            <span class="course-group-label">Lunch</span>
            <label v-for="field in servingsFields('Lunch', selection.lunch)" :key="field.label" class="servings-row">
              <span>{{ field.label.split(' - ')[1] }}</span>
              <input
                type="number" min="1" max="50" placeholder="—" class="servings-input"
                :value="field.value ?? ''"
                @input="field.set(toServings(($event.target as HTMLInputElement).value))"
              >
            </label>
          </div>

          <div class="course-group">
            <span class="course-group-label">Dinner</span>
            <label v-for="field in servingsFields('Dinner', selection.dinner)" :key="field.label" class="servings-row">
              <span>{{ field.label.split(' - ')[1] }}</span>
              <input
                type="number" min="1" max="50" placeholder="—" class="servings-input"
                :value="field.value ?? ''"
                @input="field.set(toServings(($event.target as HTMLInputElement).value))"
              >
            </label>
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
        <h2>{{ itinerary.days }}-day trip</h2>
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
                  :disabled="refreshingSlot === slotKey(day.day, entry.meal, entry.course)"
                  @click="refreshRecipe(day.day, entry)"
                >
                  {{ refreshingSlot === slotKey(day.day, entry.meal, entry.course) ? 'Refreshing…' : 'Try another' }}
                </button>
                <button
                  type="button" class="remove-button"
                  :disabled="refreshingSlot === slotKey(day.day, entry.meal, entry.course)"
                  @click="removeRecipe(day.day, entry)"
                >
                  Remove
                </button>
              </div>
            </div>
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

      <div v-if="itinerary.extras?.length" class="extras">
        <h3>Extra recipes <span class="extras-hint">(added without a day)</span></h3>
        <ul>
          <li v-for="recipe in itinerary.extras" :key="recipe.id" class="extra-item">
            <span>{{ recipe.name }} <span class="meal-meta">&middot; Serves {{ recipe.servings }}</span></span>
            <div class="extra-actions">
              <label class="day-picker">
                Day
                <select
                  :value="dayForExtra(recipe)"
                  @change="setDayForExtra(recipe, Number(($event.target as HTMLSelectElement).value))"
                >
                  <option v-for="(_, index) in daySelections" :key="index" :value="index + 1">{{ index + 1 }}</option>
                </select>
              </label>
              <button
                type="button" class="assign-button"
                :disabled="addingRecipeId === recipe.id"
                @click="assignExtraToDay(recipe, dayForExtra(recipe))"
              >
                {{ addingRecipeId === recipe.id ? 'Adding…' : `Add to Day ${dayForExtra(recipe)}` }}
              </button>
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

      <div class="shopping-list">
        <div class="shopping-list-header">
          <h3>Shopping list</h3>
          <button type="button" class="pdf-button" :disabled="shoppingListLoading" @click="openShoppingList">
            {{ shoppingListLoading ? 'Preparing…' : 'Open shareable list' }}
          </button>
        </div>
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
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
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
  margin: 0 0 4px;
  color: var(--portugal-red);
  font-size: 0.9rem;
}

.servings-hint {
  margin: 0 0 8px;
  font-size: 0.72rem;
  color: var(--muted);
}

.servings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  font-size: 0.85rem;
  margin-bottom: 4px;
}

.servings-input {
  width: 48px;
  padding: 2px 4px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 0.85rem;
  text-align: center;
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

.shopping-list {
  margin-top: 24px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
}

.shopping-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.shopping-list-header h3 {
  color: var(--portugal-red);
  margin: 0;
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
