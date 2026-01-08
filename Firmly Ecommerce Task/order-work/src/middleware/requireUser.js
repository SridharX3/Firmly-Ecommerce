import { getCookie } from '../utils/cookie';

export async function requireUser(req, env) {
  req.userId = null;
  req.sessionId = null;

  const sessionId = getCookie(req, 'session_id');
  if (!sessionId) return;

  req.sessionId = sessionId;

  if (!env.SESSION_KV) return;

  const session = await env.SESSION_KV.get(sessionId, 'json');

  if (session?.user_id) {
    req.userId = session.user_id;
  }
}
