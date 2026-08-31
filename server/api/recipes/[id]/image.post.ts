export default defineEventHandler(async (event) => {
  const { apiBase } = useRuntimeConfig()
  const id = getRouterParam(event, 'id')
  const authorization = getHeader(event, 'authorization')
  const contentType = getHeader(event, 'content-type')
  const body = await readRawBody(event, false)

  try {
    await $fetch(`/api/recipes/${id}/image`, {
      baseURL: apiBase,
      method: 'POST',
      body,
      headers: {
        ...(contentType ? { 'content-type': contentType } : {}),
        ...(authorization ? { Authorization: authorization } : {})
      }
    })
  } catch (error: any) {
    throw createError({
      statusCode: error.response?.status ?? 502,
      statusMessage: error.data?.message ?? 'Failed to reach holiday-food-api'
    })
  }

  setResponseStatus(event, 204)
  return null
})
