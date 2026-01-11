import { expect } from 'chai';
import sinon from 'sinon';
import { getCart, clearCart, getProductById } from '../src/services/cart.service.js';

describe('Service: Cart', () => {
  let env;
  let ctx;
  let stmt;
  let spanStub;

  beforeEach(() => {
    stmt = {
      bind: sinon.stub().returnsThis(),
      first: sinon.stub(),
      all: sinon.stub(),
      run: sinon.stub(),
    };
    env = {
      CART_KV: {
        get: sinon.stub(),
        put: sinon.stub(),
        delete: sinon.stub(),
      },
      DB: {
        prepare: sinon.stub().returns(stmt),
      },
    };
    
    spanStub = {
      setAttribute: sinon.spy(),
      recordException: sinon.spy(),
      end: sinon.spy(),
    };

    // Mock CTX with tracing enabled
    ctx = {
      tracing: {
        startSpan: sinon.stub().callsFake((name, opts, fn) => {
          const callback = typeof opts === 'function' ? opts : fn;
          return callback(spanStub);
        })
      }
    }; 
  });

  describe('getCart', () => {
    it('should throw error for invalid userId', async () => {
      try {
        await getCart(env, null, ctx);
        throw new Error('Should have thrown');
      } catch (err) {
        expect(err.message).to.include('Invalid userId');
      }
    });

    it('should throw and set span attribute for negative userId', async () => {
      try {
        await getCart(env, -1, ctx);
        throw new Error('Should have thrown');
      } catch (err) {
        expect(err.message).to.equal('Invalid userId');
        expect(spanStub.setAttribute.calledWith('cart.error', 'invalid_user_id')).to.be.true;
      }
    });

    it('should throw and set span attribute for float userId', async () => {
      try {
        await getCart(env, 1.5, ctx);
        throw new Error('Should have thrown');
      } catch (err) {
        expect(err.message).to.equal('Invalid userId');
        expect(spanStub.setAttribute.calledWith('cart.error', 'invalid_user_id')).to.be.true;
      }
    });

    it('should return cart from KV if present', async () => {
      const cachedCart = { items: [{ id: 1 }] };
      env.CART_KV.get.resolves(cachedCart);

      const result = await getCart(env, 123, ctx);
      expect(result).to.deep.equal(cachedCart);
      expect(env.DB.prepare.called).to.be.false;
    });

    it('should fetch from DB if KV misses', async () => {
      env.CART_KV.get.resolves(null);
      stmt.first.resolves({ id: 99 }); // Active cart found
      stmt.all.resolves({ results: [{ product_id: 1, quantity: 2 }] });

      const result = await getCart(env, 123, ctx);
      
      expect(result.items).to.have.length(1);
      expect(env.CART_KV.put.called).to.be.true; // Should cache result
    });

    it('should return empty items if no active cart in DB', async () => {
      env.CART_KV.get.resolves(null);
      stmt.first.resolves(null); // No active cart

      const result = await getCart(env, 123, ctx);
      expect(result.items).to.deep.equal([]);
    });

    it('should record exception and rethrow on error', async () => {
      env.CART_KV.get.rejects(new Error('KV Error'));
      try {
        await getCart(env, 123, ctx);
        throw new Error('Should have thrown');
      } catch (err) {
        expect(err.message).to.equal('KV Error');
        expect(spanStub.recordException.called).to.be.true;
      }
    });
  });

  describe('clearCart', () => {
    it('should update DB and delete from KV', async () => {
      await clearCart(env, 123, ctx);
      
      expect(env.DB.prepare.calledWithMatch(/UPDATE carts/)).to.be.true;
      expect(env.CART_KV.delete.called).to.be.true;
    });

    it('should throw error for invalid userId', async () => {
      try {
        await clearCart(env, 0, ctx); // 0 is invalid (not positive)
        throw new Error('Should have thrown');
      } catch (err) {
        expect(err.message).to.equal('Invalid userId');
        expect(spanStub.setAttribute.calledWith('cart.error', 'invalid_user_id')).to.be.true;
      }
    });

    it('should throw error for invalid userId (negative)', async () => {
      try {
        await clearCart(env, -5, ctx);
        throw new Error('Should have thrown');
      } catch (err) {
        expect(err.message).to.equal('Invalid userId');
        expect(spanStub.setAttribute.calledWith('cart.error', 'invalid_user_id')).to.be.true;
      }
    });

    it('should record exception and rethrow on DB error', async () => {
      stmt.run.rejects(new Error('DB Clear Error'));
      try {
        await clearCart(env, 123, ctx);
        throw new Error('Should have thrown');
      } catch (err) {
        expect(err.message).to.equal('DB Clear Error');
        expect(spanStub.recordException.called).to.be.true;
      }
    });
  });

  describe('getProductById', () => {
    it('should throw if productId is missing', async () => {
      try {
        await getProductById(env, null, ctx);
        throw new Error('Fail');
      } catch (err) {
        expect(err.message).to.equal('productId is required');
      }
    });

    it('should return product from DB', async () => {
      const mockProd = { id: 1, name: 'Test' };
      stmt.first.resolves(mockProd);

      const result = await getProductById(env, 1, ctx);
      expect(result).to.deep.equal(mockProd);
    });

    it('should throw Invalid productId for negative number (inside span)', async () => {
      try {
        await getProductById(env, -1, ctx); // -1 passes !productId check but fails Joi
        throw new Error('Should have thrown');
      } catch (err) {
        expect(err.message).to.equal('Invalid productId');
        expect(spanStub.setAttribute.calledWith('product.error', 'invalid_product_id')).to.be.true;
      }
    });

    it('should throw Invalid productId for float number', async () => {
      try {
        await getProductById(env, 1.5, ctx);
        throw new Error('Should have thrown');
      } catch (err) {
        expect(err.message).to.equal('Invalid productId');
        expect(spanStub.setAttribute.calledWith('product.error', 'invalid_product_id')).to.be.true;
      }
    });

    it('should record exception and rethrow on DB error', async () => {
      stmt.first.rejects(new Error('DB Product Error'));
      try {
        await getProductById(env, 1, ctx);
        throw new Error('Should have thrown');
      } catch (err) {
        expect(err.message).to.equal('DB Product Error');
        expect(spanStub.recordException.called).to.be.true;
      }
    });
  });
});