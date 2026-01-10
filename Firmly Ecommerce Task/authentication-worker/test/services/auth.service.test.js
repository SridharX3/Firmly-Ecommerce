
import { expect } from 'chai';
import sinon from 'sinon';
import authService from '../../src/services/auth.service.js';
import crypto from '../../src/utils/crypto.js';
import otel from '../../src/observability/otel.js';

describe('Auth Service', () => {
  let dbMock;
  let ctxMock;
  let withSpanStub;

  beforeEach(() => {
    dbMock = {
      prepare: sinon.stub().returnsThis(),
      bind: sinon.stub().returnsThis(),
      first: sinon.stub(),
      run: sinon.stub(),
    };
    ctxMock = {}; // Mock context as needed
    sinon.stub(otel, 'withSpan').callsFake((ctx, name, options, fn) => fn(options));
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const payload = {
        email: 'test@example.com',
        password: 'password123',
        confirm_password: 'password123',
      };
      const hashedPassword = 'hashedPassword';

      dbMock.first.resolves(null); // No existing user
      dbMock.run.resolves({ meta: { last_row_id: 1 } });
      const hashPasswordStub = sinon.stub(crypto, 'hashPassword').resolves(hashedPassword);

      const result = await authService.register(dbMock, payload, ctxMock, 'user-key', 'admin-secret');

      expect(result).to.deep.equal({
        id: 1,
        email: 'test@example.com',
        phone_number: undefined,
        username: undefined,
      });
      expect(dbMock.prepare.callCount).to.equal(2);
      expect(hashPasswordStub.calledOnceWith('password123')).to.be.true;
    });

    it('should throw an error if email is already registered', async () => {
      const payload = {
        email: 'test@example.com',
        password: 'password123',
        confirm_password: 'password123',
      };
      dbMock.first.resolves({ id: 1 }); // Existing user

      try {
        await authService.register(dbMock, payload, ctxMock, 'user-key', 'admin-secret');
        // Should not reach here
        expect.fail('Expected error was not thrown');
      } catch (error) {
        expect(error.message).to.equal('Email already registered');
      }
    });

    it('should throw validation error for invalid payload', async () => {
        const payload = {
          email: 'test@example.com',
          password: '123', // too short
          confirm_password: '123',
        };
  
        try {
          await authService.register(dbMock, payload, ctxMock, 'user-key', 'admin-secret');
          expect.fail('Expected validation error was not thrown');
        } catch (error) {
          expect(error.message).to.contain('"password" length must be at least 6 characters long');
        }
      });
  });

  describe('login', () => {
    it('should login a user successfully', async () => {
      const payload = {
        email: 'test@example.com',
        password: 'password123',
      };
      const user = {
        id: 1,
        email: 'test@example.com',
        password: 'hashedPassword',
      };

      dbMock.first.resolves(user);
      const verifyPasswordStub = sinon.stub(crypto, 'verifyPassword').resolves(true);

      const result = await authService.login(dbMock, payload, ctxMock);

      expect(result).to.deep.equal({
        id: 1,
        email: 'test@example.com',
      });
      expect(dbMock.prepare.calledOnce).to.be.true;
      expect(verifyPasswordStub.calledOnceWith('password123', 'hashedPassword')).to.be.true;
    });

    it('should throw an error for non-existing user', async () => {
        const payload = {
          email: 'nonexistent@example.com',
          password: 'password123',
        };
  
        dbMock.first.resolves(null); // No user found
  
        try {
          await authService.login(dbMock, payload, ctxMock);
          expect.fail('Expected error was not thrown');
        } catch (error) {
          expect(error.message).to.equal('No account found with this email');
        }
      });
  
      it('should throw an error for incorrect password', async () => {
        const payload = {
          email: 'test@example.com',
          password: 'wrongpassword',
        };
        const user = {
          id: 1,
          email: 'test@example.com',
          password: 'hashedPassword',
        };
  
        dbMock.first.resolves(user);
        const verifyPasswordStub = sinon.stub(crypto, 'verifyPassword').resolves(false);
  
        try {
          await authService.login(dbMock, payload, ctxMock);
          expect.fail('Expected error was not thrown');
        } catch (error) {
          expect(error.message).to.equal('Incorrect password');
        }
        expect(verifyPasswordStub.calledOnceWith('wrongpassword', 'hashedPassword')).to.be.true;
      });
  });
});
