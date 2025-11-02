// Execute instant endpoint (public - no auth required)
export default defineEventHandler(async (event) => {
  // Get endpoint ID from route
  const id = event.context.params?.id;

  if (!id) {
    setResponseStatus(event, 400);
    return { error: 'Endpoint ID required' };
  }

  // Get request details
  const method = event.node.req.method || 'GET';
  const query = getQuery(event);

  let body = null;
  if (method !== 'GET') {
    try {
      body = await readBody(event);
    } catch (e) {
      // No body or invalid body
    }
  }

  // Forward to backend
  const backendUrl = `${getBackendUrl()}/api/e/${id}`;

  // Build query string
  const queryString = new URLSearchParams(query as any).toString();
  const fullUrl = queryString ? `${backendUrl}?${queryString}` : backendUrl;

  try {
    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'accept-encoding': 'identity'
      }
    };

    if (body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(fullUrl, fetchOptions);

    if (!response.ok) {
      const error = await response.json();
      setResponseStatus(event, response.status);
      return error;
    }

    const contentType = response.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      return await response.json();
    } else {
      return await response.text();
    }
  } catch (error: any) {
    console.error('[Execute Endpoint API] Error:', error);
    setResponseStatus(event, 500);
    return { error: 'Failed to execute endpoint' };
  }
});

