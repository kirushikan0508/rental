/**
 * @file services/google.service.ts
 * @description Google OAuth 2.0 ID token verification service.
 * Validates tokens issued by Google Sign-In and extracts user profile data.
 */

import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { config } from '../config';
import { logger } from '../utils/logger';

// ─── OAuth2 Client ──────────────────────────────────────────

const googleClient = new OAuth2Client(config.google.clientId);

// ─── Public Interface ───────────────────────────────────────

/** Profile data extracted from a verified Google ID token */
export interface GoogleProfile {
  googleId: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar: string;
  isEmailVerified: boolean;
}

/**
 * Verifies a Google ID token and extracts the user's profile.
 *
 * @param idToken - The ID token from Google Sign-In (client-side)
 * @returns Extracted user profile, or null if verification fails
 *
 * @example
 * const profile = await verifyGoogleToken(idTokenFromClient);
 * if (profile) {
 *   // Create or login user with profile.email, profile.googleId, etc.
 * }
 */
export async function verifyGoogleToken(idToken: string): Promise<GoogleProfile | null> {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: config.google.clientId,
    });

    const payload: TokenPayload | undefined = ticket.getPayload();
    if (!payload) {
      logger.warn('Google OAuth: empty payload from ID token');
      return null;
    }

    // Ensure we have the required fields
    if (!payload.sub || !payload.email) {
      logger.warn('Google OAuth: missing sub or email in payload');
      return null;
    }

    return {
      googleId: payload.sub,
      email: payload.email,
      firstName: payload.given_name || '',
      lastName: payload.family_name || '',
      avatar: payload.picture || '',
      isEmailVerified: payload.email_verified ?? false,
    };
  } catch (error) {
    logger.error('Google OAuth verification failed:', error);
    return null;
  }
}
