import { expect } from 'chai';
import sinon from 'sinon';
import router from '../src/router.js';
import authService from '../src/services/auth.service.js';
import sessionService from '../src/services/session.service.js';
import cookie from '../src/utils/cookie.js';

describe('Router', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('POST /auth/register', () => {
    it('should register a user and return a session cookie', async () => {
      const request = {
        method: 'POST',
        url: 'https://test.com/auth/register',
        headers: {
          'content-type': 'application/json',
        },
        json: async () => ({
          email: 'test@example.com',
          password: 'password123',
        }),
      };
      const env = { DB: {} };
      const ctx = {};

      const user = { id: 1, email: 'test@example.com' };
      const sessionId = 'some-session-id';

const createSessionStub = sinon.stub(sessionService, 'createSession').resolves(sessionId);

      const response = await router.handle(request, env, ctx);
      const body = await response.json();

      expect(response.status).to.equal(201);
      expect(body.email).to.equal(user.email);
      expect(response.headers.get('Set-Cookie')).to.equal(
        cookie.setSessionCookie(sessionId)
      );
      expect(registerStub.calledOnce).to.be.true;
      expect(createSessionStub.calledOnce).to.be.true;
    });

    it('should handle registration failure', async () => {
      const request = {
        method: 'POST',
        url: 'https://test.com/auth/register',
        headers: {
          'content-type': 'application/json',
        },
        json: async () => ({
          email: 'test@example.com',
          password: 'password123',
        }),
      };
      const env = { DB: {} };
      const ctx = {};

      const registerStub = sinon.stub(authService, 'register').throws(new Error('Registration failed'));

      const response = await router.handle(request, env, ctx);
      const body = await response.json();

      expect(response.status).to.equal(400);
      expect(body.error).to.equal('Registration failed');
      expect(registerStub.calledOnce).to.be.true;
    });
  });

  describe('POST /auth/login', () => {
    it('should login a user and return a session cookie', async () => {
      const request = {
        method: 'POST',
        url: 'https://test.com/auth/login',
        headers: {
          'content-type': 'application/json',
        },
        json: async () => ({
          email: 'test@example.com',
          password: 'password123',
        }),
      };
      const env = { DB: {} };
      const ctx = {};

      const user = { id: 1, email: 'test@example.com' };
      const sessionId = 'some-session-id';

      const loginStub = sinon.stub(authService, 'login').resolves(user);
      const createSessionStub = sinon.stub(sessionService, 'createSession').resolves(sessionId);

      const response = await router.handle(request, env, ctx);
      const body = await response.json();

      expect(response.status).to.equal(200);
      expect(body.email).to.equal(user.email);
      expect(response.headers.get('Set-Cookie')).to.equal(
        setSessionCookie(sessionId)
      );
      expect(loginStub.calledOnce).to.be.true;
      expect(createSessionStub.calledOnce).to.be.true;
    });

    it('should handle login failure', async () => {
      const request = {
        method: 'POST',
        url: 'https://test.com/auth/login',
        headers: {
          'content-type': 'application/json',
        },
        json: async () => ({
          email: 'test@example.com',
          password: 'wrong-password',
        }),
      };
      const env = { DB: {} };
      const ctx = {};

      const loginStub = sinon.replace(authService, 'login', sinon.fake.throws(new Error('Login failed')));

      const response = await router.handle(request, env, ctx);
      const body = await response.json();

      expect(response.status).to.equal(401);
      expect(body.error).to.equal('Login failed');
      expect(loginStub.calledOnce).to.be.true;
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout a user and clear the session cookie', async () => {
      const request = {
        method: 'POST',
        url: 'https://test.com/auth/logout',
        headers: {
          cookie: 'session_id=some-session-id',
        },
      };
      const env = { DB: {} };
      const ctx = {};

      const deleteSessionStub = sinon.replace(sessionService, 'deleteSession', sinon.fake.resolves(undefined));

      const response = await router.handle(request, env, ctx);
      const body = await response.json();

      expect(response.status).to.equal(200);
      expect(body.success).to.be.true;
      expect(response.headers.get('Set-Cookie')).to.equal(
        clearSessionCookie()
      );
      expect(deleteSessionStub.calledOnce).to.be.true;
    });
  });

  describe('Fallback', () => {
    it('should return a 404 for an unknown route', async () => {
      const request = {
        method: 'GET',
        url: 'https://test.com/unknown',
      };
      const env = {};
      const ctx = {};

      const response = await router.handle(request, env, ctx);
      const body = await response.json();

      expect(response.status).to.equal(404);
      expect(body.error).to.equal('Route not found');
    });
  });
});
