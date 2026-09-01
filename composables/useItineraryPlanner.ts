import type {
  DayPlan,
  ExtraRecipeSelection,
  ItineraryResponse,
  MealSelection,
  MealSlot,
  Recipe,
  SaveItineraryRequest,
  SavedItineraryResponse
} from '~~/shared/types/itinerary'

// Every recipe is Portuguese, drawn from the full national catalogue - there's no
// country/town filtering to select here.
export const COUNTRY = 'Portugal'

// How long to wait after the last edit to a field like the itinerary name before autosaving -
// long enough that autosave doesn't fire on every keystroke.
const AUTOSAVE_DEBOUNCE_MS = 600

export interface MealEntry {
  label: string
  recipe: Recipe
  slot: MealSlot
}

function emptySelection(): MealSelection {
  return { breakfast: null, lunch: null, dinner: null, dessert: null }
}

/** Converts a number input's raw string value to a servings count, or null if it's empty/invalid. */
export function toServings(value: string): number | null {
  if (value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export function slotKey(day: number, slot: MealSlot): string {
  return `${day}-${slot}`
}

export function mealEntries(day: DayPlan): MealEntry[] {
  const candidates: { label: string; recipe: Recipe | null; slot: MealSlot }[] = [
    { label: 'Breakfast', recipe: day.breakfast, slot: 'BREAKFAST' },
    { label: 'Lunch', recipe: day.lunch, slot: 'LUNCH' },
    { label: 'Dinner', recipe: day.dinner, slot: 'DINNER' },
    { label: 'Dessert', recipe: day.dessert, slot: 'DESSERT' }
  ]
  return candidates.filter((entry): entry is MealEntry => entry.recipe !== null)
}

/** The recipe currently occupying a given (day, slot) meal, or null if it's empty. */
export function recipeForSlot(day: DayPlan, slot: MealSlot): Recipe | null {
  if (slot === 'BREAKFAST') return day.breakfast
  if (slot === 'LUNCH') return day.lunch
  if (slot === 'DINNER') return day.dinner
  return day.dessert
}

/**
 * Which day slot(s) a recipe can be assigned to, based on its course. A Main
 * recipe can go into either Lunch or Dinner (there's no lunch/dinner
 * distinction any more); a Starter has no day slot at all, so it can only
 * ever be added as an extra.
 */
export function targetSlotsFor(recipe: Recipe): MealSlot[] {
  switch (recipe.course) {
    case 'BREAKFAST': return ['BREAKFAST']
    case 'MAIN': return ['LUNCH', 'DINNER']
    case 'DESSERT': return ['DESSERT']
    default: return []
  }
}

export function placeLabel(recipe: Recipe): string | null {
  if (recipe.location && recipe.region) return `${recipe.location}, ${recipe.region}`
  return recipe.region ?? recipe.location
}

export function capitalize(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase()
}

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

/** Today's date as a 'YYYY-MM-DD' string, in the browser's local timezone. */
export function todayIso(): string {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

function parseIso(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function toIso(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
}

export function addDaysIso(iso: string, days: number): string {
  const date = parseIso(iso)
  date.setUTCDate(date.getUTCDate() + days)
  return toIso(date)
}

/** Number of days in a stay from `startIso` up to (not including) `endIso`, minimum 1. */
export function dayCountBetween(startIso: string, endIso: string): number {
  const diffDays = Math.round((parseIso(endIso).getTime() - parseIso(startIso).getTime()) / 86_400_000)
  return Math.max(1, diffDays)
}

function formatDisplayDate(iso: string): string {
  return parseIso(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

/** The default itinerary name for a given date range: "Tavira [start date] - [end date]". */
export function generatedName(startIso: string, endIso: string): string {
  return `Tavira ${formatDisplayDate(startIso)} - ${formatDisplayDate(endIso)}`
}

/**
 * Shared itinerary-planning state, lifted out of any single page via useState() so the home
 * page and the Explore Recipes page read/write the same trip. The trip itself is persisted on
 * the backend (found again by date, autosaved as it's edited) - see `initialize()`.
 */
export function useItineraryPlanner() {
  const itineraryId = useState<string | null>('planner-id', () => null)
  const name = useState('planner-name', () => '')
  // Whether the user has typed their own name for this trip - if so, changing the dates should
  // stop overwriting it with the auto-generated "Tavira ..." name.
  const nameEditedManually = useState('planner-name-edited', () => false)
  const startDate = useState('planner-start-date', () => todayIso())
  const endDate = useState('planner-end-date', () => addDaysIso(todayIso(), 3))
  const tripServings = useState('planner-trip-servings', () => 2)
  const daySelections = useState<MealSelection[]>('planner-day-selections', () =>
    Array.from({ length: 3 }, emptySelection)
  )
  const extraRecipes = useState<ExtraRecipeSelection[]>('planner-extra-recipes', () => [])

  const itinerary = useState<ItineraryResponse | null>('planner-itinerary', () => null)
  const saving = useState('planner-saving', () => false)
  const shoppingListLoading = useState('planner-shopping-list-loading', () => false)
  const errorMessage = useState('planner-error', () => '')
  const refreshingSlot = useState<string | null>('planner-refreshing-slot', () => null)
  const addingRecipeId = useState<string | null>('planner-adding-recipe-id', () => null)

  let autosaveTimer: ReturnType<typeof setTimeout> | null = null

  const tripLength = computed(() => daySelections.value.length)

  function applyRecord(record: SavedItineraryResponse) {
    itineraryId.value = record.id
    name.value = record.name
    nameEditedManually.value = record.name !== generatedName(record.startDate, record.endDate)
    startDate.value = record.startDate
    endDate.value = record.endDate
    tripServings.value = record.partySize
    daySelections.value = record.days.map((day) => ({ ...day }))
    extraRecipes.value = record.extraRecipes.map((extra) => ({ ...extra }))
    itinerary.value = record.resolved
  }

  function currentSaveRequest(): SaveItineraryRequest {
    return {
      name: name.value,
      startDate: startDate.value,
      endDate: endDate.value,
      partySize: tripServings.value,
      days: daySelections.value,
      extraRecipes: extraRecipes.value
    }
  }

  /**
   * Loads the itinerary the household already has planned for today, or creates a fresh, empty
   * one (3 days, 2 people, no meals selected) if there isn't one. Safe to call from multiple
   * pages/components - only runs once per app load.
   */
  async function initialize() {
    await callOnce('itinerary-planner-init', async () => {
      const today = todayIso()
      const existing = await $fetch<SavedItineraryResponse | null>('/api/itineraries/lookup', { query: { date: today } })

      if (existing) {
        applyRecord(existing)
        return
      }

      const start = today
      const end = addDaysIso(start, 3)
      const created = await $fetch<SavedItineraryResponse>('/api/itineraries', {
        method: 'POST',
        body: {
          name: generatedName(start, end),
          startDate: start,
          endDate: end,
          partySize: 2,
          days: Array.from({ length: 3 }, emptySelection),
          extraRecipes: []
        }
      })
      applyRecord(created)
    })
  }

  /** Persists the current trip immediately. Only updates the displayed plan when `applyResolved` is true. */
  async function persistNow(applyResolved: boolean) {
    if (!itineraryId.value) return

    saving.value = true
    errorMessage.value = ''

    try {
      const record = await $fetch<SavedItineraryResponse>(`/api/itineraries/${itineraryId.value}`, {
        method: 'PUT',
        body: currentSaveRequest()
      })
      if (applyResolved) itinerary.value = record.resolved
    } catch (error: any) {
      errorMessage.value = error.data?.message ?? error.statusMessage ?? 'Something went wrong saving your itinerary.'
    } finally {
      saving.value = false
    }
  }

  /**
   * Persists the current trip a moment after the last change, without touching the displayed
   * plan - used after actions (like "Try another recipe") that already show their own result
   * and shouldn't have it overwritten by a plain re-save.
   */
  function persistDebounced() {
    if (!itineraryId.value) return
    if (autosaveTimer) clearTimeout(autosaveTimer)
    autosaveTimer = setTimeout(() => { persistNow(false) }, AUTOSAVE_DEBOUNCE_MS)
  }

  /** If the household already has a different itinerary covering `date`, switches to viewing it. */
  async function switchToItineraryForDate(date: string) {
    try {
      const match = await $fetch<SavedItineraryResponse | null>('/api/itineraries/lookup', { query: { date } })
      if (match && match.id !== itineraryId.value) applyRecord(match)
    } catch {
      // Best-effort - if the lookup fails, keep editing the current itinerary under the new dates.
    }
  }

  function resizeDaysForDateRange() {
    const expected = dayCountBetween(startDate.value, endDate.value)
    const current = daySelections.value
    if (expected > current.length) {
      for (let i = current.length; i < expected; i++) current.push(emptySelection())
    } else if (expected < current.length) {
      current.length = expected
    }
  }

  function syncNameForDates() {
    if (!nameEditedManually.value) name.value = generatedName(startDate.value, endDate.value)
  }

  async function setStartDate(value: string) {
    startDate.value = value
    syncNameForDates()
    resizeDaysForDateRange()
    await switchToItineraryForDate(value)
    await persistNow(true)
  }

  async function setEndDate(value: string) {
    endDate.value = value
    syncNameForDates()
    resizeDaysForDateRange()
    await persistNow(true)
  }

  async function setPartySize(value: number) {
    const clamped = Math.min(Math.max(Math.round(value) || 1, 1), 50)
    tripServings.value = clamped

    // Rescales any meal that's already selected - it doesn't turn any new meals on.
    for (const selection of daySelections.value) {
      if (selection.breakfast !== null) selection.breakfast = clamped
      if (selection.lunch !== null) selection.lunch = clamped
      if (selection.dinner !== null) selection.dinner = clamped
    }

    await persistNow(true)
  }

  function setName(value: string) {
    name.value = value
    nameEditedManually.value = true
    persistDebounced()
  }

  /** Saves the current shopping list under its own id and navigates to its shareable page. */
  async function openShoppingList() {
    if (!itinerary.value) return

    shoppingListLoading.value = true
    errorMessage.value = ''

    try {
      const list = await $fetch<{ id: string }>('/api/shopping-lists', {
        method: 'POST',
        body: {
          title: `${itinerary.value.days}-Day Trip`,
          items: itinerary.value.shoppingList
        }
      })
      await navigateTo(`/shopping-list/${list.id}`)
    } catch (error: any) {
      errorMessage.value = error.data?.message ?? error.statusMessage ?? 'Something went wrong creating the shopping list.'
    } finally {
      shoppingListLoading.value = false
    }
  }

  async function refreshRecipe(dayNumber: number, entry: MealEntry) {
    const key = slotKey(dayNumber, entry.slot)
    refreshingSlot.value = key
    errorMessage.value = ''

    try {
      itinerary.value = await $fetch<ItineraryResponse>('/api/itinerary/refresh-recipe', {
        method: 'POST',
        body: {
          country: COUNTRY,
          days: daySelections.value,
          extraRecipes: extraRecipes.value,
          day: dayNumber,
          slot: entry.slot,
          excludeRecipeId: entry.recipe.id
        }
      })
      persistDebounced()
    } catch (error: any) {
      errorMessage.value = error.data?.message ?? error.statusMessage ?? 'Something went wrong refreshing that recipe.'
    } finally {
      refreshingSlot.value = null
    }
  }

  /** Clears a single (day, slot) meal, dropping that recipe out of the trip entirely. */
  async function removeRecipe(dayNumber: number, entry: MealEntry) {
    const key = slotKey(dayNumber, entry.slot)
    refreshingSlot.value = key
    errorMessage.value = ''

    const selection = daySelections.value[dayNumber - 1]
    if (selection) setSelectionValue(selection, entry.slot, null)

    try {
      itinerary.value = await $fetch<ItineraryResponse>('/api/itinerary', {
        method: 'POST',
        body: { country: COUNTRY, days: daySelections.value, extraRecipes: extraRecipes.value }
      })
      persistDebounced()
    } catch (error: any) {
      errorMessage.value = error.data?.message ?? error.statusMessage ?? 'Something went wrong removing that recipe.'
    } finally {
      refreshingSlot.value = null
    }
  }

  /** Re-scales a single (day, slot) meal to a new servings count, keeping the same recipe. */
  async function changeServings(dayNumber: number, entry: MealEntry, servings: number) {
    const key = slotKey(dayNumber, entry.slot)
    refreshingSlot.value = key
    errorMessage.value = ''

    const selection = daySelections.value[dayNumber - 1]
    if (selection) setSelectionValue(selection, entry.slot, servings)

    try {
      itinerary.value = await $fetch<ItineraryResponse>('/api/itinerary', {
        method: 'POST',
        body: { country: COUNTRY, days: daySelections.value, extraRecipes: extraRecipes.value }
      })
      persistDebounced()
    } catch (error: any) {
      errorMessage.value = error.data?.message ?? error.statusMessage ?? 'Something went wrong updating servings.'
    } finally {
      refreshingSlot.value = null
    }
  }

  /** Which selection field on a MealSelection a given slot corresponds to. */
  function selectionValue(selection: MealSelection, slot: MealSlot): number | null {
    if (slot === 'BREAKFAST') return selection.breakfast
    if (slot === 'LUNCH') return selection.lunch
    if (slot === 'DINNER') return selection.dinner
    return selection.dessert
  }

  function setSelectionValue(selection: MealSelection, slot: MealSlot, value: number | null) {
    if (slot === 'BREAKFAST') selection.breakfast = value
    else if (slot === 'LUNCH') selection.lunch = value
    else if (slot === 'DINNER') selection.dinner = value
    else selection.dessert = value
  }

  /**
   * Places an exact recipe into a specific (day, slot) meal, activating that
   * slot with the trip-wide servings count first if it wasn't already selected.
   */
  async function addRecipe(dayNumber: number, slot: MealSlot, recipe: Recipe) {
    addingRecipeId.value = recipe.id
    errorMessage.value = ''

    const selection = daySelections.value[dayNumber - 1]
    if (selection && selectionValue(selection, slot) === null) {
      setSelectionValue(selection, slot, tripServings.value)
    }

    try {
      itinerary.value = await $fetch<ItineraryResponse>('/api/itinerary/add-recipe', {
        method: 'POST',
        body: {
          country: COUNTRY,
          days: daySelections.value,
          extraRecipes: extraRecipes.value,
          day: dayNumber,
          slot,
          recipeId: recipe.id
        }
      })
      persistDebounced()
    } catch (error: any) {
      errorMessage.value = error.data?.message ?? error.statusMessage ?? 'Something went wrong adding that recipe.'
    } finally {
      addingRecipeId.value = null
    }
  }

  /**
   * Adds a recipe to the trip without tying it to any day or meal - it's still
   * scaled to the trip-wide servings count and folded into the shopping list. Used by the
   * Explore Recipes page's "Add to Itinerary" button and by a recipe PDF's QR code.
   */
  async function addExtraRecipe(recipe: Recipe) {
    await initialize()
    addingRecipeId.value = recipe.id
    errorMessage.value = ''

    if (!extraRecipes.value.some((extra) => extra.recipeId === recipe.id)) {
      extraRecipes.value = [...extraRecipes.value, { recipeId: recipe.id, servings: tripServings.value }]
    }

    try {
      itinerary.value = await $fetch<ItineraryResponse>('/api/itinerary', {
        method: 'POST',
        body: { country: COUNTRY, days: daySelections.value, extraRecipes: extraRecipes.value }
      })
      persistDebounced()
    } catch (error: any) {
      errorMessage.value = error.data?.message ?? error.statusMessage ?? 'Something went wrong adding that recipe.'
    } finally {
      addingRecipeId.value = null
    }
  }

  /** Removes a recipe added without a day, and refreshes the itinerary/shopping list to match. */
  async function removeExtraRecipe(recipeId: string) {
    extraRecipes.value = extraRecipes.value.filter((extra) => extra.recipeId !== recipeId)
    if (!itinerary.value) return

    errorMessage.value = ''

    try {
      itinerary.value = await $fetch<ItineraryResponse>('/api/itinerary', {
        method: 'POST',
        body: { country: COUNTRY, days: daySelections.value, extraRecipes: extraRecipes.value }
      })
      persistDebounced()
    } catch (error: any) {
      errorMessage.value = error.data?.message ?? error.statusMessage ?? 'Something went wrong removing that recipe.'
    }
  }

  /**
   * Moves a recipe out of "extras" and into a specific day + slot - the only way a recipe
   * can be assigned to a day, since Explore Recipes only offers "Add to Itinerary". The
   * caller picks the slot (see {@link targetSlotsFor}) since a Main recipe could go into
   * either Lunch or Dinner. If that meal is already taken, the displaced recipe becomes an
   * extra itself rather than being dropped from the trip.
   */
  async function assignExtraToDay(recipe: Recipe, dayNumber: number, slot: MealSlot) {
    const day = itinerary.value?.itinerary.find((d) => d.day === dayNumber)
    const displaced = day ? recipeForSlot(day, slot) : null

    let nextExtras = extraRecipes.value.filter((extra) => extra.recipeId !== recipe.id)
    if (displaced && displaced.id !== recipe.id) {
      nextExtras = [...nextExtras, { recipeId: displaced.id, servings: displaced.servings }]
    }
    extraRecipes.value = nextExtras

    await addRecipe(dayNumber, slot, recipe)
  }

  return {
    itineraryId,
    name,
    startDate,
    endDate,
    tripLength,
    tripServings,
    daySelections,
    extraRecipes,
    itinerary,
    saving,
    shoppingListLoading,
    errorMessage,
    refreshingSlot,
    addingRecipeId,
    initialize,
    setName,
    setStartDate,
    setEndDate,
    setPartySize,
    openShoppingList,
    refreshRecipe,
    removeRecipe,
    changeServings,
    addRecipe,
    addExtraRecipe,
    removeExtraRecipe,
    assignExtraToDay
  }
}
