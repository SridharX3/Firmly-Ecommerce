import { expect } from 'chai';
import { signToken, verifyToken } from '../../src/utils/jwt.js';

// Ensure crypto is available in the test environment (Node 19+ has it globally)
if (!global.crypto) {
  global.crypto = require('crypto').webcrypto;
}

describe('JWT Utils', () => {
  const secret = 'test-secret-key-123';
  const payload = { user_id: 123, email: 'test@example.com', role: 'user' };

  it('should sign and verify a token successfully', async () => {
    const token = await signToken(payload, secret);
    expect(token).to.be.a('string');
    expect(token.split('.')).to.have.lengthOf(3);

    const decoded = await verifyToken(token, secret);
    expect(decoded).to.deep.include(payload);
  });

  it('should throw an error if secret is missing during signing', async () => {
    try {
      await signToken(payload, '');
      throw new Error('Should have failed');
    } catch (err) {
      expect(err.message).to.equal('JWT_SECRET is missing');
    }
  });

  it('should throw an error if secret is missing during verification', async () => {
    try {
      await verifyToken('some.token.here', '');
      throw new Error('Should have failed');
    } catch (err) {
      expect(err.message).to.equal('JWT_SECRET is missing');
    }
  });

  it('should throw an error for an invalid signature', async () => {
    const token = await signToken(payload, secret);
    try {
      await verifyToken(token, 'wrong-secret');
      throw new Error('Should have failed');
    } catch (err) {
      expect(err.message).to.equal('Invalid signature');
    }
  });
});