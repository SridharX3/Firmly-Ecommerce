import * as chai from 'chai';
import sinon from 'sinon';
import esmock from 'esmock';

const { expect } = chai;

describe('Router', function() {
  this.timeout(10000); // Increase timeout to prevent test failures during module loading

  let router;
  let env;
  let kvGetStub;

  before(async () => {
    kvGetStub = sinon.stub();
    // Mock all route handlers to ensure we are testing routing logic, not handlers
    const module = await esmock('../src/router.js', {
      '../src/routes/checkout.routes.js': {
        checkoutShipping: () => new Response('shipping'),
        checkoutBillingAddress: () => new Response('billing'),
        checkoutDelivery: () => new Response('delivery')
      },
      '../src/routes/payment.routes.js': {
        paypalCreate: () => new Response('create'),
        paypalCapture: () => new Response('capture')
      },
      '../src/routes/order.routes.js': {
        getAllOrders: () => new Response('orders'),
        getOrder: () => new Response('order')
      }
    });
    router = module.default;
  });

  beforeEach(() => {
    kvGetStub.reset();
    env = { SESSION_KV: { get: kvGetStub } };
  });

  describe('Global Middleware (Auth & Context)', () => {
    it('should attach env to request', async () => {
      const req = new Request('http://localhost/orders');
      await router.handle(req, env);
      expect(req.env).to.equal(env);
    });

    it('should set userId to null if no session cookie is present', async () => {
      const req = new Request('http://localhost/orders');
      await router.handle(req, env);
      expect(req.userId).to.be.null;
    });

    it('should set userId to null if cookie header exists but session_id is missing', async () => {
      const req = new Request('http://localhost/orders', {
        headers: { Cookie: 'other_cookie=abc' }
      });
      await router.handle(req, env);
      expect(req.userId).to.be.null;
    });

    it('should set userId to null if session_id cookie is empty', async () => {
      const req = new Request('http://localhost/orders', {
        headers: { Cookie: 'session_id=' }
      });
      // KV should not be called because sessionId is empty string (falsy)
      await router.handle(req, env);
      expect(req.userId).to.be.null;
    });

    it('should set userId to null if session cookie exists but KV returns null', async () => {
      const req = new Request('http://localhost/orders', {
        headers: { Cookie: 'session_id=invalid_sess' }
      });
      kvGetStub.withArgs('invalid_sess').resolves(null);
      
      await router.handle(req, env);
      expect(req.userId).to.be.null;
    });

    it('should set userId from valid session data', async () => {
      const req = new Request('http://localhost/orders', {
        headers: { Cookie: 'session_id=valid_sess' }
      });
      kvGetStub.withArgs('valid_sess').resolves(JSON.stringify({ user_id: 123 }));
      
      await router.handle(req, env);
      expect(req.userId).to.equal('123');
    });

    it('should correctly cast numeric user_id from session to string', async () => {
      const req = new Request('http://localhost/orders', {
        headers: { Cookie: 'session_id=numeric_user' }
      });
      kvGetStub.withArgs('numeric_user').resolves(JSON.stringify({ user_id: 456 }));
      
      await router.handle(req, env);
      expect(req.userId).to.equal('456');
    });

    it('should set userId to null if session data is invalid JSON', async () => {
      const req = new Request('http://localhost/orders', {
        headers: { Cookie: 'session_id=bad_json' }
      });
      kvGetStub.withArgs('bad_json').resolves('{ invalid json }');
      
      await router.handle(req, env);
      expect(req.userId).to.be.null;
    });

    it('should set userId to null if session data does not contain user_id', async () => {
      const req = new Request('http://localhost/orders', {
        headers: { Cookie: 'session_id=no_user' }
      });
      kvGetStub.withArgs('no_user').resolves(JSON.stringify({ foo: 'bar' }));
      
      await router.handle(req, env);
      expect(req.userId).to.be.null;
    });

    it('should set userId to null if user_id is 0', async () => {
      const req = new Request('http://localhost/orders', {
        headers: { Cookie: 'session_id=zero_user' }
      });
      kvGetStub.withArgs('zero_user').resolves(JSON.stringify({ user_id: 0 }));
      
      await router.handle(req, env);
      expect(req.userId).to.be.null;
    });

    it('should set userId to null if user_id is an empty string', async () => {
      const req = new Request('http://localhost/orders', {
        headers: { Cookie: 'session_id=empty_user' }
      });
      kvGetStub.withArgs('empty_user').resolves(JSON.stringify({ user_id: '' }));
      
      await router.handle(req, env);
      expect(req.userId).to.be.null;
    });
  });

  describe('CORS & Preflight', () => {
    it('should handle OPTIONS requests with 204', async () => {
      const req = new Request('http://localhost/any', { method: 'OPTIONS' });
      const res = await router.handle(req, env);
      expect(res.status).to.equal(204);
      expect(res.headers.get('Access-Control-Allow-Origin')).to.exist;
    });
  });

  describe('Route Dispatching', () => {
    it('should route to checkoutShipping', async () => {
      const req = new Request('http://localhost/checkout/shipping', { method: 'POST' });
      const res = await router.handle(req, env);
      expect(await res.text()).to.equal('shipping');
    });

    it('should route to checkoutBillingAddress', async () => {
      const req = new Request('http://localhost/checkout/billing', { method: 'POST' });
      const res = await router.handle(req, env);
      expect(await res.text()).to.equal('billing');
    });

    it('should route to checkoutDelivery', async () => {
      const req = new Request('http://localhost/checkout/delivery', { method: 'POST' });
      const res = await router.handle(req, env);
      expect(await res.text()).to.equal('delivery');
    });

    it('should route to paypalCreate', async () => {
      const req = new Request('http://localhost/payments/paypal/create', { method: 'POST' });
      const res = await router.handle(req, env);
      expect(await res.text()).to.equal('create');
    });

    it('should route to paypalCapture', async () => {
      const req = new Request('http://localhost/payments/paypal/capture', { method: 'POST' });
      const res = await router.handle(req, env);
      expect(await res.text()).to.equal('capture');
    });

    it('should route to getAllOrders', async () => {
      const req = new Request('http://localhost/orders', { method: 'GET' });
      const res = await router.handle(req, env);
      expect(await res.text()).to.equal('orders');
    });

    it('should route to getOrder', async () => {
      const req = new Request('http://localhost/orders/123', { method: 'GET' });
      const res = await router.handle(req, env);
      expect(await res.text()).to.equal('order');
    });
  });

  describe('404 Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const req = new Request('http://localhost/unknown/route');
      const res = await router.handle(req, env);
      
      expect(res.status).to.equal(404);
      const body = await res.json();
      expect(body.error).to.equal('Not Found');
      expect(body.path).to.equal('/unknown/route');
    });
  });
});