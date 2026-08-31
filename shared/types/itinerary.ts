export interface Ingredient {
  name: string
  quantity: number
  unit: string
  translatedName: string | null
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
  instructions: string[]
  /** Null for the built-in catalogue; set for a recipe someone imported/created. */
  createdByEmail: string | null
  createdByName: string | null
  likeCount: number
  likedByMe: boolean
}

export interface LikeStatus {
  likeCount: number
  likedByMe: boolean
}

export interface Comment {
  id: string
  recipeId: string
  authorEmail: string
  authorName: string | null
  text: string
  /** ISO 8601 timestamp. */
  createdAt: string
}

export interface CreateCommentRequest {
  text: string
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
  town: string | null
  days: number
  itinerary: DayPlan[]
  shoppingList: Ingredient[]
  extras: Recipe[]
}

/** A recipe added to the trip without being tied to a specific day. */
export interface ExtraRecipeSelection {
  recipeId: string
  servings: number
}

/** Number of people to cook that course for, or null to skip it. */
export interface CourseSelection {
  starter: number | null
  main: number | null
  dessert: number | null
}

export interface MealSelection {
  breakfast: number | null
  lunch: CourseSelection
  dinner: CourseSelection
}

export interface ItineraryRequest {
  country: string
  town?: string | null
  days: MealSelection[]
  extraRecipes?: ExtraRecipeSelection[]
}

export interface RefreshRecipeRequest extends ItineraryRequest {
  day: number
  meal: 'BREAKFAST' | 'LUNCH' | 'DINNER'
  course: 'STARTER' | 'MAIN' | 'DESSERT' | null
  excludeRecipeId: string
}

export interface AddRecipeRequest extends ItineraryRequest {
  day: number
  meal: 'BREAKFAST' | 'LUNCH' | 'DINNER'
  course: 'STARTER' | 'MAIN' | 'DESSERT' | null
  recipeId: string
}

export interface RecipeImportRequest {
  /** A recipe name or a URL to a recipe page. */
  input: string
}

/** A recipe extracted by the AI, not yet saved - it has no id until it's reviewed and saved. */
export type RecipeDraft = Omit<Recipe, 'id'> & { id: string | null }
