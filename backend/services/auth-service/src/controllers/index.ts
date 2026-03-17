/**
 * @file controllers/index.ts
 * @description Barrel exports for all auth controllers.
 */

export {
  registerController,
  loginController,
  googleLoginController,
  requestOtpController,
  verifyOtpController,
  refreshTokenController,
  logoutController,
  getProfileController,
  healthCheckController,
} from './auth.controller';
