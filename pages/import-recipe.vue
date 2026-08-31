<script setup lang="ts">
import type { RecipeDraft, RecipeImportResult } from '~~/shared/types/itinerary'

useHead({ title: 'Import Recipe - Tavira Recipe Maker' })

const { user, authHeaders } = useAuth()

const input = ref('')
const draft = ref<RecipeDraft | null>(null)
const importing = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const savedRecipeName = ref('')

// The photo shown in the review step, either auto-fetched from the source page during
// import or picked by the user - `imageFile` always wins over `fetchedImageUrl` when set.
const fetchedImageUrl = ref<string | null>(null)
const imageFile = ref<File | null>(null)
const imagePreviewUrl = computed(() => {
  if (imageFile.value) return URL.createObjectURL(imageFile.value)
  return fetchedImageUrl.value
})

async function fetchDraft() {
  if (!input.value.trim()) return

  importing.value = true
  errorMessage.value = ''
  savedRecipeName.value = ''

  try {
    const result = await $fetch<RecipeImportResult>('/api/recipes/import', {
      method: 'POST',
      body: { input: input.value.trim() },
      headers: authHeaders()
    })
    draft.value = result.recipe
    fetchedImageUrl.value = result.imageDataUrl
    imageFile.value = null
  } catch (error: any) {
    errorMessage.value = error.data?.message ?? error.statusMessage ?? 'Something went wrong fetching that recipe.'
  } finally {
    importing.value = false
  }
}

function onImagePicked(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) imageFile.value = file
}

function removeImage() {
  imageFile.value = null
  fetchedImageUrl.value = null
}

function startOver() {
  draft.value = null
  input.value = ''
  errorMessage.value = ''
  fetchedImageUrl.value = null
  imageFile.value = null
}

function addIngredient() {
  draft.value?.ingredients.push({ name: '', quantity: 0, unit: '', translatedName: null })
}

function removeIngredient(index: number) {
  draft.value?.ingredients.splice(index, 1)
}

function addStep() {
  draft.value?.instructions.push('')
}

function removeStep(index: number) {
  draft.value?.instructions.splice(index, 1)
}

async function saveRecipe() {
  if (!draft.value) return

  saving.value = true
  errorMessage.value = ''

  const payload: RecipeDraft = {
    ...draft.value,
    region: draft.value.region?.trim() || null,
    location: draft.value.location?.trim() || null,
    localContext: draft.value.localContext?.trim() || null
  }

  try {
    const saved = await $fetch<RecipeDraft>('/api/recipes', { method: 'POST', body: payload, headers: authHeaders() })
    await uploadImage(saved.id!)
    savedRecipeName.value = saved.name
    draft.value = null
    input.value = ''
    fetchedImageUrl.value = null
    imageFile.value = null
  } catch (error: any) {
    errorMessage.value = error.data?.message ?? error.statusMessage ?? 'Something went wrong saving that recipe.'
  } finally {
    saving.value = false
  }
}

// Best-effort: the recipe is already saved by this point, so a photo upload failure
// shouldn't be reported as the save itself failing.
async function uploadImage(recipeId: string) {
  const file = imageFile.value ?? (fetchedImageUrl.value ? await dataUrlToFile(fetchedImageUrl.value) : null)
  if (!file) return

  const formData = new FormData()
  formData.append('file', file)
  try {
    await $fetch(`/api/recipes/${recipeId}/image`, { method: 'POST', body: formData, headers: authHeaders() })
  } catch {
    // Photo upload is optional - the recipe itself saved fine.
  }
}

async function dataUrlToFile(dataUrl: string): Promise<File> {
  const blob = await (await fetch(dataUrl)).blob()
  const extension = blob.type === 'image/png' ? 'png' : 'jpg'
  return new File([blob], `photo.${extension}`, { type: blob.type })
}
</script>

