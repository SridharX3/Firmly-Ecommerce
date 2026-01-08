import { withSpan } from '../observability/otel.js';
import { generateUUID } from '../utils/crypto.js';

export async function createSession(env, userId, ctx) {
  return withSpan(
    ctx,
    'session.create',
    { 'session.user_id': userId },
    async () => {
      if (!env?.SESSION_KV) {
        throw new Error('Session storage is currently unavailable');
      }

      const sessionId = generateUUID();
      const ttl = Number(env.SESSION_TTL || 86400);

      await withSpan(ctx, 'kv.put.session', {}, () =>
        env.SESSION_KV.put(
          sessionId,
          JSON.stringify({ user_id: userId }),
          { expirationTtl: ttl }
        )
      );
      return sessionId;
    }
  );
}

export async function getSession(env, sessionId, ctx) {
  if (!sessionId) return null;

  return withSpan(
    ctx,
    'session.get',
    { 'session.id': sessionId },
    async () =>
      !env?.SESSION_KV 
        ? null 
        : 
      withSpan(ctx, 'kv.get.session', {}, () =>
        env.SESSION_KV.get(sessionId, 'json')
      )
  );
}

export async function deleteSession(env, sessionId, ctx) {
  if (!sessionId) return;

  return withSpan(
    ctx,
    'session.delete',
    { 'session.id': sessionId },
    async () =>
      !env?.SESSION_KV 
        ? null 
        :
      withSpan(ctx, 'kv.delete.session', {}, () =>
        env.SESSION_KV.delete(sessionId)
      )
  );
}
