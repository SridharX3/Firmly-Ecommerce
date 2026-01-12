import { jest, expect, describe, it, beforeEach, afterEach } from '@jest/globals';

jest.unstable_mockModule('../src/services/auth.service.js', () => ({
  register: jest.fn(),
  login: jest.fn(),
}));

jest.unstable_mockModule('../src/utils/jwt.js', () => ({
  signToken: jest.fn(),
}));

jest.unstable_mockModule('../src/utils/cookie.js', () => ({
  setAuthCookie: jest.fn(),
  clearAuthCookie: jest.fn(),
  getCookie: jest.fn(),
}));

const authService = await import('../src/services/auth.service.js');
const jwt = await import('../src/utils/jwt.js');
const cookie = await import('../src/utils/cookie.js');
const { default: router } = await import('../src/router.js');

describe('Router', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    it('should register a user and return an auth cookie', async () => {
      const request = {
        method: 'POST',
        url: 'https://test.com/auth/register',
        headers: {
          get: (key) => key.toLowerCase() === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({
          email: 'test@example.com',
          password: 'password123',
        }),
      };
      const env = { DB: {} };
      const ctx = {};

      const user = { id: 1, email: 'test@example.com' };
      const token = 'mock-jwt-token';

      authService.register.mockResolvedValue(user);
      jwt.signToken.mockResolvedValue(token);
      cookie.setAuthCookie.mockReturnValue(`auth_token=${token}`);

      const response = await router.handle(request, env, ctx);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.email).toBe(user.email);
      expect(response.headers.get('Set-Cookie')).toBe(`auth_token=${token}`);
      expect(authService.register).toHaveBeenCalledTimes(1);
      expect(jwt.signToken).toHaveBeenCalledTimes(1);
    });

    it('should handle registration failure', async () => {
      const request = {
        method: 'POST',
        url: 'https://test.com/auth/register',
        headers: {
          get: (key) => key.toLowerCase() === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({
          email: 'test@example.com',
          password: 'password123',
        }),
      };
      const env = { DB: {} };
      const ctx = {};

      authService.register.mockImplementation(() => { throw new Error('Registration failed'); });

      const response = await router.handle(request, env, ctx);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('Registration failed');
      expect(authService.register).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /auth/login', () => {
    it('should login a user and return an auth cookie', async () => {
      const request = {
        method: 'POST',
        url: 'https://test.com/auth/login',
        headers: {
          get: (key) => key.toLowerCase() === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({
          email: 'test@example.com',
          password: 'password123',
        }),
      };
      const env = { DB: {} };
      const ctx = {};

      const user = { id: 1, email: 'test@example.com' };
      const token = 'mock-jwt-token';

      authService.login.mockResolvedValue(user);
      jwt.signToken.mockResolvedValue(token);
      cookie.setAuthCookie.mockReturnValue(`auth_token=${token}`);

      const response = await router.handle(request, env, ctx);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.email).toBe(user.email);
      expect(response.headers.get('Set-Cookie')).toBe(`auth_token=${token}`);
      expect(authService.login).toHaveBeenCalledTimes(1);
      expect(jwt.signToken).toHaveBeenCalledTimes(1);
    });

    it('should handle login failure', async () => {
      const request = {
        method: 'POST',
        url: 'https://test.com/auth/login',
        headers: {
          get: (key) => key.toLowerCase() === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({
          email: 'test@example.com',
          password: 'wrong-password',
        }),
      };
      const env = { DB: {} };
      const ctx = {};

      authService.login.mockImplementation(() => { throw new Error('Login failed'); });

      const response = await router.handle(request, env, ctx);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error).toBe('Login failed');
      expect(authService.login).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout a user and clear the auth cookie', async () => {
      const request = {
        method: 'POST',
        url: 'https://test.com/auth/logout',
        headers: {
          get: (key) => key.toLowerCase() === 'cookie' ? 'auth_token=some-token' : null,
        },
      };
      const env = { DB: {} };
      const ctx = {};

      cookie.clearAuthCookie.mockReturnValue('auth_token=; Max-Age=0; Path=/');

      const response = await router.handle(request, env, ctx);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(response.headers.get('Set-Cookie')).toBe('auth_token=; Max-Age=0; Path=/');
      expect(cookie.clearAuthCookie).toHaveBeenCalledTimes(1);
    });
  });

  describe('CORS Preflight', () => {
    it('should handle CORS preflight requests', async () => {
      const request = {
        method: 'OPTIONS',
        url: 'https://test.com/some/path',
        headers: {
          get: (key) => {
            if (key === 'Origin') return 'https://example.com';
            if (key === 'Access-Control-Request-Method') return 'POST';
            if (key === 'Access-Control-Request-Headers') return 'Content-Type, Authorization';
            return null;
          },
          'Origin': 'https://example.com',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type, Authorization',
        },
      };
      const env = {};
      const ctx = {};

      const response = await router.handle(request, env, ctx);

      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, PATCH, DELETE, OPTIONS');
      expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type, Authorization');
      expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true');
    });
  });

  describe('Fallback', () => {
    it('should return a 404 for an unknown route', async () => {
      const request = {
        method: 'GET',
        url: 'https://test.com/unknown',
        headers: {
          get: () => null
        }
      };
      const env = {};
      const ctx = {};

      const response = await router.handle(request, env, ctx);
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error).toBe('Route not found');
    });
  });
});
