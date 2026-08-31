import type { ItineraryRequest, ItineraryResponse } from '~~/shared/types/itinerary'

export default defineEventHandler(async (event) => {
  const { apiBase } = useRuntimeConfig()
  const body = await readBody<ItineraryRequest>(event)

  try {
    return await $fetch<ItineraryResponse>('/api/itinerary', { baseURL: apiBase, method: 'POST', body })
  } catch (error: any) {
    throw createError({
      statusCode: error.response?.status ?? 502,
      statusMessage: error.data?.message ?? 'Failed to reach holiday-food-api'
    })
  }
})
