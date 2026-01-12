import { Router } from 'itty-router';
import { json } from './response.js';
import * as authService from './services/auth.service.js';
import { signToken, verifyToken } from './utils/jwt.js';
import {
  setAuthCookie,
  clearAuthCookie
} from './utils/cookie.js';

const router = Router();

// Helper to authenticate request
const getUserId = async (req, secret) => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Unauthorized: Missing token');
  }
  const token = authHeader.split(' ')[1];
  const payload = await verifyToken(token, secret);
  return payload.user_id;
};

/* ======================
   REGISTER
====================== */
router.post('/auth/register', async (req, env, ctx) => {
  try {
    let body;
    
    body = await req.json();

    const secret = env.JWT_SECRET || 'default-secret';

    const authKey = req.headers.get('auth-key');

    const user = await authService.register(
      env.DB,
      body,
      ctx,
      authKey,
      env.ADMIN_SECRET
    );

    const token = await signToken({
      user_id: user.id,
      email: user.email,
      role: user.role || 'user',
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 1 day expiration
    }, secret);

    return json(
      user,
      201,
      req,
      {
        'Set-Cookie': setAuthCookie(token)
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
    let body;
    
    body = await req.json();

    const secret = env.JWT_SECRET || 'default-secret';

    const user = await authService.login(env.DB, body, ctx, env.ADMIN_SECRET);

    const token = await signToken({
      user_id: user.id,
      email: user.email,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
    }, secret);

    return json(
      user,
      200,
      req,
      {
        'Set-Cookie': setAuthCookie(token)
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
    return json(
      { success: true },
      200,
      req,
      {
        'Set-Cookie': clearAuthCookie()
      }
    );
  } catch (err) {
    console.error('LOGOUT ERROR:', err);
    return json(
      { error: 'Logout failed', message: err.message },
      500,
      req,
      { 'Set-Cookie': clearAuthCookie() }
    );
  }
});

/* ======================
   SHIPPING ADDRESS
====================== */
router.get('/user/shipping-address', async (req, env, ctx) => {
  try {
    const secret = env.JWT_SECRET || 'default-secret';
    const userId = await getUserId(req, secret);

    const address = await authService.getShippingAddress(env.DB, userId, ctx, env.ADMIN_SECRET);

    return json({ shipping_address: address }, 200, req);
  } catch (err) {
    const status = err.message.includes('Unauthorized') ? 401 : 500;
    return json({ error: err.message }, status, req);
  }
});

router.post('/user/shipping-address', async (req, env, ctx) => {
  try {
    const secret = env.JWT_SECRET || 'default-secret';
    const userId = await getUserId(req, secret);
    const body = await req.json();

    await authService.updateShippingAddress(env.DB, userId, body.shipping_address, ctx, env.ADMIN_SECRET);

    return json({ success: true, shipping_address: body.shipping_address }, 200, req);
  } catch (err) {
    const status = err.message.includes('Unauthorized') ? 401 : 500;
    return json({ error: err.message }, status, req);
  }
});

/* ======================
   BILLING ADDRESS
====================== */
router.get('/user/billing-address', async (req, env, ctx) => {
  try {
    const secret = env.JWT_SECRET || 'default-secret';
    const userId = await getUserId(req, secret);

    const address = await authService.getBillingAddress(env.DB, userId, ctx, env.ADMIN_SECRET);

    return json({ billing_address: address }, 200, req);
  } catch (err) {
    const status = err.message.includes('Unauthorized') ? 401 : 500;
    return json({ error: err.message }, status, req);
  }
});

router.post('/user/billing-address', async (req, env, ctx) => {
  try {
    const secret = env.JWT_SECRET || 'default-secret';
    const userId = await getUserId(req, secret);
    const body = await req.json();

    await authService.updateBillingAddress(env.DB, userId, body.billing_address, ctx, env.ADMIN_SECRET);

    return json({ success: true, billing_address: body.billing_address }, 200, req);
  } catch (err) {
    const status = err.message.includes('Unauthorized') ? 401 : 500;
    return json({ error: err.message }, status, req);
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
