export default defineEventHandler(async (event) => {
  const { apiBase } = useRuntimeConfig()
  const query = getQuery(event)

  try {
    return await $fetch<string[]>('/api/towns', { baseURL: apiBase, query })
  } catch (error: any) {
    throw createError({
      statusCode: error.response?.status ?? 502,
      statusMessage: error.data?.message ?? 'Failed to reach holiday-food-api'
    })
  }
})
