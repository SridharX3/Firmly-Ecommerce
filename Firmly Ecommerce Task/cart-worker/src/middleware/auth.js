import { json } from '../response.js';
import { getCookie, clearAuthCookie } from '../utils/cookie.js';
import { verifyToken } from '../utils/jwt.js';

export async function requireAuth(request, env, ctx) {
  request.env = env;

  // 1. Extract Cookie
  // The browser sends the cookie automatically. We just need to read it.
  const token = getCookie(request, 'auth_token');

  if (!token) {
    return json({ error: 'Authentication token is missing' }, { status: 401, request });
  }

  // 2. Verify Signature
  if (!env.JWT_SECRET) {
    console.error('JWT_SECRET is missing in environment variables');
    return json({ error: 'Internal server error: Configuration missing' }, { status: 500, request });
  }

  try {
    const payload = await verifyToken(token, env.JWT_SECRET);
    // 3. Trust User
    request.user = payload;
  } catch (err) {
    console.error('Auth Verification Failed:', err);
    // Return the specific error message (e.g., "Token expired") to help debugging
    return json({ error: err.message || 'Invalid or expired token' }, {
      status: 401,
      headers: { 'Set-Cookie': clearAuthCookie() },
      request
    });
  }
}