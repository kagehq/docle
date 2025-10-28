// Create new endpoint
export default defineEventHandler(async (event) => {
  // Get session token from cookie
  const cookieHeader = event.node.req.headers.cookie || '';
  const match = cookieHeader.match(/docle_session=([^;]+)/);
  const sessionToken = match ? match[1] : null;

  if (!sessionToken) {
    setResponseStatus(event, 401);
    return { error: 'Unauthorized' };
  }

  // Get request body
  const body = await readBody(event);

  // Forward to backend with cookie
  const backendUrl = 'http://localhost:8787/api/endpoints';

  try {
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Cookie': `docle_session=${sessionToken}`,
        'Content-Type': 'application/json',
        'accept-encoding': 'identity'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.json();
      setResponseStatus(event, response.status);
      return error;
    }

    return await response.json();
  } catch (error: any) {
    console.error('[Endpoints API] Error:', error);
    setResponseStatus(event, 500);
    return { error: 'Failed to create endpoint' };
  }
});

