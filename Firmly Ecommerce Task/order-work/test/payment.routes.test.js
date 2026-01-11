import * as chai from 'chai';
import sinon from 'sinon';
import esmock from 'esmock';

const { expect } = chai;

describe('Payment Routes', () => {
  let paypalCreate, paypalCapture;
  let req, env, ctx;
  let jsonStub, safeJsonStub, getCookieStub, withSpanStub, setAttributesStub;
  let createPayPalOrderStub, capturePayPalOrderStub, createOrderTransactionStub;
  let dbPrepareStub, kvGetStub, kvPutStub;
  let consoleErrorStub;

  before(async () => {
    jsonStub = sinon.stub().callsFake((data, status) => ({ data, status }));
    safeJsonStub = sinon.stub();
    getCookieStub = sinon.stub();
    withSpanStub = sinon.stub().callsFake((ctx, name, attrs, fn) => {
      const span = { setAttribute: sinon.spy(), recordException: sinon.spy() };
      return fn(span);
    });
    setAttributesStub = sinon.stub();

    createPayPalOrderStub = sinon.stub();
    capturePayPalOrderStub = sinon.stub();
    createOrderTransactionStub = sinon.stub();

    const module = await esmock('../src/routes/payment.routes.js', {
      '../src/response.js': { json: jsonStub },
      '../src/utils/safeJ.js': { safeJson: safeJsonStub },
      '../src/utils/cookie.js': { getCookie: getCookieStub },
      '../src/observability/otel.js': { withSpan: withSpanStub, setAttributes: setAttributesStub },
      '../src/services/payment.service.js': {
        createPayPalOrder: createPayPalOrderStub,
        capturePayPalOrder: capturePayPalOrderStub
      },
      '../src/services/order.service.js': {
        createOrderTransaction: createOrderTransactionStub
      }
    });

    paypalCreate = module.paypalCreate;
    paypalCapture = module.paypalCapture;
  });

  beforeEach(() => {
    jsonStub.resetHistory();
    safeJsonStub.reset();
    getCookieStub.reset();
    createPayPalOrderStub.reset();
    capturePayPalOrderStub.reset();
    createOrderTransactionStub.reset();

    dbPrepareStub = sinon.stub();
    kvGetStub = sinon.stub();
    kvPutStub = sinon.stub();

    env = {
      DB: { prepare: dbPrepareStub },
      SESSION_KV: { get: kvGetStub, put: kvPutStub }
    };

    req = { 
      userId: '123', 
      headers: new Map(),
      url: 'http://localhost/payments/paypal/create'
    };
    ctx = {};
    consoleErrorStub = sinon.stub(console, 'error');
  });

  afterEach(() => {
    consoleErrorStub.restore();
  });

  describe('paypalCreate', () => {
    it('should return 401 if unauthorized', async () => {
      req.userId = null;
      const res = await paypalCreate(req, env, ctx);
      expect(res.status).to.equal(401);
    });

    it('should return 401 if session expired', async () => {
      getCookieStub.returns('sess_1');
      kvGetStub.resolves(null);
      const res = await paypalCreate(req, env, ctx);
      expect(res.status).to.equal(401);
    });

    it('should return 400 if checkout step is invalid', async () => {
      getCookieStub.returns('sess_1');
      kvGetStub.resolves(JSON.stringify({ checkout: { step: 'SHIPPING_COMPLETED' } }));
      const res = await paypalCreate(req, env, ctx);
      expect(res.status).to.equal(400);
      expect(res.data.error).to.include('complete shipping and billing');
    });

    it('should return 404 if active cart not found', async () => {
      getCookieStub.returns('sess_1');
      kvGetStub.resolves(JSON.stringify({ checkout: { step: 'BILLING_COMPLETED', cart_id: 1 } }));
      dbPrepareStub.returns({ bind: () => ({ first: () => null }) });

      const res = await paypalCreate(req, env, ctx);
      expect(res.status).to.equal(404);
    });

    it('should return 400 if total is 0', async () => {
      getCookieStub.returns('sess_1');
      kvGetStub.resolves(JSON.stringify({ checkout: { step: 'BILLING_COMPLETED', cart_id: 1, total_price: 0 } }));
      dbPrepareStub.returns({ bind: () => ({ first: () => ({ total_price: 100 }) }) }); // DB says 100, but session says 0

      const res = await paypalCreate(req, env, ctx);
      expect(res.status).to.equal(400);
    });

    it('should create paypal order and return 201', async () => {
      getCookieStub.returns('sess_1');
      kvGetStub.resolves(JSON.stringify({ checkout: { step: 'BILLING_COMPLETED', cart_id: 1, total_price: 150, currency: 'USD' } }));
      dbPrepareStub.returns({ bind: () => ({ first: () => ({ total_price: 100 }) }) });
      
      createPayPalOrderStub.resolves({ paypal_order_id: 'pp_123', approval_url: 'http://approve' });

      const res = await paypalCreate(req, env, ctx);
      expect(res.status).to.equal(201);
      expect(res.data.paypal_order_id).to.equal('pp_123');
      expect(createPayPalOrderStub.calledOnce).to.be.true;
    });

    it('should handle service errors', async () => {
      getCookieStub.returns('sess_1');
      kvGetStub.resolves(JSON.stringify({ checkout: { step: 'BILLING_COMPLETED', cart_id: 1, total_price: 150 } }));
      dbPrepareStub.returns({ bind: () => ({ first: () => ({ total_price: 100 }) }) });
      
      createPayPalOrderStub.rejects(new Error('PayPal Down'));

      const res = await paypalCreate(req, env, ctx);
      expect(res.status).to.equal(500);
      expect(res.data.error).to.equal('PayPal Down');
    });
  });

  describe('paypalCapture', () => {
    it('should return 401 if unauthorized', async () => {
      req.userId = null;
      const res = await paypalCapture(req, env, ctx);
      expect(res.status).to.equal(401);
    });

    it('should return 400 if paypal_order_id missing', async () => {
      safeJsonStub.resolves({});
      const res = await paypalCapture(req, env, ctx);
      expect(res.status).to.equal(400);
    });

    it('should return 200 with status if capture not COMPLETED', async () => {
      safeJsonStub.resolves({ paypal_order_id: 'pp_123' });
      capturePayPalOrderStub.resolves({ status: 'PENDING', capture_id: 'cap_1' });

      const res = await paypalCapture(req, env, ctx);
      expect(res.status).to.equal(200);
      expect(res.data.status).to.equal('PENDING');
      expect(createOrderTransactionStub.called).to.be.false;
    });

    it('should create order and clear session if capture COMPLETED', async () => {
      safeJsonStub.resolves({ paypal_order_id: 'pp_123' });
      capturePayPalOrderStub.resolves({ status: 'COMPLETED', capture_id: 'cap_1' });
      
      getCookieStub.returns('sess_1');
      const session = { 
        checkout: { 
          cart_id: 1, 
          total_price: 100, 
          currency: 'USD',
          shipping_address: {},
          delivery_type: 'NORMAL'
        } 
      };
      kvGetStub.resolves(JSON.stringify(session));
      createOrderTransactionStub.resolves(999);

      const res = await paypalCapture(req, env, ctx);
      
      expect(res.status).to.equal(200);
      expect(res.data.success).to.be.true;
      expect(res.data.order_id).to.equal(999);
      
      expect(createOrderTransactionStub.calledOnce).to.be.true;
      expect(kvPutStub.calledOnce).to.be.true;
      
      const updatedSession = JSON.parse(kvPutStub.firstCall.args[1]);
      expect(updatedSession.checkout).to.be.undefined;
    });

    it('should use shipping address for billing if billing missing', async () => {
      safeJsonStub.resolves({ paypal_order_id: 'pp_123' });
      capturePayPalOrderStub.resolves({ status: 'COMPLETED', capture_id: 'cap_1' });
      
      getCookieStub.returns('sess_1');
      const session = { 
        checkout: { 
          cart_id: 1, 
          shipping_address: { city: 'A' },
          // billing_address missing
        } 
      };
      kvGetStub.resolves(JSON.stringify(session));
      createOrderTransactionStub.resolves(999);

      await paypalCapture(req, env, ctx);
      
      const args = createOrderTransactionStub.firstCall.args[1];
      expect(args.billing_address).to.deep.equal({ city: 'A' });
    });

    it('should handle service errors', async () => {
      safeJsonStub.resolves({ paypal_order_id: 'pp_123' });
      capturePayPalOrderStub.rejects(new Error('Capture Failed'));

      const res = await paypalCapture(req, env, ctx);
      expect(res.status).to.equal(500);
      expect(res.data.error).to.equal('Capture Failed');
    });
  });
});