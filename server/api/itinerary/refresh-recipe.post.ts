import type { ItineraryResponse, RefreshRecipeRequest } from '~~/shared/types/itinerary'

export default defineEventHandler(async (event) => {
  const { apiBase } = useRuntimeConfig()
  const body = await readBody<RefreshRecipeRequest>(event)

  try {
    return await $fetch<ItineraryResponse>('/api/itinerary/refresh-recipe', { baseURL: apiBase, method: 'POST', body })
  } catch (error: any) {
    throw createError({
      statusCode: error.response?.status ?? 502,
      statusMessage: error.data?.message ?? 'Failed to reach holiday-food-api'
    })
  }
})
