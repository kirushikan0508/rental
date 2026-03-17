import { createBooking, cancelBooking, BookingError } from '../../src/services/booking.service';
import { Booking } from '../../src/models';
import * as lockUtil from '../../src/utils/lock.util';
import * as loyaltySvc from '../../src/services/loyalty.service';

// Mock dependencies
jest.mock('../../src/models');
jest.mock('../../src/utils/lock.util');
jest.mock('../../src/services/loyalty.service');

describe('Booking Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createBooking', () => {
    it('creates booking successfully if no overlap', async () => {
      // Mock lock
      (lockUtil.acquireLock as jest.Mock).mockResolvedValue('lock-id');
      (lockUtil.releaseLock as jest.Mock).mockResolvedValue(undefined);

      // Mock DB: no overlap
      (Booking.findOne as jest.Mock).mockResolvedValue(null);
      (Booking.create as jest.Mock).mockResolvedValue({ _id: 'new-booking' });

      const input = {
        renterId: 'renter-1',
        ownerId: 'owner-1',
        vehicleId: 'vehicle-1',
        vehicleTitle: 'Test Car',
        startDate: new Date('2024-05-01T10:00:00Z'),
        endDate: new Date('2024-05-02T10:00:00Z'),
        pricingType: 'DAILY' as const,
        baseRate: 50,
      };

      const result = await createBooking(input);
      
      expect(result._id).toBe('new-booking');
      expect(Booking.findOne).toHaveBeenCalledTimes(1);
      expect(Booking.create).toHaveBeenCalledTimes(1);
      expect(lockUtil.acquireLock).toHaveBeenCalledTimes(1);
      expect(lockUtil.releaseLock).toHaveBeenCalledTimes(1);
    });

    it('throws error if dates overlap', async () => {
      (lockUtil.acquireLock as jest.Mock).mockResolvedValue('lock-id');
      
      // Mock DB: overlap exists
      (Booking.findOne as jest.Mock).mockResolvedValue({ _id: 'existing-booking' });

      const input = {
        renterId: 'renter-1', ownerId: 'owner-1', vehicleId: 'vehicle-1', vehicleTitle: 'Test Car',
        startDate: new Date('2024-05-01T10:00:00Z'), endDate: new Date('2024-05-02T10:00:00Z'),
        pricingType: 'DAILY' as const, baseRate: 50,
      };

      await expect(createBooking(input)).rejects.toThrow(BookingError);
      
      expect(Booking.create).not.toHaveBeenCalled();
      expect(lockUtil.releaseLock).toHaveBeenCalledTimes(1); // Lock released even on error
    });
  });
});
