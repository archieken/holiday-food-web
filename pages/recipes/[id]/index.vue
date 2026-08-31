<script setup lang="ts">
import type { Comment, Recipe } from '~~/shared/types/itinerary'
import { capitalize, placeLabel } from '~~/composables/useItineraryPlanner'

const route = useRoute()
const id = route.params.id as string

const { user, authHeaders } = useAuth()
const { addingRecipeId, errorMessage, addExtraRecipe } = useItineraryPlanner()

const { data: recipe, pending, error } = await useFetch<Recipe>(`/api/recipes/${id}`, {
  headers: authHeaders()
})

useHead(() => ({ title: recipe.value ? `${recipe.value.name} - Tavira Recipe Maker` : 'Recipe - Tavira Recipe Maker' }))

function mealLabel(r: Recipe): string {
  return capitalize(r.course)
}

function uploaderLabel(r: Recipe): string {
  return r.createdByName ?? r.createdByEmail ?? 'Tavira Recipe Maker'
}

const brokenImage = ref(false)
const likingRecipe = ref(false)

const canEdit = computed(() =>
  !!user.value && !!recipe.value && (user.value.admin || user.value.email === recipe.value.createdByEmail)
)

async function toggleLike() {
  if (!recipe.value) return
  if (!user.value) {
    errorMessage.value = 'Sign in to like a recipe.'
    return
  }

  likingRecipe.value = true
  errorMessage.value = ''

  try {
    const status = await $fetch<{ likeCount: number; likedByMe: boolean }>(`/api/recipes/${recipe.value.id}/like`, {
      method: recipe.value.likedByMe ? 'DELETE' : 'POST',
      headers: authHeaders()
    })
    recipe.value.likeCount = status.likeCount
    recipe.value.likedByMe = status.likedByMe
  } catch (error: any) {
    errorMessage.value = error.data?.message ?? error.statusMessage ?? 'Something went wrong updating that like.'
  } finally {
    likingRecipe.value = false
  }
}

const printing = ref(false)

async function printRecipe() {
  if (!recipe.value) return

  // Open the tab synchronously, inside the click's user gesture, so the
  // browser doesn't treat it as a popup once we redirect it after the
  // (async) PDF fetch below resolves.
  const pdfWindow = window.open('', '_blank')

  printing.value = true
  errorMessage.value = ''

  try {
    const blob = await $fetch<Blob>(`/api/recipes/${recipe.value.id}/pdf`, { responseType: 'blob' })
    const url = URL.createObjectURL(blob)
    if (pdfWindow) {
      pdfWindow.location.href = url
    } else {
      window.location.href = url
    }
  } catch (error: any) {
    pdfWindow?.close()
    errorMessage.value = error.data?.message ?? error.statusMessage ?? 'Something went wrong generating the recipe PDF.'
  } finally {
    printing.value = false
  }
}

const deleting = ref(false)

async function deleteRecipe() {
  if (!recipe.value) return
  if (!confirm(`Delete "${recipe.value.name}"? This can't be undone.`)) return

  deleting.value = true
  errorMessage.value = ''

  try {
    await $fetch(`/api/recipes/${recipe.value.id}`, { method: 'DELETE', headers: authHeaders() })
    await navigateTo('/recipes')
  } catch (error: any) {
    errorMessage.value = error.data?.message ?? error.statusMessage ?? 'Something went wrong deleting that recipe.'
    deleting.value = false
  }
}

const { data: comments } = await useFetch<Comment[]>(`/api/recipes/${id}/comments`)
const newComment = ref('')
const postingComment = ref(false)
const commentError = ref('')
const deletingCommentId = ref<string | null>(null)

async function postComment() {
  if (!newComment.value.trim()) return
  if (!user.value) {
    commentError.value = 'Sign in to leave a comment.'
    return
  }

  postingComment.value = true
  commentError.value = ''

  try {
    const comment = await $fetch<Comment>(`/api/recipes/${id}/comments`, {
      method: 'POST',
      body: { text: newComment.value.trim() },
      headers: authHeaders()
    })
    comments.value = [...(comments.value ?? []), comment]
    newComment.value = ''
  } catch (error: any) {
    commentError.value = error.data?.message ?? error.statusMessage ?? 'Something went wrong posting that comment.'
  } finally {
    postingComment.value = false
  }
}

