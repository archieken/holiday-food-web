export default defineEventHandler(async (event) => {
  const { apiBase } = useRuntimeConfig()
  const id = getRouterParam(event, 'id')

  const response = await fetch(new URL(`/api/recipes/${id}/pdf`, apiBase))

  if (!response.ok) {
    const responseBody = await response.text()
    let message = 'Failed to reach holiday-food-api'
    try {
      message = JSON.parse(responseBody).message ?? message
    } catch {
      // backend returned a non-JSON error body, fall back to the default message
    }
    throw createError({ statusCode: response.status, statusMessage: message })
  }

  setHeader(event, 'Content-Type', 'application/pdf')
  const disposition = response.headers.get('content-disposition')
  if (disposition) setHeader(event, 'Content-Disposition', disposition)

  return Buffer.from(await response.arrayBuffer())
})
