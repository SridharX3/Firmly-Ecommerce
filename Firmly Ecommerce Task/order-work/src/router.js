import { Router } from 'itty-router';
import { json, preflight } from './response.js';
import { getCookie } from './utils/cookie.js';
import { requireAuth } from './middleware/auth.js';

import { 
  checkoutShipping, 
  checkoutBillingAddress,
  checkoutDelivery,
  checkoutCancel,
  getCheckout
} from './routes/checkout.routes.js';
import {
  paypalCreate,
  paypalCapture
} from './routes/payment.routes.js';
import { getOrder, getAllOrders } from './routes/order.routes.js';

const router = Router();

/* ===============================
   CORS
================================ */
router.options('*', preflight);

/* ===============================
   ROUTES
================================ */
router.get('/checkout', requireAuth, getCheckout);
router.post('/checkout/shipping', requireAuth, checkoutShipping);
router.post('/checkout/billing', requireAuth, checkoutBillingAddress);
router.post('/checkout/delivery', requireAuth, checkoutDelivery);
router.post('/checkout/cancel', requireAuth, checkoutCancel);

/* PAYPAL */
router.post('/payments/paypal/create', requireAuth, paypalCreate);
router.post('/payments/paypal/capture', requireAuth, paypalCapture);

/* ORDERS */
router.get('/orders', requireAuth, getAllOrders);
router.get('/orders/:orderId', requireAuth, getOrder);

// 404 Fallback for unknown routes
router.all('*', (req) => json({ error: 'Not Found', path: new URL(req.url).pathname }, 404, req));

export default router;