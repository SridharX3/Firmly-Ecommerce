import Joi from 'joi';
import { withSpan } from '../observability/otel.js';

const DELIVERY_PRICING = {
  NORMAL: { cost: 50, eta_days: 5 },
  SPEED: { cost: 120, eta_days: 2 },
  EXPRESS: { cost: 250, eta_days: 1 }
};

const CHECKOUT_TTL_MINUTES = 15;
const CURRENCY = 'USD';

/* ===============================
   Joi schema (CANONICAL)
================================ */
const checkoutSchema = Joi.object({
  shipping_address: Joi.object({
    full_name: Joi.string().min(2).required(),
    phone: Joi.string().min(6).required(),
    address_line1: Joi.string().min(5).required(),
    address_line2: Joi.string().optional().allow(''),
    city: Joi.string().required(),
    state: Joi.string().required(),
    postal_code: Joi.string().required(),
    country: Joi.string().length(2).default('IN')
  }).rename('zip', 'postal_code').required(),

  billing_address: Joi.object().optional(),

  delivery_type: Joi.string()
    .valid('NORMAL', 'SPEED', 'EXPRESS')
    .required()
});

export async function createCheckout(env, userId, payload, ctx) {
  return withSpan(ctx, 'checkout.create', {}, async (span) => {
    const { error, value } = checkoutSchema.validate(payload, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      console.error('[CHECKOUT VALIDATION FAILED]', {
        payload,
        details: error.details.map(d => d.message)
      });
      throw new Error(error.details.map(d => d.message).join(', '));
    }

    const { shipping_address, billing_address, delivery_type } = value;

    const delivery = DELIVERY_PRICING[delivery_type];
    if (!delivery) throw new Error('Invalid delivery type');

    /* ---------- Load active cart ---------- */
    const cart = await withSpan(ctx, 'db.get.active_cart', { 'cart.user_id': userId }, () =>
      env.DB.prepare(
        `SELECT id FROM carts WHERE user_id = ? AND status = 'active' LIMIT 1`
      )
        .bind(userId)
        .first()
    );

    if (!cart) throw new Error('No active cart');

    const { results: items } = await withSpan(ctx, 'db.get.cart_items', { 'cart.id': cart.id }, () =>
      env.DB.prepare(
        `SELECT product_id, quantity, snapshot_price, snapshot_name FROM cart_items WHERE cart_id = ? AND status = 'active'`
      )
        .bind(cart.id)
        .all()
    );

    if (!items.length) throw new Error('Cart is empty');

    /* ---------- Totals ---------- */
    let subtotal = 0;
    const snapshot = [];

    for (const i of items) {
      subtotal += i.snapshot_price * i.quantity;
      snapshot.push({
        product_id: i.product_id,
        name: i.snapshot_name,
        price: i.snapshot_price,
        quantity: i.quantity
      });
    }

    const tax = Math.round(subtotal * 0.1);
    const shipping = delivery.cost;
    const total = subtotal + tax + shipping;
    const checkoutId = crypto.randomUUID();

    /* ---------- Insert checkout ---------- */
    await withSpan(ctx, 'db.insert.checkout', { 'checkout.id': checkoutId, 'cart.id': cart.id }, () =>
      env.DB.batch([
        env.DB.prepare(
          `INSERT INTO checkout_sessions (id, user_id, cart_id, cart_snapshot, subtotal, tax, shipping, total, currency, status, shipping_address, billing_address, delivery_type, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'CREATED', ?, ?, ?, datetime('now', '+${CHECKOUT_TTL_MINUTES} minutes'))`
        ).bind(
          checkoutId,
          userId,
          cart.id,
          JSON.stringify(snapshot),
          subtotal,
          tax,
          shipping,
          total,
          CURRENCY,
          JSON.stringify(shipping_address),
          JSON.stringify(billing_address || shipping_address),
          delivery_type
        ),

        env.DB.prepare(
          `UPDATE carts SET status = 'locked' WHERE id = ?`
        ).bind(cart.id),
      ])
    );

    return {
      checkout_id: checkoutId,
      subtotal,
      tax,
      shipping,
      total,
      currency: CURRENCY,
      delivery_type,
      estimated_delivery_days: delivery.eta_days
    };
  });
}

export async function cancelCheckout(env, checkoutId, ctx) {
  return withSpan(ctx, 'checkout.cancel', { 'checkout.id': checkoutId }, async (span) => {
    // 1. Find the checkout session to identify the locked cart
    const session = await withSpan(ctx, 'db.get.checkout_session', { 'checkout.id': checkoutId }, () =>
      env.DB.prepare(
        `SELECT cart_id, status FROM checkout_sessions WHERE id = ?`
      )
        .bind(checkoutId)
        .first()
    );

    if (!session) {
      span.setAttribute('error.reason', 'session_not_found');
      throw new Error('Checkout session not found');
    }

    // 2. Only cancel if it hasn't been completed yet
    if (session.status !== 'CREATED') {
      return { status: session.status, message: 'Checkout cannot be canceled' };
    }

    // 3. Unlock the cart and mark checkout as canceled
    await withSpan(ctx, 'db.cancel.checkout_session', { 'checkout.id': checkoutId, 'cart.id': session.cart_id }, () =>
      env.DB.batch([
        env.DB.prepare(
          `UPDATE carts SET status = 'active' WHERE id = ?`
        ).bind(session.cart_id),
        env.DB.prepare(
          `UPDATE checkout_sessions SET status = 'CANCELED' WHERE id = ?`
        ).bind(checkoutId),
      ])
    );

    return { status: 'CANCELED', cart_id: session.cart_id };
  });
}
