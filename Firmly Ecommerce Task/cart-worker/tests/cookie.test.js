import { expect } from 'chai';
import { getCookie } from '../src/utils/cookie.js';

describe('Utils: Cookie', () => {
  const createReq = (cookieString) => ({
    headers: {
      get: (name) => (name === 'Cookie' ? cookieString : null),
    },
  });

  it('should return null if no cookie header exists', () => {
    const req = { headers: { get: () => null } };
    expect(getCookie(req, 'session_id')).to.be.null;
  });

  it('should return null if cookie name is not found', () => {
    const req = createReq('foo=bar; baz=qux');
    expect(getCookie(req, 'session_id')).to.be.null;
  });

  it('should return the value of the cookie', () => {
    const req = createReq('session_id=12345');
    expect(getCookie(req, 'session_id')).to.equal('12345');
  });

  it('should handle multiple cookies', () => {
    const req = createReq('theme=dark; session_id=abc-123; lang=en');
    expect(getCookie(req, 'session_id')).to.equal('abc-123');
  });

  it('should decode URI components', () => {
    const req = createReq('user=John%20Doe');
    expect(getCookie(req, 'user')).to.equal('John Doe');
  });
});