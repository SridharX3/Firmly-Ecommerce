import * as chai from 'chai';
import { json, preflight, corsHeaders } from '../src/response.js';

const { expect } = chai;

describe('Response Helper', () => {
  describe('corsHeaders', () => {
    it('should return default cors headers', () => {
      const headers = corsHeaders({});
      expect(headers['Access-Control-Allow-Origin']).to.equal('*');
    });

    it('should reflect origin', () => {
      const req = { headers: { get: () => 'http://example.com' } };
      const headers = corsHeaders(req);
      expect(headers['Access-Control-Allow-Origin']).to.equal('http://example.com');
    });
  });

  describe('json', () => {
    it('should return a JSON response', async () => {
      const res = json({ a: 1 }, 201);
      expect(res.status).to.equal(201);
      expect(res.headers.get('Content-Type')).to.equal('application/json');
      const body = await res.json();
      expect(body).to.deep.equal({ a: 1 });
    });
  });

  describe('preflight', () => {
    it('should return 204', () => {
      const res = preflight({});
      expect(res.status).to.equal(204);
    });
  });
});