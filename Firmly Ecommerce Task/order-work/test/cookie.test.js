import * as chai from 'chai';
import { getCookie, setSessionCookie } from '../src/utils/cookie.js';

const { expect } = chai;

describe('Utils: Cookie', () => {
  describe('getCookie', () => {
    it('should return null if no cookie header', () => {
      const req = { headers: { get: () => null } };
      expect(getCookie(req, 'id')).to.be.null;
    });

    it('should return null if cookie not found', () => {
      const req = { headers: { get: () => 'foo=bar; baz=qux' } };
      expect(getCookie(req, 'id')).to.be.null;
    });

    it('should return cookie value', () => {
      const req = { headers: { get: () => 'foo=bar; id=123; baz=qux' } };
      expect(getCookie(req, 'id')).to.equal('123');
    });
    
    it('should decode cookie value', () => {
      const req = { headers: { get: () => 'id=123%20456' } };
      expect(getCookie(req, 'id')).to.equal('123 456');
    });
  });

  describe('setSessionCookie', () => {
    it('should return formatted cookie string', () => {
      const cookie = setSessionCookie('abc');
      expect(cookie).to.include('session_id=abc');
      expect(cookie).to.include('HttpOnly');
      expect(cookie).to.include('Secure');
    });
  });
});