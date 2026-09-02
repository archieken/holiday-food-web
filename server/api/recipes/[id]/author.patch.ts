import type { Recipe } from '~~/shared/types/itinerary'

export default defineEventHandler(async (event) => {
  const { apiBase } = useRuntimeConfig()
  const id = getRouterParam(event, 'id')
  const body = await readBody<{ email: string | null, name: string | null }>(event)
  const authorization = getHeader(event, 'authorization')

  try {
    return await $fetch<Recipe>(`/api/recipes/${id}/author`, {
      baseURL: apiBase,
      method: 'PATCH',
      body,
      headers: authorization ? { Authorization: authorization } : {}
    })
  } catch (error: any) {
    throw createError({
      statusCode: error.response?.status ?? 502,
      statusMessage: error.data?.message ?? 'Failed to reach holiday-food-api'
    })
  }
})
