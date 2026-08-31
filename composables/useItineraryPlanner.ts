import type { CourseSelection, DayPlan, ItineraryResponse, MealSelection, Recipe } from '~~/shared/types/itinerary'

// Every recipe is Portuguese, drawn from the full national catalogue - there's no
// country/town filtering to select here.
export const COUNTRY = 'Portugal'

export type Meal = 'BREAKFAST' | 'LUNCH' | 'DINNER'
export type CourseName = 'STARTER' | 'MAIN' | 'DESSERT'

export interface MealEntry {
  label: string
  recipe: Recipe
  meal: Meal
  course: CourseName | null
}

function defaultSelection(servings: number): MealSelection {
  return {
    breakfast: servings,
    lunch: { starter: null, main: servings, dessert: null },
    dinner: { starter: null, main: servings, dessert: null }
  }
}

/** Converts a number input's raw string value to a servings count, or null if it's empty/invalid. */
export function toServings(value: string): number | null {
  if (value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export function slotKey(day: number, meal: Meal, course: CourseName | null): string {
  return `${day}-${meal}-${course ?? ''}`
}

export function mealEntries(day: DayPlan): MealEntry[] {
  const candidates: { label: string; recipe: Recipe | null; meal: Meal; course: CourseName | null }[] = [
    { label: 'Breakfast', recipe: day.breakfast, meal: 'BREAKFAST', course: null },
    { label: 'Lunch - Starter', recipe: day.lunch.starter, meal: 'LUNCH', course: 'STARTER' },
    { label: 'Lunch - Main', recipe: day.lunch.main, meal: 'LUNCH', course: 'MAIN' },
    { label: 'Lunch - Dessert', recipe: day.lunch.dessert, meal: 'LUNCH', course: 'DESSERT' },
    { label: 'Dinner - Starter', recipe: day.dinner.starter, meal: 'DINNER', course: 'STARTER' },
    { label: 'Dinner - Main', recipe: day.dinner.main, meal: 'DINNER', course: 'MAIN' },
    { label: 'Dinner - Dessert', recipe: day.dinner.dessert, meal: 'DINNER', course: 'DESSERT' }
  ]
  return candidates.filter((entry): entry is MealEntry => entry.recipe !== null)
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

  const itinerary = useState<ItineraryResponse | null>('planner-itinerary', () => null)
  const loading = useState('planner-loading', () => false)
  const pdfLoading = useState('planner-pdf-loading', () => false)
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

  // The trip-wide servings selector sets breakfast + every main course across all days;
  // starters/desserts are left alone since they default to (and usually stay) unselected.
  watch(tripServings, (count) => {
    const clamped = Math.min(Math.max(Math.round(count) || 1, 1), 50)
    if (clamped !== count) {
      tripServings.value = clamped
      return
    }

    for (const selection of daySelections.value) {
      selection.breakfast = clamped
      selection.lunch.main = clamped
      selection.dinner.main = clamped
    }
  })

  async function generate() {
    loading.value = true
    errorMessage.value = ''
    itinerary.value = null

    try {
      itinerary.value = await $fetch<ItineraryResponse>('/api/itinerary', {
        method: 'POST',
        body: { country: COUNTRY, days: daySelections.value }
      })
    } catch (error: any) {
      errorMessage.value = error.data?.message ?? error.statusMessage ?? 'Something went wrong generating the itinerary.'
    } finally {
      loading.value = false
    }
  }

  async function openPdf() {
    // Open the tab synchronously, inside the click's user gesture, so the
    // browser doesn't treat it as a popup once we redirect it after the
    // (async) PDF fetch below resolves.
    const pdfWindow = window.open('', '_blank')

    pdfLoading.value = true
    errorMessage.value = ''

    try {
      const blob = await $fetch<Blob>('/api/itinerary/pdf', {
        method: 'POST',
        body: { country: COUNTRY, days: daySelections.value },
        responseType: 'blob'
      })
      const url = URL.createObjectURL(blob)
      if (pdfWindow) {
        pdfWindow.location.href = url
      } else {
        window.location.href = url
      }
    } catch (error: any) {
      pdfWindow?.close()
      errorMessage.value = error.data?.message ?? error.statusMessage ?? 'Something went wrong generating the PDF.'
    } finally {
      pdfLoading.value = false
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
    const key = slotKey(dayNumber, entry.meal, entry.course)
    refreshingSlot.value = key
    errorMessage.value = ''

    try {
      itinerary.value = await $fetch<ItineraryResponse>('/api/itinerary/refresh-recipe', {
        method: 'POST',
        body: {
          country: COUNTRY,
          days: daySelections.value,
          day: dayNumber,
          meal: entry.meal,
          course: entry.course,
          excludeRecipeId: entry.recipe.id
        }
      })
    } catch (error: any) {
      errorMessage.value = error.data?.message ?? error.statusMessage ?? 'Something went wrong refreshing that recipe.'
    } finally {
      refreshingSlot.value = null
    }
  }

  /** Which selection field on a MealSelection a given (meal, course) slot corresponds to. */
  function selectionValue(selection: MealSelection, meal: Meal, course: CourseName | null): number | null {
    if (meal === 'BREAKFAST') return selection.breakfast
    const courses: CourseSelection = meal === 'LUNCH' ? selection.lunch : selection.dinner
    if (course === 'STARTER') return courses.starter
    if (course === 'MAIN') return courses.main
    return courses.dessert
  }

  function setSelectionValue(selection: MealSelection, meal: Meal, course: CourseName | null, value: number) {
    if (meal === 'BREAKFAST') {
      selection.breakfast = value
      return
    }
    const courses: CourseSelection = meal === 'LUNCH' ? selection.lunch : selection.dinner
    if (course === 'STARTER') courses.starter = value
    else if (course === 'MAIN') courses.main = value
    else courses.dessert = value
  }

  /**
   * Places an exact recipe into a specific (day, meal, course) slot, activating that
   * slot with the trip-wide servings count first if it wasn't already selected.
   */
  async function addRecipe(dayNumber: number, meal: Meal, course: CourseName | null, recipe: Recipe) {
    addingRecipeId.value = recipe.id
    errorMessage.value = ''

    const selection = daySelections.value[dayNumber - 1]
    if (selection && selectionValue(selection, meal, course) === null) {
      setSelectionValue(selection, meal, course, tripServings.value)
    }

    try {
      itinerary.value = await $fetch<ItineraryResponse>('/api/itinerary/add-recipe', {
        method: 'POST',
        body: {
          country: COUNTRY,
          days: daySelections.value,
          day: dayNumber,
          meal,
          course,
          recipeId: recipe.id
        }
      })
    } catch (error: any) {
      errorMessage.value = error.data?.message ?? error.statusMessage ?? 'Something went wrong adding that recipe.'
    } finally {
      addingRecipeId.value = null
    }
  }

  return {
    days,
    tripServings,
    daySelections,
    itinerary,
    loading,
    pdfLoading,
    shoppingListLoading,
    errorMessage,
    refreshingSlot,
    addingRecipeId,
    generate,
    openPdf,
    openShoppingList,
    refreshRecipe,
    addRecipe
  }
}
