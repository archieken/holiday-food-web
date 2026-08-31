import type { Recipe } from '~~/shared/types/itinerary'

export default defineEventHandler(async (event) => {
  const { apiBase } = useRuntimeConfig()
  const { country } = getQuery(event)
  const authorization = getHeader(event, 'authorization')

  try {
    return await $fetch<Recipe[]>('/api/recipes', {
      baseURL: apiBase,
      method: 'GET',
      query: { country },
      headers: authorization ? { Authorization: authorization } : {}
    })
  } catch (error: any) {
    throw createError({
      statusCode: error.response?.status ?? 502,
      statusMessage: error.data?.message ?? 'Failed to reach holiday-food-api'
    })
  }
})
