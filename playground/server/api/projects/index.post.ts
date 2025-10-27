// Create a new project
export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  
  // Get session token from cookie
  const cookieHeader = event.node.req.headers.cookie || '';
  const match = cookieHeader.match(/docle_session=([^;]+)/);
  const sessionToken = match ? match[1] : null;
  
  if (!sessionToken) {
    setResponseStatus(event, 401);
    return { error: 'Unauthorized' };
  }
  
  // Forward to backend
  const backendUrl = 'http://localhost:8787/api/projects';
  
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
    console.error('[Projects API] Error:', error);
    setResponseStatus(event, 500);
    return { error: 'Failed to create project' };
  }
});

