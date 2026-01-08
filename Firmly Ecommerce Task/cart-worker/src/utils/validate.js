import { getCookie } from './cookie';

export async function requireUser(req, env) {
  const sessionId = getCookie(req, 'session_id');

  if (!sessionId) {
    throw new Error('Unauthorized');
  }

  const session = await env.SESSION_KV.get(sessionId, { type: 'json' });

  if (!session || typeof session.user_id !== 'number') {
    throw new Error('Invalid session');
  }

  return session.user_id;
}

export function validateQuantity(quantity) {
  if (
    typeof quantity !== 'number' ||
    !Number.isInteger(quantity) ||
    quantity <= 0
  ) {
    throw new Error('Invalid quantity');
  }
}
