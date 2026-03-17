import { createPaymentIntent, PaymentError } from '../../src/services/payment.service';
import { stripe } from '../../src/utils/stripe.util';
import { generatePayHereSignature } from '../../src/utils/payhere.util';
import { PrismaClient } from '@prisma/client';

// Keep reference to mocked prisma so we can assert on it
const prismaMock = {
  payment: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
};

// Mock dependencies
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => prismaMock),
  PaymentStatus: { PENDING: 'PENDING' },
  PaymentProvider: { STRIPE: 'STRIPE', PAYHERE: 'PAYHERE' }
}));

jest.mock('../../src/utils/stripe.util', () => ({
  stripe: {
    paymentIntents: {
      create: jest.fn().mockResolvedValue({ id: 'pi_mock', client_secret: 'secret_mock' })
    }
  }
}));

jest.mock('../../src/utils/payhere.util', () => ({
  generatePayHereSignature: jest.fn().mockReturnValue('mock-md5-hash')
}));

describe('Payment Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createPaymentIntent', () => {
    
    it('returns existing intent if idempotencyKey hits', async () => {
      prismaMock.payment.findUnique.mockResolvedValue({
        id: 'existing-id',
        providerPaymentId: 'pi_existing',
        clientSecret: 'secret_existing'
      });

      const result = await createPaymentIntent({
        bookingId: 'b_1', renterId: 'r_1', ownerId: 'o_1', amount: 1000, idempotencyKey: 'idemp-1'
      });

      expect(result.clientSecret).toBe('secret_existing');
      expect(stripe.paymentIntents.create).not.toHaveBeenCalled();
    });

    it('creates Stripe PaymentIntent and db record', async () => {
      prismaMock.payment.findUnique.mockResolvedValue(null);
      prismaMock.payment.create.mockResolvedValue({ id: 'db-id' });

      const result = await createPaymentIntent({
        bookingId: 'b_1', renterId: 'r_1', ownerId: 'o_1', amount: 5000, provider: 'STRIPE'
      });

      expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
        { amount: 5000, currency: 'usd', metadata: { bookingId: 'b_1', renterId: 'r_1', ownerId: 'o_1' } },
        { idempotencyKey: undefined }
      );

      expect(prismaMock.payment.create).toHaveBeenCalled();
      expect(result.providerPaymentId).toBe('pi_mock');
    });

    it('creates PayHere signature and db record', async () => {
      prismaMock.payment.findUnique.mockResolvedValue(null);
      prismaMock.payment.create.mockResolvedValue({ id: 'db-id' });

      const result = await createPaymentIntent({
        bookingId: 'b_1', renterId: 'r_1', ownerId: 'o_1', amount: 5000, provider: 'PAYHERE', currency: 'lkr'
      });

      expect(stripe.paymentIntents.create).not.toHaveBeenCalled();
      expect(generatePayHereSignature).toHaveBeenCalled();
      expect(result.payhere!.hash).toBe('mock-md5-hash');
    });

  });
});
