
import { expect } from 'chai';
import sinon from 'sinon';
import { attachSession } from '../../src/middleware/session.js';
import otel from '../../src/observability/otel.js';

describe('Session Middleware', () => {
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
      session: undefined, // Initially undefined
    };
    env = {
      SESSION_KV: {
        get: sinon.stub(),
      },
    };
    ctx = {};
    sinon.stub(otel, 'withSpan').callsFake((ctx, name, options, fn) => fn(options));
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should set request.session to null if session_id cookie is missing', async () => {
    const result = await attachSession(request, env, ctx);
    expect(result).to.be.null;
    expect(request.session).to.be.null;
  });

  it('should set request.session to null if SESSION_KV is not available', async () => {
    headers.set('Cookie', 'session_id=some-session-id');
    env.SESSION_KV = null;
    const result = await attachSession(request, env, ctx);
    expect(result).to.be.null;
    expect(request.session).to.be.null;
  });

  it('should set request.session to null if session is not found in KV', async () => {
    headers.set('Cookie', 'session_id=some-session-id');
    env.SESSION_KV.get.resolves(null);
    const result = await attachSession(request, env, ctx);
    expect(result).to.be.null;
    expect(request.session).to.be.null;
  });

  it('should attach the session to the request on successful retrieval', async () => {
    headers.set('Cookie', 'session_id=some-session-id');
    const session = { user_id: 123 };
    env.SESSION_KV.get.resolves(session);
    const result = await attachSession(request, env, ctx);
    expect(result).to.be.null;
    expect(request.session).to.deep.equal(session);
  });

  it('should set request.session to null if there is an error reading from KV', async () => {
    headers.set('Cookie', 'session_id=some-session-id');
    env.SESSION_KV.get.throws(new Error('KV read error'));
    const result = await attachSession(request, env, ctx);
    expect(result).to.be.null;
    expect(request.session).to.be.null;
  });
});
