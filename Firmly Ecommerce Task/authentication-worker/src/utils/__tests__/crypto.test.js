
import { generateUUID, hashPassword, verifyPassword } from '../crypto';

describe('crypto', () => {
  describe('generateUUID', () => {
    it('should generate a valid UUID', () => {
      const uuid = generateUUID();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(uuid).toMatch(uuidRegex);
    });
  });

  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'password123';
      const hashedPassword = await hashPassword(password);
      expect(hashedPassword).toBeDefined();
      expect(typeof hashedPassword).toBe('string');
      expect(hashedPassword.length).toBe(64);
    });

    it('should throw an error if password is not a string', async () => {
      await expect(hashPassword(123)).rejects.toThrow('Password must be a string');
    });
  });

  describe('verifyPassword', () => {
    it('should return true for a correct password', async () => {
      const password = 'password123';
      const hashedPassword = await hashPassword(password);
      const result = await verifyPassword(password, hashedPassword);
      expect(result).toBe(true);
    });

    it('should return false for an incorrect password', async () => {
      const password = 'password123';
      const hashedPassword = await hashPassword(password);
      const result = await verifyPassword('wrongpassword', hashedPassword);
      expect(result).toBe(false);
    });
  });
});
