import type { AuthUser } from '~~/composables/useAuth'

export default defineEventHandler(async (event) => {
  const { apiBase } = useRuntimeConfig()
  const authorization = getHeader(event, 'authorization')

  try {
    return await $fetch<AuthUser>('/api/auth/me', {
      baseURL: apiBase,
      headers: authorization ? { Authorization: authorization } : {}
    })
  } catch (error: any) {
    throw createError({
      statusCode: error.response?.status ?? 502,
      statusMessage: error.data?.message ?? 'Failed to reach holiday-food-api'
    })
  }
})
