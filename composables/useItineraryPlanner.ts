import type { DayPlan, ExtraRecipeSelection, ItineraryResponse, MealSelection, MealSlot, Recipe } from '~~/shared/types/itinerary'

// Every recipe is Portuguese, drawn from the full national catalogue - there's no
// country/town filtering to select here.
export const COUNTRY = 'Portugal'

export interface MealEntry {
  label: string
  recipe: Recipe
  slot: MealSlot
}

function defaultSelection(servings: number): MealSelection {
  return { breakfast: servings, lunch: servings, dinner: servings, dessert: null }
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

/**
 * Shared itinerary-planning state, lifted out of any single page via useState()
 * so both the home page and the Explore Recipes page read/write the same trip.
 */
export function useItineraryPlanner() {
  const days = useState('planner-days', () => 3)
  const tripServings = useState('planner-trip-servings', () => 2)
  const daySelections = useState<MealSelection[]>('planner-day-selections', () =>
    Array.from({ length: days.value }, () => defaultSelection(tripServings.value))
  )
  const extraRecipes = useState<ExtraRecipeSelection[]>('planner-extra-recipes', () => [])

  const itinerary = useState<ItineraryResponse | null>('planner-itinerary', () => null)
  const loading = useState('planner-loading', () => false)
  const shoppingListLoading = useState('planner-shopping-list-loading', () => false)
  const errorMessage = useState('planner-error', () => '')
  const refreshingSlot = useState<string | null>('planner-refreshing-slot', () => null)
  const addingRecipeId = useState<string | null>('planner-adding-recipe-id', () => null)

  watch(days, (count) => {
    const clamped = Math.min(Math.max(Math.round(count) || 1, 1), 60)
    if (clamped !== count) {
      days.value = clamped
      return
    }

    const current = daySelections.value
    if (clamped > current.length) {
      for (let i = current.length; i < clamped; i++) current.push(defaultSelection(tripServings.value))
    } else {
      current.length = clamped
    }
  })

  // The trip-wide servings selector sets Breakfast, Lunch and Dinner across all days;
  // Dessert is left alone since it defaults to (and usually stays) unselected.
  watch(tripServings, (count) => {
    const clamped = Math.min(Math.max(Math.round(count) || 1, 1), 50)
    if (clamped !== count) {
      tripServings.value = clamped
      return
    }

    for (const selection of daySelections.value) {
      selection.breakfast = clamped
      selection.lunch = clamped
      selection.dinner = clamped
    }
  })

  async function generate() {
    loading.value = true
    errorMessage.value = ''
    itinerary.value = null

    try {
      itinerary.value = await $fetch<ItineraryResponse>('/api/itinerary', {
        method: 'POST',
        body: { country: COUNTRY, days: daySelections.value, extraRecipes: extraRecipes.value }
      })
    } catch (error: any) {
      errorMessage.value = error.data?.message ?? error.statusMessage ?? 'Something went wrong generating the itinerary.'
    } finally {
      loading.value = false
    }
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
    } catch (error: any) {
      errorMessage.value = error.data?.message ?? error.statusMessage ?? 'Something went wrong removing that recipe.'
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

    loading.value = true
    errorMessage.value = ''

    try {
      itinerary.value = await $fetch<ItineraryResponse>('/api/itinerary', {
        method: 'POST',
        body: { country: COUNTRY, days: daySelections.value, extraRecipes: extraRecipes.value }
      })
    } catch (error: any) {
      errorMessage.value = error.data?.message ?? error.statusMessage ?? 'Something went wrong removing that recipe.'
    } finally {
      loading.value = false
    }
  }

  /**
   * Moves a recipe out of "extras" and into a specific day + slot - the only way a recipe
   * can be assigned to a day, since Explore Recipes only offers "Add to Itinerary". The
   * caller picks the slot (see {@link targetSlotsFor}) since a Main recipe could go into
   * either Lunch or Dinner.
   */
  async function assignExtraToDay(recipe: Recipe, dayNumber: number, slot: MealSlot) {
    extraRecipes.value = extraRecipes.value.filter((extra) => extra.recipeId !== recipe.id)
    await addRecipe(dayNumber, slot, recipe)
  }

  return {
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
    addExtraRecipe,
    removeExtraRecipe,
    assignExtraToDay
  }
}
