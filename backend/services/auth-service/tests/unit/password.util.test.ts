/**
 * @file tests/unit/password.util.test.ts
 * @description Unit tests for Argon2 password hashing utilities.
 */

import { hashPassword, verifyPassword, needsRehash } from '../../src/utils/password.util';

describe('Password Utility (Argon2)', () => {
  const testPassword = 'MySecureP@ssw0rd!';

  describe('hashPassword', () => {
    it('should return an Argon2id hash string', async () => {
      const hash = await hashPassword(testPassword);

      expect(typeof hash).toBe('string');
      expect(hash).toMatch(/^\$argon2id\$/); // Argon2id prefix
      expect(hash.length).toBeGreaterThan(50);
    });

    it('should produce different hashes for the same password (salted)', async () => {
      const hash1 = await hashPassword(testPassword);
      const hash2 = await hashPassword(testPassword);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('should return true for correct password', async () => {
      const hash = await hashPassword(testPassword);
      const isValid = await verifyPassword(hash, testPassword);

      expect(isValid).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const hash = await hashPassword(testPassword);
      const isValid = await verifyPassword(hash, 'WrongPassword123!');

      expect(isValid).toBe(false);
    });

    it('should return false for invalid hash format', async () => {
      const isValid = await verifyPassword('not-a-valid-hash', testPassword);

      expect(isValid).toBe(false);
    });

    it('should return false for empty password', async () => {
      const hash = await hashPassword(testPassword);
      const isValid = await verifyPassword(hash, '');

      expect(isValid).toBe(false);
    });
  });

  describe('needsRehash', () => {
    it('should return false for a freshly hashed password', async () => {
      const hash = await hashPassword(testPassword);
      const shouldRehash = needsRehash(hash);

      expect(shouldRehash).toBe(false);
    });
  });
});
