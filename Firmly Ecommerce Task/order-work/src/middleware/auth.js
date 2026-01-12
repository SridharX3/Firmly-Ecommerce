import { json } from '../response.js';
import { verifyToken } from '../utils/jwt.js';
import { getCookie, clearAuthCookie } from '../utils/cookie.js';

export async function requireAuth(req, env, ctx) {
  const token = getCookie(req, 'auth_token');

  if (!token) {
    console.error('[Auth] Missing auth_token cookie. Cookies:', req.headers.get('Cookie'));
    return json({ error: 'Unauthorized: Missing auth_token' }, 401, req);
  }

  if (!env.JWT_SECRET) {
    console.error('[Auth] JWT_SECRET is missing in environment variables');
    return json({ error: 'Server Configuration Error' }, 500, req);
  }

  try {
    const payload = await verifyToken(token, env.JWT_SECRET);
    req.userId = payload.sub || payload.user_id;

    if (!req.userId) {
      console.error('[Auth] Token payload missing user_id:', payload);
      throw new Error('User ID missing in token');
    }
  } catch (err) {
    console.error('[Auth] Token verification failed:', err.message);
    
    // Extract domain from request to ensure cookie clearing works for the specific host
    const url = new URL(req.url);
    const domain = url.hostname;

    // Token is invalid or expired; clear it to prevent infinite loops
    const res = json({ error: `Unauthorized: ${err.message}` }, 401, req);
    res.headers.append('Set-Cookie', clearAuthCookie(domain));
    return res;
  }
}