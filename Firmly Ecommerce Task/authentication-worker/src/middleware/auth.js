import { json } from '../response.js';
import { getCookie } from '../utils/cookie.js';
import { withSpan } from '../observability/otel.js';
import { verifyToken } from '../utils/jwt.js';

export async function requireAuth(request, env, ctx) {
  return withSpan(ctx, 'auth.require', {}, async (span) => {
    const token = getCookie(request, 'auth_token');
    span.setAttribute('auth.token_present', !!token);

    if (!token) {
      span.setAttribute('auth.result', 'missing_token');
      return json({ error: 'Authentication required' }, 401, request);
    }

    if (!env?.JWT_SECRET) {
      span.setAttribute('auth.error', 'jwt_secret_missing');
      return json({ error: 'Internal server error: Configuration missing' }, 500, request);
    }

    let payload;
    try {
      payload = await withSpan(
        ctx,
        'jwt.verify',
        {},
        async () => {
          return await verifyToken(token, env.JWT_SECRET);
        }
      );
    } catch (err) {
      span.recordException(err);
      span.setAttribute('auth.result', 'invalid_token');
      return json({ error: 'Invalid or expired token' }, 401, request);
    }

    request.user = payload;
    span.setAttribute('auth.user_id', payload.user_id);
    span.setAttribute('auth.result', 'success');

    return null;
  });
}
