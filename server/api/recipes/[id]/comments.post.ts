import type { Comment, CreateCommentRequest } from '~~/shared/types/itinerary'

export default defineEventHandler(async (event) => {
  const { apiBase } = useRuntimeConfig()
  const id = getRouterParam(event, 'id')
  const body = await readBody<CreateCommentRequest>(event)
  const authorization = getHeader(event, 'authorization')

  try {
    return await $fetch<Comment>(`/api/recipes/${id}/comments`, {
      baseURL: apiBase,
      method: 'POST',
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
