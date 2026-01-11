
import { expect } from 'chai';
import sinon from 'sinon';
import { requireAuth } from '../../src/middleware/auth.js';
import { jest } from '@jest/globals';

// Mock the otel module
jest.mock('../../src/observability/otel.js', () => ({
  withSpan: jest.fn().callsFake((ctx, name, options, fn) => fn(options)),
}));
import * as otel from '../../src/observability/otel.js';

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
      SESSION_KV: {
        get: sinon.stub(),
      },
    };
    ctx = {};
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should return 401 if session_id cookie is missing', async () => {
    const response = await requireAuth(request, env, ctx);
    const body = await response.json();
    expect(response.status).to.equal(401);
    expect(body.error).to.equal('Authentication required');
  });

  it('should return 500 if SESSION_KV is not available', async () => {
    headers.set('Cookie', 'session_id=some-session-id');
    env.SESSION_KV = null;
    const response = await requireAuth(request, env, ctx);
    const body = await response.json();
    expect(response.status).to.equal(500);
    expect(body.error).to.equal('Internal server error: Session store unavailable');
  });

  it('should return 401 if session is not found in KV', async () => {
    headers.set('Cookie', 'session_id=some-session-id');
    env.SESSION_KV.get.resolves(null);
    const response = await requireAuth(request, env, ctx);
    const body = await response.json();
    expect(response.status).to.equal(401);
    expect(body.error).to.equal('Invalid or expired session');
  });

  it('should return 401 if session is found but has no user_id', async () => {
    headers.set('Cookie', 'session_id=some-session-id');
    env.SESSION_KV.get.resolves({ some_other_data: 'data' });
    const response = await requireAuth(request, env, ctx);
    const body = await response.json();
    expect(response.status).to.equal(401);
    expect(body.error).to.equal('Invalid or expired session');
  });

  it('should set request.user and return null on successful authentication', async () => {
    headers.set('Cookie', 'session_id=some-session-id');
    const session = { user_id: 123 };
    env.SESSION_KV.get.resolves(session);
    const result = await requireAuth(request, env, ctx);
    expect(result).to.be.null;
    expect(request.user).to.deep.equal(session);
  });

  it('should return 500 if there is an error reading from KV', async () => {
    headers.set('Cookie', 'session_id=some-session-id');
    env.SESSION_KV.get.throws(new Error('KV read error'));
    const response = await requireAuth(request, env, ctx);
    const body = await response.json();
    expect(response.status).to.equal(500);
    expect(body.error).to.equal('Failed to retrieve session');
  });
});
