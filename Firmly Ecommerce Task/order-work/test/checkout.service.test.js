import * as chai from 'chai';
import sinon from 'sinon';
import esmock from 'esmock';

const { expect } = chai;

describe('Checkout Service', () => {
  let createCheckout, cancelCheckout;
  let env, ctx;
  let dbPrepareStub, dbBatchStub;
  let withSpanStub;
  let consoleErrorStub;

  before(async () => {
    if (!global.crypto) {
      global.crypto = { randomUUID: () => 'test-uuid' };
    }

    withSpanStub = sinon.stub().callsFake((ctx, name, attrs, fn) => {
      const span = { setAttribute: sinon.spy(), recordException: sinon.spy() };
      return fn(span);
    });

    const module = await esmock('../src/services/checkout.service.js', {
      '../src/observability/otel.js': { withSpan: withSpanStub }
    });
    createCheckout = module.createCheckout;
    cancelCheckout = module.cancelCheckout;
  });

  beforeEach(() => {
    dbPrepareStub = sinon.stub();
    dbBatchStub = sinon.stub();
    env = {
      DB: {
        prepare: dbPrepareStub,
        batch: dbBatchStub
      }
    };
    ctx = {};
    consoleErrorStub = sinon.stub(console, 'error');
  });

  afterEach(() => {
    consoleErrorStub.restore();
  });

  describe('createCheckout', () => {
    const validPayload = {
      shipping_address: {
        full_name: 'John', phone: '123456', address_line1: 'Street', city: 'City', state: 'State', postal_code: '12345', country: 'IN'
      },
      delivery_type: 'NORMAL'
    };

    it('should throw if validation fails', async () => {
      try {
        await createCheckout(env, 'user1', {}, ctx);
        throw new Error('Should have thrown');
      } catch (e) {
        expect(e.message).to.include('shipping_address');
      }
    });

    it('should throw if active cart not found', async () => {
      dbPrepareStub.returns({ bind: () => ({ first: () => null }) });
      try {
        await createCheckout(env, 'user1', validPayload, ctx);
        throw new Error('Should have thrown');
      } catch (e) {
        expect(e.message).to.equal('No active cart');
      }
    });

    it('should throw if cart is empty', async () => {
      dbPrepareStub.onFirstCall().returns({ bind: () => ({ first: () => ({ id: 1 }) }) });
      dbPrepareStub.onSecondCall().returns({ bind: () => ({ all: () => ({ results: [] }) }) });
      
      try {
        await createCheckout(env, 'user1', validPayload, ctx);
        throw new Error('Should have thrown');
      } catch (e) {
        expect(e.message).to.equal('Cart is empty');
      }
    });

    it('should create checkout session', async () => {
      dbPrepareStub.onFirstCall().returns({ bind: () => ({ first: () => ({ id: 1 }) }) });
      dbPrepareStub.onSecondCall().returns({ bind: () => ({ all: () => ({ results: [{ product_id: 1, quantity: 1, snapshot_price: 100, snapshot_name: 'P1' }] }) }) });
      
      // Mock batch execution
      dbPrepareStub.returns({ bind: sinon.stub() });
      
      const result = await createCheckout(env, 'user1', validPayload, ctx);
      
      expect(env.DB.batch.called).to.be.true;
      expect(result).to.have.property('checkout_id');
      expect(result.total).to.be.a('number');
    });

    it('should accept billing_address and strip unknown fields', async () => {
      dbPrepareStub.onFirstCall().returns({ bind: () => ({ first: () => ({ id: 1 }) }) });
      dbPrepareStub.onSecondCall().returns({ bind: () => ({ all: () => ({ results: [{ product_id: 1, quantity: 1, snapshot_price: 100, snapshot_name: 'P1' }] }) }) });
      dbPrepareStub.returns({ bind: sinon.stub() });

      const payload = {
        ...validPayload,
        billing_address: validPayload.shipping_address,
        extra_field: 'should_be_stripped'
      };

      const result = await createCheckout(env, 'user1', payload, ctx);
      expect(result).to.have.property('checkout_id');
      expect(consoleErrorStub.called).to.be.false;
    });

    it('should throw if delivery_type is invalid value', async () => {
      const payload = { ...validPayload, delivery_type: 'INVALID' };
      try {
        await createCheckout(env, 'user1', payload, ctx);
        throw new Error('Should have thrown');
      } catch (e) {
        expect(e.message).to.include('delivery_type');
        expect(consoleErrorStub.called).to.be.true;
      }
    });
  });

  describe('cancelCheckout', () => {
    it('should throw if session not found', async () => {
      dbPrepareStub.returns({ bind: () => ({ first: () => null }) });
      try {
        await cancelCheckout(env, 'chk_1', ctx);
        throw new Error('Should have thrown');
      } catch (e) {
        expect(e.message).to.equal('Checkout session not found');
      }
    });

    it('should return status if not CREATED', async () => {
      dbPrepareStub.returns({ bind: () => ({ first: () => ({ status: 'COMPLETED' }) }) });
      const res = await cancelCheckout(env, 'chk_1', ctx);
      expect(res.status).to.equal('COMPLETED');
      expect(res.message).to.include('cannot be canceled');
    });

    it('should cancel checkout', async () => {
      // 1. Select session
      const selectStub = { bind: () => ({ first: () => ({ status: 'CREATED', cart_id: 1 }) }) };
      // 2. Batch update
      const batchStub = { bind: () => ({}) };
      
      dbPrepareStub.onFirstCall().returns(selectStub);
      dbPrepareStub.returns(batchStub);

      const res = await cancelCheckout(env, 'chk_1', ctx);
      
      expect(res.status).to.equal('CANCELED');
      expect(res.cart_id).to.equal(1);
      expect(env.DB.batch.called).to.be.true;
    });
  });
});