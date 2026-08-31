export interface Ingredient {
  name: string
  quantity: number
  unit: string
  translatedName: string | null
  /** Recipe(s) this quantity was combined from - empty on a recipe's own ingredient list. */
  recipeNames: string[]
}

export interface Recipe {
  id: string
  name: string
  country: string
  region: string | null
  location: string | null
  course: 'BREAKFAST' | 'STARTER' | 'MAIN' | 'DESSERT'
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

/** Which of a day's four planned meals a recipe fills. */
export type MealSlot = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'DESSERT'

export interface DayPlan {
  day: number
  breakfast: Recipe | null
  lunch: Recipe | null
  dinner: Recipe | null
  dessert: Recipe | null
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

/** What a single day of the trip should include: how many people to cook each
 * meal for, or null to skip it. */
export interface MealSelection {
  breakfast: number | null
  lunch: number | null
  dinner: number | null
  dessert: number | null
}

export interface ItineraryRequest {
  country: string
  town?: string | null
  days: MealSelection[]
  extraRecipes?: ExtraRecipeSelection[]
}

export interface RefreshRecipeRequest extends ItineraryRequest {
  day: number
  slot: MealSlot
  excludeRecipeId: string
}

export interface AddRecipeRequest extends ItineraryRequest {
  day: number
  slot: MealSlot
  recipeId: string
}

export interface RecipeImportRequest {
  /** A recipe name or a URL to a recipe page. */
  input: string
}

/** A recipe extracted by the AI, not yet saved - it has no id until it's reviewed and saved. */
export type RecipeDraft = Omit<Recipe, 'id'> & { id: string | null }

export interface RecipeImportResult {
  recipe: RecipeDraft
  /** A base64 data URL for a photo auto-fetched from the source page, or null if none was found. */
  imageDataUrl: string | null
}
