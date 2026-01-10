
import { expect } from 'chai';
import crypto from '../../src/utils/crypto.js';

describe('Crypto Utils', () => {
  describe('generateUUID', () => {
    it('should generate a valid UUID', () => {
      const uuid = crypto.generateUUID();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(uuid).to.match(uuidRegex);
    });
  });

  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'password123';
      const hashedPassword = await crypto.hashPasswordpassword);
      expect(hashedPassword).to.be.a('string');
      expect(hashedPassword).to.have.lengthOf(64);
    });

    it('should throw an error if password is not a string', async () => {
      try {
        await crypto.hashPassword123);
        expect.fail('should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Password must be a string');
      }
    });
  });

  describe('verifyPassword', () => {
    it('should return true for a correct password', async () => {
      const password = 'password123';
      const hashedPassword = await crypto.hashPasswordpassword);
      const result = await crypto.verifyPassword(password, hashedPassword);
      expect(result).to.be.true;
    });

    it('should return false for an incorrect password', async () => {
      const password = 'password123';
      const hashedPassword = await crypto.hashPasswordpassword);
      const result = await crypto.verifyPassword('wrongpassword', hashedPassword);
      expect(result).to.be.false;
    });
  });
});
