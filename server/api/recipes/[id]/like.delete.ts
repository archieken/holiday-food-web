import type { LikeStatus } from '~~/shared/types/itinerary'

export default defineEventHandler(async (event) => {
  const { apiBase } = useRuntimeConfig()
  const id = getRouterParam(event, 'id')
  const authorization = getHeader(event, 'authorization')

  try {
    return await $fetch<LikeStatus>(`/api/recipes/${id}/like`, {
      baseURL: apiBase,
      method: 'DELETE',
      headers: authorization ? { Authorization: authorization } : {}
    })
  } catch (error: any) {
    throw createError({
      statusCode: error.response?.status ?? 502,
      statusMessage: error.data?.message ?? 'Failed to reach holiday-food-api'
    })
  }
})
