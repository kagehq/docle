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
      // Backend returns session token in response body
      const data = await response.json();

      if (data.success && data.sessionToken) {
        // Set the session cookie
        const isProduction = process.env.NODE_ENV === 'production';
        const cookieFlags = `HttpOnly; ${isProduction ? 'Secure; ' : ''}SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}; Path=/`;
        const cookieHeader = `docle_session=${data.sessionToken}; ${cookieFlags}`;

        setHeader(event, 'set-cookie', cookieHeader);

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
