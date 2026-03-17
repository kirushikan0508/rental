/**
 * @file services/auth.service.ts
 * @description Core authentication business logic — register, login,
 * token refresh, logout. Orchestrates Prisma, Redis, JWT, Argon2,
 * Google OAuth, and OTP services.
 */

import { PrismaClient, UserRole, AuthProvider, User } from '@prisma/client';
import { hashPassword, verifyPassword, needsRehash } from '../utils/password.util';
import { generateTokenPair, verifyRefreshToken, getTokenRemainingTTL, TokenPayload } from '../utils/jwt.util';
import {
  storeRefreshToken,
  getRefreshToken,
  deleteRefreshToken,
  blacklistToken,
  incrementLoginAttempts,
  getLoginAttempts,
  resetLoginAttempts,
} from '../utils/redis.util';
import { verifyGoogleToken } from './google.service';
import { requestOtp, verifyOtp } from './otp.service';
import { sendWelcomeEmail } from './email.service';
import { config } from '../config';
import { logger } from '../utils/logger';

// ─── Prisma Client Singleton ────────────────────────────────

const prisma = new PrismaClient({
  log: config.isProduction ? ['error'] : ['query', 'info', 'warn', 'error'],
});

// ─── Custom Errors ──────────────────────────────────────────

export class AuthError extends Error {
  public statusCode: number;
  public code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

// ─── Response Interfaces ────────────────────────────────────

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthResponse {
  user: SafeUser;
  tokens: AuthTokens;
}

/** User object stripped of sensitive fields */
interface SafeUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: UserRole;
  authProvider: AuthProvider;
  avatar: string | null;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isActive: boolean;
  preferredLanguage: string;
  darkMode: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

// ─── Helpers ────────────────────────────────────────────────

/**
 * Strips sensitive fields (passwordHash) from a User record.
 */
function toSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    authProvider: user.authProvider,
    avatar: user.avatar,
    isEmailVerified: user.isEmailVerified,
    isPhoneVerified: user.isPhoneVerified,
    isActive: user.isActive,
    preferredLanguage: user.preferredLanguage,
    darkMode: user.darkMode,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
}

/**
 * Builds a JWT payload from a User record.
 */
function buildTokenPayload(user: User): TokenPayload {
  return {
    userId: user.id,
    email: user.email,
    role: user.role,
  };
}

/**
 * Generates a token pair and stores the refresh token in Redis.
 */
async function issueTokens(user: User): Promise<AuthTokens> {
  const payload = buildTokenPayload(user);
  const tokens = generateTokenPair(payload);
  await storeRefreshToken(user.id, tokens.refreshToken);
  return tokens;
}

// ═══════════════════════════════════════════════════════════
// REGISTER
// ═══════════════════════════════════════════════════════════

/**
 * Registers a new user with email + password.
 *
 * @param data - Registration data (firstName, lastName, email, phone, password)
 * @returns AuthResponse with user profile and token pair
 * @throws AuthError(409) if email or phone already exists
 */
export async function registerWithEmail(data: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  role?: UserRole;
}): Promise<AuthResponse> {
  // Check for existing user by email or phone
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email: data.email.toLowerCase() }, { phone: data.phone }],
    },
  });

  if (existing) {
    const field = existing.email === data.email.toLowerCase() ? 'email' : 'phone';
    throw new AuthError(`A user with this ${field} already exists`, 409, 'CONFLICT');
  }

  // Hash the password with Argon2id
  const passwordHash = await hashPassword(data.password);

  // Create the user
  const user = await prisma.user.create({
    data: {
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      email: data.email.toLowerCase().trim(),
      phone: data.phone.trim(),
      passwordHash,
      role: data.role || UserRole.RENTER,
      authProvider: AuthProvider.EMAIL,
    },
  });

  logger.info(`👤 New user registered: ${user.email} (${user.role})`);

  // Issue tokens
  const tokens = await issueTokens(user);

  // Send welcome email (fire-and-forget)
  sendWelcomeEmail(user.email, user.firstName).catch((err) =>
    logger.error('Failed to send welcome email:', err),
  );

  return { user: toSafeUser(user), tokens };
}

/**
 * Registers or logs in a user via Google OAuth.
 *
 * @param idToken - Google ID token from the client
 * @returns AuthResponse with user profile and token pair
 * @throws AuthError(401) if Google token is invalid
 */
