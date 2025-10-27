// Logout endpoint - accepts both GET and POST
export default defineEventHandler(async (event) => {
  // Get session token from cookie
  const cookieHeader = event.node.req.headers.cookie || '';
  const match = cookieHeader.match(/docle_session=([^;]+)/);
  const sessionToken = match ? match[1] : null;
  
  if (sessionToken) {
    // Forward to backend to delete session
    const backendUrl = 'http://localhost:8787/api/logout';
    
    try {
      await fetch(backendUrl, {
        method: 'GET',
        headers: {
          'Cookie': `docle_session=${sessionToken}`,
          'accept-encoding': 'identity'
        },
      });
    } catch (error) {
      console.error('[Logout API] Error:', error);
    }
  }
  
  // Clear cookie on frontend
  const isProduction = false; // Always false in dev
  const cookieFlags = `HttpOnly; ${isProduction ? 'Secure; ' : ''}SameSite=Lax; Max-Age=0; Path=/`;
  
  setHeader(event, 'set-cookie', `docle_session=; ${cookieFlags}`);
  
  return { success: true, message: 'Logged out successfully' };
});

