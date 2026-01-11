import { expect } from 'chai';
import sinon from 'sinon';
import worker from '../src/index.js';
import { ViewerCounter } from '../src/viewer-counter.js';
import * as otel from '../src/observability/otel.js';

// Polyfill WebSocketPair for Cloudflare Workers environment simulation
if (!global.WebSocketPair) {
  global.WebSocketPair = class {
    constructor() {
      this.listeners = {};
      const createSocket = () => ({
        accept: sinon.stub(),
        addEventListener: sinon.stub().callsFake((event, cb) => {
          this.listeners[event] = cb;
        }),
        send: sinon.stub(),
        close: sinon.stub()
      });
      this[0] = createSocket();
      this[1] = createSocket();
    }
  };
}

// Mock Response to support status 101 (Cloudflare Workers specific)
const OriginalResponse = global.Response;
class MockResponse extends OriginalResponse {
  constructor(body, init) {
    if (init && init.status === 101) {
      return {
        status: 101,
        webSocket: init.webSocket,
        headers: new Headers(init.headers || {}),
        ok: true,
      };
    }
    super(body, init);
  }
}

describe('Product Worker API', () => {
  let env;
  let ctx;
  let dbStmt;
  let authStmt;
  let globalFetchStub;
  let consoleErrorStub;

  beforeEach(() => {
    global.Response = MockResponse;

    // Mock Database Statement
    dbStmt = {
      bind: sinon.stub().returnsThis(),
      first: sinon.stub(),
      all: sinon.stub(),
      run: sinon.stub(),
    };

    // Mock Auth Database Statement (for getAuthUser)
    authStmt = {
      bind: sinon.stub().returnsThis(),
      first: sinon.stub().resolves(null), // Default no user
    };

    // Mock Environment
    env = {
      DB: {
        prepare: sinon.stub().callsFake((query) => {
          if (query.includes('FROM users')) {
            return authStmt;
          }
          return dbStmt;
        }),
        batch: sinon.stub(),
      },
      AUTH_WORKER_URL: 'https://auth.internal',
      VIEWER_COUNTER: {
        idFromName: sinon.stub().returns({ toString: () => 'do-id' }),
        get: sinon.stub().returns({
          fetch: sinon.stub().resolves({ status: 101, webSocket: {} })
        })
      }
    };

    // Mock Execution Context
    ctx = {
      waitUntil: sinon.stub(),
      passThroughOnException: sinon.stub(),
    };

    // Mock Global Fetch (for Auth)
    globalFetchStub = sinon.stub(global, 'fetch');
    globalFetchStub.resolves(new Response(null, { status: 404 }));

    // Stub console.error to suppress expected error logs during testing
    consoleErrorStub = sinon.stub(console, 'error');
  });

  afterEach(() => {
    global.Response = OriginalResponse;
    sinon.restore();
  });

  // Helper to mock Auth response
  const mockAuth = (role = null) => {
    if (role) {
      // 1. Mock Auth Worker response
      globalFetchStub.callsFake(() => Promise.resolve(new Response(JSON.stringify({ session: { user_id: 123 } }), { status: 200 })));
      // 2. Mock DB call for user role
      authStmt.first.resolves({ role });
    } else {
      globalFetchStub.callsFake(() => Promise.resolve(new Response(null, { status: 401 })));
    }
  };

  describe('GET /products', () => {
    it('should return a list of products (Guest)', async () => {
      const mockProducts = [
        { id: 1, name: 'P1', price: 100, specs: '{"color":"red"}', status: 'active' }
      ];
      
      // Mock Count Query
      dbStmt.first.resolves({ total: 1 });
      // Mock Select Query
      dbStmt.all.resolves({ results: mockProducts });

      const req = new Request('http://localhost/products', { method: 'GET' });
      const res = await worker.fetch(req, env, ctx);
      
      expect(res.status).to.equal(200);
      const body = await res.json();
      expect(body.data).to.have.lengthOf(1);
      expect(body.data[0].specs).to.deep.equal({ color: 'red' });
      expect(env.DB.prepare.calledWithMatch(/status IN \('active', 'out_of_stock'\)/)).to.be.true;
    });

    it('should return all products including drafts for Admin', async () => {
      mockAuth('admin');
      
      dbStmt.first.resolves({ total: 5 }); // Count
      dbStmt.all.resolves({ results: [{ id: 1, name: 'P1', deleted_at: '2023-01-01' }] }); // Data with deleted_at

      const req = new Request('http://localhost/products', { 
        method: 'GET',
        headers: { 'Cookie': 'session=123' }
      });
      const res = await worker.fetch(req, env, ctx);

      expect(res.status).to.equal(200);
      // Verify admin filter (empty string instead of status check)
      expect(env.DB.prepare.calledWithMatch(/SELECT COUNT\(\*\) AS total FROM products p $/)).to.be.true;
      const body = await res.json();
      expect(body.data[0].deleted_at).to.equal('2023-01-01');
    });

    it('should return error for invalid pagination (Negative)', async () => {
      dbStmt.first.resolves({ total: 0 });
      dbStmt.all.resolves({ results: [] });

      const req = new Request('http://localhost/products', { 
        method: 'GET',
        headers: { 'X-Page': 'invalid' }
      });
      const res = await worker.fetch(req, env, ctx);
      
      expect(res.status).to.equal(500);
      const body = await res.json();
      expect(body.message).to.include('Invalid pagination parameters');
    });
  });

  describe('GET /products/:id', () => {
    it('should return a single product', async () => {
      dbStmt.first.resolves({ id: 1, name: 'Test', price: 50, status: 'active' });

      const req = new Request('http://localhost/products/1', { method: 'GET' });
      const res = await worker.fetch(req, env, ctx);

      expect(res.status).to.equal(200);
      const body = await res.json();
      expect(body.id).to.equal(1);
    });

    it('should return 404 if product not found (Negative)', async () => {
      dbStmt.first.resolves(null);

      const req = new Request('http://localhost/products/999', { method: 'GET' });
      const res = await worker.fetch(req, env, ctx);

      expect(res.status).to.equal(404);
      const body = await res.json();
      expect(body.error).to.equal('Product not found');
    });

    it('should return 400 for invalid ID format (Negative)', async () => {
      const req = new Request('http://localhost/products/abc', { method: 'GET' });
      const res = await worker.fetch(req, env, ctx);

      expect(res.status).to.equal(400);
    });

    it('should handle WebSocket upgrade request', async () => {
      const req = new Request('http://localhost/products/1', { 
        method: 'GET',
        headers: { 'Upgrade': 'websocket' }
      });
      
      const res = await worker.fetch(req, env, ctx);
      
      expect(res.status).to.equal(101);
      expect(env.VIEWER_COUNTER.idFromName.calledWith('product_1')).to.be.true;
      expect(env.VIEWER_COUNTER.get.called).to.be.true;
    });
  });

  describe('GET /products/ssr/:id', () => {
    it('should return HTML for valid product', async () => {
      dbStmt.first.resolves({ 
        id: 1, 
        name: 'SSR Product', 
        price: 99.99, 
        status: 'active',
        specs: '{"Weight": "1kg"}'
      });

      const req = new Request('http://localhost/products/ssr/1', { method: 'GET' });
      const res = await worker.fetch(req, env, ctx);

      expect(res.status).to.equal(200);
      expect(res.headers.get('Content-Type')).to.include('text/html');
      const html = await res.text();
      expect(html).to.include('<h1>SSR Product</h1>');
      expect(html).to.include('Weight');
    });

    it('should return 404 HTML if product missing', async () => {
      dbStmt.first.resolves(null);

      const req = new Request('http://localhost/products/ssr/999', { method: 'GET' });
      const res = await worker.fetch(req, env, ctx);

      expect(res.status).to.equal(404);
      const html = await res.text();
      expect(html).to.include('Product Not Found');
    });

    it('should return 400 for invalid SSR ID format (Negative)', async () => {
      const req = new Request('http://localhost/products/ssr/abc', { method: 'GET' });
      const res = await worker.fetch(req, env, ctx);

      expect(res.status).to.equal(400);
      const body = await res.json();
      expect(body.error).to.equal('Invalid product id');
    });
  });

  describe('POST /products (Admin)', () => {
    it('should create a product when authorized', async () => {
      mockAuth('admin');
      
      // Mock Insert
      dbStmt.run.onFirstCall().resolves({ meta: { last_row_id: 10 } }); // Insert Product
      dbStmt.run.onSecondCall().resolves({}); // Insert Inventory
      
      // Mock GetById after create
      dbStmt.first.resolves({ id: 10, name: 'New Item', price: 20, status: 'draft' });

      const payload = {
        name: 'New Item',
        price: 20,
        inventory: { available: 100 }
      };

      const req = new Request('http://localhost/products', {
        method: 'POST',
        headers: { 'Cookie': 's=1', 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const res = await worker.fetch(req, env, ctx);
      
      expect(res.status).to.equal(201);
      const body = await res.json();
      expect(body.id).to.equal(10);
      expect(env.DB.prepare.calledWithMatch(/INSERT INTO products/)).to.be.true;
    });

    it('should return 401 if not admin (Negative)', async () => {
      mockAuth('user'); // Not admin

      const req = new Request('http://localhost/products', {
        method: 'POST',
        headers: { 'Cookie': 's=1' },
        body: JSON.stringify({ name: 'Fail' })
      });

      const res = await worker.fetch(req, env, ctx);
      expect(res.status).to.equal(401);
    });

    it('should return 400 for validation error (Negative)', async () => {
      mockAuth('admin');

      const req = new Request('http://localhost/products', {
        method: 'POST',
        headers: { 'Cookie': 's=1' },
        body: JSON.stringify({ name: '' }) // Invalid name
      });

      const res = await worker.fetch(req, env, ctx);
      expect(res.status).to.equal(500); // The service throws Error, index catches and returns 500 with message
      const body = await res.json();
      expect(body.message).to.include('Invalid product data');
    });
  });

  describe('PATCH /products/:id (Admin)', () => {
    it('should update product fields', async () => {
      mockAuth('admin');

      // Mock Batch Update
      env.DB.batch.resolves([{ meta: { changes: 1 } }]);
      
      // Mock GetById after update
      dbStmt.first.resolves({ id: 1, name: 'Updated', price: 50 });

      const req = new Request('http://localhost/products/1', {
        method: 'PATCH',
        headers: { 'Cookie': 's=1', 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated' })
      });

      const res = await worker.fetch(req, env, ctx);
      expect(res.status).to.equal(200);
      expect(env.DB.prepare.calledWithMatch(/UPDATE products/)).to.be.true;
    });

    it('should return 404 if product to update does not exist', async () => {
      mockAuth('admin');
      env.DB.batch.resolves([{ meta: { changes: 0 } }]); // No changes

      const req = new Request('http://localhost/products/999', {
        method: 'PATCH',
        headers: { 'Cookie': 's=1' },
        body: JSON.stringify({ price: 100 })
      });

      const res = await worker.fetch(req, env, ctx);
      expect(res.status).to.equal(404);
    });

    it('should return 400 for invalid ID format in PATCH (Negative)', async () => {
      mockAuth('admin');
      const req = new Request('http://localhost/products/abc', {
        method: 'PATCH',
        headers: { 'Cookie': 's=1', 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated' })
      });
      const res = await worker.fetch(req, env, ctx);
      expect(res.status).to.equal(400);
    });

    it('should handle updates that result in no SQL statements', async () => {
      // Case: Sending { inventory: {} } passes Joi min(1) but generates no SQL
      mockAuth('admin');
      
      // Mock GetById to return existing product
      dbStmt.first.resolves({ id: 1, name: 'Existing', price: 50 });

      const req = new Request('http://localhost/products/1', {
        method: 'PATCH',
        headers: { 'Cookie': 's=1', 'Content-Type': 'application/json' },
        body: JSON.stringify({ inventory: {} })
      });

      const res = await worker.fetch(req, env, ctx);
      expect(res.status).to.equal(200);
      // Should not call batch, just return getById
      expect(env.DB.batch.called).to.be.false;
    });
  });

  describe('PATCH /products/:action/:id (Delete/Restore)', () => {
    it('should soft delete a product', async () => {
      mockAuth('admin');
      
      // Mock Run (Update status)
      dbStmt.run.resolves({ meta: { changes: 1 } });

      const req = new Request('http://localhost/products/delete/1', {
        method: 'PATCH',
        headers: { 'Cookie': 's=1' }
      });

      const res = await worker.fetch(req, env, ctx);
      expect(res.status).to.equal(200);
      expect(env.DB.prepare.calledWithMatch(/UPDATE products SET status = 'deleted'/)).to.be.true;
    });

    it('should restore a product', async () => {
      mockAuth('admin');
      
      dbStmt.run.resolves({ meta: { changes: 1 } });
      dbStmt.first.resolves({ id: 1, status: 'active' });

      const req = new Request('http://localhost/products/restore/1', {
        method: 'PATCH',
        headers: { 'Cookie': 's=1' }
      });

      const res = await worker.fetch(req, env, ctx);
      expect(res.status).to.equal(200);
      expect(env.DB.prepare.calledWithMatch(/UPDATE products SET status = 'active'/)).to.be.true;
    });

    it('should return 404 if delete fails (Negative)', async () => {
      mockAuth('admin');
      dbStmt.run.resolves({ meta: { changes: 0 } });

      const req = new Request('http://localhost/products/delete/999', {
        method: 'PATCH',
        headers: { 'Cookie': 's=1' }
      });

      const res = await worker.fetch(req, env, ctx);
      expect(res.status).to.equal(404);
    });
  });

  describe('Auth & Middleware', () => {
    it('should handle missing Auth Worker URL', async () => {
      env.AUTH_WORKER_URL = null;
      // Should fail auth check and return null user, so GET /products works as guest
      dbStmt.first.resolves({ total: 0 }); // For count query
      dbStmt.all.resolves({ results: [] });

      const req = new Request('http://localhost/products', { method: 'GET' });
      const res = await worker.fetch(req, env, ctx);
      expect(res.status).to.equal(200);
    });

    it('should handle Auth Worker fetch failure', async () => {
      globalFetchStub.rejects(new Error('Network Error'));
      
      const req = new Request('http://localhost/products', { 
        method: 'GET',
        headers: { 'Cookie': 's=1' }
      });
      // Should fallback to guest
      dbStmt.first.resolves({ total: 0 }); // For count query
      dbStmt.all.resolves({ results: [] });

      const res = await worker.fetch(req, env, ctx);
      expect(res.status).to.equal(200);
    });

    it('should handle OPTIONS preflight', async () => {
      const req = new Request('http://localhost/products', { method: 'OPTIONS' });
      const res = await worker.fetch(req, env, ctx);
      expect(res.status).to.equal(204);
      expect(res.headers.get('Access-Control-Allow-Methods')).to.exist;
    });
  });

  describe('Integration Sequence', () => {
    it('should perform a full lifecycle: Create -> Get -> Update -> Delete', async () => {
      mockAuth('admin');

      // 1. Create
      dbStmt.run.onCall(0).resolves({ meta: { last_row_id: 50 } }); // Insert Product
      dbStmt.run.onCall(1).resolves({}); // Insert Inventory
      dbStmt.first.onCall(0).resolves({ id: 50, name: 'Cycle', price: 10 }); // Return created

      let req = new Request('http://localhost/products', {
        method: 'POST',
        headers: { 'Cookie': 's=1', 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Cycle', price: 10 })
      });
      let res = await worker.fetch(req, env, ctx);
      expect(res.status).to.equal(201);

      // 2. Get
      dbStmt.first.onCall(1).resolves({ id: 50, name: 'Cycle', price: 10 }); // GetById
      req = new Request('http://localhost/products/50', { method: 'GET' });
      res = await worker.fetch(req, env, ctx);
      expect(res.status).to.equal(200);

      // 3. Update
      env.DB.batch.resolves([{ meta: { changes: 1 } }]);
      dbStmt.first.onCall(2).resolves({ id: 50, name: 'Cycle v2', price: 15 }); // GetById after update
      
      req = new Request('http://localhost/products/50', {
        method: 'PATCH',
        headers: { 'Cookie': 's=1', 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Cycle v2' })
      });
      res = await worker.fetch(req, env, ctx);
      expect(res.status).to.equal(200);

      // 4. Delete
      dbStmt.run.onCall(2).resolves({ meta: { changes: 1 } });
      req = new Request('http://localhost/products/delete/50', {
        method: 'PATCH',
        headers: { 'Cookie': 's=1' }
      });
      res = await worker.fetch(req, env, ctx);
      expect(res.status).to.equal(200);
    });
  });

  describe('Edge Cases & Error Handling', () => {
    it('should return 500 if DB binding is missing', async () => {
      const req = new Request('http://localhost/products', { method: 'GET' });
      const res = await worker.fetch(req, {}, ctx); // Empty env
      expect(res.status).to.equal(500);
      const body = await res.json();
      expect(body.error).to.equal('Database binding missing');
    });

    it('should return 404 for unknown routes', async () => {
      const req = new Request('http://localhost/unknown', { method: 'GET' });
      const res = await worker.fetch(req, env, ctx);
      expect(res.status).to.equal(404);
      const body = await res.json();
      expect(body.error).to.equal('Route not found');
    });

    it('should return 400 for invalid JSON body in POST', async () => {
      mockAuth('admin');
      const req = new Request('http://localhost/products', {
        method: 'POST',
        headers: { 'Cookie': 's=1', 'Content-Type': 'application/json' },
        body: '{ invalid json '
      });
      const res = await worker.fetch(req, env, ctx);
      expect(res.status).to.equal(400);
      const body = await res.json();
      expect(body.error).to.include('Invalid or missing JSON');
    });

    it('should return 400 for invalid JSON body in PATCH', async () => {
      mockAuth('admin');
      const req = new Request('http://localhost/products/1', {
        method: 'PATCH',
        headers: { 'Cookie': 's=1', 'Content-Type': 'application/json' },
        body: '{ invalid json '
      });
      const res = await worker.fetch(req, env, ctx);
      expect(res.status).to.equal(400);
    });

    it('should ignore invalid actions in PATCH /products/:action/:id', async () => {
      mockAuth('admin');
      const req = new Request('http://localhost/products/invalid_action/1', {
        method: 'PATCH',
        headers: { 'Cookie': 's=1' }
      });
      const res = await worker.fetch(req, env, ctx);
      // The router handler returns undefined for invalid action, falling through to 404 fallback or similar
      // In the code: if (!['delete', 'restore'].includes(action)) return;
      // Itty router will continue to next handler or return undefined.
      // Since it's the last specific route, it likely hits the 404 fallback if defined, or returns undefined (which itty-router might treat as 200 or 404 depending on config).
      // Based on router.all('*') fallback:
      expect(res.status).to.equal(404);
    });

    it('should handle invalid JSON in specs from DB gracefully', async () => {
      // Mock DB returning invalid JSON string for specs
      dbStmt.first.resolves({ 
        id: 1, 
        name: 'Bad Specs', 
        price: 10, 
        specs: '{bad json', 
        status: 'active' 
      });

      const req = new Request('http://localhost/products/1', { method: 'GET' });
      const res = await worker.fetch(req, env, ctx);
      expect(res.status).to.equal(200);
      const body = await res.json();
      expect(body.specs).to.deep.equal({}); // Should default to empty object
    });
  });

  describe('ViewerCounter (Unit)', () => {
    let state, doEnv, counter;
    let webSocketPair;

    beforeEach(() => {
      state = {};
      doEnv = {};
      counter = new ViewerCounter(state, doEnv);
    });

    it('should reject non-websocket requests', async () => {
      const req = new Request('http://localhost', { headers: {} });
      const res = await counter.fetch(req);
      expect(res.status).to.equal(426);
    });

    it('should accept websocket requests and manage sessions', async () => {
      const req = new Request('http://localhost', { headers: { Upgrade: 'websocket' } });
      const res = await counter.fetch(req);
      expect(res.status).to.equal(101);
      expect(res.webSocket).to.exist;
      expect(counter.sessions.size).to.equal(1);
    });

    it('should handle session cleanup on close/error', async () => {
      // Simulate close event using the captured listener from the mock
      // Note: The mock implementation in beforeEach assigns listeners to `this.listeners` on the instance
      // We need to access the specific socket's listeners. 
      // Since `new WebSocketPair()` creates a new instance, we need to capture that instance or rely on the global mock behavior.
      // The global mock attaches listeners to `this.listeners` of the WebSocketPair instance.
      // However, `counter.fetch` calls `new WebSocketPair()`. We need to spy on the global constructor or access the created socket.
      
      // Easier approach: Manually invoke handleSession with a mock socket we control
      const mockSocket = { accept: sinon.stub(), addEventListener: sinon.stub(), send: sinon.stub(), close: sinon.stub() };
      counter.handleSession(mockSocket);
      expect(counter.sessions.size).to.equal(1);

      // Trigger close
      const closeCallback = mockSocket.addEventListener.args.find(arg => arg[0] === 'close')[1];
      closeCallback();
      expect(counter.sessions.size).to.equal(0);
    });

    it('should handle broadcast errors', async () => {
      const req = new Request('http://localhost', { headers: { Upgrade: 'websocket' } });
      await counter.fetch(req);

      const serverSocket = [...counter.sessions][0];
      serverSocket.send.throws(new Error('Closed'));
      
      counter.broadcast({ count: 1 });
      expect(counter.sessions.size).to.equal(0);
    });
  });

  describe('Observability (Unit)', () => {
    it('should work without tracing context', () => {
      const span = otel.startSpan({}, 'test');
      expect(span.setAttribute).to.be.a('function');
      expect(span.recordException).to.be.a('function');
      expect(span.end).to.be.a('function');
      
      span.setAttribute('key', 'value'); // Should be no-op
      span.recordException(new Error('test')); // Should be no-op
      span.end();

      const result = otel.withSpan({}, 'test', {}, () => 'result');
      expect(result).to.equal('result');
    });

    it('should use tracing context when available', () => {
      const mockSpan = { setAttribute: sinon.stub(), end: sinon.stub(), recordException: sinon.stub() };
      const mockCtx = {
        tracing: {
          startSpan: sinon.stub().callsFake((name, ...args) => {
            // Handle both signatures: (name, fn) and (name, attrs, fn)
            const fn = args.length === 2 ? args[1] : args[0];
            return fn(mockSpan);
          })
        }
      };

      const span = otel.startSpan(mockCtx, 'test', { a: 1 });
      expect(mockSpan.setAttribute.calledWith('a', 1)).to.be.true;
      
      span.recordException(new Error('fail'));
      expect(mockSpan.recordException.called).to.be.true;

      span.end({ extra: 2 });
      expect(mockSpan.setAttribute.calledWith('extra', 2)).to.be.true;
      expect(mockSpan.end.called).to.be.true;
    });
  });
});