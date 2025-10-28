// Generate API key for a project
export default defineEventHandler(async (event) => {
  const id = event.context.params?.id

  if (!id) {
    setResponseStatus(event, 400)
    return { error: 'Project ID is required' }
  }

  // Get session token from cookie
  const cookieHeader = event.node.req.headers.cookie || ''
  const match = cookieHeader.match(/docle_session=([^;]+)/)
  const sessionToken = match ? match[1] : null

  if (!sessionToken) {
    setResponseStatus(event, 401)
    return { error: 'Not authenticated' }
  }

  // Get request body
  const body = await readBody(event)

  // Forward to backend
  const backendUrl = `${getBackendUrl()}/api/projects/${id}/keys`

  try {
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Cookie': `docle_session=${sessionToken}`,
        'Content-Type': 'application/json',
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
    console.error('[API Keys] Error:', error)
    setResponseStatus(event, 500)
    return { error: 'Failed to generate API key' }
  }
})

