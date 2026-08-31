import type { ShoppingList } from '~~/shared/types/shopping-list'

export default defineEventHandler(async (event) => {
  const { apiBase } = useRuntimeConfig()
  const id = getRouterParam(event, 'id')
  const itemId = getRouterParam(event, 'itemId')
  const body = await readBody<{ checked: boolean }>(event)

  try {
    return await $fetch<ShoppingList>(`/api/shopping-lists/${id}/items/${itemId}`, {
      baseURL: apiBase,
      method: 'PATCH',
      body
    })
  } catch (error: any) {
    throw createError({
      statusCode: error.response?.status ?? 502,
      statusMessage: error.data?.message ?? 'Failed to reach holiday-food-api'
    })
  }
})
