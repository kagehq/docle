// Get dashboard data (user info and projects)
export default defineEventHandler(async (event) => {
  // Get session token from cookie
  const cookieHeader = event.node.req.headers.cookie || '';
  const match = cookieHeader.match(/docle_session=([^;]+)/);
  const sessionToken = match ? match[1] : null;

  if (!sessionToken) {
    setResponseStatus(event, 401);
    return { error: 'Unauthorized' };
  }

  // Forward to backend with cookie
  const backendUrl = 'http://localhost:8787/api/dashboard';

  try {
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Cookie': `docle_session=${sessionToken}`,
        'accept-encoding': 'identity'
      },
    });

    if (!response.ok) {
      const error = await response.json();
      setResponseStatus(event, response.status);
      return error;
    }

    return await response.json();
  } catch (error: any) {
    console.error('[Dashboard API] Error:', error);
    setResponseStatus(event, 500);
    return { error: 'Failed to fetch dashboard data' };
  }
});

