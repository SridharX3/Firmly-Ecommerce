import { Router } from 'itty-router';
import { json } from '../response.js';
import { requireUser, validateQuantity } from '../utils/validate.js';

const router = Router();

const DEFAULT_CURRENCY = 'USD';

/* =====================================================
   Helpers
===================================================== */

async function getActiveCart(env, userId) {
  return await env.DB.prepare(`
    SELECT id, currency, total_price
    FROM carts
    WHERE user_id = ?
      AND status = 'active'
    LIMIT 1
  `)
    .bind(userId)
    .first();
}

async function ensureUsdCurrency(env, cartId, currency) {
  if (currency !== DEFAULT_CURRENCY) {
    await env.DB.prepare(`
      UPDATE carts
      SET currency = ?
      WHERE id = ?
    `)
      .bind(DEFAULT_CURRENCY, cartId)
      .run();
  }
}

async function updateCartTotal(env, cartId) {
  await env.DB.prepare(`
    UPDATE carts
    SET total_price = (
      SELECT COALESCE(SUM(snapshot_price * quantity), 0)
      FROM cart_items
      WHERE cart_id = ? AND status = 'active'
    )
    WHERE id = ?
  `)
    .bind(cartId, cartId)
    .run();
}

async function getOrCreateActiveCart(env, userId) {
  const cart = await getActiveCart(env, userId);

  if (cart) {
    // 🔒 Force USD even for old carts
    await ensureUsdCurrency(env, cart.id, cart.currency);
    return cart.id;
  }

  const res = await env.DB.prepare(`
    INSERT INTO carts (user_id, status, currency)
    VALUES (?, 'active', ?)
  `)
    .bind(userId, DEFAULT_CURRENCY)
    .run();

  return res.meta.last_row_id;
}

async function fetchProduct(env, productId) {
  return await env.DB.prepare(`
    SELECT id, name, price, status, deleted_at
    FROM products
    WHERE id = ?
  `)
    .bind(productId)
    .first();
}

/* =====================================================
   GET /cart
===================================================== */
router.get('/cart', async (req) => {
  try {
    const userId = await requireUser(req, req.env);

    const cart = await getActiveCart(req.env, userId);
    if (!cart) {
      return json({ items: [], subtotal: 0, currency: DEFAULT_CURRENCY });
    }

    await ensureUsdCurrency(req.env, cart.id, cart.currency);

    const { results } = await req.env.DB.prepare(`
      SELECT
        product_id,
        quantity,
        snapshot_name,
        snapshot_price
      FROM cart_items
      WHERE cart_id = ?
        AND status = 'active'
    `)
      .bind(cart.id)
      .all();

    const subtotal = cart.total_price;

    const items = results.map((item) => {
      return {
        product_id: item.product_id,
        name: item.snapshot_name,
        quantity: item.quantity,
        price: item.snapshot_price
      };
    });

    return json({
      items,
      subtotal,
      currency: DEFAULT_CURRENCY
    });
  } catch {
    return json({ error: 'Unauthorized' }, 401);
  }
});

/* =====================================================
   POST /cart/items  (ADD OR INCREMENT)
===================================================== */
router.post('/cart/items', async (req) => {
  try {
    const userId = await requireUser(req, req.env);
    const { product_id, quantity } = await req.json();

    validateQuantity(quantity);

    const productId = Number(product_id);
    const qtyToAdd = Number(quantity);

    const product = await fetchProduct(req.env, productId);
    if (!product || product.deleted_at || product.status !== 'active') {
      return json({ error: 'Product unavailable' }, 400);
    }

    const cartId = await getOrCreateActiveCart(req.env, userId);

    const existing = await req.env.DB.prepare(`
      SELECT id, quantity
      FROM cart_items
      WHERE cart_id = ?
        AND product_id = ?
        AND status = 'active'
      LIMIT 1
    `)
      .bind(cartId, productId)
      .first();

    if (existing) {
      const newQty = existing.quantity + qtyToAdd;

      await req.env.DB.prepare(`
        UPDATE cart_items
        SET
          quantity = ?,
          snapshot_price = ?,
          snapshot_name = ?
        WHERE id = ?
      `)
        .bind(
          newQty,
          product.price,
          product.name,
          existing.id
        )
        .run();

      await updateCartTotal(req.env, cartId);

      return json({
        message: 'Cart updated',
        product_id: productId,
        quantity: newQty,
        currency: DEFAULT_CURRENCY
      });
    }

    await req.env.DB.prepare(`
      INSERT INTO cart_items (
        cart_id,
        product_id,
        quantity,
        snapshot_price,
        snapshot_name,
        status
      )
      VALUES (?, ?, ?, ?, ?, 'active')
    `)
      .bind(
        cartId,
        productId,
        qtyToAdd,
        product.price,
        product.name
      )
      .run();

    await updateCartTotal(req.env, cartId);

    return json({
      message: 'Item added to cart',
      product_id: productId,
      quantity: qtyToAdd,
      currency: DEFAULT_CURRENCY
    });
  } catch (err) {
    console.error('ADD TO CART ERROR:', err);
    return json(
      { error: err.message || 'Unable to add item to cart' },
      400
    );
  }
});

/* =====================================================
   DELETE /cart/items/:productId
===================================================== */
router.delete('/cart/items/:productId', async (req) => {
  try {
    const userId = await requireUser(req, req.env);
    const cart = await getActiveCart(req.env, userId);

    await req.env.DB.prepare(`
      UPDATE cart_items
      SET status = 'removed'
      WHERE cart_id = ?
        AND product_id = ?
        AND status = 'active'
    `)
      .bind(cart.id, Number(req.params.productId))
      .run();

    await updateCartTotal(req.env, cart.id);

    return json({ message: 'Item removed' });
  } catch {
    return json({ message: 'Item removed' });
  }
});

/* =====================================================
   DELETE /cart  (SOFT CLEAR)
===================================================== */
router.delete('/cart', async (req) => {
  try {
    const userId = await requireUser(req, req.env);
    const cart = await getActiveCart(req.env, userId);

    await req.env.DB.batch([
      req.env.DB.prepare(`
        UPDATE carts
        SET status = 'removed',
            total_price = 0
        WHERE id = ?
      `).bind(cart.id),

      req.env.DB.prepare(`
        UPDATE cart_items
        SET status = 'removed'
        WHERE cart_id = ?
      `).bind(cart.id)
    ]);

    return json({ message: 'Cart cleared' });
  } catch (err) {
    console.error('CLEAR CART ERROR:', err);
    return json({ message: 'Cart cleared' });
  }
});

export default router;
