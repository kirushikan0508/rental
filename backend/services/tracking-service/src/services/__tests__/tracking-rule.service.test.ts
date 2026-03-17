import { TrackingRuleService, TrackingContext } from '../tracking-rule.service';

describe('TrackingRuleService', () => {
  
  const createBaseContext = (role: 'RENTER' | 'OWNER' | 'ADMIN'): TrackingContext => ({
    userId: 'user_1',
    role,
    bookingState: {
      status: 'ACTIVE',
      startTime: new Date(Date.now() - 30 * 60 * 1000), // 30 mins ago
      endTime: new Date(Date.now() + 60 * 60 * 1000),   // Ends in 60 mins
      hasConsentToTrack: true
    }
  });

  it('Admin should be able to track continuously', () => {
    const context = createBaseContext('ADMIN');
    // Even without booking
    delete context.bookingState;
    expect(TrackingRuleService.canTrack(context)).toBe(true);
  });

  it('Owner should be able to track during active booking with consent', () => {
    const context = createBaseContext('OWNER');
    expect(TrackingRuleService.canTrack(context)).toBe(true);
  });

  it('Owner should NOT be able to track if Renter revoked consent', () => {
    const context = createBaseContext('OWNER');
    context.bookingState!.hasConsentToTrack = false;
    expect(TrackingRuleService.canTrack(context)).toBe(false);
  });

  it('Owner should NOT be able to track before the trip starts', () => {
    const context = createBaseContext('OWNER');
    // Starts an hour from now
    context.bookingState!.startTime = new Date(Date.now() + 60 * 60 * 1000); 
    // Ends 2 hours from now
    context.bookingState!.endTime = new Date(Date.now() + 120 * 60 * 1000);  
    
    expect(TrackingRuleService.canTrack(context)).toBe(false);
  });

  it('Renter SHOULD be able to track 1 hour before pickup', () => {
    const context = createBaseContext('RENTER');
    // Starts 30 mins from now
    context.bookingState!.startTime = new Date(Date.now() + 30 * 60 * 1000); 
    context.bookingState!.endTime = new Date(Date.now() + 120 * 60 * 1000);  

    expect(TrackingRuleService.canTrack(context)).toBe(true);
  });

  it('Renter should NOT be able to track completed trips', () => {
    const context = createBaseContext('RENTER');
    context.bookingState!.status = 'COMPLETED';

    expect(TrackingRuleService.canTrack(context)).toBe(false);
  });
});
