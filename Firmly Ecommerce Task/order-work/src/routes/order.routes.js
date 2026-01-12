import { json } from '../response.js';
import { withSpan, setAttributes } from '../observability/otel.js';

export async function getAllOrders(req, env, ctx) {
  return withSpan(ctx, 'order.get_all', { 'user.id': req.userId }, async (span) => {
    const { results } = await withSpan(ctx, 'db.get_all_orders', { 'user.id': req.userId }, () =>
      env.DB
        .prepare('SELECT * FROM orders WHERE user_id = ?')
        .bind(req.userId)
        .all()
    );

    const orders = await Promise.all(results.map(async (order) => {
      const orderedItems = typeof order.ordered_items === 'string'
        ? JSON.parse(order.ordered_items)
        : order.ordered_items;

      for (const item of orderedItems) {
        if (!item.image_url) {
          const product = await withSpan(ctx, 'db.get_product_image', { 'product.id': item.product_id }, () =>
            env.DB
              .prepare('SELECT image_url FROM products WHERE id = ?')
              .bind(item.product_id)
              .first()
          );
          if (product) {
            item.image_url = product.image_url;
          }
        }
      }

      return {
        id: order.id,
        user_id: order.user_id,
        status: order.status,
        ordered_items: orderedItems,
        total_amount: order.total_amount,
        currency: order.currency,
        shipping_address: typeof order.shipping_address === 'string' ? JSON.parse(order.shipping_address) : order.shipping_address,
        billing_address: typeof order.billing_address === 'string' ? JSON.parse(order.billing_address) : order.billing_address,
        delivery_mode: order.delivery_mode,
        payment_provider: order.payment_provider,
        payment_reference: order.payment_reference,
        created_at: order.created_at
      };
    }));

    setAttributes(span, { 'order.count': orders.length });

    return json(orders, 200, req);
  });
}

export async function getOrder(req, env, ctx) {
  return withSpan(ctx, 'order.get_one', { 'user.id': req.userId, 'order.id': req.params.orderId }, async (span) => {
    const order = await withSpan(ctx, 'db.get_order', { 'order.id': req.params.orderId }, () =>
      env.DB
        .prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?')
        .bind(req.params.orderId, req.userId)
        .first()
    );

    if (!order) return json({ error: 'Not found' }, 404, req);

    const orderedItems = typeof order.ordered_items === 'string'
      ? JSON.parse(order.ordered_items)
      : order.ordered_items;

    for (const item of orderedItems) {
      if (!item.image_url) {
        const product = await withSpan(ctx, 'db.get_product_image', { 'product.id': item.product_id }, () =>
          env.DB
            .prepare('SELECT image_url FROM products WHERE id = ?')
            .bind(item.product_id)
            .first()
        );
        if (product) {
          item.image_url = product.image_url;
        }
      }
    }

    return json({
      id: order.id,
      user_id: order.user_id,
      status: order.status,
      ordered_items: orderedItems,
      total_amount: order.total_amount,
      currency: order.currency,
      shipping_address: typeof order.shipping_address === 'string' ? JSON.parse(order.shipping_address) : order.shipping_address,
      billing_address: typeof order.billing_address === 'string' ? JSON.parse(order.billing_address) : order.billing_address,
      delivery_mode: order.delivery_mode,
      payment_provider: order.payment_provider,
      payment_reference: order.payment_reference,
      created_at: order.created_at
    }, 200, req);
  });
}
