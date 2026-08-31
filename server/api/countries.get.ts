export default defineEventHandler(async (event) => {
  const { apiBase } = useRuntimeConfig()

  try {
    return await $fetch<string[]>('/api/countries', { baseURL: apiBase })
  } catch (error: any) {
    throw createError({
      statusCode: error.response?.status ?? 502,
      statusMessage: error.data?.message ?? 'Failed to reach holiday-food-api'
    })
  }
})
