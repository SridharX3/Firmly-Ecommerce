import { Router } from 'itty-router';
import { json, preflight } from './response.js';
import { requireAuth } from './middleware/auth.js';
import { signToken } from './utils/jwt.js';
import { setAuthCookie, getCookie } from './utils/cookie.js';
import * as CartService from './services/cart.service.js';

const router = Router();

/* ===============================
   MIDDLEWARES
================================ */
const handleError = (err, req) => {
  console.error('CART ROUTER ERROR:', err);
  if (err.message.includes('Product not found') || err.message.includes('Cart not found')) {
    return json({ error: err.message }, 404, req);
  }
  if (err.message.includes('Invalid') || err.message.includes('locked')) {
    return json({ error: err.message }, 400, req);
  }
  return json(err, 500, req);
};

router.options('*', preflight);

// Public Route
router.get('/health', () => json({ status: 'ok' }));

/* ===============================
   DEBUG TOKEN
================================ */
router.get('/debug-token', (req) => {
  let token = getCookie(req, 'auth_token');
  if (!token) {
    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }
  }
  return json({ token, cookie_header: req.headers.get('Cookie') });
});

/* ===============================
   LOGIN (DEV HELPER)
================================ */
router.get('/login', async (req, env) => {
  const secret = env.JWT_SECRET || 'default-secret';
  const payload = {
    user_id: 8,
    email: 'exam@example.com',
    role: 'admin',
    exp: Math.floor(Date.now() / 1000) + 86400 // 24 hours
  };
  const token = await signToken(payload, secret);
  return json({ message: 'Logged in', token }, 200, req, {
    'Set-Cookie': setAuthCookie(token)
  });
});

/* ===============================
   GET CART
================================ */
router.get('/cart', requireAuth, async (req, env, ctx) => {
  try {
    const cart = await CartService.getCart(env, req.user.user_id, ctx);
    return json(cart, 200, req);
  } catch (err) {
    return handleError(err, req);
  }
});

/* ===============================
   ADD TO CART
================================ */
router.post('/cart/items', requireAuth, async (req, env, ctx) => {
  try {
    let body;
    try { body = await req.json(); } catch {
      return json({ error: 'Invalid JSON body' }, 400, req);
    }

    const productId = Number(body?.product_id);
    const qty = Number(body?.quantity ?? 1); // Default to 1

    const result = await CartService.addToCart(env, req.user.user_id, productId, qty, ctx);
    return json(result, 201, req);
  } catch (err) {
    return handleError(err, req);
  }
});

/* ===============================
   UPDATE QUANTITY
================================ */
router.patch('/cart/items/:productId', requireAuth, async (req, env, ctx) => {
  try {
    let body;
    try { 
      body = await req.json(); 
    } catch {
      return json({ error: 'Invalid JSON body' }, 400, req);
    }

    const qty = Number(body?.quantity);
    const productId = Number(req.params.productId);

    const result = await CartService.updateItemQuantity(env, req.user.user_id, productId, qty, ctx);
    return json(result, 200, req);
  } catch (err) {
    return handleError(err, req);
  }
});

/* ===============================
   REMOVE ITEM
================================ */
router.delete('/cart/items/:productId', requireAuth, async (req, env, ctx) => {
  try {
    const productId = Number(req.params.productId);
    const result = await CartService.removeItem(env, req.user.user_id, productId, ctx);
    return json(result, 200, req);
  } catch (err) {
    return handleError(err, req);
  }
});

/* ===============================
   CLEAR CART
================================ */
router.delete('/cart', requireAuth, async (req, env, ctx) => {
  try {
    const result = await CartService.clearCart(env, req.user.user_id, ctx);
    return json(result, 200, req);
  } catch (err) {
    return handleError(err, req);
  }
});

/* ===============================
   404
================================ */
router.all('*', (req) => json({ error: 'Route not found' }, 404, req));

export default router;
