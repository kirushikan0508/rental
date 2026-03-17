/**
 * @file frontend/src/types/index.ts
 * @description Frontend-specific TypeScript types and API response interfaces.
 */

// Re-export shared types that the frontend needs
// In a monorepo setup these would come from @rental/shared
// For now, define frontend-specific interfaces here.

/** Generic paginated API response */
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/** Authentication state */
export interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;
}

/** User profile for the frontend */
export interface UserProfile {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  avatar: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
}

/** Vehicle listing card data */
export interface VehicleCard {
  _id: string;
  title: string;
  type: string;
  brand: string;
  model: string;
  year: number;
  pricing: {
    dailyRate: number;
    currency: string;
  };
  location: {
    city: string;
    state: string;
  };
  images: { url: string; isPrimary: boolean }[];
  averageRating: number;
  totalReviews: number;
  isAvailable: boolean;
  isEVBadge: boolean;
}

/** Booking summary for lists */
export interface BookingSummary {
  _id: string;
  bookingRef: string;
  vehicleTitle: string;
  vehicleImage: string;
  startDateTime: string;
  endDateTime: string;
  status: string;
  totalAmount: number;
  currency: string;
}
