import * as chai from 'chai';
import sinon from 'sinon';
import esmock from 'esmock';

const { expect } = chai;

describe('Payment Service', () => {
  let createPayPalOrder, capturePayPalOrder;
  let env, ctx;
  let withSpanStub, getPayPalAccessTokenStub;
  let fetchStub;
  let consoleErrorStub;

  before(async () => {
    withSpanStub = sinon.stub().callsFake((ctx, name, attrs, fn) => {
      const span = { setAttribute: sinon.spy(), recordException: sinon.spy() };
      return fn(span);
    });
    getPayPalAccessTokenStub = sinon.stub().resolves('mock_token');

    const module = await esmock('../../src/services/payment.service.js', {
      '../../src/observability/otel.js': { withSpan: withSpanStub },
      '../../src/utils/paypal.js': { getPayPalAccessToken: getPayPalAccessTokenStub }
    });
    createPayPalOrder = module.createPayPalOrder;
    capturePayPalOrder = module.capturePayPalOrder;
  });

  beforeEach(() => {
    env = { PAYPAL_API_BASE: 'https://mock.paypal' };
    ctx = {};
    fetchStub = sinon.stub(global, 'fetch');
    consoleErrorStub = sinon.stub(console, 'error');
  });

  afterEach(() => {
    fetchStub.restore();
    consoleErrorStub.restore();
  });

  describe('createPayPalOrder', () => {
    const payload = { total_amount: 100, currency: 'USD', return_url: 'http://r', cancel_url: 'http://c' };

    it('should throw if URLs missing', async () => {
      try {
        await createPayPalOrder(env, { total_amount: 100 }, ctx);
        throw new Error('Should have thrown');
      } catch (e) {
        expect(e.message).to.include('URLs required');
      }
    });

    it('should create order successfully', async () => {
      const mockResponse = {
        id: 'pp_123',
        status: 'CREATED',
        links: [{ rel: 'approve', href: 'http://approve' }]
      };
      fetchStub.resolves({ ok: true, json: async () => mockResponse, status: 201 });

      const res = await createPayPalOrder(env, payload, ctx);
      expect(res.paypal_order_id).to.equal('pp_123');
      expect(res.approval_url).to.equal('http://approve');
    });

    it('should throw if fetch fails', async () => {
      fetchStub.resolves({ ok: false, json: async () => ({ message: 'Bad Request' }), status: 400 });
      try {
        await createPayPalOrder(env, payload, ctx);
        throw new Error('Should have thrown');
      } catch (e) {
        expect(e.message).to.equal('Bad Request');
      }
    });

    it('should throw if approval link missing', async () => {
      const mockResponse = { id: 'pp_123', status: 'CREATED', links: [] };
      fetchStub.resolves({ ok: true, json: async () => mockResponse, status: 201 });
      try {
        await createPayPalOrder(env, payload, ctx);
        throw new Error('Should have thrown');
      } catch (e) {
        expect(e.message).to.equal('PayPal approval URL missing');
      }
    });
  });

  describe('capturePayPalOrder', () => {
    it('should capture order successfully', async () => {
      const mockResponse = {
        status: 'COMPLETED',
        purchase_units: [{ payments: { captures: [{ id: 'cap_1' }] } }]
      };
      fetchStub.resolves({ ok: true, json: async () => mockResponse, status: 201 });

      const res = await capturePayPalOrder(env, 'pp_123', ctx);
      expect(res.status).to.equal('COMPLETED');
      expect(res.capture_id).to.equal('cap_1');
    });

    it('should throw if capture fails', async () => {
      fetchStub.resolves({ ok: false, json: async () => ({ message: 'Capture Failed' }), status: 422 });
      try {
        await capturePayPalOrder(env, 'pp_123', ctx);
        throw new Error('Should have thrown');
      } catch (e) {
        expect(e.message).to.equal('Capture Failed');
      }
    });
  });
});