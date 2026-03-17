/**
 * @file utils/pricing.engine.ts
 * @description Calculates rental pricing based on duration, rates, and discounts.
 */

import dayjs from 'dayjs';
import { PricingTypeValue } from '../models';

export interface PricingResult {
  totalUnits: number;
  subtotal: number;
}

/**
 * Calculates the total units (hours/days/weeks/months) and subtotal based on the pricing type.
 */
export function calculatePricing(
  startDate: Date,
  endDate: Date,
  pricingType: PricingTypeValue,
  baseRate: number,
): PricingResult {
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  
  if (end.isBefore(start) || end.isSame(start)) {
    throw new Error('End date must be after start date');
  }

  let totalUnits = 0;
  let subtotal = 0;

  // Add 1 hour grace period, anything above rounds up to next unit
  const diffHours = Math.ceil(end.diff(start, 'minute') / 60);

  switch (pricingType) {
    case 'HOURLY':
      totalUnits = diffHours;
      subtotal = totalUnits * baseRate;
      break;

    case 'DAILY':
      totalUnits = Math.ceil(diffHours / 24) || 1;
      subtotal = totalUnits * baseRate;
      break;

    case 'WEEKLY':
      totalUnits = Math.ceil(diffHours / (24 * 7)) || 1;
      subtotal = totalUnits * baseRate;
      break;

    case 'MONTHLY':
      totalUnits = Math.ceil(end.diff(start, 'month', true)) || 1;
      subtotal = totalUnits * baseRate;
      break;

    default:
      throw new Error(`Unsupported pricing type: ${pricingType}`);
  }

  // Round to 2 decimal places
  subtotal = Math.round(subtotal * 100) / 100;

  return { totalUnits, subtotal };
}
