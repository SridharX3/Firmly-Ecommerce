import * as chai from 'chai';
import sinon from 'sinon';
import esmock from 'esmock';

const { expect } = chai;

describe('Order Service', () => {
  let createOrder, createOrderTransaction;
  let env, ctx;
  let dbPrepareStub, dbBatchStub;
  let withSpanStub;

  const validOrder = {
    user_id: 1,
    status: 'PAID',
    total_amount: 100,
    currency: 'USD',
    payment_provider: 'paypal',
    payment_reference: 'ref_123',
    shipping_address: { full_name: 'John Doe', phone: '123456', address_line1: '123 Main St', city: 'City', state: 'State', postal_code: '12345', country: 'IN' },
    billing_address: { full_name: 'John Doe', phone: '123456', address_line1: '123 Main St', city: 'City', state: 'State', postal_code: '12345', country: 'IN' },
    delivery_mode: 'NORMAL',
    ordered_items: [{ product_id: 1, name: 'P1', price: 10, quantity: 1 }]
  };

  before(async () => {
    withSpanStub = sinon.stub().callsFake((ctx, name, attrs, fn) => {
      const span = { setAttribute: sinon.spy(), recordException: sinon.spy() };
      return fn(span);
    });

    const module = await esmock('../src/services/order.service.js', {
      '../src/observability/otel.js': { withSpan: withSpanStub }
    });
    createOrder = module.createOrder;
    createOrderTransaction = module.createOrderTransaction;
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
  });

  describe('createOrder', () => {
    it('should throw if validation fails', async () => {
      try {
        await createOrder(env, { ...validOrder, status: 'INVALID' }, ctx);
        throw new Error('Should have thrown');
      } catch (e) {
        expect(e.message).to.equal('Invalid order input');
      }
    });

    it('should create order and return ID', async () => {
      dbPrepareStub.returns({ bind: () => ({ first: () => ({ id: 123 }) }) });
      
      const id = await createOrder(env, validOrder, ctx);
      expect(id).to.equal(123);
    });
  });

  describe('createOrderTransaction', () => {
    const transactionPayload = {
      ...validOrder,
      cart_id: 99,
      ordered_items: undefined // Should be fetched from DB
    };

    it('should fetch items, validate, and execute batch', async () => {
      // 1. Fetch items
      const itemsStub = { 
        bind: () => ({ 
          all: () => ({ results: [{ product_id: 1, name: 'P1', price: 10, quantity: 1 }] }) 
        }) 
      };
      
      // 2. Batch result
      const batchResult = [
        { success: true, results: [{ id: 555 }] },
        { success: true }
      ];

      dbPrepareStub.onFirstCall().returns(itemsStub);
      dbPrepareStub.returns({ bind: sinon.stub() }); // For insert/update queries
      dbBatchStub.resolves(batchResult);

      const orderId = await createOrderTransaction(env, transactionPayload, ctx);
      
      expect(orderId).to.equal(555);
      expect(dbBatchStub.calledOnce).to.be.true;
    });

    it('should throw if validation fails after fetching items', async () => {
      // Fetch empty items -> validation error for ordered_items
      const itemsStub = { bind: () => ({ all: () => ({ results: [] }) }) };
      dbPrepareStub.onFirstCall().returns(itemsStub);

      try {
        await createOrderTransaction(env, transactionPayload, ctx);
        throw new Error('Should have thrown');
      } catch (e) {
        expect(e.message).to.include('Invalid order input');
      }
    });

    it('should throw if transaction fails partially', async () => {
      const itemsStub = { 
        bind: () => ({ 
          all: () => ({ results: [{ product_id: 1, name: 'P1', price: 10, quantity: 1 }] }) 
        }) 
      };
      
      const batchResult = [
        { success: true, results: [{ id: 555 }] },
        { success: false } // Failed
      ];

      dbPrepareStub.onFirstCall().returns(itemsStub);
      dbPrepareStub.returns({ bind: sinon.stub() });
      dbBatchStub.resolves(batchResult);

      try {
        await createOrderTransaction(env, transactionPayload, ctx);
        throw new Error('Should have thrown');
      } catch (e) {
        expect(e.message).to.equal('Order transaction failed partially');
      }
    });
  });
});