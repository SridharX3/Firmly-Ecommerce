import { json } from '../response.js';
import { safeJson } from '../utils/safeJ.js';
import Joi from 'joi';
import { cancelCheckout } from '../services/checkout.service.js';
import { withSpan, setAttributes } from '../observability/otel.js';

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

function syncUserProfile(ctx, env, req, type, address) {
  const baseUrl = env.AUTH_WORKER_URL;
  if (!baseUrl) {
    console.warn('[Sync Profile] AUTH_WORKER_URL not configured');
    return;
  }

  const url = `${baseUrl}/user/${type}-address`;
  
  ctx.waitUntil(
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': req.headers.get('Cookie') || ''
      },
      body: JSON.stringify({ [`${type}_address`]: address })
    }).catch(err => console.error(`[Sync Profile] Failed to update ${type} address:`, err))
  );
}

async function getActiveCheckout(env, userId) {
  return env.DB.prepare('SELECT * FROM checkout_snapshot WHERE user_id = ? AND status = ?')
    .bind(userId, 'CREATED')
    .first();
}

export async function getCheckout(req, env, ctx) {
  return withSpan(ctx, 'checkout.get', { 'user.id': req.userId }, async (span) => {
    const checkout = await getActiveCheckout(env, req.userId);
    
    if (!checkout) {
      return json({ message: 'No active checkout session' }, 404, req);
    }

    const cartSnapshot = checkout.cart_snapshot ? JSON.parse(checkout.cart_snapshot) : [];

    // Hydrate images since they are not saved in snapshot anymore
    for (const item of cartSnapshot) {
      if (!item.image_url) {
        const product = await env.DB.prepare('SELECT image_url FROM products WHERE id = ?')
          .bind(item.product_id)
          .first();
        if (product) item.image_url = product.image_url;
      }
    }

    const response = {
      ...checkout,
      shipping_address: checkout.shipping_address ? JSON.parse(checkout.shipping_address) : null,
      billing_address: checkout.billing_address ? JSON.parse(checkout.billing_address) : null,
      cart_snapshot: cartSnapshot
    };

    return json(response, 200, req);
  });
}

export async function checkoutShipping(req, env, ctx) {
  return withSpan(ctx, 'checkout.shipping', { 'user.id': req.userId }, async (span) => {
    const { userId } = req;
    const body = await safeJson(req);
    const { shipping_address } = body;

    if (!shipping_address) {
      return json({ error: 'Shipping address is required' }, 400, req);
    }

    const { error, value: validated_address } = addressSchema.validate(shipping_address);
    if (error) {
      return json({ error: `Invalid shipping address: ${error.message}` }, 400, req);
    }

    let checkout = await getActiveCheckout(env, userId);

    if (checkout) {
      await env.DB.prepare('UPDATE checkout_snapshot SET shipping_address = ? WHERE id = ?')
        .bind(JSON.stringify(validated_address), checkout.id)
        .run();
    } else {
      const cart = await env.DB.prepare('SELECT id FROM carts WHERE user_id = ? AND status = ? ORDER BY created_at DESC')
        .bind(userId, 'active')
        .first();

      if (!cart) return json({ error: 'No active cart found' }, 404, req);

      const items = await env.DB.prepare(`
        SELECT ci.*, p.delivery_options 
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        WHERE ci.cart_id = ? AND ci.status = ?
      `).bind(cart.id, 'active').all();

      if (!items.results.length) return json({ error: 'Cart is empty' }, 400, req);

      let subtotal = 0;
      const snapshot = items.results.map(item => {
        subtotal += item.snapshot_price * item.quantity;
        return {
          product_id: item.product_id,
          name: item.snapshot_name || item.name,
          price: item.snapshot_price,
          quantity: item.quantity
        };
      });

      const checkoutId = crypto.randomUUID();
      const tax = 0;
      const shipping = 0;
      const total = subtotal;

      await env.DB.batch([
        env.DB.prepare(`
          INSERT INTO checkout_snapshot 
          (id, user_id, cart_id, cart_snapshot, subtotal, tax, shipping, total, status, shipping_address)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'CREATED', ?)
        `).bind(
          checkoutId, userId, cart.id, JSON.stringify(snapshot), subtotal, tax, shipping, total, JSON.stringify(validated_address)
        ),
        env.DB.prepare("UPDATE carts SET status = 'CHECKOUT_LOCKED' WHERE id = ?").bind(cart.id)
      ]);
    }

    syncUserProfile(ctx, env, req, 'shipping', validated_address);

    return json({ message: 'Shipping address saved', next_step: 'billing' }, 200, req);
  });
}

