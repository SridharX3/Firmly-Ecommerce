import Joi from 'joi';
import { withSpan } from '../observability/otel.js';

/* ---------------------------------------------------
   Joi Schemas (SQL safety layer)
--------------------------------------------------- */
const createOrderSchema = Joi.object({
  user_id: Joi.alternatives().try(Joi.string().min(1), Joi.number()).required(),
  status: Joi.string().valid('PAID', 'FAILED', 'CANCELLED', 'REFUNDED').required(),
  total_amount: Joi.number().positive().required(),
  currency: Joi.string().length(3).required(),
  payment_provider: Joi.string().valid('paypal').required(),
  payment_reference: Joi.string().min(1).required(),
  cart_id: Joi.number().optional(),
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
  billing_address: Joi.object({
    full_name: Joi.string().min(2).required(),
    phone: Joi.string().min(6).required(),
    address_line1: Joi.string().min(5).required(),
    address_line2: Joi.string().optional().allow(''),
    city: Joi.string().required(),
    state: Joi.string().required(),
    postal_code: Joi.string().required(),
    country: Joi.string().length(2).default('IN')
  }).rename('zip', 'postal_code').required(),
  delivery_mode: Joi.string().valid('NORMAL', 'SPEED', 'EXPRESS').required(),
  ordered_items: Joi.array().items(Joi.object({
    product_id: Joi.number().required(),
    name: Joi.string().required(),
    price: Joi.number().required(),
    quantity: Joi.number().required(),
    image_url: Joi.string().optional().allow(null),
    status: Joi.string().optional()
  })).required()
});

export async function createOrder(
  env,
  {
    user_id,
    status,
    total_amount,
    currency,
    payment_provider,
    payment_reference,
    shipping_address,
    billing_address,
    delivery_mode,
    ordered_items
  },
  ctx
) {
  return withSpan(
    ctx,
    'order.create',
    {
      'user.id': user_id,
      'payment.provider': payment_provider,
      'order.total': total_amount,
      'order.currency': currency
    },
    async (span) => {

      /* ---------------------------------------------------
         0️⃣ Joi validation (before SQL)
      --------------------------------------------------- */
      const { error } = createOrderSchema.validate(
        {
          user_id,
          status,
          total_amount,
          currency,
          payment_provider,
          payment_reference,
          shipping_address,
          billing_address,
          delivery_mode,
          ordered_items
        },
        { abortEarly: false }
      );

      if (error) {
        span.setAttribute('order.error', 'validation_failed');
        span.setAttribute(
          'order.validation_error',
          error.details.map(d => d.message).join(', ')
        );
        throw new Error('Invalid order input');
      }

      const result = await withSpan(ctx, 'db.insert.order', {}, () =>
        env.DB.prepare(`
          INSERT INTO orders (
            user_id,
            status,
            total_amount,
            currency,
            payment_provider,
            payment_reference,
            shipping_address,
            billing_address,
            delivery_mode,
            ordered_items,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
          RETURNING id
        `)
          .bind(
            Number(user_id),
            status,
            total_amount,
            currency,
            payment_provider,
            payment_reference,
            JSON.stringify(shipping_address),
            JSON.stringify(billing_address),
            delivery_mode,
            JSON.stringify(ordered_items)
          )
          .first()
      );

      span.setAttribute('order.id', result.id);
      span.setAttribute('order.status', status);
      span.setAttribute('order.result', 'created');

      return result.id;
    }
  );
}

/**
 * ATOMIC ORDER CREATION TRANSACTION
 * Creates Order + Migrates Items + Closes Cart in one batch
 */
export async function createOrderTransaction(
  env,
  { checkout_id, payment_reference, payment_provider },
  ctx
) {
  return withSpan(
    ctx,
    'order.transaction.create',
    { 'checkout.id': checkout_id },
    async (span) => {
      // 1. Fetch Checkout Session (Source of Truth)
      const session = await withSpan(ctx, 'db.get.checkout_session', { 'checkout.id': checkout_id }, () =>
        env.DB.prepare(
          `SELECT * FROM checkout_snapshot WHERE id = ?`
        )
          .bind(checkout_id)
          .first()
      );

      if (!session) throw new Error('Checkout session not found');
      if (session.status !== 'CREATED') throw new Error('Checkout session invalid or already processed');

      const ordered_items = JSON.parse(session.cart_snapshot);
      const shipping_address = JSON.parse(session.shipping_address);
      const billing_address = session.billing_address ? JSON.parse(session.billing_address) : shipping_address;

      const orderData = {
        user_id: session.user_id,
        status: 'PAID',
        total_amount: session.total,
        currency: session.currency || 'USD',
        payment_provider,
        payment_reference,
        cart_id: session.cart_id,
        shipping_address,
        billing_address,
        delivery_mode: session.delivery_type,
        ordered_items
      };

      const { error } = createOrderSchema.validate(
        orderData,
        { abortEarly: false, stripUnknown: true }
      );
      if (error) throw new Error(`Invalid order data: ${error.message}`);

      // 2. Prepare Batch Operations
      const insertOrder = env.DB.prepare(`
        INSERT INTO orders (user_id, status, total_amount, currency, payment_provider, payment_reference, shipping_address, billing_address, delivery_mode, ordered_items, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        RETURNING id
      `).bind(
        Number(orderData.user_id),
        orderData.status,
        orderData.total_amount,
        orderData.currency,
        orderData.payment_provider,
        orderData.payment_reference,
        JSON.stringify(orderData.shipping_address),
        JSON.stringify(orderData.billing_address),
        orderData.delivery_mode,
        JSON.stringify(orderData.ordered_items)
      );

      const markCartOrdered = env.DB.prepare(`
        UPDATE carts SET status = 'completed', updated_at = datetime('now')
        WHERE id = ?
      `).bind(session.cart_id);

      const markItemsOrdered = env.DB.prepare(`
        UPDATE cart_items SET status = 'completed'
        WHERE cart_id = ?
      `).bind(session.cart_id);

      const createNewCart = env.DB.prepare(`
        INSERT INTO carts (user_id, status, created_at)
        SELECT ?, 'active', datetime('now')
        WHERE NOT EXISTS (SELECT 1 FROM carts WHERE user_id = ? AND status = 'active')
      `).bind(session.user_id, session.user_id);

      const completeSession = env.DB.prepare(`
        UPDATE checkout_snapshot SET status = 'COMPLETED' WHERE id = ?
      `).bind(checkout_id);

      // 3. Execute Transaction
      const results = await withSpan(ctx, 'db.transaction.create_order', { 'cart.id': session.cart_id }, () =>
        env.DB.batch([
          insertOrder,
          markCartOrdered,
          markItemsOrdered,
          createNewCart,
          completeSession
        ])
      );

      const success = results.every(r => r.success);
      if (!success) {
        throw new Error('Order transaction failed partially');
      }

      const orderId = results[0].results[0].id;
      span.setAttribute('order.id', orderId);
      return orderId;
    }
  );
}
 