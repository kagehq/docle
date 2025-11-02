// Get or create playground API key
export default defineEventHandler(async (event) => {
  // Get session token from cookie
  const cookieHeader = event.node.req.headers.cookie || ''
  const match = cookieHeader.match(/docle_session=([^;]+)/)
  const sessionToken = match ? match[1] : null

  if (!sessionToken) {
    setResponseStatus(event, 401)
    return { error: 'Not authenticated' }
  }

  // Forward to backend
  const backendUrl = `${getBackendUrl()}/api/playground/key`

  try {
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Cookie': `docle_session=${sessionToken}`,
        'accept-encoding': 'identity'
      }
    })

    if (!response.ok) {
      const errorData = await response.json()
      setResponseStatus(event, response.status)
      return errorData
    }

    return await response.json()
  } catch (error) {
    console.error('[Playground Key] Error:', error)
    setResponseStatus(event, 500)
    return { error: 'Failed to get playground API key' }
  }
})

