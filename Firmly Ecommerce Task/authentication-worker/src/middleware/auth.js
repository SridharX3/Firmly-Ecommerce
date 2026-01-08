import { json } from '../response.js';
import { getCookie } from '../utils/cookie.js';
import { withSpan } from '../observability/otel.js';

export async function requireAuth(request, env, ctx) {
  return withSpan(ctx, 'auth.require', {}, async (span) => {
    const sessionId = getCookie(request, 'session_id');
    span.setAttribute('session.id', sessionId || 'none');

    if (!sessionId) {
      span.setAttribute('auth.result', 'missing_session');
      return json({ error: 'Authentication required' }, 401, request);
    }

    if (!env?.SESSION_KV) {
      span.setAttribute('auth.error', 'kv_binding_missing');
      return json({ error: 'Internal server error: Session store unavailable' }, 500, request);
    }

    let session;
    try {
      session = await withSpan(
        ctx,
        'kv.get.session',
        { 'session.id': sessionId },
        async () => {
          return await env.SESSION_KV.get(sessionId, 'json');
        }
      );
    } catch (err) {
      span.recordException(err);
      span.setAttribute('auth.result', 'kv_error');
      return json({ error: 'Failed to retrieve session' }, 500, request);
    }

    if (!session || !session.user_id) {
      span.setAttribute('auth.result', 'invalid_session');
      return json({ error: 'Invalid or expired session' }, 401, request);
    }

    request.user = session;
    span.setAttribute('auth.user_id', session.user_id);
    span.setAttribute('auth.result', 'success');

    return null;
  });
}