export async function registerOrLoginWithGoogle(idToken: string): Promise<AuthResponse> {
  const profile = await verifyGoogleToken(idToken);
  if (!profile) {
    throw new AuthError('Invalid Google ID token', 401, 'INVALID_GOOGLE_TOKEN');
  }

  // Check if user exists by googleId or email
  let user = await prisma.user.findFirst({
    where: {
      OR: [{ googleId: profile.googleId }, { email: profile.email }],
    },
  });

  if (user) {
    // Existing user — update Google ID if not set, and refresh avatar
    if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: profile.googleId,
          avatar: profile.avatar || user.avatar,
          isEmailVerified: true,
          lastLoginAt: new Date(),
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    }
    logger.info(`🔑 Google login: ${user.email}`);
  } else {
    // New user — create account
    user = await prisma.user.create({
      data: {
        firstName: profile.firstName || 'User',
        lastName: profile.lastName || '',
        email: profile.email,
        phone: '',  // Will need to be set later
        googleId: profile.googleId,
        avatar: profile.avatar,
        authProvider: AuthProvider.GOOGLE,
        isEmailVerified: profile.isEmailVerified,
        lastLoginAt: new Date(),
      },
    });
    logger.info(`👤 New Google user: ${user.email}`);

    sendWelcomeEmail(user.email, user.firstName).catch((err) =>
      logger.error('Failed to send welcome email:', err),
    );
  }

  const tokens = await issueTokens(user);
  return { user: toSafeUser(user), tokens };
}

// ═══════════════════════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════════════════════

/**
 * Authenticates a user with email + password.
 * Enforces rate limiting and updates login attempt counters.
 *
 * @param email - User's email address
 * @param password - User's plaintext password
 * @param ip - Client IP address for rate limiting
 * @returns AuthResponse with user profile and token pair
 * @throws AuthError(429) if too many failed attempts
 * @throws AuthError(401) if credentials are invalid
 * @throws AuthError(403) if account is suspended
 */
export async function loginWithEmail(
  email: string,
  password: string,
  ip: string,
): Promise<AuthResponse> {
  // Rate limiting check
  const attempts = await getLoginAttempts(ip);
  if (attempts >= config.rateLimit.maxLoginAttempts) {
    const lockoutMinutes = Math.ceil(config.rateLimit.loginLockoutSeconds / 60);
    throw new AuthError(
      `Too many failed login attempts. Please try again in ${lockoutMinutes} minutes.`,
      429,
      'RATE_LIMITED',
    );
  }

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user || !user.passwordHash) {
    await incrementLoginAttempts(ip);
    throw new AuthError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  // Check if account is suspended
  if (user.isSuspended) {
    throw new AuthError(
      `Account suspended: ${user.suspendedReason || 'Contact support'}`,
      403,
      'ACCOUNT_SUSPENDED',
    );
  }

  if (!user.isActive) {
    throw new AuthError('Account is deactivated', 403, 'ACCOUNT_DEACTIVATED');
  }

  // Verify password
  const isValid = await verifyPassword(user.passwordHash, password);
  if (!isValid) {
    await incrementLoginAttempts(ip);
    throw new AuthError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  // Reset rate limiter on successful login
  await resetLoginAttempts(ip);

  // Re-hash password if Argon2 parameters have changed
  if (needsRehash(user.passwordHash)) {
    const newHash = await hashPassword(password);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });
    logger.info(`🔄 Password rehashed for user ${user.id}`);
  }

  // Update last login timestamp
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  logger.info(`🔑 Email login: ${user.email}`);

  const tokens = await issueTokens(user);
  return { user: toSafeUser(user), tokens };
}

// ═══════════════════════════════════════════════════════════
// OTP LOGIN
// ═══════════════════════════════════════════════════════════

/**
 * Initiates OTP-based login by sending a code to the user's email or phone.
 *
 * @param identifier - Email or phone number
 * @throws AuthError(404) if no user found with this identifier
 */
