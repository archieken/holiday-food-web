export default defineEventHandler(async (event) => {
  const { apiBase } = useRuntimeConfig()
  const { country } = getQuery(event)
  const authorization = getHeader(event, 'authorization')

  const url = new URL('/api/recipes/pdf', apiBase)
  if (country) url.searchParams.set('country', String(country))

  const response = await fetch(url, {
    headers: authorization ? { Authorization: authorization } : {}
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
