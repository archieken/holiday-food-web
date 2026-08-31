export default defineEventHandler(async (event) => {
  const { apiBase } = useRuntimeConfig()
  const query = getQuery(event)

  const url = new URL('/api/itinerary/pdf', apiBase)
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) url.searchParams.set(key, String(value))
  }

  const response = await fetch(url)

  if (!response.ok) {
    const body = await response.text()
    let message = 'Failed to reach holiday-food-api'
    try {
      message = JSON.parse(body).message ?? message
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
