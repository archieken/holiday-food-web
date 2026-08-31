export default defineEventHandler(async (event) => {
  const { apiBase } = useRuntimeConfig()
  const id = getRouterParam(event, 'id')
  const commentId = getRouterParam(event, 'commentId')
  const authorization = getHeader(event, 'authorization')

  try {
    await $fetch(`/api/recipes/${id}/comments/${commentId}`, {
      baseURL: apiBase,
      method: 'DELETE',
      headers: authorization ? { Authorization: authorization } : {}
    })
    return { success: true }
  } catch (error: any) {
    throw createError({
      statusCode: error.response?.status ?? 502,
      statusMessage: error.data?.message ?? 'Failed to reach holiday-food-api'
    })
  }
})
