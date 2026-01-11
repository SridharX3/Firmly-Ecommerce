import * as chai from 'chai';
import sinon from 'sinon';
import esmock from 'esmock';

const { expect } = chai;

describe('Checkout Routes', () => {
  let checkoutShipping, checkoutBillingAddress, checkoutDelivery;
  let req, env, ctx;
  let jsonStub, safeJsonStub, getCookieStub, withSpanStub, setAttributesStub;
  let dbPrepareStub, kvGetStub, kvPutStub;

  before(async () => {
    jsonStub = sinon.stub().callsFake((data, status) => ({ data, status }));
    safeJsonStub = sinon.stub();
    getCookieStub = sinon.stub();
    withSpanStub = sinon.stub().callsFake((ctx, name, attrs, fn) => {
      const span = { setAttribute: sinon.spy(), recordException: sinon.spy() };
      return fn(span);
    });
    setAttributesStub = sinon.stub();

    const module = await esmock('../src/routes/checkout.routes.js', {
      '../src/response.js': { json: jsonStub },
      '../src/utils/safeJ.js': { safeJson: safeJsonStub },
      '../src/utils/cookie.js': { getCookie: getCookieStub },
      '../src/observability/otel.js': { withSpan: withSpanStub, setAttributes: setAttributesStub }
    });

    checkoutShipping = module.checkoutShipping;
    checkoutBillingAddress = module.checkoutBillingAddress;
    checkoutDelivery = module.checkoutDelivery;
  });

  beforeEach(() => {
    jsonStub.resetHistory();
    safeJsonStub.reset();
    getCookieStub.reset();
    setAttributesStub.reset();

    dbPrepareStub = sinon.stub();
    kvGetStub = sinon.stub();
    kvPutStub = sinon.stub();

    env = {
      DB: { prepare: dbPrepareStub },
      SESSION_KV: { get: kvGetStub, put: kvPutStub }
    };

    req = { userId: 'user123' };
    ctx = {};
  });

  describe('checkoutShipping', () => {
    const validAddress = {
      full_name: 'John Doe',
      phone: '1234567890',
      address_line1: '123 Main St',
      city: 'Chennai',
      state: 'TN',
      postal_code: '600001',
      country: 'IN'
    };

    it('should return 401 if user is unauthorized', async () => {
      req.userId = null;
      const res = await checkoutShipping(req, env, ctx);
      expect(res.status).to.equal(401);
      expect(res.data.error).to.equal('Unauthorized');
    });

    it('should return 400 if shipping address is missing', async () => {
      safeJsonStub.resolves({});
      const res = await checkoutShipping(req, env, ctx);
      expect(res.status).to.equal(400);
      expect(res.data.error).to.include('required');
    });

    it('should return 400 if shipping address is invalid', async () => {
      safeJsonStub.resolves({ shipping_address: { ...validAddress, phone: '123' } }); // Phone too short
      const res = await checkoutShipping(req, env, ctx);
      expect(res.status).to.equal(400);
      expect(res.data.error).to.include('Invalid shipping address');
    });

    it('should return 404 if no active cart found', async () => {
      safeJsonStub.resolves({ shipping_address: validAddress });
      const bindStub = sinon.stub().returns({ first: sinon.stub().resolves(null) });
      dbPrepareStub.returns({ bind: bindStub });

      const res = await checkoutShipping(req, env, ctx);
      expect(res.status).to.equal(404);
      expect(res.data.error).to.equal('No active cart found');
    });

    it('should return 401 if session ID is missing', async () => {
      safeJsonStub.resolves({ shipping_address: validAddress });
      const bindStub = sinon.stub().returns({ first: sinon.stub().resolves({ id: 1 }) });
      dbPrepareStub.returns({ bind: bindStub });
      getCookieStub.returns(null);

      const res = await checkoutShipping(req, env, ctx);
      expect(res.status).to.equal(401);
      expect(res.data.error).to.equal('Session ID missing');
    });

    it('should save shipping address and return 200', async () => {
      safeJsonStub.resolves({ shipping_address: validAddress });
      const bindStub = sinon.stub().returns({ first: sinon.stub().resolves({ id: 123 }) });
      dbPrepareStub.returns({ bind: bindStub });
      getCookieStub.returns('sess_123');
      kvGetStub.resolves(JSON.stringify({ checkout: {} }));
      kvPutStub.resolves();

      const res = await checkoutShipping(req, env, ctx);
      
      expect(res.status).to.equal(200);
      expect(res.data.next_step).to.equal('billing');
      expect(kvPutStub.calledOnce).to.be.true;
      const savedSession = JSON.parse(kvPutStub.firstCall.args[1]);
      expect(savedSession.checkout.step).to.equal('SHIPPING_COMPLETED');
      expect(savedSession.checkout.cart_id).to.equal(123);
    });

    it('should handle race condition where session is missing in KV', async () => {
      safeJsonStub.resolves({ shipping_address: validAddress });
      const bindStub = sinon.stub().returns({ first: sinon.stub().resolves({ id: 123 }) });
      dbPrepareStub.returns({ bind: bindStub });
      getCookieStub.returns('sess_123');
      kvGetStub.resolves(null); // KV returns null
      kvPutStub.resolves();

      const res = await checkoutShipping(req, env, ctx);
      
      expect(res.status).to.equal(200);
      expect(kvPutStub.calledOnce).to.be.true;
      const savedSession = JSON.parse(kvPutStub.firstCall.args[1]);
      // Session should be recreated with checkout data
      expect(savedSession.checkout.cart_id).to.equal(123);
    });

    it('should accept address_line2', async () => {
      const addressWithLine2 = { ...validAddress, address_line2: 'Apt 4B' };
      safeJsonStub.resolves({ shipping_address: addressWithLine2 });
      const bindStub = sinon.stub().returns({ first: sinon.stub().resolves({ id: 123 }) });
      dbPrepareStub.returns({ bind: bindStub });
      getCookieStub.returns('sess_123');
      kvGetStub.resolves(JSON.stringify({ checkout: {} }));
      kvPutStub.resolves();

      const res = await checkoutShipping(req, env, ctx);
      expect(res.status).to.equal(200);
    });
  });

  describe('checkoutBillingAddress', () => {
    const validBilling = {
      full_name: 'Jane Doe',
      phone: '0987654321',
      address_line1: '456 Another St',
      city: 'Bangalore',
      state: 'KA',
      postal_code: '560001',
      country: 'IN'
    };

    it('should return 401 if unauthorized', async () => {
      req.userId = null;
      const res = await checkoutBillingAddress(req, env, ctx);
      expect(res.status).to.equal(401);
    });

    it('should return 400 if billing address is missing and not using shipping', async () => {
      safeJsonStub.resolves({ use_shipping_for_billing: false });
      const res = await checkoutBillingAddress(req, env, ctx);
      expect(res.status).to.equal(400);
      expect(res.data.error).to.equal('Billing address is required');
    });

    it('should return 401 if session expired', async () => {
      safeJsonStub.resolves({ use_shipping_for_billing: true });
      getCookieStub.returns('sess_123');
      kvGetStub.resolves(null);

      const res = await checkoutBillingAddress(req, env, ctx);
      expect(res.status).to.equal(401);
      expect(res.data.error).to.equal('Session expired');
    });

    it('should return 400 if previous step not completed', async () => {
      safeJsonStub.resolves({ use_shipping_for_billing: true });
      getCookieStub.returns('sess_123');
      kvGetStub.resolves(JSON.stringify({ checkout: { step: 'INIT' } }));

      const res = await checkoutBillingAddress(req, env, ctx);
      expect(res.status).to.equal(400);
      expect(res.data.error).to.include('complete shipping step first');
    });

    it('should return 400 for invalid billing address', async () => {
      safeJsonStub.resolves({ billing_address: { ...validBilling, phone: '1' }, use_shipping_for_billing: false });
      getCookieStub.returns('sess_123');
      kvGetStub.resolves(JSON.stringify({ checkout: { step: 'SHIPPING_COMPLETED' } }));

      const res = await checkoutBillingAddress(req, env, ctx);
      expect(res.status).to.equal(400);
      expect(res.data.error).to.include('Invalid billing address');
    });

    it('should save billing address (use shipping) and return 200', async () => {
      safeJsonStub.resolves({ use_shipping_for_billing: true });
      getCookieStub.returns('sess_123');
      const session = { checkout: { step: 'SHIPPING_COMPLETED', shipping_address: { city: 'Chennai' } } };
      kvGetStub.resolves(JSON.stringify(session));

      const res = await checkoutBillingAddress(req, env, ctx);
      expect(res.status).to.equal(200);
      expect(kvPutStub.called).to.be.true;
      const saved = JSON.parse(kvPutStub.firstCall.args[1]);
      expect(saved.checkout.billing_address.city).to.equal('Chennai');
      expect(saved.checkout.step).to.equal('BILLING_ADDRESS_COMPLETED');
    });

    it('should save explicit billing address and return 200', async () => {
      safeJsonStub.resolves({ billing_address: validBilling, use_shipping_for_billing: false });
      getCookieStub.returns('sess_123');
      const session = { checkout: { step: 'SHIPPING_COMPLETED', shipping_address: { city: 'Chennai' } } };
      kvGetStub.resolves(JSON.stringify(session));

      const res = await checkoutBillingAddress(req, env, ctx);
      expect(res.status).to.equal(200);
      const saved = JSON.parse(kvPutStub.firstCall.args[1]);
      expect(saved.checkout.billing_address.city).to.equal('Bangalore');
    });
  });

  describe('checkoutDelivery', () => {
    it('should return 400 if delivery type missing', async () => {
      safeJsonStub.resolves({});
      const res = await checkoutDelivery(req, env, ctx);
      expect(res.status).to.equal(400);
    });

    it('should return 400 if step is incorrect', async () => {
      safeJsonStub.resolves({ delivery_type: 'NORMAL' });
      getCookieStub.returns('sess_123');
      kvGetStub.resolves(JSON.stringify({ checkout: { step: 'SHIPPING_COMPLETED' } }));

      const res = await checkoutDelivery(req, env, ctx);
      expect(res.status).to.equal(400);
      expect(res.data.error).to.include('complete billing address step first');
    });

    it('should return 404 if cart not found', async () => {
      safeJsonStub.resolves({ delivery_type: 'NORMAL' });
      getCookieStub.returns('sess_123');
      kvGetStub.resolves(JSON.stringify({ checkout: { step: 'BILLING_ADDRESS_COMPLETED', cart_id: 1 } }));
      
      dbPrepareStub.onFirstCall().returns({ bind: () => ({ first: () => null }) });

      const res = await checkoutDelivery(req, env, ctx);
      expect(res.status).to.equal(404);
    });

    it('should return 400 if delivery type not available for product', async () => {
      safeJsonStub.resolves({ delivery_type: 'EXPRESS' });
      getCookieStub.returns('sess_123');
      kvGetStub.resolves(JSON.stringify({ checkout: { step: 'BILLING_ADDRESS_COMPLETED', cart_id: 1 } }));

      const cartStub = { bind: () => ({ first: () => ({ total_price: 100, currency: 'USD' }) }) };
      const itemsStub = { bind: () => ({ all: () => ({ results: [{ name: 'Slow Item', delivery_options: '["NORMAL"]' }] }) }) };
      
      dbPrepareStub.onFirstCall().returns(cartStub);
      dbPrepareStub.onSecondCall().returns(itemsStub);

      const res = await checkoutDelivery(req, env, ctx);
      expect(res.status).to.equal(400);
      expect(res.data.error).to.include('not available for product');
    });

    it('should return 400 for invalid delivery type constant', async () => {
      safeJsonStub.resolves({ delivery_type: 'TELEPORT' });
      getCookieStub.returns('sess_123');
      kvGetStub.resolves(JSON.stringify({ checkout: { step: 'BILLING_ADDRESS_COMPLETED', cart_id: 1 } }));

      const cartStub = { bind: () => ({ first: () => ({ total_price: 100, currency: 'USD' }) }) };
      const itemsStub = { bind: () => ({ all: () => ({ results: [{ name: 'Item', delivery_options: '["TELEPORT"]' }] }) }) };
      
      dbPrepareStub.onFirstCall().returns(cartStub);
      dbPrepareStub.onSecondCall().returns(itemsStub);

      const res = await checkoutDelivery(req, env, ctx);
      expect(res.status).to.equal(400);
      expect(res.data.error).to.equal('Invalid delivery type');
    });

    it('should calculate totals and return 200 (TN tax)', async () => {
      safeJsonStub.resolves({ delivery_type: 'NORMAL' });
      getCookieStub.returns('sess_123');
      const session = { 
        checkout: { 
          step: 'BILLING_ADDRESS_COMPLETED', 
          cart_id: 1,
          shipping_address: { state: 'TN' }
        } 
      };
      kvGetStub.resolves(JSON.stringify(session));

      const cartStub = { bind: () => ({ first: () => ({ total_price: 1000, currency: 'INR' }) }) };
      const itemsStub = { bind: () => ({ all: () => ({ results: [{ name: 'Item', delivery_options: '["NORMAL"]' }] }) }) };
      
      dbPrepareStub.onFirstCall().returns(cartStub);
      dbPrepareStub.onSecondCall().returns(itemsStub);

      const res = await checkoutDelivery(req, env, ctx);
      expect(res.status).to.equal(200);
      
      // Cost: 50, Tax: 5% of 1000 = 50. Total = 1000 + 50 + 50 = 1100
      expect(res.data.summary.shipping).to.equal(50);
      expect(res.data.summary.tax).to.equal(50);
      expect(res.data.summary.total).to.equal(1100);
      
      const saved = JSON.parse(kvPutStub.firstCall.args[1]);
      expect(saved.checkout.step).to.equal('BILLING_COMPLETED');
    });

    it('should calculate totals and return 200 (Other state tax)', async () => {
      safeJsonStub.resolves({ delivery_type: 'SPEED' });
      getCookieStub.returns('sess_123');
      const session = { 
        checkout: { 
          step: 'BILLING_ADDRESS_COMPLETED', 
          cart_id: 1,
          shipping_address: { state: 'KA' }
        } 
      };
      kvGetStub.resolves(JSON.stringify(session));

      const cartStub = { bind: () => ({ first: () => ({ total_price: 1000, currency: 'INR' }) }) };
      const itemsStub = { bind: () => ({ all: () => ({ results: [] }) }) }; // No items to validate
      
      dbPrepareStub.onFirstCall().returns(cartStub);
      dbPrepareStub.onSecondCall().returns(itemsStub);

      const res = await checkoutDelivery(req, env, ctx);
      expect(res.status).to.equal(200);
      
      // Cost: 120, Tax: 12% of 1000 = 120. Total = 1000 + 120 + 120 = 1240
      expect(res.data.summary.shipping).to.equal(120);
      expect(res.data.summary.tax).to.equal(120);
      expect(res.data.summary.total).to.equal(1240);
    });

    it('should handle JSON parse error in delivery options', async () => {
      safeJsonStub.resolves({ delivery_type: 'NORMAL' });
      getCookieStub.returns('sess_123');
      kvGetStub.resolves(JSON.stringify({ checkout: { step: 'BILLING_ADDRESS_COMPLETED', cart_id: 1, shipping_address: { state: 'TN' } } }));

      const cartStub = { bind: () => ({ first: () => ({ total_price: 100, currency: 'USD' }) }) };
      // Invalid JSON in delivery_options
      const itemsStub = { bind: () => ({ all: () => ({ results: [{ name: 'Item', delivery_options: 'INVALID_JSON' }] }) }) };
      
      dbPrepareStub.onFirstCall().returns(cartStub);
      dbPrepareStub.onSecondCall().returns(itemsStub);

      const res = await checkoutDelivery(req, env, ctx);
      expect(res.status).to.equal(200); // Should default to ["NORMAL"] and succeed
    });
  });
});