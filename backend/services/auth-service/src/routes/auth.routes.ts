/**
 * @file routes/auth.routes.ts
 * @description Express router for all authentication endpoints.
 *
 * Route Structure:
 *   POST   /auth/register        - Email + password registration
 *   POST   /auth/login           - Email + password login
 *   POST   /auth/google          - Google OAuth login
 *   POST   /auth/otp/request     - Request OTP
 *   POST   /auth/otp/verify      - Verify OTP + login
 *   POST   /auth/refresh         - Rotate tokens
 *   POST   /auth/logout          - Logout (authenticated)
 *   GET    /auth/me              - Get profile (authenticated)
 *   GET    /auth/health          - Health check
 */

import { Router } from 'express';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/authenticate';
import { loginRateLimiter } from '../middleware/rateLimiter';
import {
  registerSchema,
  loginSchema,
  googleLoginSchema,
  requestOtpSchema,
  verifyOtpSchema,
  refreshTokenSchema,
} from '../validators/auth.validator';
import {
  registerController,
  loginController,
  googleLoginController,
  requestOtpController,
  verifyOtpController,
  refreshTokenController,
  logoutController,
  getProfileController,
  healthCheckController,
} from '../controllers/auth.controller';

const router = Router();

// ═══════════════════════════════════════════════════════════
// Public Routes (no authentication required)
// ═══════════════════════════════════════════════════════════

/**
 * @route   POST /auth/register
 * @desc    Register a new user with email + password
 * @access  Public
 */
router.post('/register', validate(registerSchema), registerController);

/**
 * @route   POST /auth/login
 * @desc    Login with email + password
 * @access  Public
 * @rateLimit 5 attempts per 15 minutes per IP
 */
router.post('/login', loginRateLimiter, validate(loginSchema), loginController);

/**
 * @route   POST /auth/google
 * @desc    Register or login with Google OAuth
 * @access  Public
 */
router.post('/google', validate(googleLoginSchema), googleLoginController);

/**
 * @route   POST /auth/otp/request
 * @desc    Request an OTP for email/phone verification or login
 * @access  Public
 */
router.post('/otp/request', validate(requestOtpSchema), requestOtpController);

/**
 * @route   POST /auth/otp/verify
 * @desc    Verify OTP and login
 * @access  Public
 */
router.post('/otp/verify', validate(verifyOtpSchema), verifyOtpController);

/**
 * @route   POST /auth/refresh
 * @desc    Rotate access + refresh tokens
 * @access  Public (with valid refresh token in body)
 */
router.post('/refresh', validate(refreshTokenSchema), refreshTokenController);

// ═══════════════════════════════════════════════════════════
// Protected Routes (requires valid access token)
// ═══════════════════════════════════════════════════════════

/**
 * @route   POST /auth/logout
 * @desc    Logout — blacklists access token, deletes refresh token
 * @access  Private
 */
router.post('/logout', authenticate, logoutController);

/**
 * @route   GET /auth/me
 * @desc    Get the authenticated user's profile
 * @access  Private
 */
router.get('/me', authenticate, getProfileController);

// ═══════════════════════════════════════════════════════════
// Health Check
// ═══════════════════════════════════════════════════════════

/**
 * @route   GET /auth/health
 * @desc    Service health check
 * @access  Public
 */
router.get('/health', healthCheckController);

export default router;
