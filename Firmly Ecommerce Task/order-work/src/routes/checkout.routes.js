import { json } from '../response';
import { safeJson } from '../utils/safeJ';
import { getCookie } from '../utils/cookie';
import Joi from 'joi';
import { withSpan, setAttributes } from '../observability/otel';

const DELIVERY_PRICING = {
  NORMAL: { cost: 50, eta_days: 5 },
  SPEED: { cost: 120, eta_days: 2 },
  EXPRESS: { cost: 250, eta_days: 1 }
};

const addressSchema = Joi.object({
  full_name: Joi.string().min(2).required(),
  phone: Joi.string().min(6).required(),
  address_line1: Joi.string().min(5).required(),
  address_line2: Joi.string().optional().allow(''),
  city: Joi.string().required(),
  state: Joi.string().required(),
  postal_code: Joi.string().required(),
  country: Joi.string().length(2).default('IN')
}).rename('zip', 'postal_code');

export async function checkoutShipping(req, env, ctx) {
  return withSpan(ctx, 'checkout.shipping', { 'user.id': req.userId }, async (span) => {
    const { userId } = req;
    if (!userId) return json({ error: 'Unauthorized' }, 401, req);

    const body = await safeJson(req);
    const { shipping_address } = body;

    if (!shipping_address || !shipping_address.address_line1) {
      return json({ error: 'Shipping address is required' }, 400, req);
    }

    const { error, value: validated_shipping_address } = addressSchema.validate(shipping_address);

    if (error) {
      return json({ error: `Invalid shipping address: ${error.message}` }, 400, req);
    }

    // Verify user has an active cart in the database
    const cart = await env.DB.prepare('SELECT id FROM carts WHERE user_id = ? AND status = ? ORDER BY created_at DESC')
      .bind(userId, 'active')
      .first();

    if (!cart) return json({ error: 'No active cart found' }, 404, req);

    // Get current session data
    const sessionId = getCookie(req, 'session_id');
    if (!sessionId) return json({ error: 'Session ID missing' }, 401, req);
    const sessionRaw = await env.SESSION_KV.get(sessionId);
    const session = JSON.parse(sessionRaw || '{}');

    // Update session with shipping info
    session.checkout = {
      ...session.checkout,
      shipping_address: validated_shipping_address,
      cart_id: cart.id,
      step: 'SHIPPING_COMPLETED'
    };

    await env.SESSION_KV.put(sessionId, JSON.stringify(session));

    return json({ message: 'Shipping address saved', next_step: 'billing' }, 200, req);
  });
}

export async function checkoutBillingAddress(req, env, ctx) {
  return withSpan(ctx, 'checkout.billing', { 'user.id': req.userId }, async (span) => {
    const { userId } = req;
    if (!userId) return json({ error: 'Unauthorized' }, 401, req);

    const body = await safeJson(req);
    const { billing_address, use_shipping_for_billing } = body;

    if (!billing_address && !use_shipping_for_billing) {
      return json({ error: 'Billing address is required' }, 400, req);
    }

    const sessionId = getCookie(req, 'session_id');
    if (!sessionId) return json({ error: 'Session ID missing' }, 401, req);
    const sessionRaw = await env.SESSION_KV.get(sessionId);
    if (!sessionRaw) return json({ error: 'Session expired' }, 401, req);
    
    const session = JSON.parse(sessionRaw);
    if (session.checkout?.step !== 'SHIPPING_COMPLETED') {
      return json({ error: 'Please complete shipping step first' }, 400, req);
    }

    let validated_billing_address = session.checkout.shipping_address;
    if (!use_shipping_for_billing) {
      const { error, value } = addressSchema.validate(billing_address);
      if (error) {
        return json({ error: `Invalid billing address: ${error.message}` }, 400, req);
      }
      validated_billing_address = value;
    }

    session.checkout.billing_address = validated_billing_address;
    session.checkout.step = 'BILLING_ADDRESS_COMPLETED';

    await env.SESSION_KV.put(sessionId, JSON.stringify(session));

    return json({ message: 'Billing address saved', next_step: 'delivery' }, 200, req);
  });
}

export async function checkoutDelivery(req, env, ctx) {
  return withSpan(ctx, 'checkout.delivery', { 'user.id': req.userId }, async (span) => {
    const { userId } = req;
    if (!userId) return json({ error: 'Unauthorized' }, 401, req);

    const body = await safeJson(req);
    const { delivery_type } = body;

    if (!delivery_type) {
      return json({ error: 'Delivery type is required' }, 400, req);
    }

    const sessionId = getCookie(req, 'session_id');
    if (!sessionId) return json({ error: 'Session ID missing' }, 401, req);
    const sessionRaw = await env.SESSION_KV.get(sessionId);
    if (!sessionRaw) return json({ error: 'Session expired' }, 401, req);
    
    const session = JSON.parse(sessionRaw);
    if (session.checkout?.step !== 'BILLING_ADDRESS_COMPLETED') {
      return json({ error: 'Please complete billing address step first' }, 400, req);
    }

    // Fetch the latest cart total and items to validate delivery options
    const cart = await env.DB.prepare('SELECT total_price, currency FROM carts WHERE id = ? AND user_id = ? AND status = ?')
      .bind(session.checkout.cart_id, userId, 'active')
      .first();

    if (!cart) return json({ error: 'Cart not found' }, 404, req);

    // Validate delivery type against all products in the cart
    const items = await env.DB.prepare(`
      SELECT p.delivery_options, p.name 
      FROM cart_items ci 
      JOIN products p ON ci.product_id = p.id 
      WHERE ci.cart_id = ? AND ci.status = ?
    `).bind(session.checkout.cart_id, 'active').all();

    for (const item of items.results) {
      let options = [];
      try {
        options = JSON.parse(item.delivery_options || '["NORMAL"]');
      } catch {
        options = ["NORMAL"];
      }

      if (!options.includes(delivery_type)) {
        return json({ 
          error: `Delivery method '${delivery_type}' is not available for product: ${item.name}` 
        }, 400, req);
      }
    }

    const delivery = DELIVERY_PRICING[delivery_type];
    if (!delivery) {
      return json({ error: 'Invalid delivery type' }, 400, req);
    }
    const shippingCost = delivery.cost;

    const taxRate = session.checkout.shipping_address.state?.toUpperCase() === 'TN' ? 0.05 : 0.12;
    const subtotal = cart.total_price; 
    const taxAmount = Math.round(subtotal * taxRate);
    const total = subtotal + taxAmount + shippingCost;

    // Update session with billing info
    session.checkout = {
      ...session.checkout,
      delivery_type,
      shipping_cost: shippingCost,
      tax_amount: taxAmount,
      total_price: total,
      currency: cart.currency,
      step: 'BILLING_COMPLETED'
    };
    setAttributes(span, {
      'checkout.subtotal': subtotal,
      'checkout.shipping': shippingCost,
      'checkout.tax': taxAmount,
      'checkout.total': total,
      'checkout.delivery_type': delivery_type
    });

    await env.SESSION_KV.put(sessionId, JSON.stringify(session));

    return json({ 
      message: 'Billing details updated', 
      summary: {
        subtotal,
        shipping: shippingCost,
        tax: taxAmount,
        total: session.checkout.total_price,
        currency: cart.currency
      },
      next_step: 'payment' 
    }, 200, req);
  });
}
