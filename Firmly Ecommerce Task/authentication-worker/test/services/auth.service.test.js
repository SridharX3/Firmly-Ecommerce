import { jest, expect, describe, it, beforeEach, afterEach } from '@jest/globals';

jest.unstable_mockModule('../../src/utils/crypto.js', () => ({
  hashPassword: jest.fn(),
  verifyPassword: jest.fn(),
}));

jest.unstable_mockModule('../../src/observability/otel.js', () => ({
  withSpan: jest.fn(),
}));

const authService = await import('../../src/services/auth.service.js');
const crypto = await import('../../src/utils/crypto.js');
const otel = await import('../../src/observability/otel.js');

describe('Auth Service', () => {
  let dbMock;
  let ctxMock;

  beforeEach(() => {
    dbMock = {
      prepare: jest.fn().mockReturnThis(),
      bind: jest.fn().mockReturnThis(),
      first: jest.fn(),
      run: jest.fn(),
    };
    ctxMock = {}; // Mock context as needed
    otel.withSpan.mockImplementation((ctx, name, options, fn) => {
      const mockSpan = {
        setAttribute: jest.fn(),
        recordException: jest.fn(),
      };
      return fn(mockSpan);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const payload = {
        email: 'test@example.com',
        password: 'password123',
        confirm_password: 'password123',
      };
      const hashedPassword = 'hashedPassword';

      dbMock.first.mockResolvedValue(null); // No existing user
      dbMock.run.mockResolvedValue({ meta: { last_row_id: 1 } });
      crypto.hashPassword.mockResolvedValue(hashedPassword);

      const result = await authService.register(dbMock, payload, ctxMock, 'user-key', 'admin-secret');

      expect(result).toEqual({
        id: 1,
        email: 'test@example.com',
        phone_number: null,
        username: null,
      });
      expect(dbMock.prepare).toHaveBeenCalledTimes(2);
      expect(crypto.hashPassword).toHaveBeenCalledWith('password123');
    });

    it('should throw an error if email is already registered', async () => {
      const payload = {
        email: 'test@example.com',
        password: 'password123',
        confirm_password: 'password123',
      };
      dbMock.first.mockResolvedValue({ id: 1 }); // Existing user

      try {
        await authService.register(dbMock, payload, ctxMock, 'user-key', 'admin-secret');
        // Should not reach here
        throw new Error('Expected error was not thrown');
      } catch (error) {
        expect(error.message).toBe('Email already registered');
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
          throw new Error('Expected validation error was not thrown');
        } catch (error) {
          expect(error.message).toContain('"password" length must be at least 6 characters long');
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

      dbMock.first.mockResolvedValue(user);
      crypto.verifyPassword.mockResolvedValue(true);

      const result = await authService.login(dbMock, payload, ctxMock);

      expect(result).toEqual({
        id: 1,
        email: 'test@example.com',
      });
      expect(dbMock.prepare).toHaveBeenCalledTimes(1);
      expect(crypto.verifyPassword).toHaveBeenCalledWith('password123', 'hashedPassword');
    });

    it('should throw an error for non-existing user', async () => {
        const payload = {
          email: 'nonexistent@example.com',
          password: 'password123',
        };
  
        dbMock.first.mockResolvedValue(null); // No user found
  
        try {
          await authService.login(dbMock, payload, ctxMock);
          throw new Error('Expected error was not thrown');
        } catch (error) {
          expect(error.message).toBe('No account found with this email');
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
  
        dbMock.first.mockResolvedValue(user);
        crypto.verifyPassword.mockResolvedValue(false);
  
        try {
          await authService.login(dbMock, payload, ctxMock);
          throw new Error('Expected error was not thrown');
        } catch (error) {
          expect(error.message).toBe('Incorrect password');
        }
        expect(crypto.verifyPassword).toHaveBeenCalledWith('wrongpassword', 'hashedPassword');
      });
  });
});
