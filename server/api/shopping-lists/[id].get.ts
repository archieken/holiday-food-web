import type { ShoppingList } from '~~/shared/types/shopping-list'

export default defineEventHandler(async (event) => {
  const { apiBase } = useRuntimeConfig()
  const id = getRouterParam(event, 'id')

  try {
    return await $fetch<ShoppingList>(`/api/shopping-lists/${id}`, { baseURL: apiBase })
  } catch (error: any) {
    throw createError({
      statusCode: error.response?.status ?? 502,
      statusMessage: error.data?.message ?? 'Failed to reach holiday-food-api'
    })
  }
})
