import type { ItineraryRequest } from '~~/shared/types/itinerary'

export default defineEventHandler(async (event) => {
  const { apiBase } = useRuntimeConfig()
  const body = await readBody<ItineraryRequest>(event)

  const response = await fetch(new URL('/api/itinerary/pdf', apiBase), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

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
