
import { expect } from 'chai';
import { json } from '../src/response.js';

describe('Response Util', () => {
  it('should return a 200 response with JSON content type by default', async () => {
    const response = json({ message: 'hello' });
    const body = await response.json();
    expect(response.status).to.equal(200);
    expect(response.headers.get('Content-Type')).to.equal('application/json');
    expect(body.message).to.equal('hello');
  });

  it('should allow setting a custom status code', async () => {
    const response = json({ error: 'not found' }, 404);
    const body = await response.json();
    expect(response.status).to.equal(404);
    expect(body.error).to.equal('not found');
  });

  it('should handle Error objects in the body', async () => {
    const response = json(new Error('something went wrong'), 500);
    const body = await response.json();
    expect(response.status).to.equal(500);
    expect(body.error).to.equal('something went wrong');
  });

  it('should handle string bodies', async () => {
    const response = json('just a string');
    const body = await response.json();
    expect(body.data).to.equal('just a string');
  });

  it('should include extra headers', () => {
    const response = json({}, 200, null, { 'X-My-Header': 'my-value' });
    expect(response.headers.get('X-My-Header')).to.equal('my-value');
  });

  it('should set CORS headers correctly', () => {
    const request = {
      headers: new Map([['Origin', 'https://my-test-origin.com']]),
    };
    const response = json({}, 200, request);
    expect(response.headers.get('Access-Control-Allow-Origin')).to.equal('https://my-test-origin.com');
    expect(response.headers.get('Access-Control-Allow-Credentials')).to.equal('true');
  });

  it('should fallback to "*" for Access-Control-Allow-Origin if Origin is not in request', () => {
    const response = json({}, 200, null);
    expect(response.headers.get('Access-Control-Allow-Origin')).to.equal('*');
  });
});
