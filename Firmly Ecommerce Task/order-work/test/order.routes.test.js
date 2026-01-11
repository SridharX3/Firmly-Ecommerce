import * as chai from 'chai';
import sinon from 'sinon';
import esmock from 'esmock';

const { expect } = chai;

describe('Order Routes', () => {
  let getAllOrders, getOrder;
  let req, env, ctx;
  let jsonStub, withSpanStub, setAttributesStub;
  let dbPrepareStub;

  before(async () => {
    jsonStub = sinon.stub().callsFake((data, status) => ({ data, status }));
    withSpanStub = sinon.stub().callsFake((ctx, name, attrs, fn) => {
      const span = { setAttribute: sinon.spy(), recordException: sinon.spy() };
      return fn(span);
    });
    setAttributesStub = sinon.stub();

    const module = await esmock('../src/routes/order.routes.js', {
      '../src/response.js': { json: jsonStub },
      '../src/observability/otel.js': { withSpan: withSpanStub, setAttributes: setAttributesStub }
    });

    getAllOrders = module.getAllOrders;
    getOrder = module.getOrder;
  });

  beforeEach(() => {
    jsonStub.resetHistory();
    dbPrepareStub = sinon.stub();
    env = { DB: { prepare: dbPrepareStub } };
    req = { userId: '123', params: {} };
    ctx = {};
  });

  describe('getAllOrders', () => {
    it('should return 401 if unauthorized', async () => {
      req.userId = null;
      const res = await getAllOrders(req, env, ctx);
      expect(res.status).to.equal(401);
    });

    it('should return empty list if no orders', async () => {
      dbPrepareStub.returns({ bind: () => ({ all: () => ({ results: [] }) }) });
      const res = await getAllOrders(req, env, ctx);
      expect(res.status).to.equal(200);
      expect(res.data).to.be.an('array').that.is.empty;
    });

    it('should return orders with parsed items and fetched images', async () => {
      const mockOrder = {
        id: 1,
        user_id: 123,
        ordered_items: JSON.stringify([{ product_id: 10, name: 'P1' }]), // No image
        shipping_address: '{}',
        billing_address: '{}'
      };

      const ordersQuery = { bind: () => ({ all: () => ({ results: [mockOrder] }) }) };
      const productQuery = { bind: () => ({ first: () => ({ image_url: 'http://img.com/1.jpg' }) }) };

      dbPrepareStub.onFirstCall().returns(ordersQuery);
      dbPrepareStub.onSecondCall().returns(productQuery);

      const res = await getAllOrders(req, env, ctx);
      expect(res.status).to.equal(200);
      expect(res.data[0].ordered_items[0].image_url).to.equal('http://img.com/1.jpg');
    });

    it('should handle already parsed ordered_items and existing images', async () => {
      const mockOrder = {
        id: 1,
        ordered_items: [{ product_id: 10, name: 'P1', image_url: 'existing.jpg' }],
        shipping_address: {},
        billing_address: {}
      };

      dbPrepareStub.returns({ bind: () => ({ all: () => ({ results: [mockOrder] }) }) });

      const res = await getAllOrders(req, env, ctx);
      expect(res.status).to.equal(200);
      expect(res.data[0].ordered_items[0].image_url).to.equal('existing.jpg');
      expect(dbPrepareStub.calledOnce).to.be.true; // No product lookup
    });
  });

  describe('getOrder', () => {
    it('should return 401 if unauthorized', async () => {
      req.userId = null;
      const res = await getOrder(req, env, ctx);
      expect(res.status).to.equal(401);
    });

    it('should return 404 if order not found', async () => {
      req.params.orderId = '999';
      dbPrepareStub.returns({ bind: () => ({ first: () => null }) });
      const res = await getOrder(req, env, ctx);
      expect(res.status).to.equal(404);
    });

    it('should return order details with image enrichment', async () => {
      req.params.orderId = '1';
      const mockOrder = {
        id: 1,
        user_id: 123,
        ordered_items: JSON.stringify([{ product_id: 10, name: 'P1' }]),
        shipping_address: '{}',
        billing_address: '{}'
      };

      const orderQuery = { bind: () => ({ first: () => mockOrder }) };
      const productQuery = { bind: () => ({ first: () => ({ image_url: 'http://img.com/1.jpg' }) }) };

      dbPrepareStub.onFirstCall().returns(orderQuery);
      dbPrepareStub.onSecondCall().returns(productQuery);

      const res = await getOrder(req, env, ctx);
      expect(res.status).to.equal(200);
      expect(res.data.id).to.equal(1);
      expect(res.data.ordered_items[0].image_url).to.equal('http://img.com/1.jpg');
    });

    it('should handle missing product image in DB', async () => {
      req.params.orderId = '1';
      const mockOrder = {
        id: 1,
        ordered_items: JSON.stringify([{ product_id: 10, name: 'P1' }]),
        shipping_address: '{}',
        billing_address: '{}'
      };

      const orderQuery = { bind: () => ({ first: () => mockOrder }) };
      const productQuery = { bind: () => ({ first: () => null }) };

      dbPrepareStub.onFirstCall().returns(orderQuery);
      dbPrepareStub.onSecondCall().returns(productQuery);

      const res = await getOrder(req, env, ctx);
      expect(res.status).to.equal(200);
      expect(res.data.ordered_items[0].image_url).to.be.undefined;
    });

    it('should handle object format addresses and items', async () => {
      req.params.orderId = '1';
      const mockOrder = {
        id: 1,
        ordered_items: [{ product_id: 10, name: 'P1', image_url: 'ok.jpg' }],
        shipping_address: { city: 'A' },
        billing_address: { city: 'B' }
      };

      dbPrepareStub.returns({ bind: () => ({ first: () => mockOrder }) });

      const res = await getOrder(req, env, ctx);
      expect(res.status).to.equal(200);
      expect(res.data.shipping_address.city).to.equal('A');
      expect(res.data.ordered_items[0].image_url).to.equal('ok.jpg');
    });
  });
});