import { jest, expect, describe, it, beforeEach, afterEach } from '@jest/globals';

jest.unstable_mockModule('../../src/utils/crypto.js', () => ({
  generateUUID: jest.fn(),
}));

jest.unstable_mockModule('../../src/observability/otel.js', () => ({
  withSpan: jest.fn(),
}));

const sessionService = await import('../../src/services/session.service.js');
const crypto = await import('../../src/utils/crypto.js');
const otel = await import('../../src/observability/otel.js');

describe('Session Service', () => {
  let envMock;
  let ctxMock;

  beforeEach(() => {
    envMock = {
      SESSION_KV: {
        put: jest.fn(),
        get: jest.fn(),
        delete: jest.fn(),
      },
      SESSION_TTL: '3600',
    };
    ctxMock = {}; // Mock context as needed
    otel.withSpan.mockImplementation((ctx, name, options, fn) => fn(options));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSession', () => {
    it('should create a session successfully', async () => {
      const userId = 1;
      const uuid = 'test-session-id';
      crypto.generateUUID.mockReturnValue(uuid);

      const sessionId = await sessionService.createSession(envMock, userId, ctxMock);

      expect(sessionId).toBe(uuid);
      expect(envMock.SESSION_KV.put).toHaveBeenCalledWith(
        uuid,
        JSON.stringify({ user_id: userId }),
        { expirationTtl: 3600 }
      );
      expect(crypto.generateUUID).toHaveBeenCalledTimes(1);
    });

    it('should throw an error if session storage is unavailable', async () => {
      const userId = 1;
      envMock.SESSION_KV = null;

      try {
        await sessionService.createSession(envMock, userId, ctxMock);
        throw new Error('Expected error was not thrown');
      } catch (error) {
        expect(error.message).toBe('Session storage is currently unavailable');
      }
    });
  });

  describe('getSession', () => {
    it('should return null if no session id is provided', async () => {
      const session = await sessionService.getSession(envMock, null, ctxMock);
      expect(session).toBeNull();
    });

    it('should return session data for a valid session id', async () => {
      const sessionId = 'test-session-id';
      const sessionData = { user_id: 1 };
      envMock.SESSION_KV.get.mockResolvedValue(sessionData);

      const session = await sessionService.getSession(envMock, sessionId, ctxMock);

      expect(session).toEqual(sessionData);
      expect(envMock.SESSION_KV.get).toHaveBeenCalledWith(sessionId, 'json');
    });

    it('should return null if session storage is unavailable', async () => {
        envMock.SESSION_KV = null;
        const session = await sessionService.getSession(envMock, 'test-session-id', ctxMock);
        expect(session).toBeNull();
    });
  });

  describe('deleteSession', () => {
    it('should not do anything if no session id is provided', async () => {
      await sessionService.deleteSession(envMock, null, ctxMock);
      expect(envMock.SESSION_KV.delete).not.toHaveBeenCalled();
    });

    it('should delete a session for a valid session id', async () => {
      const sessionId = 'test-session-id';
      await sessionService.deleteSession(envMock, sessionId, ctxMock);
      expect(envMock.SESSION_KV.delete).toHaveBeenCalledWith(sessionId);
    });

    it('should not throw if session storage is unavailable', async () => {
        envMock.SESSION_KV = null;
        await sessionService.deleteSession(envMock, 'test-session-id', ctxMock);
        // No assertion needed, just checking that it doesn't throw
      });
  });
});
