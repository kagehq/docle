// Handle magic link token verification
export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const rawToken = body?.token;
  const token =
    typeof rawToken === 'string'
      ? rawToken.split(/[?#]/)[0]
      : Array.isArray(rawToken)
        ? String(rawToken[0]).split(/[?#]/)[0]
        : '';

  if (!token) {
    setResponseStatus(event, 400);
    return { error: 'Token is required' };
  }

  // Forward to backend with the token as query param
  const backendUrl = `${getBackendUrl()}/auth/verify?token=${encodeURIComponent(token)}`;

  try {
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'accept-encoding': 'identity', // Disable compression
        'x-nuxt-api': 'true' // Tell backend this is an API call, not direct browser access
      }
    });

    if (response.ok) {
      // Backend returns success and user, and sets cookie via Set-Cookie header
      const data = await response.json();

      if (data.success) {
        // Forward the Set-Cookie header from backend
        const setCookie = response.headers.get('set-cookie');
        if (setCookie) {
          setHeader(event, 'set-cookie', setCookie);
        }

        return { success: true, user: data.user };
      }
    }

    // If not successful, return error
    setResponseStatus(event, 401);
    return { error: 'Invalid or expired token' };
  } catch (error: any) {
    console.error('[Verify] Token verification error:', error);
    setResponseStatus(event, 500);
    return { error: 'Verification failed' };
  }
});
