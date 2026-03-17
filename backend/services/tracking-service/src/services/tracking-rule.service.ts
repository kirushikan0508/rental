export interface TrackingContext {
  userId: string;
  role: 'RENTER' | 'OWNER' | 'ADMIN';
  bookingState?: {
    status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
    startTime: Date;
    endTime: Date;
    hasConsentToTrack: boolean;
  };
}

export class TrackingRuleService {
  
  /**
   * Evaluates whether a user is authorized to view real-time location.
   */
  public static canTrack(context: TrackingContext): boolean {
    // Admins can always track
    if (context.role === 'ADMIN') return true;

    // Both RENTER and OWNER need an active booking context
    if (!context.bookingState) return false;

    const { status, startTime, endTime, hasConsentToTrack } = context.bookingState;
    const now = new Date();

    // The trip must not be completed or cancelled
    if (status === 'COMPLETED' || status === 'CANCELLED') return false;

    // Consent check - If renter revoked consent (e.g., privacy mode), even owner might be restricted 
    // depending on local laws. We assume they need consent unless it's an emergency.
    if (!hasConsentToTrack) return false;

    if (context.role === 'OWNER') {
      // Owners can only track during the exact active booking window
      return now >= startTime && now <= endTime;
    }

    if (context.role === 'RENTER') {
      // Renters can track 1 hour before pickup to find the vehicle, and during booking
      const oneHourBefore = new Date(startTime.getTime() - 60 * 60 * 1000);
      return now >= oneHourBefore && now <= endTime;
    }

    return false;
  }
}
