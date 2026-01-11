import { expect } from 'chai';
import sinon from 'sinon';
import { requireUser, validateQuantity } from '../src/utils/validate.js';

describe('Utils: Validate', () => {
  describe('requireUser', () => {
    let env;

    beforeEach(() => {
      env = {
        SESSION_KV: {
          get: sinon.stub(),
        },
      };
    });

    const createReq = (cookieString) => ({
      headers: {
        get: (name) => (name === 'Cookie' ? cookieString : null),
      },
    });

    it('should throw Unauthorized if no session cookie', async () => {
      const req = createReq(null);
      try {
        await requireUser(req, env);
        throw new Error('Should have thrown');
      } catch (err) {
        expect(err.message).to.equal('Unauthorized');
      }
    });

    it('should throw Invalid session if session not found in KV', async () => {
      const req = createReq('session_id=invalid');
      env.SESSION_KV.get.resolves(null);

      try {
        await requireUser(req, env);
        throw new Error('Should have thrown');
      } catch (err) {
        expect(err.message).to.equal('Invalid session');
      }
    });

    it('should return user_id if session is valid', async () => {
      const req = createReq('session_id=valid');
      env.SESSION_KV.get.resolves({ user_id: 123 });

      const userId = await requireUser(req, env);
      expect(userId).to.equal(123);
    });
  });

  describe('validateQuantity', () => {
    it('should throw for non-numbers', () => {
      expect(() => validateQuantity('1')).to.throw('Invalid quantity');
    });

    it('should throw for negative numbers or zero', () => {
      expect(() => validateQuantity(0)).to.throw('Invalid quantity');
      expect(() => validateQuantity(-5)).to.throw('Invalid quantity');
    });

    it('should not throw for positive integers', () => {
      expect(() => validateQuantity(5)).to.not.throw();
    });
  });
});