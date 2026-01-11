import { expect } from 'chai';
import sinon from 'sinon';
import router from '../src/router.js';

describe('Router: Main (src/router.js)', () => {
  let env, db, stmt, sessionKv;

  beforeEach(() => {
    stmt = {
      bind: sinon.stub().returnsThis(),
      first: sinon.stub(),
      all: sinon.stub(),
      run: sinon.stub(),
    };
    db = {
      prepare: sinon.stub().returns(stmt),
      batch: sinon.stub().resolves(),
    };
    sessionKv = {
      get: sinon.stub(),
    };
    env = { DB: db, SESSION_KV: sessionKv };
  });

  const createReq = (method, path, body, headers = {}) => ({
    method,
    url: `https://host${path}`,
    headers: { get: (k) => headers[k] || null },
    json: async () => body,
  });

  const mockAuth = (userId = 123) => {
    sessionKv.get.resolves(JSON.stringify({ user_id: userId }));
    return { 'Cookie': 'session_id=abc' };
  };

  describe('Authentication', () => {
    it('should authenticate with Bearer token', async () => {
      sessionKv.get.resolves(JSON.stringify({ user_id: 123 }));
      const req = createReq('GET', '/cart', null, { 'Authorization': 'Bearer abc' });
      const res = await router.handle(req, env);
      expect(res.status).to.not.equal(401);
    });

    it('should handle invalid JSON in session KV', async () => {
      sessionKv.get.resolves('invalid-json');
      const req = createReq('GET', '/cart', null, { 'Cookie': 'session_id=abc' });
      const res = await router.handle(req, env);
      expect(res.status).to.equal(401);
    });
  });

  describe('GET /cart', () => {
    it('should return 401 if not authenticated', async () => {
      const req = createReq('GET', '/cart');
      const res = await router.handle(req, env);
      expect(res.status).to.equal(401);
    });

    it('should return empty cart if none exists', async () => {
      const headers = mockAuth();
      stmt.first.resolves(null); // No cart

      const req = createReq('GET', '/cart', null, headers);
      const res = await router.handle(req, env);
      const data = await res.json();

      expect(res.status).to.equal(200);
      expect(data.message).to.equal('Cart is empty');
    });

    it('should return empty cart if cart exists but has no items', async () => {
      const headers = mockAuth();
      stmt.first.resolves({ id: 1, total_price: 0, currency: 'USD' });
      stmt.all.resolves({ results: [] }); // Empty items

      const req = createReq('GET', '/cart', null, headers);
      const res = await router.handle(req, env);
      const data = await res.json();

      expect(res.status).to.equal(200);
      expect(data.message).to.equal('Cart is empty');
    });

    it('should return cart items', async () => {
      const headers = mockAuth();
      stmt.first.resolves({ id: 1, total_price: 100, currency: 'USD' });
      stmt.all.resolves({ results: [{ product_id: 1, quantity: 1 }] });

      const req = createReq('GET', '/cart', null, headers);
      const res = await router.handle(req, env);
      const data = await res.json();

      expect(data.items).to.have.length(1);
      expect(data.subtotal).to.equal(100);
    });

    it('should handle DB errors', async () => {
      mockAuth();
      stmt.first.rejects(new Error('DB Error'));
      const req = createReq('GET', '/cart', null, { 'Cookie': 'session_id=abc' });
      const res = await router.handle(req, env);
      expect(res.status).to.equal(500);
    });
  });

  describe('POST /cart/items', () => {
    it('should add item to cart', async () => {
      const headers = mockAuth();
      const body = { product_id: 10, quantity: 2 };
      
      // Product check
      stmt.first.onCall(0).resolves({ name: 'P1', price: 10 });
      // Cart check (exists)
      stmt.first.onCall(1).resolves({ id: 1 });
      // Item check (not exists)
      stmt.first.onCall(2).resolves(null);

      const req = createReq('POST', '/cart/items', body, headers);
      const res = await router.handle(req, env);
      
      expect(res.status).to.equal(201);
      expect(db.batch.called).to.be.true;
    });

    it('should create a new cart if one does not exist', async () => {
      const headers = mockAuth();
      const body = { product_id: 10, quantity: 2 };
      
      stmt.first.onCall(0).resolves({ name: 'P1', price: 10 }); // Product
      stmt.first.onCall(1).resolves(null); // No active cart
      stmt.run.resolves({ meta: { last_row_id: 500 } }); // Create cart
      stmt.first.onCall(2).resolves(null); // No existing item

      const req = createReq('POST', '/cart/items', body, headers);
      const res = await router.handle(req, env);
      
      expect(res.status).to.equal(201);
      expect(stmt.run.calledWithMatch(/INSERT INTO carts/)).to.be.true;
    });

    it('should handle D1 result with lastRowId (fallback)', async () => {
      const headers = mockAuth();
      stmt.first.onCall(0).resolves({ name: 'P1', price: 10 });
      stmt.first.onCall(1).resolves(null); // No cart
      // Mock run returning lastRowId directly (no meta)
      stmt.run.resolves({ lastRowId: 500 }); 
      stmt.first.onCall(2).resolves(null);

      const req = createReq('POST', '/cart/items', { product_id: 10, quantity: 1 }, headers);
      const res = await router.handle(req, env);
      expect(res.status).to.equal(201);
    });

    it('should update quantity if item exists', async () => {
      const headers = mockAuth();
      const body = { product_id: 10, quantity: 1 };
      
      stmt.first.onCall(0).resolves({ name: 'P1', price: 10 }); // Product
      stmt.first.onCall(1).resolves({ id: 1 }); // Cart exists
      stmt.first.onCall(2).resolves({ id: 88 }); // Item exists

      const req = createReq('POST', '/cart/items', body, headers);
      const res = await router.handle(req, env);
      
      expect(res.status).to.equal(201);
      // Should call batch with UPDATE cart_items
      expect(db.batch.called).to.be.true;
    });

    it('should return 400 for invalid JSON body', async () => {
      const headers = mockAuth();
      const req = createReq('POST', '/cart/items', null, headers);
      req.json = async () => { throw new Error('Bad JSON'); };
      
      const res = await router.handle(req, env);
      expect(res.status).to.equal(400);
    });

    it('should return 400 for invalid payload (negative quantity)', async () => {
      const headers = mockAuth();
      const req = createReq('POST', '/cart/items', { product_id: 1, quantity: -1 }, headers);
      
      const res = await router.handle(req, env);
      expect(res.status).to.equal(400);
    });

    it('should handle DB errors', async () => {
      const headers = mockAuth();
      stmt.first.rejects(new Error('DB Fail'));
      
      const req = createReq('POST', '/cart/items', { product_id: 1 }, headers);
      const res = await router.handle(req, env);
      
      expect(res.status).to.equal(500);
    });

    it('should return 404 if product not found', async () => {
      const headers = mockAuth();
      stmt.first.resolves(null);

      const req = createReq('POST', '/cart/items', { product_id: 999 }, headers);
      const res = await router.handle(req, env);
      expect(res.status).to.equal(404);
    });
  });

  describe('PATCH /cart/items/:productId', () => {
    it('should update item quantity', async () => {
      const headers = mockAuth();
      const req = createReq('PATCH', '/cart/items/10', { quantity: 5 }, headers);
      req.params = { productId: '10' }; // itty-router param injection
      
      const res = await router.handle(req, env);
      expect(res.status).to.equal(200);
      expect(db.batch.called).to.be.true;
    });

    it('should return 400 for invalid JSON', async () => {
      const headers = mockAuth();
      const req = createReq('PATCH', '/cart/items/10', null, headers);
      req.json = async () => { throw new Error('Bad JSON'); };
      
      const res = await router.handle(req, env);
      expect(res.status).to.equal(400);
    });

    it('should return 400 for invalid quantity', async () => {
      const headers = mockAuth();
      const req = createReq('PATCH', '/cart/items/10', { quantity: 0 }, headers);
      req.params = { productId: '10' };
      
      const res = await router.handle(req, env);
      expect(res.status).to.equal(400);
    });

    it('should handle DB errors', async () => {
      const headers = mockAuth();
      db.batch.rejects(new Error('DB Fail'));
      const req = createReq('PATCH', '/cart/items/10', { quantity: 5 }, headers);
      req.params = { productId: '10' };
      
      const res = await router.handle(req, env);
      expect(res.status).to.equal(500);
    });
  });

  describe('DELETE /cart/items/:productId', () => {
    it('should remove item', async () => {
      const headers = mockAuth();
      const req = createReq('DELETE', '/cart/items/10', null, headers);
      req.params = { productId: '10' };
      
      const res = await router.handle(req, env);
      expect(res.status).to.equal(200);
      expect(db.batch.called).to.be.true;
    });

    it('should return 400 for invalid productId', async () => {
      const headers = mockAuth();
      const req = createReq('DELETE', '/cart/items/abc', null, headers);
      req.params = { productId: 'abc' };
      
      const res = await router.handle(req, env);
      expect(res.status).to.equal(400);
    });
  });

  describe('DELETE /cart', () => {
    it('should clear cart', async () => {
      const headers = mockAuth();
      const req = createReq('DELETE', '/cart', null, headers);
      const res = await router.handle(req, env);
      
      expect(res.status).to.equal(200);
      expect(stmt.run.called).to.be.true;
    });

    it('should handle DB errors', async () => {
      const headers = mockAuth();
      stmt.run.rejects(new Error('DB Fail'));
      const req = createReq('DELETE', '/cart', null, headers);
      const res = await router.handle(req, env);
      expect(res.status).to.equal(500);
    });
  });
});