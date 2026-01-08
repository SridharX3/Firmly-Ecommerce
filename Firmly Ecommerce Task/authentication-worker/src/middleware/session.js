import { getCookie } from '../utils/cookie.js';
import { withSpan } from '../observability/otel.js';

export async function attachSession(request, env, ctx) {
  return withSpan(ctx, 'session.attach', {}, async (span) => {
    const sessionId = getCookie(request, 'session_id');

    if (!sessionId) {
      request.session = null;
      return null;
    }

    span.setAttribute('session.id', sessionId);

    if (!env?.SESSION_KV) {
      span.setAttribute('auth.error', 'kv_binding_missing');
      request.session = null;
      return null;
    }

    let session = null;
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
    }

    request.session = session || null;
    return null;
  });
}
