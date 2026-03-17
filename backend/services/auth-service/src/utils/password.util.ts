/**
 * @file utils/password.util.ts
 * @description Password hashing and verification using Argon2id.
 *
 * Argon2id is the recommended variant for password hashing — it
 * combines resistance to both side-channel (Argon2i) and
 * GPU-based (Argon2d) attacks.
 */

import argon2 from 'argon2';

// ─── Argon2 Configuration ───────────────────────────────────

/** OWASP-recommended Argon2id parameters */
const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536,    // 64 MB
  timeCost: 3,          // 3 iterations
  parallelism: 4,       // 4 parallel threads
  hashLength: 32,       // 256-bit hash output
};

// ─── Public API ─────────────────────────────────────────────

/**
 * Hashes a plaintext password using Argon2id.
 *
 * @param password - The plaintext password to hash
 * @returns Argon2id hash string (includes salt and parameters)
 * @throws Error if hashing fails
 *
 * @example
 * const hash = await hashPassword('my-secure-password');
 * // "$argon2id$v=19$m=65536,t=3,p=4$..."
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS);
}

/**
 * Verifies a plaintext password against an Argon2id hash.
 *
 * @param hash - The stored Argon2id hash
 * @param password - The plaintext password to verify
 * @returns true if the password matches the hash
 *
 * @example
 * const isValid = await verifyPassword(storedHash, 'user-input');
 */
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    // Invalid hash format or other error — treat as mismatch
    return false;
  }
}

/**
 * Checks whether a password hash needs to be re-hashed
 * (e.g., after updating Argon2 parameters).
 *
 * @param hash - The stored Argon2id hash
 * @returns true if the hash should be re-generated
 */
export function needsRehash(hash: string): boolean {
  return argon2.needsRehash(hash, ARGON2_OPTIONS);
}
