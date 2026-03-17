import { calculatePricing } from '../../src/utils/pricing.engine';
import { isValidTransition } from '../../src/utils/state-machine';

describe('Pricing Engine', () => {
  const baseRate = 100;

  it('calculates hourly rate correctly', () => {
    const start = new Date('2024-05-01T10:00:00Z');
    const end = new Date('2024-05-01T12:00:00Z');
    
    const result = calculatePricing(start, end, 'HOURLY', baseRate);
    
    expect(result.totalUnits).toBe(2);
    expect(result.subtotal).toBe(200);
  });

  it('rounds up partial hours', () => {
    const start = new Date('2024-05-01T10:00:00Z');
    const end = new Date('2024-05-01T12:15:00Z'); // 2h 15m
    
    const result = calculatePricing(start, end, 'HOURLY', baseRate);
    
    expect(result.totalUnits).toBe(3); // Charged for 3 hours
    expect(result.subtotal).toBe(300);
  });

  it('calculates daily rate correctly', () => {
    const start = new Date('2024-05-01T10:00:00Z');
    const end = new Date('2024-05-03T10:00:00Z'); // Exactly 48 hours = 2 days
    
    const result = calculatePricing(start, end, 'DAILY', baseRate);
    
    expect(result.totalUnits).toBe(2);
    expect(result.subtotal).toBe(200);
  });

  it('calculates partial daily rate rounding up to full day', () => {
     const start = new Date('2024-05-01T10:00:00Z');
    const end = new Date('2024-05-03T14:00:00Z'); // 52 hours = 3 days
    
    const result = calculatePricing(start, end, 'DAILY', baseRate);
    
    expect(result.totalUnits).toBe(3);
    expect(result.subtotal).toBe(300);
  });
});

describe('State Machine', () => {
  it('allows PENDING to CONFIRMED transition', () => {
    expect(isValidTransition('PENDING', 'CONFIRMED')).toBe(true);
  });

  it('allows CONFIRMED to ACTIVE transition', () => {
    expect(isValidTransition('CONFIRMED', 'ACTIVE')).toBe(true);
  });

  it('rejects invalid CONFIRMED to PENDING transition', () => {
    expect(isValidTransition('CONFIRMED', 'PENDING')).toBe(false);
  });

  it('allows valid cancellations', () => {
    expect(isValidTransition('PENDING', 'CANCELLED')).toBe(true);
    expect(isValidTransition('CONFIRMED', 'CANCELLED')).toBe(true);
    expect(isValidTransition('ACTIVE', 'CANCELLED')).toBe(true);
  });

  it('rejects cancelling an already completed booking', () => {
    expect(isValidTransition('COMPLETED', 'CANCELLED')).toBe(false);
  });
});
