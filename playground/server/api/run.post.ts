// Proxy code execution requests to backend
export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  // Get Authorization header
  const authHeader = event.node.req.headers.authorization

  if (!authHeader) {
    setResponseStatus(event, 401)
    return { error: 'API key required' }
  }

  // Forward to backend
  const backendUrl = `http://localhost:8787/api/run`

  try {
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
        'accept-encoding': 'identity'
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const errorData = await response.json()
      setResponseStatus(event, response.status)
      return errorData
    }

    return await response.json()
  } catch (error) {
    console.error('[Run] Error:', error)
    setResponseStatus(event, 500)
    return { error: 'Failed to execute code' }
  }
})

