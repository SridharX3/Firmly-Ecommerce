import { json } from '../response.js';
import {
  createPayPalOrder,
  capturePayPalOrder
} from '../services/payment.service.js';
import { safeJson } from '../utils/safeJ.js';
import { createOrderTransaction } from '../services/order.service.js';
import { withSpan, setAttributes } from '../observability/otel.js';

/**
 * POST /payments/paypal/create
 */
export async function paypalCreate(req, env, ctx) {
  return withSpan(ctx, 'payment.paypal.create', { 'user.id': req.userId }, async (span) => {
    const { userId } = req;

    const checkout = await env.DB.prepare('SELECT * FROM checkout_snapshot WHERE user_id = ? AND status = ?')
      .bind(userId, 'CREATED')
      .first();

    if (!checkout) {
      return json({ error: 'No active checkout session found. Please complete shipping and billing steps.' }, 404, req);
    }

    if (!checkout.total || checkout.total <= 0) {
      return json({ error: 'Checkout total is invalid. Please select a delivery method.' }, 400, req);
    }

    const currency = 'USD';
    const finalTotal = checkout.total;
    const checkoutId = checkout.id;

    setAttributes(span, {
      'payment.total': finalTotal,
      'payment.currency': currency,
      'checkout.id': checkoutId
    });

    /* ===============================
       FRONTEND ORIGIN (DYNAMIC)
    ================================ */
    const origin =
      req.headers.get('Origin') ||
      req.headers.get('Referer')?.split('/').slice(0, 3).join('/') ||
      new URL(req.url).origin;

    try {
      const order = await createPayPalOrder(
        env,
        {
          total_amount: finalTotal,
          currency: currency,
          return_url: `${origin}/order/success`,
          cancel_url: `${origin}/order/cancel`
        },
        ctx
      );

      span.setAttribute('payment.paypal_order_id', order.paypal_order_id);

      return json(
        {
          paypal_order_id: order.paypal_order_id,
          approval_url: order.approval_url
        },
        201,
        req
      );
    } catch (err) {
      console.error('[PAYPAL CREATE ERROR]', err);
      span.recordException(err);
      return json(
        { error: err.message },
        500,
        req
      );
    }
  });
}

/**
 * POST /payments/paypal/capture
 */
export async function paypalCapture(req, env, ctx) {
  return withSpan(ctx, 'payment.paypal.capture', { 'user.id': req.userId }, async (span) => {
    const { userId } = req;

    const body = await safeJson(req);
    const { paypal_order_id } = body;

    if (!paypal_order_id) {
      return json({ error: 'paypal_order_id required' }, 400, req);
    }
    span.setAttribute('payment.paypal_order_id', paypal_order_id);

    const checkout = await env.DB.prepare('SELECT * FROM checkout_snapshot WHERE user_id = ? AND status = ?')
      .bind(userId, 'CREATED')
      .first();

    if (!checkout) return json({ error: 'No active checkout session found.' }, 404, req);

    try {
      const result = await capturePayPalOrder(
        env,
        paypal_order_id,
        ctx
      );
      span.setAttribute('payment.capture_status', result.status);

      if (result.status === 'COMPLETED') {
        const orderId = await createOrderTransaction(env, {
          checkout_id: checkout.id,
          payment_provider: 'paypal',
          payment_reference: result.capture_id
        }, ctx);
        
        span.setAttribute('order.id', orderId);

        return json({
          success: true,
          order_id: orderId,
          status: result.status
        }, 200, req);
      }

      return json(
        {
          success: true,
          status: result.status,
          capture_id: result.capture_id
        },
        200,
        req
      );
    } catch (err) {
      console.error('[PAYPAL CAPTURE ERROR]', err);
      span.recordException(err);
      return json(
        { error: err.message },
        500,
        req
      );
    }
  });
}
