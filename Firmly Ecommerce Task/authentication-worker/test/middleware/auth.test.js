
import { expect } from 'chai';
import sinon from 'sinon';
import { requireAuth } from '../../src/middleware/auth.js';
import { jest } from '@jest/globals';

// Mock the otel module
jest.mock('../../src/observability/otel.js', () => ({
  withSpan: jest.fn().callsFake((ctx, name, options, fn) => fn(options)),
}));
import * as otel from '../../src/observability/otel.js';

// Mock the jwt module
jest.mock('../../src/utils/jwt.js', () => ({
  verifyToken: jest.fn()
}));
import { verifyToken } from '../../src/utils/jwt.js';

describe('Auth Middleware', () => {
  let request;
  let env;
  let ctx;
  let headers;

  beforeEach(() => {
    headers = new Map();
    request = {
      headers: {
        get: (key) => headers.get(key),
      },
      user: null,
    };
    env = {
      JWT_SECRET: 'test-secret'
    };
    ctx = {};
  });

  afterEach(() => {
    sinon.restore();
    jest.clearAllMocks();
  });

  it('should return 401 if auth_token cookie is missing', async () => {
    const response = await requireAuth(request, env, ctx);
    const body = await response.json();
    expect(response.status).to.equal(401);
    expect(body.error).to.equal('Authentication required');
  });

  it('should return 500 if JWT_SECRET is not available', async () => {
    headers.set('Cookie', 'auth_token=some-token');
    env.JWT_SECRET = null;
    const response = await requireAuth(request, env, ctx);
    const body = await response.json();
    expect(response.status).to.equal(500);
    expect(body.error).to.equal('Internal server error: Configuration missing');
  });

  it('should return 401 if token verification fails', async () => {
    headers.set('Cookie', 'auth_token=invalid-token');
    verifyToken.mockRejectedValue(new Error('Invalid token'));
    
    const response = await requireAuth(request, env, ctx);
    const body = await response.json();
    expect(response.status).to.equal(401);
    expect(body.error).to.equal('Invalid or expired token');
  });

  it('should set request.user and return null on successful authentication', async () => {
    headers.set('Cookie', 'auth_token=valid-token');
    const payload = { user_id: 123, role: 'user' };
    verifyToken.mockResolvedValue(payload);

    const result = await requireAuth(request, env, ctx);
    expect(result).to.be.null;
    expect(request.user).to.deep.equal(payload);
    expect(verifyToken).toHaveBeenCalledWith('valid-token', 'test-secret');
  });
});
