/**
 * @file frontend/src/utils/index.ts
 * @description Shared frontend utility functions.
 */

/** Format a price with currency symbol */
export const formatPrice = (amount: number, currency = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
};

/** Format a date string for display */
export const formatDate = (isoDate: string, options?: Intl.DateTimeFormatOptions): string => {
  return new Date(isoDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  });
};

/** Truncate text with ellipsis */
export const truncate = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
};

/** Build query string from an object, omitting undefined values */
export const buildQueryString = (params: Record<string, string | number | boolean | undefined>): string => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) search.set(key, String(value));
  });
  return search.toString();
};
