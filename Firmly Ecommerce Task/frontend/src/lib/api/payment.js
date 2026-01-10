import { apiFetch } from './client';
import { ORDER_API } from './endpoints';

/* =========================
   CREATE PAYPAL PAYMENT
========================= */
export function createPayPalPayment({ total, checkout_id }) {
  return apiFetch(
    `${ORDER_API}/payments/paypal/create`,
    {
      method: 'POST',
      body: { checkout_id }
    }
  );
}

/* =========================
   CAPTURE PAYPAL PAYMENT
========================= */
export function capturePayPalPayment({ paypal_order_id }) {
  return apiFetch(
    `${ORDER_API}/payments/paypal/capture`,
    {
      method: 'POST',
      body: { paypal_order_id }
    }
  );
}
