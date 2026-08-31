<script setup lang="ts">
import type { ItineraryResponse } from '~~/shared/types/itinerary'

const { data: countries } = await useFetch<string[]>('/api/countries')

const country = ref(countries.value?.[0] ?? '')
const days = ref(3)

const itinerary = ref<ItineraryResponse | null>(null)
const loading = ref(false)
const errorMessage = ref('')

const pdfHref = computed(() => {
  if (!itinerary.value) return ''
  const params = new URLSearchParams({ country: itinerary.value.country, days: String(itinerary.value.days) })
  return `/api/itinerary/pdf?${params.toString()}`
})

async function generate() {
  if (!country.value) return

  loading.value = true
  errorMessage.value = ''
  itinerary.value = null

  try {
    itinerary.value = await $fetch<ItineraryResponse>('/api/itinerary', {
      query: { country: country.value, days: days.value }
    })
  } catch (error: any) {
    errorMessage.value = error.data?.message ?? error.statusMessage ?? 'Something went wrong generating the itinerary.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="page">
    <NuxtRouteAnnouncer />

    <header class="hero">
      <h1>Holiday Food Itinerary</h1>
      <p>Pick a country and how many days you're staying, get a day-by-day recipe plan and a combined shopping list.</p>
    </header>

    <form class="planner" @submit.prevent="generate">
      <div class="field">
        <label for="country">Country</label>
        <select id="country" v-model="country">
          <option v-for="c in countries" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>

      <div class="field">
        <label for="days">Days</label>
        <input id="days" v-model.number="days" type="number" min="1" max="60" required>
      </div>

      <button type="submit" :disabled="loading">
        {{ loading ? 'Generating…' : 'Generate itinerary' }}
      </button>
    </form>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

    <section v-if="itinerary" class="results">
      <div class="results-header">
        <h2>{{ itinerary.country }} — {{ itinerary.days }}-day trip</h2>
        <a :href="pdfHref" target="_blank" class="pdf-button">View / print PDF</a>
      </div>

      <div class="days">
        <article v-for="day in itinerary.itinerary" :key="day.day" class="day-card">
          <h3>Day {{ day.day }}</h3>
          <div class="meal">
            <h4>Breakfast: {{ day.breakfast.name }}</h4>
            <ul>
              <li v-for="ingredient in day.breakfast.ingredients" :key="ingredient.name">
                {{ ingredient.quantity }} {{ ingredient.unit }} {{ ingredient.name }}
              </li>
            </ul>
          </div>
          <div class="meal">
            <h4>Lunch: {{ day.lunch.name }}</h4>
            <ul>
              <li v-for="ingredient in day.lunch.ingredients" :key="ingredient.name">
                {{ ingredient.quantity }} {{ ingredient.unit }} {{ ingredient.name }}
              </li>
            </ul>
          </div>
          <div class="meal">
            <h4>Dinner: {{ day.dinner.name }}</h4>
            <ul>
              <li v-for="ingredient in day.dinner.ingredients" :key="ingredient.name">
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
  max-width: 860px;
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
  display: flex;
  align-items: flex-end;
  gap: 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
  flex-wrap: wrap;
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
  text-decoration: none;
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 600;
  white-space: nowrap;
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
  margin: 0 0 6px;
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
