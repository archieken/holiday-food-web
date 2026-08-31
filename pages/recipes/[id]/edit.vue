<script setup lang="ts">
import type { Recipe } from '~~/shared/types/itinerary'

const route = useRoute()
const id = route.params.id as string

const { user, authHeaders } = useAuth()

const { data: recipe, pending, error } = await useFetch<Recipe>(`/api/recipes/${id}`, {
  headers: authHeaders()
})

useHead(() => ({ title: recipe.value ? `Edit ${recipe.value.name} - Tavira Recipe Maker` : 'Edit Recipe - Tavira Recipe Maker' }))

const canEdit = computed(() =>
  !!user.value && !!recipe.value && (user.value.admin || user.value.email === recipe.value.createdByEmail)
)

const imageFile = ref<File | null>(null)
const brokenExistingImage = ref(false)
const imagePreviewUrl = computed(() => {
  if (imageFile.value) return URL.createObjectURL(imageFile.value)
  if (brokenExistingImage.value || !recipe.value) return null
  return `/api/recipes/${recipe.value.id}/image`
})

function onImagePicked(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) imageFile.value = file
}

const saving = ref(false)
const errorMessage = ref('')

async function saveChanges() {
  if (!recipe.value) return

  saving.value = true
  errorMessage.value = ''

  try {
    const updated = await $fetch<Recipe>(`/api/recipes/${recipe.value.id}`, {
      method: 'PUT',
      body: recipe.value,
      headers: authHeaders()
    })

    if (imageFile.value) {
      const formData = new FormData()
      formData.append('file', imageFile.value)
      await $fetch(`/api/recipes/${updated.id}/image`, { method: 'POST', body: formData, headers: authHeaders() })
    }

    await navigateTo(`/recipes/${updated.id}`)
  } catch (err: any) {
    errorMessage.value = err.data?.message ?? err.statusMessage ?? 'Something went wrong saving your changes.'
    saving.value = false
  }
}
</script>

<template>
  <div class="page">
    <NuxtRouteAnnouncer />

    <NuxtLink :to="`/recipes/${id}`" class="back-link">&larr; Back to recipe</NuxtLink>

    <p v-if="pending" class="status">Loading recipe…</p>
    <p v-else-if="error" class="error">Could not find that recipe.</p>
    <p v-else-if="!canEdit" class="error">You don't have permission to edit this recipe.</p>

    <section v-else-if="recipe" class="draft">
      <h1>Edit Recipe</h1>

      <div class="photo-section">
        <img
          v-if="imagePreviewUrl" :src="imagePreviewUrl" alt="" class="photo-preview"
          @error="brokenExistingImage = true"
        >
        <div v-else class="photo-placeholder">No photo yet</div>
        <label class="photo-pick-button">
          {{ imagePreviewUrl ? 'Replace photo' : 'Add a photo' }}
          <input type="file" accept="image/jpeg,image/png" class="photo-input" @change="onImagePicked">
        </label>
      </div>

      <RecipeFieldsForm v-model="recipe" />

      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

      <button type="button" class="save-button" :disabled="saving" @click="saveChanges">
        {{ saving ? 'Saving…' : 'Save changes' }}
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

.back-link {
  display: inline-block;
  margin-bottom: 20px;
  color: var(--muted);
  text-decoration: none;
  font-weight: 600;
  font-size: 0.85rem;
}

.back-link:hover {
  color: var(--portugal-red);
}

.status {
  color: var(--muted);
}

.error {
  color: var(--portugal-red);
  font-weight: 600;
}

.draft {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
}

.draft h1 {
  color: var(--portugal-red);
  font-size: 1.4rem;
  margin: 0 0 16px;
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
