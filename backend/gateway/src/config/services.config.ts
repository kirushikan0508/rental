/**
 * @file config/services.config.ts
 * @description Microservice registry — defines all downstream services,
 * their URLs, route prefixes, and authentication requirements.
 */

import { config } from './index';

// ─── Service Definition ─────────────────────────────────────

export interface ServiceConfig {
  /** Human-readable service name */
  name: string;
  /** Base URL of the downstream service */
  url: string;
  /** Route prefix on the gateway (e.g. '/api/auth') */
  prefix: string;
  /** Whether routes require JWT authentication */
  requiresAuth: boolean;
  /** Specific public paths that skip auth (within an otherwise authenticated service) */
  publicPaths?: string[];
  /** Rate limit tier: 'global' | 'auth' | 'payment' */
  rateLimitTier: 'global' | 'auth' | 'payment';
}

// ─── Service Registry ───────────────────────────────────────

/**
 * Central registry of all microservices.
 * The gateway uses this to configure proxy routes, auth requirements,
 * and rate limiting for each service.
 */
export const services: ServiceConfig[] = [
  {
    name: 'auth-service',
    url: config.services.authUrl,
    prefix: '/api/auth',
    requiresAuth: false,
    publicPaths: ['/register', '/login', '/google', '/otp/request', '/otp/verify', '/refresh', '/health'],
    rateLimitTier: 'auth',
  },
  {
    name: 'user-service',
    url: config.services.userUrl,
    prefix: '/api/users',
    requiresAuth: true,
    rateLimitTier: 'global',
  },
  {
    name: 'vehicle-service',
    url: config.services.vehicleUrl,
    prefix: '/api/vehicles',
    requiresAuth: false,
    publicPaths: ['/search', '/featured', '/nearby'],
    rateLimitTier: 'global',
  },
  {
    name: 'booking-service',
    url: config.services.bookingUrl,
    prefix: '/api/bookings',
    requiresAuth: true,
    rateLimitTier: 'global',
  },
  {
    name: 'payment-service',
    url: config.services.paymentUrl,
    prefix: '/api/payments',
    requiresAuth: true,
    publicPaths: ['/webhook'],
    rateLimitTier: 'payment',
  },
  {
    name: 'tracking-service',
    url: config.services.trackingUrl,
    prefix: '/api/tracking',
    requiresAuth: true,
    rateLimitTier: 'global',
  },
  {
    name: 'chat-service',
    url: config.services.chatUrl,
    prefix: '/api/chat',
    requiresAuth: true,
    rateLimitTier: 'global',
  },
  {
    name: 'admin-service',
    url: config.services.adminUrl,
    prefix: '/api/admin',
    requiresAuth: true,
    rateLimitTier: 'global',
  },
  {
    name: 'ai-service',
    url: config.services.aiUrl,
    prefix: '/api/ai',
    requiresAuth: true,
    rateLimitTier: 'global',
  },
];

/**
 * Returns the service configuration matching a given route prefix.
 *
 * @param path - The incoming request path
 * @returns Matching ServiceConfig or undefined
 */
export function getServiceForPath(path: string): ServiceConfig | undefined {
  return services.find((svc) => path.startsWith(svc.prefix));
}

/**
 * Checks whether a specific path within a service is public (no auth required).
 *
 * @param service - The service configuration
 * @param path - Full request path
 * @returns true if the path is in the service's public paths list
 */
export function isPublicPath(service: ServiceConfig, path: string): boolean {
  if (!service.requiresAuth) return true;
  if (!service.publicPaths) return false;

  // Strip the service prefix to get the sub-path
  const subPath = path.replace(service.prefix, '');
  return service.publicPaths.some((pp) => subPath.startsWith(pp));
}
