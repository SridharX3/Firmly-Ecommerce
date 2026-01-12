import Joi from 'joi';
import { startSpan, withSpan } from '../observability/otel.js';

const CART_KEY = (userId) => `cart:user:${userId}`;

/* ---------- Joi Schemas ---------- */

const userIdSchema = Joi.alternatives()
  .try(
    Joi.number().integer().positive(),
    Joi.string().min(1)
  )
  .required();

const productIdSchema = Joi.alternatives()
  .try(
    Joi.number().integer().positive(),
    Joi.string().min(1)
  )
  .required();

const quantitySchema = Joi.number().integer().min(1).required();

/* ---------- HELPERS ---------- */

async function fetchProductWithInventory(db, productId) {
  return db.prepare(`
    SELECT 
      p.id, p.name, p.price, p.status, p.image_url, 
      (COALESCE(i.available, 0) - COALESCE(i.reserved, 0)) as available
    FROM products p
    LEFT JOIN product_inventory i ON p.id = i.product_id
    WHERE p.id = ?
  `).bind(productId).first();
}

async function updateCartTotal(db, cartId) {
  await db.prepare(`
    UPDATE carts
    SET total_price = (
      SELECT COALESCE(SUM(snapshot_price * quantity), 0)
      FROM cart_items
      WHERE cart_id = ? AND status = 'active'
    ),
    updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(cartId, cartId).run();
}

async function getCartHeader(db, userId) {
  return db.prepare(
    `SELECT id, status, currency, total_price 
     FROM carts 
     WHERE user_id = ? AND status IN ('active', 'checkout_locked') 
     LIMIT 1`
  ).bind(userId).first();
}

async function createNewCart(db, userId) {
  const res = await db
    .prepare(`
      INSERT INTO carts (user_id, status, currency, updated_at)
      SELECT ?1, 'active', 'USD', CURRENT_TIMESTAMP
      WHERE NOT EXISTS (
        SELECT 1 FROM carts WHERE user_id = ?1 AND status IN ('active', 'checkout_locked')
      )
    `)
    .bind(userId)
    .run();
  
  if ((res.meta?.changes ?? res.changes) > 0) {
    return { 
      id: res.meta?.last_row_id ?? res.lastRowId, 
      currency: 'USD', 
      total_price: 0, 
      status: 'active' 
    };
  }

  return getCartHeader(db, userId);
}

function checkCartActive(cart) {
  if (cart && cart.status !== 'active') {
    throw new Error('Cart is currently locked for checkout.');
  }
}

/* ---------- GET CART ---------- */
export async function getCart(env, userId, ctx) {
  return withSpan(ctx, 'cart.get', { 'cart.user_id': userId }, async (span) => {
    try {
      const { error } = userIdSchema.validate(userId, {
        convert: false
      });

      if (error) {
        span.setAttribute('cart.error', 'invalid_user_id');
        throw new Error('Invalid userId');
      }

      // 1. Get current cart (Active or Locked)
      let cart = await withSpan(ctx, 'db.get.cart', { 'cart.user_id': userId }, () => getCartHeader(env.DB, userId));

      // 2. If no cart exists, create a new ACTIVE cart
      if (!cart) {
        cart = await createNewCart(env.DB, userId);
      }

      // 3. Get Items
      const { results } = await withSpan(
        ctx,
        'db.get.cart_items',
        { 'cart.id': cart.id },
        () =>
          env.DB.prepare(
            `SELECT product_id, quantity, snapshot_price, snapshot_name, image_url
             FROM cart_items
             WHERE cart_id = ? AND status = 'active'`
          )
            .bind(cart.id)
            .all()
      );

      // 4. Format Response
      const items = (results || []).map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.snapshot_price,
        name: item.snapshot_name,
        image_url: item.image_url
      }));

      const response = {
        items,
        subtotal: cart.total_price,
        currency: cart.currency,
        status: cart.status
      };

      return response;
    } catch (err) {
      span.recordException(err);
      throw err;
    }
  });
}

/* ---------- ADD TO CART ---------- */
export async function addToCart(env, userId, productId, quantity, ctx) {
  return withSpan(ctx, 'cart.add', { 'cart.user_id': userId, 'product.id': productId }, async (span) => {
    try {
      // Validate inputs
      const { error: idError } = productIdSchema.validate(productId);
      const { error: qtyError } = quantitySchema.validate(quantity);
      if (idError || qtyError) throw new Error('Invalid payload');

      // 1. Get Cart (Active or Locked)
      let cart = await getCartHeader(env.DB, userId);

      // 2. Check Lock
      checkCartActive(cart);

      // 3. Create if missing
      if (!cart) {
        cart = await createNewCart(env.DB, userId);
      }

      // 4. Fetch Product
      const product = await fetchProductWithInventory(env.DB, productId);

      if (!product || product.status !== 'active') throw new Error('Product not found or unavailable');

      // 5. Check Existing Item
      const existingItem = await env.DB.prepare(
        `SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ? AND status = 'active'`
      ).bind(cart.id, productId).first();

      const currentQty = existingItem ? existingItem.quantity : 0;
      const available = product.available;

      if (currentQty + quantity > available) {
        if (available === 0) throw new Error('Out of stock');
        throw new Error(`Only ${available} items left in stock`);
      }

      if (existingItem) {
        // Update Quantity ONLY
        await env.DB.prepare(
          `UPDATE cart_items SET quantity = quantity + ? WHERE id = ?`
        ).bind(quantity, existingItem.id).run();
      } else {
        // Insert New Item
        await env.DB.prepare(
          `INSERT INTO cart_items (cart_id, product_id, quantity, snapshot_price, snapshot_name, image_url, status)
           VALUES (?, ?, ?, ?, ?, ?, 'active')`
        ).bind(cart.id, productId, quantity, product.price, product.name, product.image_url).run();
      }

      // 6. Recalculate Total
      await updateCartTotal(env.DB, cart.id);

      // Invalidate KV
      await env.CART_KV.delete(CART_KEY(userId));

      return { success: true };
    } catch (err) {
      span.recordException(err);
      throw err;
    }
  });
}

/* ---------- UPDATE QUANTITY ---------- */
export async function updateItemQuantity(env, userId, productId, quantity, ctx) {
  return withSpan(ctx, 'cart.update_qty', { 'cart.user_id': userId }, async (span) => {
    try {
      const { error: idError } = productIdSchema.validate(productId);
      const { error: qtyError } = quantitySchema.validate(quantity);
      if (idError || qtyError) throw new Error('Invalid quantity');

      const cart = await getCartHeader(env.DB, userId);

      if (!cart) throw new Error('Cart not found');
      checkCartActive(cart);

      const product = await fetchProductWithInventory(env.DB, productId);
      if (!product) throw new Error('Product not found');

      const available = product.available;
      if (quantity > available) {
        if (available === 0) throw new Error('Out of stock');
        throw new Error(`Only ${available} items left in stock`);
      }

      await env.DB.prepare(
        `UPDATE cart_items SET quantity = ? WHERE cart_id = ? AND product_id = ? AND status = 'active'`
      ).bind(quantity, cart.id, productId).run();

      await updateCartTotal(env.DB, cart.id);

      // Re-populate KV
      await env.CART_KV.delete(CART_KEY(userId));

      return { success: true };
    } catch (err) {
      span.recordException(err);
      throw err;
    }
  });
}

/* ---------- REMOVE ITEM ---------- */
export async function removeItem(env, userId, productId, ctx) {
  return withSpan(ctx, 'cart.remove_item', { 'cart.user_id': userId }, async (span) => {
    try {
      const { error } = productIdSchema.validate(productId);
      if (error) throw new Error('Invalid product id');

      const cart = await getCartHeader(env.DB, userId);

      if (!cart) return { success: true };
      checkCartActive(cart);

      await env.DB.prepare(
        `UPDATE cart_items SET status = 'removed' WHERE cart_id = ? AND product_id = ? AND status = 'active'`
      ).bind(cart.id, productId).run();

      await updateCartTotal(env.DB, cart.id);
      await env.CART_KV.delete(CART_KEY(userId));

      return { success: true };
    } catch (err) {
      span.recordException(err);
      throw err;
    }
  });
}

/* ---------- CLEAR CART ---------- */
export async function clearCart(env, userId, ctx) {
  return withSpan(ctx, 'cart.clear', { 'cart.user_id': userId }, async (span) => {
    try {
      const { error } = userIdSchema.validate(userId, {
        convert: false
      });

      if (error) {
        span.setAttribute('cart.error', 'invalid_user_id');
        throw new Error('Invalid userId');
      }

      const cart = await getCartHeader(env.DB, userId);

      if (!cart) return { success: true };
      checkCartActive(cart);

      await withSpan(
        ctx,
        'db.update.cart',
        { 'cart.user_id': userId },
        () =>
          env.DB.batch([
            env.DB.prepare(`UPDATE cart_items SET status = 'removed' WHERE cart_id = ?`).bind(cart.id),
            env.DB.prepare(`UPDATE carts SET status = 'removed', total_price = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(cart.id)
          ])
      );

      await withSpan(
        ctx,
        'kv.delete.cart',
        { 'cart.key': CART_KEY(userId) },
        () => env.CART_KV.delete(CART_KEY(userId))
      );

      return { success: true };
    } catch (err) {
      span.recordException(err);
      throw err;
    }
  });
}

/* ---------- PRODUCT VALIDATION (D1) ---------- */
export async function getProductById(env, productId, ctx) {
  if (!productId) {
    throw new Error('productId is required');
  }

  return withSpan(
    ctx,
    'product.get_by_id',
    { 'product.id': productId },
    async (span) => {
      try {
        const { error } = productIdSchema.validate(productId, {
          convert: false
        });

        if (error) {
          span.setAttribute('product.error', 'invalid_product_id');
          throw new Error('Invalid productId');
        }

        return await withSpan(
          ctx,
          'db.select.product',
          { 'product.id': productId },
          () =>
            env.DB
              .prepare(
                `SELECT id, name, price, status
                 FROM products
                 WHERE id = ?`
              )
              .bind(productId)
              .first()
        );
      } catch (err) {
        span.recordException(err);
        throw err;
      }
    }
  );
}
