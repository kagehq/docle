// Handle magic link request
export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  // Forward to backend
  const backendUrl = `${getBackendUrl()}/auth/request`;

  try {
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'accept-encoding': 'identity',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      setResponseStatus(event, response.status);
      return data;
    }

    return data;
  } catch (error: any) {
    console.error('Auth request error:', error);
    setResponseStatus(event, 500);
    return { error: 'Failed to send magic link. Please try again.' };
  }
});
