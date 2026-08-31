export interface Ingredient {
  name: string
  quantity: number
  unit: string
}

export interface Recipe {
  id: string
  name: string
  country: string
  region: string | null
  location: string | null
  mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER'
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | null
  prepTime: number
  cookTime: number
  servings: number
  localContext: string | null
  ingredients: Ingredient[]
}

export interface DayPlan {
  day: number
  breakfast: Recipe
  lunch: Recipe
  dinner: Recipe
}

export interface ItineraryResponse {
  country: string
  days: number
  itinerary: DayPlan[]
  shoppingList: Ingredient[]
}
