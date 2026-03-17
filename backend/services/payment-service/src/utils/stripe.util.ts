/**
 * @file utils/stripe.util.ts
 * @description Initialized Stripe SDK instance.
 */

import Stripe from 'stripe';
import { config } from '../config';

export const stripe = new Stripe(config.stripe.secretKey, {
  apiVersion: '2023-10-16', // using a fixed api version
  typescript: true,
  appInfo: {
    name: 'VehicleRentalPlatform',
    version: '1.0.0',
  },
});