<template>
  <div class="page">
    <NuxtRouteAnnouncer />

    <header class="hero">
      <h1>Import Recipe</h1>
      <p>Give a recipe's name, or a link to a recipe page, and the AI will fill in the details for you to review before saving.</p>
    </header>

    <p v-if="!user" class="sign-in-hint">Sign in (top right) to import a recipe - it'll be saved under your name.</p>

    <form v-else-if="!draft" class="import-form" @submit.prevent="fetchDraft">
      <label for="recipe-input">Recipe name or URL</label>
      <div class="import-row">
        <input
          id="recipe-input" v-model="input" type="text"
          placeholder="e.g. Bacalhau a Bras, or https://..."
          required
        >
        <button type="submit" :disabled="importing">
          {{ importing ? 'Fetching…' : 'Fetch with AI' }}
        </button>
      </div>
    </form>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    <p v-if="savedRecipeName" class="success">
      Saved "{{ savedRecipeName }}" - find it on the <NuxtLink to="/recipes">Explore Recipes</NuxtLink> page.
    </p>

    <section v-if="draft" class="draft">
      <div class="draft-header">
        <h2>Review before saving</h2>
        <button type="button" class="discard-button" @click="startOver">Discard</button>
      </div>
      <p class="review-hint">Check every field, especially quantities and instructions, before saving - nothing is added to the catalogue until you save.</p>

      <div class="photo-section">
        <img v-if="imagePreviewUrl" :src="imagePreviewUrl" alt="" class="photo-preview">
        <div v-else class="photo-placeholder">No photo yet</div>
        <div class="photo-actions">
          <label class="photo-pick-button">
            {{ imagePreviewUrl ? 'Replace photo' : 'Add a photo' }}
            <input type="file" accept="image/jpeg,image/png" class="photo-input" @change="onImagePicked">
          </label>
          <button v-if="imagePreviewUrl" type="button" class="remove-row-button" @click="removeImage">Remove</button>
        </div>
      </div>

      <div class="field-grid">
        <label class="field">
          <span>Name</span>
          <input v-model="draft.name" type="text" required>
        </label>

        <label class="field">
          <span>Course</span>
          <select v-model="draft.course">
            <option value="BREAKFAST">Breakfast</option>
            <option value="STARTER">Starter</option>
            <option value="MAIN">Main</option>
            <option value="DESSERT">Dessert</option>
          </select>
        </label>

        <label class="field">
          <span>Difficulty</span>
          <select v-model="draft.difficulty">
            <option :value="null">—</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>
        </label>

        <label class="field">
          <span>Prep time (min)</span>
          <input v-model.number="draft.prepTime" type="number" min="0">
        </label>

        <label class="field">
          <span>Cook time (min)</span>
          <input v-model.number="draft.cookTime" type="number" min="0">
        </label>

        <label class="field">
          <span>Servings</span>
          <input v-model.number="draft.servings" type="number" min="1">
        </label>

        <label class="field">
          <span>Region <span class="optional">(optional)</span></span>
          <input v-model="draft.region" type="text" placeholder="e.g. Algarve">
        </label>

        <label class="field">
          <span>Location <span class="optional">(optional)</span></span>
          <input v-model="draft.location" type="text" placeholder="e.g. Tavira">
        </label>
      </div>

      <label class="field full">
        <span>Context <span class="optional">(optional)</span></span>
        <textarea v-model="draft.localContext" rows="2" placeholder="A note on the dish's origin or history" />
      </label>

      <div class="list-section">
        <div class="list-header">
          <h3>Ingredients</h3>
          <button type="button" class="add-row-button" @click="addIngredient">Add ingredient</button>
        </div>
        <div v-for="(ingredient, index) in draft.ingredients" :key="index" class="ingredient-row">
          <input v-model="ingredient.name" type="text" placeholder="Name" class="ingredient-name">
          <input v-model.number="ingredient.quantity" type="number" step="any" placeholder="Qty" class="ingredient-qty">
          <input v-model="ingredient.unit" type="text" placeholder="Unit" class="ingredient-unit">
          <button type="button" class="remove-row-button" @click="removeIngredient(index)">✕</button>
        </div>
        <p v-if="draft.ingredients.length === 0" class="empty-hint">No ingredients yet.</p>
      </div>

      <div class="list-section">
        <div class="list-header">
          <h3>Instructions</h3>
          <button type="button" class="add-row-button" @click="addStep">Add step</button>
        </div>
        <div v-for="(step, index) in draft.instructions" :key="index" class="step-row">
          <span class="step-number">{{ index + 1 }}.</span>
          <textarea v-model="draft.instructions[index]" rows="2" class="step-text" />
          <button type="button" class="remove-row-button" @click="removeStep(index)">✕</button>
        </div>
        <p v-if="draft.instructions.length === 0" class="empty-hint">No steps yet.</p>
      </div>

      <button type="button" class="save-button" :disabled="saving" @click="saveRecipe">
        {{ saving ? 'Saving…' : 'Save recipe' }}
      </button>
    </section>
  </div>
</template>

<style scoped>
.page {
  max-width: 720px;
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

.sign-in-hint {
  text-align: center;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
  color: var(--muted);
}

.import-form {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
}

.import-form label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--muted);
  margin-bottom: 6px;
}

.import-row {
  display: flex;
  gap: 8px;
}

.import-row input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 1rem;
}

.import-row button {
  background: var(--portugal-red);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 10px 18px;
  font-weight: 600;
  font-size: 0.95rem;
  white-space: nowrap;
  cursor: pointer;
}

.import-row button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error {
  color: var(--portugal-red);
  font-weight: 600;
  margin-top: 16px;
}

.success {
  color: var(--portugal-green);
  font-weight: 600;
  margin-top: 16px;
}

.success a {
  color: var(--portugal-green);
}

.draft {
  margin-top: 24px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
}

.draft-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.draft-header h2 {
  color: var(--portugal-red);
  margin: 0;
}

.discard-button {
  flex-shrink: 0;
  background: none;
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 4px 12px;
  font-size: 0.8rem;
  color: var(--portugal-red);
  cursor: pointer;
}

.discard-button:hover {
  background: var(--bg);
}

.review-hint {
  font-size: 0.82rem;
  font-style: italic;
  color: var(--muted);
  margin: 8px 0 20px;
}

.photo-section {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.photo-preview {
  width: 120px;
  height: 90px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid var(--border);
}

.photo-placeholder {
  width: 120px;
  height: 90px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--border);
  border-radius: 8px;
  color: var(--muted);
  font-size: 0.78rem;
  text-align: center;
  flex-shrink: 0;
}

.photo-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.photo-pick-button {
  position: relative;
  background: none;
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 6px 14px;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--portugal-green);
  cursor: pointer;
}

.photo-pick-button:hover {
  background: var(--bg);
}

.photo-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

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

.save-button {
  width: 100%;
  background: var(--portugal-green);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
}

.save-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
