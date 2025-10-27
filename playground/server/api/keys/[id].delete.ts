// Revoke/Delete an API key
export default defineEventHandler(async (event) => {
  const id = event.context.params?.id
  if (!id) {
    setResponseStatus(event, 400)
    return { error: 'Key ID is required' }
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
  const backendUrl = `http://localhost:8787/api/keys/${id}`
  try {
    const response = await fetch(backendUrl, {
      method: 'DELETE',
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
    console.error('[API Keys] Revoke error:', error)
    setResponseStatus(event, 500)
    return { error: 'Failed to revoke API key' }
  }
})
