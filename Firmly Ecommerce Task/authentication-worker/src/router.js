import { Router } from 'itty-router';
import { json } from './response.js';
import * as authService from './services/auth.service.js';
import * as sessionService from './services/session.service.js';
import {
  setSessionCookie,
  clearSessionCookie,
  getCookie
} from './utils/cookie.js';

const router = Router();

/* ======================
   REGISTER
====================== */
router.post('/auth/register', async (req, env, ctx) => {
  try {
    if (!env.DB) {
      throw new Error('Database configuration is missing');
    }

    let body;
    try {
      body = await req.json();
    } catch {
      throw new Error('Invalid JSON payload');
    }
    const authKey = req.headers.get('auth-key');

    const user = await authService.register(
      env.DB,
      body,
      ctx,
      authKey,
      env.ADMIN_SECRET
    );

    const sessionId = await sessionService.createSession(
      env,
      user.id,
      ctx
    );

    return json(
      user,
      201,
      req,
      {
        'Set-Cookie': setSessionCookie(sessionId)
      }
    );
  } catch (err) {
    console.error('REGISTER ERROR:', err);

    const status = err.message.includes('configuration') || err.message.includes('storage') ? 500 : 400;
    return json(
      { error: err.message || 'Registration failed' },
      status,
      req
    );
  }
});

/* ======================
   LOGIN
====================== */
router.post('/auth/login', async (req, env, ctx) => {
  try {
    if (!env.DB) {
      throw new Error('Database configuration is missing');
    }

    let body;
    try {
      body = await req.json();
    } catch {
      throw new Error('Invalid JSON payload');
    }

    const user = await authService.login(env.DB, body, ctx);

    const sessionId = await sessionService.createSession(env, user.id, ctx);

    return json(
      user,
      200,
      req,
      {
        'Set-Cookie': setSessionCookie(sessionId)
      }
    );
  } catch (err) {
    console.error('LOGIN ERROR:', err);

    const status = err.message.includes('configuration') || err.message.includes('storage') ? 500 : 401;
    return json(
      { error: err.message || 'Login failed' },
      status,
      req
    );
  }
});

/* ======================
   LOGOUT
====================== */
router.post('/auth/logout', async (req, env, ctx) => {
  try {
    const sessionId = getCookie(req, 'session_id');

    if (sessionId) {
      await sessionService.deleteSession(env, sessionId, ctx);
    }

    return json(
      { success: true },
      200,
      req,
      {
        'Set-Cookie': clearSessionCookie()
      }
    );
  } catch (err) {
    console.error('LOGOUT ERROR:', err);
    return json(
      { error: 'Logout failed', message: err.message },
      500,
      req,
      { 'Set-Cookie': clearSessionCookie() }
    );
  }
});


/* ======================
   CORS PREFLIGHT
====================== */
router.options('*', (req) =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': req.headers.get('Origin'),
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers':
        'Content-Type, Authorization',
      'Access-Control-Allow-Methods':
        'GET, POST, PATCH, DELETE, OPTIONS'
    }
  })
);

/* ======================
   FALLBACK
====================== */
router.all('*', (req) =>
  json({ error: 'Route not found' }, 404, req)
);

export default router;
