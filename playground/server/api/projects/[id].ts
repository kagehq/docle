// Get project details by ID
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

  // Forward to backend
  const backendUrl = `${getBackendUrl()}/api/projects/${id}`

  try {
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Cookie': `docle_session=${sessionToken}`,
        'accept-encoding': 'identity'
      },
    })

    if (!response.ok) {
      setResponseStatus(event, response.status)
      return await response.json()
    }

    return await response.json()
  } catch (error) {
    console.error('[Projects API] Error:', error)
    setResponseStatus(event, 500)
    return { error: 'Failed to fetch project' }
  }
})

