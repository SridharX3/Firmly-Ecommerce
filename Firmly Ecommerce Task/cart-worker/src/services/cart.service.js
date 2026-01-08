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

const cartSchema = Joi.object({
  items: Joi.array().items(Joi.object()).required()
}).unknown(true);

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

      let cart = await withSpan(
        ctx,
        'kv.get.cart',
        { 'cart.key': CART_KEY(userId) },
        () => env.CART_KV.get(CART_KEY(userId), { type: 'json' })
      );

      if (cart) {
        return cart;
      }

      // Fallback: Check DB for an active cart
      const activeCart = await withSpan(
        ctx,
        'db.get.active_cart',
        { 'cart.user_id': userId },
        () =>
          env.DB.prepare(
            `SELECT id FROM carts WHERE user_id = ? AND status = 'active'`
          )
            .bind(userId)
            .first()
      );

      if (!activeCart) {
        return { items: [] };
      }

      const { results } = await withSpan(
        ctx,
        'db.get.cart_items',
        { 'cart.id': activeCart.id },
        () =>
          env.DB.prepare(
            `SELECT product_id, quantity, snapshot_name AS name, snapshot_price AS price
             FROM cart_items
             WHERE cart_id = ? AND status = 'active'`
          )
            .bind(activeCart.id)
            .all()
      );

      cart = { items: results || [] };

      // Re-populate KV
      await withSpan(
        ctx,
        'kv.put.cart',
        { 'cart.key': CART_KEY(userId) },
        () => env.CART_KV.put(CART_KEY(userId), JSON.stringify(cart))
      );

      return cart;
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

      await withSpan(
        ctx,
        'db.update.cart',
        { 'cart.user_id': userId },
        () =>
          env.DB.prepare(
            `UPDATE carts
             SET status = 'removed'
             WHERE user_id = ? AND status = 'active'`
          )
            .bind(userId)
            .run()
      );

      await withSpan(
        ctx,
        'kv.delete.cart',
        { 'cart.key': CART_KEY(userId) },
        () => env.CART_KV.delete(CART_KEY(userId))
      );
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
