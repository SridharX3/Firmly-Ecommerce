
import { expect } from 'chai';
import { getCookie, setSessionCookie, clearSessionCookie } from '../../src/utils/cookie.js';

describe('Cookie Utils', () => {
  describe('getCookie', () => {
    it('should return null if Cookie header is not present', () => {
      const request = { headers: new Map() };
      const cookie = getCookie(request, 'my_cookie');
      expect(cookie).to.be.null;
    });

    it('should return null if the named cookie is not found', () => {
      const request = { headers: new Map([['Cookie', 'other_cookie=value']]) };
      const cookie = getCookie(request, 'my_cookie');
      expect(cookie).to.be.null;
    });

    it('should return the cookie value if the named cookie is found', () => {
      const request = { headers: new Map([['Cookie', 'my_cookie=my_value; other_cookie=other_value']]) };
      const cookie = getCookie(request, 'my_cookie');
      expect(cookie).to.equal('my_value');
    });

    it('should handle cookies with no value', () => {
      const request = { headers: new Map([['Cookie', 'my_cookie=; other_cookie=other_value']]) };
      const cookie = getCookie(request, 'my_cookie');
      expect(cookie).to.be.null;
    });

    it('should handle URI encoded cookie values', () => {
        const encodedValue = encodeURIComponent('value with spaces');
        const request = { headers: new Map([['Cookie', `my_cookie=${encodedValue}`]]) };
        const cookie = getCookie(request, 'my_cookie');
        expect(cookie).to.equal('value with spaces');
      });
  });

  describe('setSessionCookie', () => {
    it('should throw an error if sessionId is missing', () => {
      expect(() => setSessionCookie(null)).to.throw('Cannot set session cookie: sessionId is missing');
    });

    it('should return a correctly formatted session cookie string', () => {
      const sessionId = 'test-session-id';
      const cookie = setSessionCookie(sessionId);
      const parts = cookie.split('; ').sort();
      const expectedParts = [
        `session_id=${encodeURIComponent(sessionId)}`,
        'Path=/',
        'HttpOnly',
        'Secure',
        'SameSite=None',
        'Domain=.sridhar-89c.workers.dev'
      ].sort();
      
      expect(parts).to.deep.equal(expectedParts);
    });
  });

  describe('clearSessionCookie', () => {
    it('should return a correctly formatted clear cookie string', () => {
      const cookie = clearSessionCookie();
      const parts = cookie.split('; ').sort();
      const expectedParts = [
        'session_id=',
        'Path=/',
        'HttpOnly',
        'Secure',
        'SameSite=None',
        'Max-Age=0'
      ].sort();
      
      expect(parts).to.deep.equal(expectedParts);
    });
  });
});
