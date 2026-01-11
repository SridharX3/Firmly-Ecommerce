import { expect } from 'chai';
import { json, preflight, corsHeaders } from '../src/response.js';

describe('Response Helper', () => {
  const mockReq = {
    headers: {
      get: (name) => (name === 'Origin' ? 'https://test.com' : null),
    },
  };

  describe('corsHeaders', () => {
    it('should return CORS headers with specific origin', () => {
      const headers = corsHeaders(mockReq);
      expect(headers['Access-Control-Allow-Origin']).to.equal('https://test.com');
    });

    it('should default origin to *', () => {
      const headers = corsHeaders({});
      expect(headers['Access-Control-Allow-Origin']).to.equal('*');
    });
  });

  describe('json', () => {
    it('should return a Response with JSON body', async () => {
      const res = json({ foo: 'bar' }, 201, mockReq);
      expect(res.status).to.equal(201);
      const body = await res.json();
      expect(body.foo).to.equal('bar');
      expect(res.headers.get('Content-Type')).to.equal('application/json');
    });

    it('should handle Error objects', async () => {
      const res = json(new Error('Test Error'), 400);
      const body = await res.json();
      expect(body.error).to.equal('Test Error');
    });

    it('should handle null body', async () => {
      const res = json(null, 500, mockReq);
      const body = await res.json();
      expect(body.error).to.equal('Invalid response payload');
    });
  });

  describe('preflight', () => {
    it('should return 204 status', () => {
      const res = preflight(mockReq);
      expect(res.status).to.equal(204);
    });
  });
});