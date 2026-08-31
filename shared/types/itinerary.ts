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
  course: 'STARTER' | 'MAIN' | 'DESSERT' | null
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | null
  prepTime: number
  cookTime: number
  servings: number
  localContext: string | null
  ingredients: Ingredient[]
}

export interface MealCourses {
  starter: Recipe | null
  main: Recipe | null
  dessert: Recipe | null
}

export interface DayPlan {
  day: number
  breakfast: Recipe | null
  lunch: MealCourses
  dinner: MealCourses
}

export interface ItineraryResponse {
  country: string
  days: number
  itinerary: DayPlan[]
  shoppingList: Ingredient[]
}

export interface CourseSelection {
  starter: boolean
  main: boolean
  dessert: boolean
}

export interface MealSelection {
  breakfast: boolean
  lunch: CourseSelection
  dinner: CourseSelection
}

export interface ItineraryRequest {
  country: string
  days: MealSelection[]
}
