import { Router } from 'itty-router';
import { json, preflight } from './response';
import { getCookie } from './utils/cookie';

const router = Router();

const CART_EMPTY_MSG = { message: 'Cart is empty' };
const CART_SUBQUERY = `(SELECT id FROM carts WHERE user_id = ? AND status = 'active')`;
const UPDATE_CART_TOTAL_SQL = `
  UPDATE carts 
  SET total_price = (
    SELECT COALESCE(SUM(snapshot_price * quantity), 0) 
    FROM cart_items 
    WHERE cart_id = carts.id AND status = 'active'
  )
  WHERE user_id = ? AND status = 'active'
`;

/* ===============================
   MIDDLEWARES
================================ */
const withAuth = async (req, env) => {
  req.env = env;
  req.userId = null;
  
  let sessionId = getCookie(req, 'session_id');

  if (!sessionId) {
    const authHeader = req.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      sessionId = authHeader.substring(7).trim();
    }
  }

  if (!sessionId) return;

  const session = await env.SESSION_KV.get(sessionId);
  if (session) {
    try {
      req.userId = JSON.parse(session)?.user_id ?? null;
    } catch {}
  }
};

const requireAuth = (req) => {
  if (!req.userId) return json({ error: 'You are not logged in' }, 401, req);
};

router.options('*', preflight);
router.all('*', withAuth);

/* ===============================
   GET CART
================================ */
router.get('/cart', requireAuth, async (req) => {
  try {
    const cart = await req.env.DB
      .prepare(`SELECT id, currency, total_price FROM carts WHERE user_id = ? AND status = 'active' LIMIT 1`)
      .bind(req.userId)
      .first();

    if (!cart) return json(CART_EMPTY_MSG, 200, req);

    const { results = [] } = await req.env.DB
      .prepare(
        `SELECT product_id, quantity, snapshot_price AS price, snapshot_name AS name, image_url
         FROM cart_items WHERE cart_id = ? AND status = 'active'`
      )
      .bind(cart.id)
      .all();

    if (results.length === 0) return json(CART_EMPTY_MSG, 200, req);

    return json({ items: results, subtotal: cart.total_price, currency: cart.currency }, 200, req);
  } catch (err) {
    console.error('GET CART ERROR:', err);
    return json(err, 500, req);
  }
});

/* ===============================
   ADD TO CART
================================ */
router.post('/cart/items', requireAuth, async (req) => {
  try {
    let body;
    try { body = await req.json(); } catch {
      return json({ error: 'Invalid JSON body' }, 400, req);
    }

    const productId = Number(body?.product_id);
    const qty = Number(body?.quantity ?? 1);

    if (!Number.isInteger(productId) || !Number.isInteger(qty) || qty < 1) {
      return json({ error: 'Invalid payload' }, 400, req);
    }

    const product = await req.env.DB
      .prepare(`SELECT name, price, image_url FROM products WHERE id = ? AND status = 'active'`)
      .bind(productId)
      .first();

    if (!product) return json({ error: 'Product not found' }, 404, req);

    let cart = await req.env.DB
      .prepare(`SELECT id FROM carts WHERE user_id = ? AND status = 'active' LIMIT 1`)
      .bind(req.userId)
      .first();

    if (!cart) {
      const res = await req.env.DB
        .prepare(`INSERT INTO carts (user_id, status, currency) VALUES (?, 'active', 'USD')`)
        .bind(req.userId)
        .run();
      cart = { id: res.meta?.last_row_id ?? res.lastRowId };
    }

    const existingItem = await req.env.DB.prepare(
      `SELECT id FROM cart_items WHERE cart_id = ? AND product_id = ? AND status = 'active'`
    ).bind(cart.id, productId).first();

    if (existingItem) {
      await req.env.DB.batch([
        req.env.DB.prepare(
          `UPDATE cart_items SET quantity = quantity + ? WHERE id = ?`
        ).bind(qty, existingItem.id),
        req.env.DB.prepare(UPDATE_CART_TOTAL_SQL).bind(req.userId)
      ]);
    } else {
      await req.env.DB.batch([
        req.env.DB.prepare(
          `INSERT INTO cart_items (cart_id, product_id, quantity, snapshot_price, snapshot_name, image_url, status)
           VALUES (?, ?, ?, ?, ?, ?, 'active')`
        ).bind(cart.id, productId, qty, product.price, product.name, product.image_url),
        req.env.DB.prepare(UPDATE_CART_TOTAL_SQL).bind(req.userId)
      ]);
    }

    return json({ success: true }, 201, req);
  } catch (err) {
    console.error('ADD TO CART ERROR:', err);
    return json(err, 500, req);
  }
});

/* ===============================
   UPDATE QUANTITY
================================ */
router.patch('/cart/items/:productId', requireAuth, async (req) => {
  try {
    let body;
    try { 
      body = await req.json(); 
    } catch {
      return json({ error: 'Invalid JSON body' }, 400, req);
    }

    const qty = Number(body?.quantity);
    const productId = Number(req.params.productId);

    if (!Number.isInteger(productId) || !Number.isInteger(qty) || qty < 1) {
      return json({ error: 'Invalid quantity' }, 400, req);
    }

    await req.env.DB.batch([
      req.env.DB.prepare(
        `UPDATE cart_items SET quantity = ?
         WHERE product_id = ? AND status = 'active' AND cart_id = ${CART_SUBQUERY}`
      ).bind(qty, productId, req.userId),
      req.env.DB.prepare(UPDATE_CART_TOTAL_SQL).bind(req.userId)
    ]);

    return json({ success: true }, 200, req);
  } catch (err) {
    console.error('UPDATE CART ERROR:', err);
    return json(err, 500, req);
  }
});

/* ===============================
   REMOVE ITEM
================================ */
router.delete('/cart/items/:productId', requireAuth, async (req) => {
  try {
    const productId = Number(req.params.productId);
    if (!Number.isInteger(productId)) return json({ error: 'Invalid product id' }, 400, req);

    await req.env.DB.batch([
      req.env.DB.prepare(`UPDATE cart_items SET status = 'removed' WHERE product_id = ? AND status = 'active' AND cart_id = ${CART_SUBQUERY}`)
        .bind(productId, req.userId),
      req.env.DB.prepare(UPDATE_CART_TOTAL_SQL).bind(req.userId)
    ]);

    return json({ success: true }, 200, req);
  } catch (err) {
    console.error('REMOVE ITEM ERROR:', err);
    return json(err, 500, req);
  }
});

/* ===============================
   CLEAR CART
================================ */
router.delete('/cart', requireAuth, async (req) => {
  try {
    await req.env.DB
      .prepare(`UPDATE carts SET status = 'removed', total_price = 0 WHERE user_id = ? AND status = 'active'`)
      .bind(req.userId)
      .run();

    return json({ success: true }, 200, req);
  } catch (err) {
    console.error('CLEAR CART ERROR:', err);
    return json(err, 500, req);
  }
});

/* ===============================
   404
================================ */
router.all('*', (req) => json({ error: 'Route not found' }, 404, req));

export default router;
