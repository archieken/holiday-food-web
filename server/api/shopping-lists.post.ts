import type { CreateShoppingListRequest, ShoppingList } from '~~/shared/types/shopping-list'

export default defineEventHandler(async (event) => {
  const { apiBase } = useRuntimeConfig()
  const body = await readBody<CreateShoppingListRequest>(event)

  try {
    return await $fetch<ShoppingList>('/api/shopping-lists', { baseURL: apiBase, method: 'POST', body })
  } catch (error: any) {
    throw createError({
      statusCode: error.response?.status ?? 502,
      statusMessage: error.data?.message ?? 'Failed to reach holiday-food-api'
    })
  }
})
