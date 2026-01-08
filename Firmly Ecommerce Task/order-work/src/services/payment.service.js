import { getPayPalAccessToken } from '../utils/paypal';
import { withSpan } from '../observability/otel.js';

/**
 * CREATE PAYPAL ORDER
 */
export async function createPayPalOrder(
  env,
  { total_amount, currency, return_url, cancel_url },
  ctx
) {
  const BASE = env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com';

  return withSpan(
    ctx,
    'paypal.order.create',
    {
      'payment.provider': 'paypal',
      'payment.amount': total_amount,
      'payment.currency': currency || 'USD'
    },
    async (span) => {
      if (!return_url || !cancel_url) {
        span.setAttribute('error.reason', 'missing_return_urls');
        throw new Error('PayPal return/cancel URLs required');
      }

      const token = await withSpan(
        ctx,
        'paypal.auth.token',
        {},
        () => getPayPalAccessToken(env)
      );

      const res = await withSpan(
        ctx,
        'paypal.http.create_order',
        {
          'http.method': 'POST',
          'http.url': '/v2/checkout/orders'
        },
        () =>
          fetch(`${BASE}/v2/checkout/orders`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              intent: 'CAPTURE',

              application_context: {
                user_action: 'PAY_NOW',
                return_url,
                cancel_url
              },

              purchase_units: [
                {
                  amount: {
                    currency_code: currency || 'USD',
                    value: String(total_amount)
                  }
                }
              ]
            })
          })
      );

      const data = await res.json();

      span.setAttribute('http.status_code', res.status);
      span.setAttribute('paypal.order_status', data.status);

      if (!res.ok) {
        span.recordException(data);
        console.error('PAYPAL CREATE RAW:', data);
        throw new Error(
          data.message || 'PayPal order creation failed'
        );
      }

      const approveLink = data.links?.find(
        (l) => l.rel === 'approve'
      );

      if (!approveLink) {
        span.setAttribute('error.reason', 'missing_approval_link');
        console.error('PAYPAL LINKS:', data.links);
        throw new Error('PayPal approval URL missing');
      }

      span.setAttribute('paypal.order_id', data.id);

      return {
        paypal_order_id: data.id,
        approval_url: approveLink.href,
        status: data.status
      };
    }
  );
}

/**
 * CAPTURE PAYPAL ORDER
 */
export async function capturePayPalOrder(
  env,
  paypalOrderId,
  ctx
) {
  const BASE = env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com';

  return withSpan(
    ctx,
    'paypal.order.capture',
    {
      'payment.provider': 'paypal',
      'paypal.order_id': paypalOrderId
    },
    async (span) => {
      const token = await withSpan(
        ctx,
        'paypal.auth.token',
        {},
        () => getPayPalAccessToken(env)
      );

      const res = await withSpan(
        ctx,
        'paypal.http.capture_order',
        {
          'http.method': 'POST',
          'http.url': `/v2/checkout/orders/${paypalOrderId}/capture`
        },
        () =>
          fetch(
            `${BASE}/v2/checkout/orders/${paypalOrderId}/capture`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }
          )
      );

      const data = await res.json();

      span.setAttribute('http.status_code', res.status);
      span.setAttribute('paypal.capture_status', data.status);

      if (!res.ok) {
        span.recordException(data);
        console.error('PAYPAL CAPTURE RAW:', data);
        throw new Error(
          data.message || 'PayPal capture failed'
        );
      }

      const captureId =
        data.purchase_units?.[0]?.payments
          ?.captures?.[0]?.id;

      span.setAttribute('paypal.capture_id', captureId);

      return {
        status: data.status,
        capture_id: captureId
      };
    }
  );
}
