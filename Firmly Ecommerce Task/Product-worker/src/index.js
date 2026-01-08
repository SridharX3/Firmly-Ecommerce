import { Router } from 'itty-router';
import * as service from './products.service.js';
import { json, preflight } from './response.js';
import { ViewerCounter } from './viewer-counter.js';

const router = Router();

/* ===============================
   HELPERS & MIDDLEWARE
================================ */
router.options('*', (request) => preflight(request));

async function getAuthUser(request, env) {
  if (!env.AUTH_WORKER_URL) {
    console.error('AUTH_WORKER_URL binding is missing');
    return null;
  }

  const cookie = request.headers.get('Cookie');
  if (!cookie) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000); 

    const res = await fetch(`${env.AUTH_WORKER_URL.replace(/\/$/, '')}/session`, {
      headers: { Cookie: cookie },
      signal: controller.signal
    });

    clearTimeout(timeout);
    if (!res.ok) return null;

    const { session } = await res.json();

    if (session?.user_id) {
      const user = await env.DB.prepare('SELECT role FROM users WHERE id = ?')
        .bind(session.user_id)
        .first();

      if (user?.role) {
        session.role = user.role.trim();
        return session;
      }
    }
    return null;
  } catch (err) {
    console.error('Auth error:', err);
    return null;
  }
}

async function safeParseJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/* ===============================
   READ ALL PRODUCTS
================================ */
router.get('/products', async (request, env, ctx) => {
  const user = await getAuthUser(request, env);
  const page = request.headers.get('X-Page');
  const products = await service.getAll(env.DB, { page, role: user?.role }, ctx);

  return json(products, 200, request);
});

/* ===============================
   READ ONE PRODUCT
================================ */
router.get('/products/:id', async (request, env, ctx) => {
  const id = Number(request.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return json({ error: 'Invalid product id' }, 400, request);
  }

  // Handle WebSocket Upgrade for live viewer count on this specific product
  if (request.headers.get('Upgrade') === 'websocket') {
    if (!env.VIEWER_COUNTER) return json({ error: 'Viewer Counter binding missing' }, 500, request);
    const doId = env.VIEWER_COUNTER.idFromName(`product_${id}`);
    return env.VIEWER_COUNTER.get(doId).fetch(request);
  }

  const user = await getAuthUser(request, env);

  const product = await service.getById(env.DB, id, { role: user?.role }, ctx);

  return product
    ? json(product, 200, request)
    : json({ error: 'Product not found' }, 404, request);
});

/* ===============================
   READ ONE (SSR)
================================ */
router.get('/products/ssr/:id', async (request, env, ctx) => {
  const id = Number(request.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return json({ error: 'Invalid product id' }, 400, request);
  }

  const product = await service.getById(env.DB, id, {}, ctx);

  if (!product) {
    return new Response(
      `<!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Product Not Found</title>
          <style>
              body { font-family: sans-serif; text-align: center; padding-top: 50px; }
              h1 { color: #dc3545; }
          </style>
      </head>
      <body>
          <h1>Product Not Found</h1>
          <p>The product you are looking for does not exist.</p>
      </body>
      </html>`,
      {
        status: 404,
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${product.name}</title>
        <style>
            body { font-family: sans-serif; margin: 20px; }
            .container { max-width: 800px; margin: auto; background: #f9f9f9; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,.1); }
            h1 { color: #333; }
            p { color: #555; line-height: 1.6; }
            img { max-width: 100%; height: auto; border-radius: 4px; margin-bottom: 20px; }
            .price { font-size: 1.5em; color: #007bff; font-weight: bold; }
            .specs { background: #eee; padding: 15px; border-radius: 5px; margin-top: 20px; }
            .specs h2 { font-size: 1.2em; margin-top: 0; }
            .specs ul { list-style: none; padding: 0; }
            .specs li { margin-bottom: 5px; }
            .status { font-style: italic; color: #666; margin-top: 10px; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>${product.name}</h1>
            ${product.image_url ? `<img src="${product.image_url}" alt="${product.name}">` : ''}
            <p class="price">${product.price.toFixed(2)}</p>
            <p class="status">Status: ${product.status}</p>
            <p style="color: #d63384; font-weight: bold;">Live Viewers: <span id="live-count">...</span></p>

            ${product.specs && Object.keys(product.specs).length > 0 ? `
            <div class="specs">
                <h2>Specifications</h2>
                <ul>
                    ${Object.entries(product.specs).map(([key, value]) => `<li><strong>${key.replace(/_/g, ' ')}:</strong> ${Array.isArray(value) ? value.join(', ') : value}</li>`).join('')}
                </ul>
            </div>
            ` : ''}
        </div>
        <script>
          (function() {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = protocol + '//' + window.location.host + '/products/${id}';
            const ws = new WebSocket(wsUrl);
            ws.onmessage = (event) => {
              const data = JSON.parse(event.data);
              document.getElementById('live-count').innerText = data.count;
            };
          })();
        </script>
    </body>
    </html>
  `;

  return new Response(htmlContent, {
    status: 200,
    headers: { 'Content-Type': 'text/html' }
  });
});

/* ===============================
   ADMIN — CREATE PRODUCT
================================ */
router.post('/products', async (request, env, ctx) => {
  const user = await getAuthUser(request, env);
  if (user?.role !== 'admin') {
    return json({ error: 'Unauthorized' }, 401, request);
  }

  const body = await safeParseJson(request);
  if (!body) {
    return json({ error: 'Invalid or missing JSON body' }, 400, request);
  }

  const product = await service.create(env.DB, body, ctx);

  return json(product, 201, request);
});

/* ===============================
   ADMIN — UPDATE
================================ */
router.patch('/products/:id', async (request, env, ctx) => {
  const user = await getAuthUser(request, env);
  if (user?.role !== 'admin') {
    return json({ error: 'Unauthorized' }, 401, request);
  }

  const id = Number(request.params.id);
  if (!Number.isInteger(id)) {
    return json({ error: 'Invalid product id' }, 400, request);
  }

  const body = await safeParseJson(request);
  if (!body) {
    return json({ error: 'Invalid or missing JSON body' }, 400, request);
  }

  const updated = await service.update(env.DB, id, body, ctx);

  return updated
    ? json(updated, 200, request)
    : json({ error: 'Product not found' }, 404, request);
});

/* ===============================
   ADMIN — DELETE / RESTORE
================================ */
router.patch('/products/:action/:id', async (request, env, ctx) => {
  const user = await getAuthUser(request, env);
  if (user?.role !== 'admin') {
    return json({ error: 'Unauthorized' }, 401, request);
  }

  const { action, id: rawId } = request.params;
  if (!['delete', 'restore'].includes(action)) return;

  const id = Number(rawId);
  const result = await service.toggleDeletion(env.DB, id, action === 'restore', ctx);

  return result
    ? json(result, 200, request)
    : json({ error: 'Product not found' }, 404, request);
});

/* ===============================
   FALLBACK
================================ */
router.all('*', (request) =>
  json({ error: 'Route not found' }, 404, request)
);

export { ViewerCounter };

export default {
  async fetch(request, env, ctx) {
    try {
      if (!env.DB) {
        return json({ error: 'Database binding missing' }, 500, request);
      }
      return await router.handle(request, env, ctx);
    } catch (err) {
      console.error('Unhandled Error:', err);
      return json(
        { error: 'Internal Server Error', message: err.message },
        500,
        request
      );
    }
  }
};