export async function requestOtpLogin(identifier: string): Promise<void> {
  // Verify user exists
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: identifier.toLowerCase() },
        { phone: identifier },
      ],
    },
  });

  if (!user) {
    // Don't reveal whether the user exists — silently succeed
    logger.warn(`OTP requested for unknown identifier: ${identifier}`);
    return;
  }

  if (user.isSuspended || !user.isActive) {
    // Don't reveal account status — silently succeed
    logger.warn(`OTP requested for inactive/suspended user: ${user.id}`);
    return;
  }

  await requestOtp(identifier.includes('@') ? user.email : user.phone);
}

/**
 * Completes OTP-based login by verifying the code and issuing tokens.
 *
 * @param identifier - Email or phone number
 * @param code - OTP code entered by the user
 * @returns AuthResponse with user profile and token pair
 * @throws AuthError(401) if OTP is invalid/expired
 * @throws AuthError(404) if no user found
 */
export async function loginWithOtp(identifier: string, code: string): Promise<AuthResponse> {
  // Verify OTP
  await verifyOtp(identifier, code);

  // Find user
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: identifier.toLowerCase() },
        { phone: identifier },
      ],
    },
  });

  if (!user) {
    throw new AuthError('User not found', 404, 'USER_NOT_FOUND');
  }

  // Mark email/phone as verified
  const updateData: Record<string, boolean | Date> = { lastLoginAt: new Date() };
  if (identifier.includes('@')) {
    updateData.isEmailVerified = true;
  } else {
    updateData.isPhoneVerified = true;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: updateData,
  });

  logger.info(`🔑 OTP login: ${identifier}`);

  const tokens = await issueTokens(user);
  return { user: toSafeUser(user), tokens };
}

// ═══════════════════════════════════════════════════════════
// TOKEN REFRESH
// ═══════════════════════════════════════════════════════════

/**
 * Rotates tokens — verifies the refresh token, issues a new pair,
 * and invalidates the old refresh token.
 *
 * @param refreshToken - The current refresh token
 * @returns New token pair (access + refresh)
 * @throws AuthError(401) if refresh token is invalid/expired/revoked
 */
export async function refreshTokens(refreshToken: string): Promise<AuthTokens> {
  // Verify the refresh token signature and expiry
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw new AuthError('Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN');
  }

  // Check if the refresh token matches the one stored in Redis
  const storedToken = await getRefreshToken(decoded.userId);
  if (!storedToken || storedToken !== refreshToken) {
    // Potential token reuse — invalidate all sessions for this user
    await deleteRefreshToken(decoded.userId);
    logger.warn(`⚠️  Refresh token reuse detected for user ${decoded.userId}`);
    throw new AuthError('Refresh token has been revoked', 401, 'TOKEN_REVOKED');
  }

  // Fetch current user data (role may have changed)
  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
  });

  if (!user || !user.isActive || user.isSuspended) {
    await deleteRefreshToken(decoded.userId);
    throw new AuthError('Account is no longer active', 403, 'ACCOUNT_INACTIVE');
  }

  // Issue new token pair (rotation)
  const tokens = await issueTokens(user);
  logger.info(`🔄 Tokens rotated for user ${user.id}`);
  return tokens;
}

// ═══════════════════════════════════════════════════════════
// LOGOUT
// ═══════════════════════════════════════════════════════════

/**
 * Logs out a user by blacklisting the access token and
 * deleting the refresh token from Redis.
 *
 * @param userId - The user's ID
 * @param accessToken - The current access token to blacklist
 */
export async function logout(userId: string, accessToken: string): Promise<void> {
  // Blacklist the access token for its remaining TTL
  const ttl = getTokenRemainingTTL(accessToken);
  if (ttl > 0) {
    await blacklistToken(accessToken, ttl);
  }

  // Delete the refresh token from Redis
  await deleteRefreshToken(userId);

  logger.info(`🚪 User ${userId} logged out`);
}

// ═══════════════════════════════════════════════════════════
// GET USER PROFILE
// ═══════════════════════════════════════════════════════════

/**
 * Retrieves a user's profile by ID.
 *
 * @param userId - The user's unique identifier
 * @returns Safe user profile (no password hash)
 * @throws AuthError(404) if user not found
 */
export async function getUserProfile(userId: string): Promise<SafeUser> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AuthError('User not found', 404, 'USER_NOT_FOUND');
  }

  return toSafeUser(user);
}

// ─── Prisma Cleanup ─────────────────────────────────────────

/**
 * Gracefully disconnects the Prisma client.
 */
export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}
