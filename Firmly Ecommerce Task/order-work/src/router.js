import { Router } from 'itty-router';
import { json, preflight } from './response.js';
import { getCookie } from './utils/cookie.js';

import { 
  checkoutShipping, 
  checkoutBillingAddress,
  checkoutDelivery
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
router.post('/checkout/shipping', checkoutShipping);
router.post('/checkout/billing', checkoutBillingAddress);
router.post('/checkout/delivery', checkoutDelivery);

/* PAYPAL */
router.post('/payments/paypal/create', paypalCreate);
router.post('/payments/paypal/capture', paypalCapture);

/* ORDERS */
router.get('/orders', getAllOrders);
router.get('/orders/:orderId', getOrder);

// 404 Fallback for unknown routes
router.all('*', (req) => json({ error: 'Not Found', path: new URL(req.url).pathname }, 404, req));

export default router;