/**
 * @file utils/jwt.util.ts
 * @description JWT utility functions for signing and verifying
 * access tokens and refresh tokens with different secrets and TTLs.
 */

import jwt, { SignOptions, JwtPayload } from 'jsonwebtoken';
import { config } from '../config';

// ─── Token Payload Interface ────────────────────────────────

/** Payload embedded in every JWT issued by this service */
export interface TokenPayload {
  /** User's unique identifier (UUID) */
  userId: string;
  /** User's email address */
  email: string;
  /** User's role for RBAC */
  role: string;
}

/** Decoded JWT with standard claims + custom payload */
export interface DecodedToken extends TokenPayload {
  iat: number;
  exp: number;
}

// ─── Access Token ───────────────────────────────────────────

/**
 * Signs a short-lived access token (default 15 minutes).
 *
 * @param payload - User data to embed in the token
 * @returns Signed JWT access token string
 */
export function signAccessToken(payload: TokenPayload): string {
  const options: SignOptions = {
    expiresIn: config.jwt.accessExpiresIn,
    issuer: 'rental-auth-service',
    audience: 'rental-platform',
  };
  return jwt.sign(payload, config.jwt.accessSecret, options);
}

/**
 * Verifies and decodes an access token.
 *
 * @param token - The JWT access token to verify
 * @returns Decoded token payload
 * @throws JsonWebTokenError if token is invalid or expired
 */
export function verifyAccessToken(token: string): DecodedToken {
  return jwt.verify(token, config.jwt.accessSecret, {
    issuer: 'rental-auth-service',
    audience: 'rental-platform',
  }) as DecodedToken;
}

// ─── Refresh Token ──────────────────────────────────────────

/**
 * Signs a long-lived refresh token (default 7 days).
 * Uses a different secret than access tokens for isolation.
 *
 * @param payload - User data to embed in the token
 * @returns Signed JWT refresh token string
 */
export function signRefreshToken(payload: TokenPayload): string {
  const options: SignOptions = {
    expiresIn: config.jwt.refreshExpiresIn,
    issuer: 'rental-auth-service',
    audience: 'rental-platform',
  };
  return jwt.sign(payload, config.jwt.refreshSecret, options);
}

/**
 * Verifies and decodes a refresh token.
 *
 * @param token - The JWT refresh token to verify
 * @returns Decoded token payload
 * @throws JsonWebTokenError if token is invalid or expired
 */
export function verifyRefreshToken(token: string): DecodedToken {
  return jwt.verify(token, config.jwt.refreshSecret, {
    issuer: 'rental-auth-service',
    audience: 'rental-platform',
  }) as DecodedToken;
}

// ─── Helpers ────────────────────────────────────────────────

/**
 * Generates both access and refresh tokens for a user.
 *
 * @param payload - User data to embed in both tokens
 * @returns Object containing accessToken and refreshToken
 */
export function generateTokenPair(payload: TokenPayload): {
  accessToken: string;
  refreshToken: string;
} {
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

/**
 * Extracts the remaining TTL (in seconds) of a JWT.
 * Useful for setting blacklist TTL on logout.
 *
 * @param token - Any JWT token
 * @returns Remaining seconds until expiry (0 if already expired)
 */
export function getTokenRemainingTTL(token: string): number {
  const decoded = jwt.decode(token) as JwtPayload | null;
  if (!decoded?.exp) return 0;
  const remaining = decoded.exp - Math.floor(Date.now() / 1000);
  return Math.max(remaining, 0);
}
