
import { expect } from 'chai';
import sinon from 'sinon';
import sessionService from '../../src/services/session.service.js';
import crypto from '../../src/utils/crypto.js';
import otel from '../../src/observability/otel.js';

describe('Session Service', () => {
  let envMock;
  let ctxMock;
  let withSpanStub;

  beforeEach(() => {
    envMock = {
      SESSION_KV: {
        put: sinon.stub(),
        get: sinon.stub(),
        delete: sinon.stub(),
      },
      SESSION_TTL: '3600',
    };
    ctxMock = {}; // Mock context as needed
    sinon.stub(otel, 'withSpan').callsFake((ctx, name, options, fn) => fn(options));
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('createSession', () => {
    it('should create a session successfully', async () => {
      const userId = 1;
      const uuid = 'test-session-id';
      const generateUUIDStub = sinon.stub(crypto, 'generateUUID').returns(uuid);

      const sessionId = await sessionService.createSession(envMock, userId, ctxMock);

      expect(sessionId).to.equal(uuid);
      expect(envMock.SESSION_KV.put.calledOnceWith(
        uuid,
        JSON.stringify({ user_id: userId }),
        { expirationTtl: 3600 }
      )).to.be.true;
      expect(generateUUIDStub.calledOnce).to.be.true;
    });

    it('should throw an error if session storage is unavailable', async () => {
      const userId = 1;
      envMock.SESSION_KV = null;

      try {
        await sessionService.createSession(envMock, userId, ctxMock);
        expect.fail('Expected error was not thrown');
      } catch (error) {
        expect(error.message).to.equal('Session storage is currently unavailable');
      }
    });
  });

  describe('getSession', () => {
    it('should return null if no session id is provided', async () => {
      const session = await sessionService.getSession(envMock, null, ctxMock);
      expect(session).to.be.null;
    });

    it('should return session data for a valid session id', async () => {
      const sessionId = 'test-session-id';
      const sessionData = { user_id: 1 };
      envMock.SESSION_KV.get.withArgs(sessionId, 'json').resolves(sessionData);

      const session = await sessionService.getSession(envMock, sessionId, ctxMock);

      expect(session).to.deep.equal(sessionData);
      expect(envMock.SESSION_KV.get.calledOnceWith(sessionId, 'json')).to.be.true;
    });

    it('should return null if session storage is unavailable', async () => {
        envMock.SESSION_KV = null;
        const session = await sessionService.getSession(envMock, 'test-session-id', ctxMock);
        expect(session).to.be.null;
    });
  });

  describe('deleteSession', () => {
    it('should not do anything if no session id is provided', async () => {
      await sessionService.deleteSession(envMock, null, ctxMock);
      expect(envMock.SESSION_KV.delete.notCalled).to.be.true;
    });

    it('should delete a session for a valid session id', async () => {
      const sessionId = 'test-session-id';
      await sessionService.deleteSession(envMock, sessionId, ctxMock);
      expect(envMock.SESSION_KV.delete.calledOnceWith(sessionId)).to.be.true;
    });

    it('should not throw if session storage is unavailable', async () => {
        envMock.SESSION_KV = null;
        await sessionService.deleteSession(envMock, 'test-session-id', ctxMock);
        // No assertion needed, just checking that it doesn't throw
      });
  });
});
