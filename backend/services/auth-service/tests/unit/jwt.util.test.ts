/**
 * @file tests/unit/jwt.util.test.ts
 * @description Unit tests for JWT utility functions.
 */

// ─── Mock config BEFORE imports ─────────────────────────────

jest.mock('../../src/config', () => ({
  config: {
    jwt: {
      accessSecret: 'test-access-secret-long-enough-1234',
      refreshSecret: 'test-refresh-secret-long-enough-1234',
      accessExpiresIn: '15m',
      refreshExpiresIn: '7d',
    },
  },
}));

import {
  signAccessToken,
  verifyAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  generateTokenPair,
  getTokenRemainingTTL,
  TokenPayload,
} from '../../src/utils/jwt.util';

// ─── Test Data ──────────────────────────────────────────────

const testPayload: TokenPayload = {
  userId: '550e8400-e29b-41d4-a716-446655440000',
  email: 'test@example.com',
  role: 'RENTER',
};

// ─── Tests ──────────────────────────────────────────────────

describe('JWT Utility', () => {
  describe('signAccessToken', () => {
    it('should return a signed JWT string', () => {
      const token = signAccessToken(testPayload);
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });
  });

  describe('verifyAccessToken', () => {
    it('should decode a valid access token', () => {
      const token = signAccessToken(testPayload);
      const decoded = verifyAccessToken(token);

      expect(decoded.userId).toBe(testPayload.userId);
      expect(decoded.email).toBe(testPayload.email);
      expect(decoded.role).toBe(testPayload.role);
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });

    it('should throw for an invalid token', () => {
      expect(() => verifyAccessToken('invalid.token.string')).toThrow();
    });

    it('should throw for a token signed with wrong secret', () => {
      const token = signRefreshToken(testPayload); // Different secret
      expect(() => verifyAccessToken(token)).toThrow();
    });
  });

  describe('signRefreshToken', () => {
    it('should return a signed JWT string', () => {
      const token = signRefreshToken(testPayload);
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });
  });

  describe('verifyRefreshToken', () => {
    it('should decode a valid refresh token', () => {
      const token = signRefreshToken(testPayload);
      const decoded = verifyRefreshToken(token);

      expect(decoded.userId).toBe(testPayload.userId);
      expect(decoded.email).toBe(testPayload.email);
      expect(decoded.role).toBe(testPayload.role);
    });

    it('should throw for access token (wrong secret)', () => {
      const token = signAccessToken(testPayload);
      expect(() => verifyRefreshToken(token)).toThrow();
    });
  });

  describe('generateTokenPair', () => {
    it('should return both access and refresh tokens', () => {
      const { accessToken, refreshToken } = generateTokenPair(testPayload);

      expect(typeof accessToken).toBe('string');
      expect(typeof refreshToken).toBe('string');
      expect(accessToken).not.toBe(refreshToken);
    });

    it('should produce verifiable tokens', () => {
      const { accessToken, refreshToken } = generateTokenPair(testPayload);

      const decodedAccess = verifyAccessToken(accessToken);
      const decodedRefresh = verifyRefreshToken(refreshToken);

      expect(decodedAccess.userId).toBe(testPayload.userId);
      expect(decodedRefresh.userId).toBe(testPayload.userId);
    });
  });

  describe('getTokenRemainingTTL', () => {
    it('should return a positive number for a valid token', () => {
      const token = signAccessToken(testPayload);
      const ttl = getTokenRemainingTTL(token);

      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(15 * 60); // ≤ 15 minutes
    });

    it('should return 0 for an invalid token', () => {
      const ttl = getTokenRemainingTTL('not-a-jwt');
      expect(ttl).toBe(0);
    });
  });
});