async function deleteComment(comment: Comment) {
  if (!confirm('Delete this comment?')) return

  deletingCommentId.value = comment.id
  commentError.value = ''

  try {
    await $fetch(`/api/recipes/${id}/comments/${comment.id}`, { method: 'DELETE', headers: authHeaders() })
    comments.value = comments.value?.filter((c) => c.id !== comment.id) ?? null
  } catch (error: any) {
    commentError.value = error.data?.message ?? error.statusMessage ?? 'Something went wrong deleting that comment.'
  } finally {
    deletingCommentId.value = null
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}
</script>

<template>
  <div class="page">
    <NuxtRouteAnnouncer />

    <NuxtLink to="/recipes" class="back-link">&larr; Back to Explore Recipes</NuxtLink>

    <p v-if="pending" class="status">Loading recipe…</p>
    <p v-else-if="error" class="error">Could not find that recipe.</p>

    <template v-else-if="recipe">
      <article class="recipe">
        <div v-if="!brokenImage" class="recipe-image-wrap">
          <img
            :src="`/api/recipes/${recipe.id}/image`"
            :alt="recipe.name"
            class="recipe-image"
            @error="brokenImage = true"
          >
        </div>

        <div class="title-row">
          <h1>{{ recipe.name }}</h1>
          <button
            type="button" class="like-button" :class="{ liked: recipe.likedByMe }"
            :disabled="likingRecipe"
            @click="toggleLike"
          >
            {{ recipe.likedByMe ? '♥' : '♡' }} {{ recipe.likeCount }}
          </button>
        </div>

        <p class="recipe-meta">
          {{ mealLabel(recipe) }}
          <template v-if="placeLabel(recipe)"> &middot; {{ placeLabel(recipe) }}</template>
          <template v-if="recipe.difficulty"> &middot; {{ capitalize(recipe.difficulty) }}</template>
          &middot; Prep {{ recipe.prepTime }}m / Cook {{ recipe.cookTime }}m &middot; Serves {{ recipe.servings }}
        </p>
        <p class="recipe-uploader">Uploaded by {{ uploaderLabel(recipe) }}</p>
        <p v-if="recipe.localContext" class="recipe-context">{{ recipe.localContext }}</p>

        <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

        <div class="actions">
          <button type="button" class="print-button" :disabled="printing" @click="printRecipe">
            {{ printing ? 'Preparing…' : 'Print recipe' }}
          </button>
          <button
            type="button" class="add-extra-button"
            :disabled="addingRecipeId === recipe.id"
            @click="addExtraRecipe(recipe)"
          >
            {{ addingRecipeId === recipe.id ? 'Adding…' : 'Add to Itinerary' }}
          </button>
          <NuxtLink
            v-if="canEdit"
            :to="`/recipes/${recipe.id}/edit`" class="edit-button"
          >
            Edit recipe
          </NuxtLink>
          <button
            v-if="user?.admin"
            type="button" class="delete-button"
            :disabled="deleting"
            @click="deleteRecipe"
          >
            {{ deleting ? 'Deleting…' : 'Delete recipe' }}
          </button>
        </div>

        <section class="recipe-body">
          <h2>Ingredients</h2>
          <ul class="recipe-ingredients">
            <li v-for="ingredient in recipe.ingredients" :key="ingredient.name">
              {{ ingredient.quantity }} {{ ingredient.unit }} {{ ingredient.name }}
              <span v-if="ingredient.translatedName" class="ingredient-translation">({{ ingredient.translatedName }})</span>
            </li>
          </ul>

          <h2>Instructions</h2>
          <ol class="recipe-instructions">
            <li v-for="(step, index) in recipe.instructions" :key="index">{{ step }}</li>
          </ol>
        </section>
      </article>

      <section class="comments">
        <h2>Comments <span class="comment-count">({{ comments?.length ?? 0 }})</span></h2>

        <form v-if="user" class="comment-form" @submit.prevent="postComment">
          <textarea v-model="newComment" rows="3" placeholder="Share a tip, or how it turned out..." required />
          <button type="submit" :disabled="postingComment">{{ postingComment ? 'Posting…' : 'Post comment' }}</button>
        </form>
        <p v-else class="sign-in-hint">Sign in (top right) to leave a comment.</p>

        <p v-if="commentError" class="error">{{ commentError }}</p>

        <ul v-if="comments?.length" class="comment-list">
          <li v-for="comment in comments" :key="comment.id" class="comment">
            <div class="comment-header">
              <span class="comment-author">{{ comment.authorName ?? comment.authorEmail }}</span>
              <span class="comment-date">{{ formatDate(comment.createdAt) }}</span>
              <button
                v-if="user?.email === comment.authorEmail"
                type="button" class="comment-delete-button"
                :disabled="deletingCommentId === comment.id"
                @click="deleteComment(comment)"
              >
                Delete
              </button>
            </div>
            <p class="comment-text">{{ comment.text }}</p>
          </li>
        </ul>
        <p v-else class="status">No comments yet - be the first!</p>
      </section>
    </template>
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

.recipe {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
}

.recipe-image-wrap {
  margin: -20px -20px 16px;
  border-radius: 12px 12px 0 0;
  overflow: hidden;
}

.recipe-image {
  display: block;
  width: 100%;
  max-height: 320px;
  object-fit: cover;
}

.title-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin: 0 0 6px;
}

