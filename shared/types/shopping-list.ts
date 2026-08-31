import type { Ingredient } from '~~/shared/types/itinerary'

export interface ShoppingListItem {
  id: string
  name: string
  quantity: number
  unit: string
  translatedName: string | null
  checked: boolean
  /** Recipe(s) this quantity was combined from. */
  recipeNames: string[]
}

export interface ShoppingList {
  id: string
  title: string | null
  items: ShoppingListItem[]
}

export interface CreateShoppingListRequest {
  title?: string | null
  items: Ingredient[]
}
