<script setup lang="ts">
import type { RecipeDraft } from '~~/shared/types/itinerary'

const model = defineModel<RecipeDraft>({ required: true })

function addIngredient() {
  model.value.ingredients.push({ name: '', quantity: 0, unit: '', translatedName: null, recipeNames: [] })
}

function removeIngredient(index: number) {
  model.value.ingredients.splice(index, 1)
}

function addStep() {
  model.value.instructions.push('')
}

function removeStep(index: number) {
  model.value.instructions.splice(index, 1)
}
</script>

<template>
  <div class="field-grid">
    <label class="field">
      <span>Name</span>
      <input v-model="model.name" type="text" required>
    </label>

    <label class="field">
      <span>Course</span>
      <select v-model="model.course">
        <option value="BREAKFAST">Breakfast</option>
        <option value="STARTER">Starter</option>
        <option value="MAIN">Main</option>
        <option value="DESSERT">Dessert</option>
      </select>
    </label>

    <label class="field">
      <span>Difficulty</span>
      <select v-model="model.difficulty">
        <option :value="null">—</option>
        <option value="EASY">Easy</option>
        <option value="MEDIUM">Medium</option>
        <option value="HARD">Hard</option>
      </select>
    </label>

    <label class="field">
      <span>Prep time (min)</span>
      <input v-model.number="model.prepTime" type="number" min="0">
    </label>

    <label class="field">
      <span>Cook time (min)</span>
      <input v-model.number="model.cookTime" type="number" min="0">
    </label>

    <label class="field">
      <span>Servings</span>
      <input v-model.number="model.servings" type="number" min="1">
    </label>

    <label class="field">
      <span>Region <span class="optional">(optional)</span></span>
      <input v-model="model.region" type="text" placeholder="e.g. Algarve">
    </label>

    <label class="field">
      <span>Location <span class="optional">(optional)</span></span>
      <input v-model="model.location" type="text" placeholder="e.g. Tavira">
    </label>
  </div>

  <label class="field full">
    <span>Context <span class="optional">(optional)</span></span>
    <textarea v-model="model.localContext" rows="2" placeholder="A note on the dish's origin or history" />
  </label>

  <div class="list-section">
    <div class="list-header">
      <h3>Ingredients</h3>
      <button type="button" class="add-row-button" @click="addIngredient">Add ingredient</button>
    </div>
    <div v-for="(ingredient, index) in model.ingredients" :key="index" class="ingredient-row">
      <input v-model="ingredient.name" type="text" placeholder="Name" class="ingredient-name">
      <input v-model.number="ingredient.quantity" type="number" step="any" placeholder="Qty" class="ingredient-qty">
      <input v-model="ingredient.unit" type="text" placeholder="Unit" class="ingredient-unit">
      <button type="button" class="remove-row-button" @click="removeIngredient(index)">✕</button>
    </div>
    <p v-if="model.ingredients.length === 0" class="empty-hint">No ingredients yet.</p>
  </div>

  <div class="list-section">
    <div class="list-header">
      <h3>Instructions</h3>
      <button type="button" class="add-row-button" @click="addStep">Add step</button>
    </div>
    <div v-for="(step, index) in model.instructions" :key="index" class="step-row">
      <span class="step-number">{{ index + 1 }}.</span>
      <textarea v-model="model.instructions[index]" rows="2" class="step-text" />
      <button type="button" class="remove-row-button" @click="removeStep(index)">✕</button>
    </div>
    <p v-if="model.instructions.length === 0" class="empty-hint">No steps yet.</p>
  </div>

  <label class="field full">
    <span>Chef's notes <span class="optional">(optional)</span></span>
    <textarea v-model="model.chefsNotes" rows="2" placeholder="Substitutions, timing tricks, anything worth knowing before you cook it" />
  </label>
</template>

<style scoped>
.field-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 14px;
  margin-bottom: 14px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field.full {
  margin-bottom: 20px;
}

.field span {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--muted);
}

.optional {
  font-weight: 400;
  font-style: italic;
}

.field input,
.field select,
.field textarea {
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 0.9rem;
  font-family: inherit;
}

.list-section {
  margin-bottom: 20px;
}

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.list-header h3 {
  color: var(--portugal-red);
  font-size: 1rem;
  margin: 0;
}

.add-row-button {
  background: none;
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 3px 10px;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--portugal-green);
  cursor: pointer;
}

.add-row-button:hover {
  background: var(--bg);
}

.ingredient-row {
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
}

.ingredient-row input {
  padding: 6px 8px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 0.85rem;
}

.ingredient-name {
  flex: 3;
}

.ingredient-qty {
  flex: 1;
  min-width: 0;
}

.ingredient-unit {
  flex: 1;
  min-width: 0;
}

.step-row {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-bottom: 6px;
}

.step-number {
  padding-top: 8px;
  font-size: 0.85rem;
  color: var(--muted);
  flex-shrink: 0;
}

.step-text {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 0.85rem;
  font-family: inherit;
  resize: vertical;
}

.remove-row-button {
  flex-shrink: 0;
  background: none;
  border: 1px solid var(--border);
  border-radius: 6px;
  width: 28px;
  height: 28px;
  font-size: 0.8rem;
  color: var(--portugal-red);
  cursor: pointer;
}

.remove-row-button:hover {
  background: var(--bg);
}

.empty-hint {
  font-size: 0.82rem;
  color: var(--muted);
  font-style: italic;
  margin: 0;
}
</style>
