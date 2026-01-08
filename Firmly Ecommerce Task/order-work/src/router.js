import { Router } from 'itty-router';
import { json, preflight } from './response';
import { getCookie } from './utils/cookie';

import { 
  checkoutShipping, 
  checkoutBillingAddress,
  checkoutDelivery
} from './routes/checkout.routes';
import {
  paypalCreate,
  paypalCapture
} from './routes/payment.routes';
import { getOrder, getAllOrders } from './routes/order.routes';

const router = Router();

/* ===============================
   CORS
================================ */
router.options('*', preflight);

/* ===============================
   AUTH CONTEXT
================================ */
router.all('*', async (req, env) => {
  req.env = env;

  const sessionId = getCookie(req, 'session_id');
  if (!sessionId) {
    req.userId = null;
    return;
  }

  const session = await env.SESSION_KV.get(sessionId);
  if (!session) {
    req.userId = null;
    return;
  }

  try {
    const data = JSON.parse(session);
    req.userId = data.user_id ? String(data.user_id) : null;
  } catch {
    req.userId = null;
  }
});

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


/* ===============================
   404
================================ */
router.all('*', (req) =>
  json(
    {
      error: 'Not Found',
      path: new URL(req.url).pathname
    },
    404,
    req
  )
);

export default router;