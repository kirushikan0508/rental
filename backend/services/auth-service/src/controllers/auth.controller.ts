/**
 * @file controllers/auth.controller.ts
 * @description Express request handlers for all authentication endpoints.
 * Each handler delegates business logic to the auth service and
 * returns standardized JSON responses.
 */

import { Request, Response, NextFunction } from 'express';
import {
  registerWithEmail,
  registerOrLoginWithGoogle,
  loginWithEmail,
  requestOtpLogin,
  loginWithOtp,
  refreshTokens,
  logout,
  getUserProfile,
  AuthError,
} from '../services/auth.service';
import { OtpError } from '../services/otp.service';
import { logger } from '../utils/logger';

import type {
  RegisterInput,
  LoginInput,
  GoogleLoginInput,
  RequestOtpInput,
  VerifyOtpInput,
  RefreshTokenInput,
} from '../validators/auth.validator';

// ═══════════════════════════════════════════════════════════
// REGISTER
// ═══════════════════════════════════════════════════════════

/**
 * POST /auth/register
 * Registers a new user with email + password.
 */
export async function registerController(
  req: Request<object, object, RegisterInput>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await registerWithEmail(req.body);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: result,
    });
  } catch (error) {
    handleError(error, res, next);
  }
}

// ═══════════════════════════════════════════════════════════
// LOGIN — Email + Password
// ═══════════════════════════════════════════════════════════

/**
 * POST /auth/login
 * Authenticates a user with email + password.
 */
export async function loginController(
  req: Request<object, object, LoginInput>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const result = await loginWithEmail(req.body.email, req.body.password, ip);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result,
    });
  } catch (error) {
    handleError(error, res, next);
  }
}

// ═══════════════════════════════════════════════════════════
// LOGIN — Google OAuth
// ═══════════════════════════════════════════════════════════

/**
 * POST /auth/google
 * Registers or logs in a user via Google OAuth.
 */
export async function googleLoginController(
  req: Request<object, object, GoogleLoginInput>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await registerOrLoginWithGoogle(req.body.idToken);

    res.status(200).json({
      success: true,
      message: 'Google authentication successful',
      data: result,
    });
  } catch (error) {
    handleError(error, res, next);
  }
}

// ═══════════════════════════════════════════════════════════
// OTP
// ═══════════════════════════════════════════════════════════

/**
 * POST /auth/otp/request
 * Sends an OTP to the user's email or phone.
 */
export async function requestOtpController(
  req: Request<object, object, RequestOtpInput>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await requestOtpLogin(req.body.identifier);

    // Always return success to prevent user enumeration
    res.status(200).json({
      success: true,
      message: 'If an account exists, an OTP has been sent',
    });
  } catch (error) {
    handleError(error, res, next);
  }
}

/**
 * POST /auth/otp/verify
 * Verifies the OTP and logs in the user.
 */
export async function verifyOtpController(
  req: Request<object, object, VerifyOtpInput>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await loginWithOtp(req.body.identifier, req.body.code);

    res.status(200).json({
      success: true,
      message: 'OTP verification successful',
      data: result,
    });
  } catch (error) {
    handleError(error, res, next);
  }
}

// ═══════════════════════════════════════════════════════════
// TOKEN REFRESH
// ═══════════════════════════════════════════════════════════

/**
 * POST /auth/refresh
 * Rotates tokens — issues new access + refresh token pair.
 */
export async function refreshTokenController(
  req: Request<object, object, RefreshTokenInput>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tokens = await refreshTokens(req.body.refreshToken);

    res.status(200).json({
      success: true,
      message: 'Tokens refreshed successfully',
      data: { tokens },
    });
  } catch (error) {
    handleError(error, res, next);
  }
}

// ═══════════════════════════════════════════════════════════
// LOGOUT
// ═══════════════════════════════════════════════════════════

/**
 * POST /auth/logout
 * Blacklists the access token and deletes the refresh token.
 * Requires authentication.
 */
export async function logoutController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user || !req.accessToken) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    await logout(req.user.userId, req.accessToken);

    res.status(200).json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    handleError(error, res, next);
  }
}

// ═══════════════════════════════════════════════════════════
// PROFILE
// ═══════════════════════════════════════════════════════════

/**
 * GET /auth/me
 * Returns the authenticated user's profile.
 * Requires authentication.
 */
export async function getProfileController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    const user = await getUserProfile(req.user.userId);

    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    handleError(error, res, next);
  }
}

// ═══════════════════════════════════════════════════════════
// HEALTH
// ═══════════════════════════════════════════════════════════

/**
 * GET /auth/health
 * Health check endpoint — returns service status.
 */
export function healthCheckController(_req: Request, res: Response): void {
  res.status(200).json({
    success: true,
    service: 'auth-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
}

// ─── Error Handler ──────────────────────────────────────────

/**
 * Centralized error handler for controller catch blocks.
 * Maps known error types to HTTP status codes.
 */
function handleError(error: unknown, res: Response, next: NextFunction): void {
  if (error instanceof AuthError) {
    res.status(error.statusCode).json({
      success: false,
      error: { code: error.code, message: error.message },
    });
    return;
  }

  if (error instanceof OtpError) {
    res.status(400).json({
      success: false,
      error: { code: 'OTP_ERROR', message: error.message },
    });
    return;
  }

  // Unexpected error — pass to Express error handler
  logger.error('Unhandled controller error:', error);
  next(error);
}
