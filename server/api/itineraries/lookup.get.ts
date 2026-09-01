import type { SavedItineraryResponse } from '~~/shared/types/itinerary'

/** The saved itinerary covering `?date=YYYY-MM-DD`, or null if the household hasn't planned one. */
export default defineEventHandler(async (event) => {
  const { apiBase } = useRuntimeConfig()
  const { date } = getQuery(event)

  try {
    return await $fetch<SavedItineraryResponse>('/api/itineraries/lookup', { baseURL: apiBase, query: { date } })
  } catch (error: any) {
    if (error.response?.status === 404) return null
    throw createError({
      statusCode: error.response?.status ?? 502,
      statusMessage: error.data?.message ?? 'Failed to reach holiday-food-api'
    })
  }
})
