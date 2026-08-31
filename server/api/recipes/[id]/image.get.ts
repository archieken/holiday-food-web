export default defineEventHandler(async (event) => {
  const { apiBase } = useRuntimeConfig()
  const id = getRouterParam(event, 'id')

  const response = await fetch(new URL(`/api/recipes/${id}/image`, apiBase))

  if (!response.ok) {
    throw createError({ statusCode: response.status, statusMessage: 'Failed to reach holiday-food-api' })
  }

  setHeader(event, 'Content-Type', response.headers.get('content-type') ?? 'image/jpeg')
  // Photos never change once published, so let the browser cache them aggressively.
  setHeader(event, 'Cache-Control', 'public, max-age=86400')

  return Buffer.from(await response.arrayBuffer())
})
