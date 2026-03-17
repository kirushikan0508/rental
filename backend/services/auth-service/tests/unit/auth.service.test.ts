/**
 * @file tests/unit/auth.service.test.ts
 * @description Unit tests for the core authentication service.
 * Mocks Prisma, Redis, and external services.
 */

// ─── Mock Setup ─────────────────────────────────────────────

// Mock config
jest.mock('../../src/config', () => ({
  config: {
    nodeEnv: 'test',
    isProduction: false,
    jwt: {
      accessSecret: 'test-access-secret-long-enough-1234',
      refreshSecret: 'test-refresh-secret-long-enough-1234',
      accessExpiresIn: '15m',
      refreshExpiresIn: '7d',
    },
    otp: { length: 6, expirySeconds: 300 },
    rateLimit: { maxLoginAttempts: 5, loginLockoutSeconds: 900 },
    logLevel: 'error',
  },
}));

// Mock logger (silence test output)
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    http: jest.fn(),
  },
}));

// Mock Redis utilities
jest.mock('../../src/utils/redis.util', () => ({
  storeRefreshToken: jest.fn().mockResolvedValue(undefined),
  getRefreshToken: jest.fn().mockResolvedValue(null),
  deleteRefreshToken: jest.fn().mockResolvedValue(undefined),
  blacklistToken: jest.fn().mockResolvedValue(undefined),
  incrementLoginAttempts: jest.fn().mockResolvedValue(1),
  getLoginAttempts: jest.fn().mockResolvedValue(0),
  resetLoginAttempts: jest.fn().mockResolvedValue(undefined),
}));

// Mock email service
jest.mock('../../src/services/email.service', () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
  sendOtpEmail: jest.fn().mockResolvedValue(undefined),
}));

// Mock Google service
jest.mock('../../src/services/google.service', () => ({
  verifyGoogleToken: jest.fn().mockResolvedValue(null),
}));

// Mock OTP service
jest.mock('../../src/services/otp.service', () => ({
  requestOtp: jest.fn().mockResolvedValue(undefined),
  verifyOtp: jest.fn().mockResolvedValue(true),
  OtpError: class OtpError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'OtpError';
    }
  },
}));

// Mock Prisma
const mockPrismaUser = {
  findFirst: jest.fn(),
  findUnique: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
};

jest.mock('@prisma/client', () => {
  const actual = jest.requireActual('@prisma/client');
  return {
    ...actual,
    PrismaClient: jest.fn().mockImplementation(() => ({
      user: mockPrismaUser,
      $disconnect: jest.fn(),
    })),
  };
});

// ─── Imports (AFTER mocks) ──────────────────────────────────

import {
  registerWithEmail,
  loginWithEmail,
  logout,
  AuthError,
} from '../../src/services/auth.service';
import { storeRefreshToken, getLoginAttempts, resetLoginAttempts, incrementLoginAttempts } from '../../src/utils/redis.util';

// ─── Test Data ──────────────────────────────────────────────

const testUser = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  phone: '+94771234567',
  passwordHash: '', // Will be set in beforeEach
  role: 'RENTER',
  authProvider: 'EMAIL',
  googleId: null,
  avatar: null,
  isEmailVerified: false,
  isPhoneVerified: false,
  isActive: true,
  isSuspended: false,
  suspendedReason: null,
  emergencyContactName: null,
  emergencyContactPhone: null,
  fcmToken: null,
  preferredLanguage: 'en',
  darkMode: false,
  lastLoginAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ─── Tests ──────────────────────────────────────────────────

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ═════════════════════════════════════════════════════════
  // REGISTER
  // ═════════════════════════════════════════════════════════

  describe('registerWithEmail', () => {
    it('should create a new user and return tokens', async () => {
      mockPrismaUser.findFirst.mockResolvedValue(null); // No existing user
      mockPrismaUser.create.mockResolvedValue(testUser);

      const result = await registerWithEmail({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+94771234567',
        password: 'SecureP@ss1',
      });

      expect(result.user.email).toBe('john@example.com');
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
      expect(storeRefreshToken).toHaveBeenCalledWith(testUser.id, expect.any(String));
    });

    it('should throw 409 if email already exists', async () => {
      mockPrismaUser.findFirst.mockResolvedValue(testUser);

      await expect(
        registerWithEmail({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '+94771234567',
          password: 'SecureP@ss1',
        }),
      ).rejects.toThrow(AuthError);

      try {
        await registerWithEmail({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '+94771234567',
          password: 'SecureP@ss1',
        });
      } catch (error) {
        expect(error).toBeInstanceOf(AuthError);
        expect((error as AuthError).statusCode).toBe(409);
      }
    });
  });

  // ═════════════════════════════════════════════════════════
  // LOGIN
  // ═════════════════════════════════════════════════════════

  describe('loginWithEmail', () => {
    it('should throw 401 for non-existent email', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(null);
      (getLoginAttempts as jest.Mock).mockResolvedValue(0);

      await expect(
        loginWithEmail('nobody@example.com', 'password', '127.0.0.1'),
      ).rejects.toThrow(AuthError);

      expect(incrementLoginAttempts).toHaveBeenCalledWith('127.0.0.1');
    });

    it('should throw 429 when rate limited', async () => {
      (getLoginAttempts as jest.Mock).mockResolvedValue(5);

      await expect(
        loginWithEmail('john@example.com', 'password', '127.0.0.1'),
      ).rejects.toThrow(AuthError);

      try {
        await loginWithEmail('john@example.com', 'password', '127.0.0.1');
      } catch (error) {
        expect((error as AuthError).statusCode).toBe(429);
      }
    });

    it('should throw 403 for suspended accounts', async () => {
      const suspendedUser = { ...testUser, isSuspended: true, suspendedReason: 'Fraud' };
      // Need a valid password hash
      const { hashPassword } = jest.requireActual('../../src/utils/password.util');
      suspendedUser.passwordHash = await hashPassword('SecureP@ss1');
      mockPrismaUser.findUnique.mockResolvedValue(suspendedUser);
      (getLoginAttempts as jest.Mock).mockResolvedValue(0);

      await expect(
        loginWithEmail('john@example.com', 'SecureP@ss1', '127.0.0.1'),
      ).rejects.toThrow(AuthError);

      try {
        await loginWithEmail('john@example.com', 'SecureP@ss1', '127.0.0.1');
      } catch (error) {
        expect((error as AuthError).statusCode).toBe(403);
      }
    });
  });

  // ═════════════════════════════════════════════════════════
  // LOGOUT
  // ═════════════════════════════════════════════════════════

  describe('logout', () => {
    it('should blacklist the access token and delete the refresh token', async () => {
      const { signAccessToken } = jest.requireActual('../../src/utils/jwt.util');
      const accessToken = signAccessToken({
        userId: testUser.id,
        email: testUser.email,
        role: testUser.role,
      });

      await logout(testUser.id, accessToken);

      const { blacklistToken, deleteRefreshToken } = require('../../src/utils/redis.util');
      expect(blacklistToken).toHaveBeenCalled();
      expect(deleteRefreshToken).toHaveBeenCalledWith(testUser.id);
    });
  });
});
