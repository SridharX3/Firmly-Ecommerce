import { json } from '../response';
import {
  createPayPalOrder,
  capturePayPalOrder
} from '../services/payment.service';
import { getCookie } from '../utils/cookie';
import { safeJson } from '../utils/safeJ';
import { createOrderTransaction } from '../services/order.service';
import { withSpan, setAttributes } from '../observability/otel';

/**
 * POST /payments/paypal/create
 */
export async function paypalCreate(req, env, ctx) {
  return withSpan(ctx, 'payment.paypal.create', { 'user.id': req.userId }, async (span) => {
    const { userId } = req;
    if (!userId) return json({ error: 'Unauthorized' }, 401, req);

    const sessionId = getCookie(req, 'session_id');
    const sessionRaw = await env.SESSION_KV.get(sessionId);
    if (!sessionRaw) return json({ error: 'Session expired' }, 401, req);

    const session = JSON.parse(sessionRaw);
    const checkout = session.checkout;

    if (!checkout || checkout.step !== 'BILLING_COMPLETED') {
      return json({ error: 'Please complete shipping and billing steps first' }, 400, req);
    }

    // Edge Case: Re-verify cart total from DB to prevent stale session pricing
    const cart = await env.DB.prepare('SELECT total_price FROM carts WHERE id = ? AND status = ?')
      .bind(checkout.cart_id, 'active')
      .first();

    if (!cart) return json({ error: 'Active cart not found' }, 404, req);
    
    // Read total amount from session (includes shipping + tax)
    const finalTotal = checkout.total_price;

    if (finalTotal <= 0) {
      return json({ error: 'Order total must be greater than 0' }, 400, req);
    }

    setAttributes(span, {
      'payment.total': finalTotal,
      'payment.currency': checkout.currency || 'USD'
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
          currency: checkout.currency || 'USD',
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
    if (!userId) return json({ error: 'Unauthorized' }, 401, req);

    const body = await safeJson(req);
    const { paypal_order_id } = body;

    if (!paypal_order_id) {
      return json({ error: 'paypal_order_id required' }, 400, req);
    }
    span.setAttribute('payment.paypal_order_id', paypal_order_id);

    try {
      const result = await capturePayPalOrder(
        env,
        paypal_order_id,
        ctx
      );
      span.setAttribute('payment.capture_status', result.status);

      if (result.status === 'COMPLETED') {
        const sessionId = getCookie(req, 'session_id');
        const session = JSON.parse(await env.SESSION_KV.get(sessionId));

        const orderId = await createOrderTransaction(env, {
          user_id: Number(userId),
          status: 'PAID',
          total_amount: session.checkout.total_price,
          currency: session.checkout.currency,
          payment_provider: 'paypal',
          payment_reference: result.capture_id,
          cart_id: session.checkout.cart_id,
          shipping_address: session.checkout.shipping_address,
          billing_address: session.checkout.billing_address || session.checkout.shipping_address,
          delivery_mode: session.checkout.delivery_type
        }, ctx);
        
        span.setAttribute('order.id', orderId);
        
        // 2. Clear checkout session state
        delete session.checkout;
        await env.SESSION_KV.put(sessionId, JSON.stringify(session));

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