export async function checkoutBillingAddress(req, env, ctx) {
  return withSpan(ctx, 'checkout.billing', { 'user.id': req.userId }, async (span) => {
    const { userId } = req;
    const body = await safeJson(req);
    const { billing_address, use_shipping_for_billing } = body;

    const checkout = await getActiveCheckout(env, userId);
    if (!checkout) return json({ error: 'Session expired or not found' }, 404, req);

    let finalBilling = null;
    if (use_shipping_for_billing) {
      finalBilling = JSON.parse(checkout.shipping_address);
    } else {
      if (!billing_address) return json({ error: 'Billing address is required' }, 400, req);
      const { error, value } = addressSchema.validate(billing_address);
      if (error) return json({ error: `Invalid billing address: ${error.message}` }, 400, req);
      finalBilling = value;
    }

    await env.DB.prepare('UPDATE checkout_snapshot SET billing_address = ? WHERE id = ?')
      .bind(JSON.stringify(finalBilling), checkout.id)
      .run();

    syncUserProfile(ctx, env, req, 'billing', finalBilling);

    return json({ message: 'Billing address saved', next_step: 'delivery' }, 200, req);
  });
}

export async function checkoutDelivery(req, env, ctx) {
  return withSpan(ctx, 'checkout.delivery', { 'user.id': req.userId }, async (span) => {
    const { userId } = req;
    const body = await safeJson(req);
    const { delivery_type } = body;

    if (!delivery_type) return json({ error: 'Delivery type is required' }, 400, req);

    const checkout = await getActiveCheckout(env, userId);
    if (!checkout) return json({ error: 'Session expired or not found' }, 404, req);

    // Validate delivery type against DB products since snapshot doesn't have options
    const dbItems = await env.DB.prepare(`
      SELECT p.name, p.delivery_options 
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.cart_id = ?
    `).bind(checkout.cart_id).all();

    for (const item of dbItems.results) {
      let options = ['NORMAL'];
      try {
        if (item.delivery_options) options = JSON.parse(item.delivery_options);
      } catch (e) {}
      
      if (!options.includes(delivery_type)) {
        return json({ error: `Delivery method '${delivery_type}' is not available for product: ${item.name}` }, 400, req);
      }
    }

    const delivery = DELIVERY_PRICING[delivery_type];
    if (!delivery) return json({ error: 'Invalid delivery type' }, 400, req);

    const shippingCost = delivery.cost;
    const shippingAddr = JSON.parse(checkout.shipping_address);
    const taxRate = shippingAddr.state?.toUpperCase() === 'TN' ? 0.05 : 0.12;
    
    const subtotal = checkout.subtotal;
    const taxAmount = Math.round(subtotal * taxRate);
    const total = subtotal + taxAmount + shippingCost;

    await env.DB.prepare(`
      UPDATE checkout_snapshot 
      SET delivery_type = ?, shipping = ?, tax = ?, total = ?
      WHERE id = ?
    `).bind(delivery_type, shippingCost, taxAmount, total, checkout.id).run();

    return json({ 
      message: 'Billing details updated', 
      summary: {
        subtotal,
        shipping: shippingCost,
        tax: taxAmount,
        total
      },
      next_step: 'payment' 
    }, 200, req);
  });
}

export async function checkoutCancel(req, env, ctx) {
  return withSpan(ctx, 'checkout.cancel_route', { 'user.id': req.userId }, async (span) => {
    const checkout = await getActiveCheckout(env, req.userId);
    
    if (!checkout) return json({ message: 'No active session' }, 200, req);

    await cancelCheckout(env, checkout.id, ctx);

    return json({ message: 'Checkout cancelled, cart unlocked' }, 200, req);
  });
}