.title-row h1 {
  color: var(--portugal-red);
  font-size: 1.6rem;
  margin: 0;
}

.like-button {
  flex-shrink: 0;
  background: none;
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 4px 14px;
  font-size: 0.9rem;
  color: var(--muted);
  cursor: pointer;
}

.like-button.liked {
  color: var(--portugal-red);
  border-color: var(--portugal-red);
}

.like-button:hover:not(:disabled) {
  background: var(--bg);
}

.like-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.recipe-meta {
  font-size: 0.85rem;
  color: var(--muted);
  margin: 0 0 4px;
}

.recipe-uploader {
  font-size: 0.8rem;
  color: var(--muted);
  margin: 0 0 12px;
}

.recipe-context {
  font-size: 0.9rem;
  font-style: italic;
  color: var(--muted);
  margin: 0 0 16px;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
}

.actions button,
.actions a {
  flex: 1;
  min-width: 140px;
  padding: 8px 14px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  text-align: center;
  text-decoration: none;
}

.print-button {
  background: none;
  border: 1px solid var(--border);
  color: var(--portugal-green);
}

.print-button:hover:not(:disabled) {
  background: var(--bg);
}

.add-extra-button {
  background: var(--portugal-green);
  color: white;
  border: none;
}

.add-extra-button:hover:not(:disabled) {
  opacity: 0.92;
}

.edit-button {
  background: none;
  border: 1px solid var(--border);
  color: var(--portugal-green);
}

.edit-button:hover {
  background: var(--bg);
}

.delete-button {
  background: none;
  border: 1px solid var(--border);
  color: var(--portugal-red);
}

.delete-button:hover:not(:disabled) {
  background: var(--bg);
}

.actions button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.recipe-body h2 {
  color: var(--portugal-red);
  font-size: 1.1rem;
  margin: 16px 0 8px;
}

.recipe-body h2:first-child {
  margin-top: 0;
}

.recipe-ingredients,
.recipe-instructions {
  margin: 0;
  padding-left: 20px;
  color: var(--ink);
}

.recipe-ingredients li,
.recipe-instructions li {
  font-size: 0.92rem;
  margin-bottom: 4px;
}

.ingredient-translation {
  color: var(--muted);
  font-style: italic;
}

.comments {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
}

.comments h2 {
  color: var(--portugal-red);
  font-size: 1.1rem;
  margin: 0 0 16px;
}

.comment-count {
  color: var(--muted);
  font-weight: 400;
}

.comment-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.comment-form textarea {
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 0.9rem;
  font-family: inherit;
  resize: vertical;
}

.comment-form button {
  align-self: flex-end;
  background: var(--portugal-red);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 8px 18px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
}

.comment-form button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.sign-in-hint {
  color: var(--muted);
  font-size: 0.9rem;
  margin-bottom: 16px;
}

.comment-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.comment {
  padding: 12px 0;
  border-top: 1px solid var(--border);
}

.comment:first-child {
  border-top: none;
  padding-top: 0;
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.comment-author {
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--ink);
}

.comment-date {
  font-size: 0.75rem;
  color: var(--muted);
  flex: 1;
}

.comment-delete-button {
  flex-shrink: 0;
  background: none;
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 2px 8px;
  font-size: 0.72rem;
  color: var(--portugal-red);
  cursor: pointer;
}

.comment-delete-button:hover:not(:disabled) {
  background: var(--bg);
}

.comment-delete-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.comment-text {
  margin: 0;
  font-size: 0.9rem;
  color: var(--ink);
  white-space: pre-wrap;
}
</style>
