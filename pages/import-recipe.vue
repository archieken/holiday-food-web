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

async function saveRecipe() {
  if (!draft.value) return

  saving.value = true
  errorMessage.value = ''

  const payload: RecipeDraft = {
    ...draft.value,
    region: draft.value.region?.trim() || null,
    location: draft.value.location?.trim() || null,
    localContext: draft.value.localContext?.trim() || null,
    chefsNotes: draft.value.chefsNotes?.trim() || null
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

      <RecipeFieldsForm v-model="draft" />

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
  color: var(--danger);
  font-weight: 600;
  margin-top: 16px;
}

.success {
  color: var(--success);
  font-weight: 600;
  margin-top: 16px;
}

.success a {
  color: var(--success);
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
