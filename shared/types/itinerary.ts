export interface Ingredient {
  name: string
  quantity: number
  unit: string
}

export interface Recipe {
  id: string
  name: string
  country: string
  mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER'
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
