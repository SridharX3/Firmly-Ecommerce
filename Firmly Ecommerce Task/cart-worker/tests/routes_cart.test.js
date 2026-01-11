import { expect } from 'chai';
import sinon from 'sinon';
import router from '../src/routes/cart.js';

describe('Router: Routes/Cart (src/routes/cart.js)', () => {
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
    params: {}, // itty-router adds params here
    env // Pass env directly to req for this router implementation
  });

  const mockAuth = (userId = 123) => {
    sessionKv.get.resolves({ user_id: userId });
    return { 'Cookie': 'session_id=abc' };
  };

  describe('GET /cart', () => {
    it('should return empty cart structure if no cart', async () => {
      const headers = mockAuth();
      stmt.first.resolves(null);

      const req = createReq('GET', '/cart', null, headers);
      const res = await router.handle(req);
      const data = await res.json();

      expect(data.items).to.be.an('array').that.is.empty;
      expect(data.subtotal).to.equal(0);
    });

    it('should return items if cart exists', async () => {
      const headers = mockAuth();
      stmt.first.resolves({ id: 1, currency: 'USD', total_price: 50 });
      stmt.all.resolves({ 
        results: [{ product_id: 1, snapshot_name: 'P1', quantity: 1, snapshot_price: 50 }] 
      });

      const req = createReq('GET', '/cart', null, headers);
      const res = await router.handle(req);
      const data = await res.json();

      expect(data.items).to.have.length(1);
      expect(data.subtotal).to.equal(50);
    });

    it('should return 401 on error', async () => {
      // Force error by not mocking auth correctly or DB fail
      sessionKv.get.rejects(new Error('KV Fail'));
      const req = createReq('GET', '/cart', null, {});
      const res = await router.handle(req);
      expect(res.status).to.equal(401);
    });
  });

  describe('POST /cart/items', () => {
    it('should add new item', async () => {
      const headers = mockAuth();
      const body = { product_id: 10, quantity: 1 };

      // Product fetch
      stmt.first.onCall(0).resolves({ id: 10, name: 'P', price: 10, status: 'active' });
      // Get Active Cart -> null
      stmt.first.onCall(1).resolves(null);
      // Insert Cart -> returns meta
      stmt.run.onCall(0).resolves({ meta: { last_row_id: 99 } });
      // Check existing item -> null
      stmt.first.onCall(2).resolves(null);

      const req = createReq('POST', '/cart/items', body, headers);
      const res = await router.handle(req);
      
      expect(res.status).to.equal(200);
      const data = await res.json();
      expect(data.message).to.equal('Item added to cart');
    });

    it('should update existing item', async () => {
      const headers = mockAuth();
      const body = { product_id: 10, quantity: 1 };

      stmt.first.onCall(0).resolves({ id: 10, name: 'P', price: 10, status: 'active' }); // Product
      stmt.first.onCall(1).resolves({ id: 1 }); // Cart exists
      stmt.first.onCall(2).resolves({ id: 55, quantity: 1 }); // Item exists

      const req = createReq('POST', '/cart/items', body, headers);
      const res = await router.handle(req);
      
      expect(res.status).to.equal(200);
      const data = await res.json();
      expect(data.message).to.equal('Cart updated');
      expect(data.quantity).to.equal(2);
    });

    it('should return 400 if product unavailable', async () => {
      const headers = mockAuth();
      stmt.first.resolves({ status: 'inactive' }); // Product inactive

      const req = createReq('POST', '/cart/items', { product_id: 1, quantity: 1 }, headers);
      const res = await router.handle(req);
      
      expect(res.status).to.equal(400);
      const data = await res.json();
      expect(data.error).to.equal('Product unavailable');
    });

    it('should handle errors', async () => {
      const headers = mockAuth();
      stmt.first.rejects(new Error('DB Fail'));
      const req = createReq('POST', '/cart/items', { product_id: 1, quantity: 1 }, headers);
      const res = await router.handle(req);
      expect(res.status).to.equal(400);
    });

    it('should handle errors without message', async () => {
      const headers = mockAuth();
      const req = createReq('POST', '/cart/items', {}, headers);
      // Mock json() to throw an object without message
      req.json = async () => { throw {}; };
      
      const res = await router.handle(req);
      
      expect(res.status).to.equal(400);
      const data = await res.json();
      expect(data.error).to.equal('Unable to add item to cart');
    });
  });

  describe('DELETE /cart/items/:productId', () => {
    it('should remove item', async () => {
      const headers = mockAuth();
      stmt.first.resolves({ id: 1 }); // Cart exists

      const req = createReq('DELETE', '/cart/items/10', null, headers);
      req.params = { productId: '10' };
      
      const res = await router.handle(req);
      expect(res.status).to.equal(200);
      const data = await res.json();
      expect(data.message).to.equal('Item removed');
    });

    it('should handle errors gracefully', async () => {
      const headers = mockAuth();
      stmt.first.rejects(new Error('Fail'));
      
      const req = createReq('DELETE', '/cart/items/10', null, headers);
      req.params = { productId: '10' };
      const res = await router.handle(req);
      expect(res.status).to.equal(200); // The code catches error and returns message
    });
  });

  describe('DELETE /cart', () => {
    it('should soft clear cart', async () => {
      const headers = mockAuth();
      stmt.first.resolves({ id: 1 }); // Cart exists

      const req = createReq('DELETE', '/cart', null, headers);
      const res = await router.handle(req);
      
      expect(db.batch.called).to.be.true;
      const data = await res.json();
      expect(data.message).to.equal('Cart cleared');
    });

    it('should handle errors gracefully', async () => {
      const headers = mockAuth();
      stmt.first.rejects(new Error('Fail'));
      const req = createReq('DELETE', '/cart', null, headers);
      const res = await router.handle(req);
      expect(res.status).to.equal(200);
    });
  });
});