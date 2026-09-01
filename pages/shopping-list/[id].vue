<script setup lang="ts">
import type { ShoppingList } from '~~/shared/types/shopping-list'

const route = useRoute()
const id = route.params.id as string

useHead({ title: 'Shopping List' })

const list = ref<ShoppingList | null>(null)
const loading = ref(true)
const errorMessage = ref('')
const pendingItemIds = ref(new Set<string>())
const copyLabel = ref('Copy link')

let pollTimer: ReturnType<typeof setInterval> | undefined

/**
 * Loads the list from the server. Silent (poll-driven) loads skip the loading
 * spinner and are dropped if a checkbox toggle is still in flight, so a poll
 * landing mid-tap can't stomp on the optimistic update.
 */
async function loadList(options: { silent?: boolean } = {}) {
  if (!options.silent) loading.value = true

  try {
    const fetched = await $fetch<ShoppingList>(`/api/shopping-lists/${id}`)
    if (pendingItemIds.value.size === 0) {
      list.value = fetched
    }
    errorMessage.value = ''
  } catch (error: any) {
    if (!list.value) {
      errorMessage.value = error.data?.message ?? error.statusMessage ?? 'Could not find that shopping list.'
    }
  } finally {
    loading.value = false
  }
}

async function toggleItem(itemId: string, checked: boolean) {
  const item = list.value?.items.find((candidate) => candidate.id === itemId)
  if (!item) return

  const previous = item.checked
  item.checked = checked
  pendingItemIds.value.add(itemId)

  try {
    await $fetch(`/api/shopping-lists/${id}/items/${itemId}`, {
      method: 'PATCH',
      body: { checked }
    })
  } catch {
    item.checked = previous
    errorMessage.value = 'Could not save that change - check your connection and try again.'
  } finally {
    pendingItemIds.value.delete(itemId)
  }
}

const checkedCount = computed(() => list.value?.items.filter((item) => item.checked).length ?? 0)
const totalCount = computed(() => list.value?.items.length ?? 0)

// Unticked items stay on top so the remaining shop stays easy to scan.
const sortedItems = computed(() => {
  if (!list.value) return []
  return [...list.value.items].sort((a, b) => Number(a.checked) - Number(b.checked))
})

/** Speaks an ingredient's Portuguese name aloud via the browser's built-in text-to-speech. */
function pronounce(text: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'pt-PT'
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(window.location.href)
    copyLabel.value = 'Copied!'
  } catch {
    copyLabel.value = 'Copy failed'
  }
  setTimeout(() => { copyLabel.value = 'Copy link' }, 2000)
}

onMounted(() => {
  loadList()
  pollTimer = setInterval(() => loadList({ silent: true }), 8000)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})
</script>

<template>
  <div class="page">
    <NuxtRouteAnnouncer />

    <p v-if="loading" class="status">Loading shopping list…</p>

    <template v-else-if="list">
      <header class="hero">
        <h1>{{ list.title || 'Shopping List' }}</h1>
        <p class="progress">{{ checkedCount }} of {{ totalCount }} ticked off</p>
        <button type="button" class="copy-button" @click="copyLink">{{ copyLabel }}</button>
      </header>

      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

      <ul class="items">
        <li v-for="item in sortedItems" :key="item.id" class="item">
          <label :class="{ checked: item.checked }">
            <input
              type="checkbox"
              :checked="item.checked"
              @change="toggleItem(item.id, ($event.target as HTMLInputElement).checked)"
            >
            <span class="item-text">
              {{ item.quantity }} {{ item.unit }} {{ item.name }}
              <span v-if="item.translatedName" class="ingredient-translation">
                ({{ item.translatedName }})
                <button
                  type="button" class="pronounce-button" title="Hear the Portuguese pronunciation"
                  @click.stop.prevent="pronounce(item.translatedName!)"
                >
                  🔊
                </button>
              </span>
              <span v-if="item.recipeNames.length" class="ingredient-source">{{ item.recipeNames.join(', ') }}</span>
            </span>
          </label>
        </li>
      </ul>

      <NuxtLink to="/" class="back-link">Back to planner</NuxtLink>
    </template>

    <p v-else class="status error">{{ errorMessage }}</p>
  </div>
</template>

<style scoped>
.page {
  max-width: 640px;
  margin: 0 auto;
  padding: 40px 20px 80px;
}

.status {
  text-align: center;
  color: var(--muted);
}

.hero {
  text-align: center;
  margin-bottom: 24px;
}

.hero h1 {
  color: var(--portugal-red);
  font-size: 1.7rem;
  margin: 0 0 6px;
}

.progress {
  color: var(--muted);
  margin: 0 0 12px;
}

.copy-button {
  background: var(--portugal-green);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
}

.error {
  color: var(--danger);
  font-weight: 600;
  text-align: center;
}

.items {
  list-style: none;
  margin: 0 0 24px;
  padding: 0;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
}

.item {
  border-bottom: 1px solid var(--border);
}

.item:last-child {
  border-bottom: none;
}

.item label {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  cursor: pointer;
}

.item label:hover {
  background: var(--bg);
}

.item input[type='checkbox'] {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  accent-color: var(--portugal-green);
}

.item-text {
  font-size: 1rem;
  color: var(--ink);
}

label.checked .item-text {
  color: var(--muted);
  text-decoration: line-through;
}

.ingredient-translation {
  color: var(--muted);
  font-style: italic;
}

.pronounce-button {
  background: none;
  border: none;
  padding: 0 0 0 2px;
  font-size: 0.85rem;
  line-height: 1;
  cursor: pointer;
  vertical-align: middle;
  opacity: 0.75;
}

.pronounce-button:hover {
  opacity: 1;
}

.ingredient-source {
  display: block;
  color: var(--muted);
  font-size: 0.78rem;
}

.back-link {
  display: block;
  text-align: center;
  color: var(--muted);
  font-weight: 600;
  font-size: 0.9rem;
  text-decoration: none;
}

.back-link:hover {
  color: var(--portugal-red);
}
</style>
