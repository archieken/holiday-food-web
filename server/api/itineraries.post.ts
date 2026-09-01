import type { SaveItineraryRequest, SavedItineraryResponse } from '~~/shared/types/itinerary'

export default defineEventHandler(async (event) => {
  const { apiBase } = useRuntimeConfig()
  const body = await readBody<SaveItineraryRequest>(event)

  try {
    return await $fetch<SavedItineraryResponse>('/api/itineraries', { baseURL: apiBase, method: 'POST', body })
  } catch (error: any) {
    throw createError({
      statusCode: error.response?.status ?? 502,
      statusMessage: error.data?.message ?? 'Failed to reach holiday-food-api'
    })
  }
})
