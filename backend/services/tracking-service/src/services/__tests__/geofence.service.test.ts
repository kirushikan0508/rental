import { GeofenceService, GeofenceZone } from '../geofence.service';

// Mock GeofenceEvent to avoid actual DB calls during tests
jest.mock('../../models/GeofenceEvent', () => ({
  GeofenceEvent: {
    create: jest.fn().mockResolvedValue(true)
  }
}));

describe('GeofenceService', () => {
  const mockVehicleId = 'mock_vehicle_1';

  // A simple square zone covering [0,0] to [10,10]
  const mockSquareZone: GeofenceZone = {
    id: 'zone_1',
    vehicleId: mockVehicleId,
    isActive: true,
    coordinates: [[
      [0, 0],   // Point 1
      [10, 0],  // Point 2
      [10, 10], // Point 3
      [0, 10],  // Point 4
      [0, 0]    // Point 1 (closing polygon)
    ]]
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return true if location is inside the active zone', async () => {
    // Inside the square [5, 5]
    const isInside = await GeofenceService.evaluateLocation(
      mockVehicleId,
      5, // lat
      5, // lng
      [mockSquareZone]
    );

    expect(isInside).toBe(true);
  });

  it('should return false and log breach if location is outside the active zone', async () => {
    // Outside the square [15, 15]
    const isInside = await GeofenceService.evaluateLocation(
      mockVehicleId,
      15, // lat
      15, // lng
      [mockSquareZone]
    );

    expect(isInside).toBe(false);
    
    // Check if GeofenceEvent.create was conceptually called
    const { GeofenceEvent } = require('../../models/GeofenceEvent');
    expect(GeofenceEvent.create).toHaveBeenCalled();
  });

  it('should always return true if there are no active zones provided', async () => {
    const isInside = await GeofenceService.evaluateLocation(
      mockVehicleId,
      15, 15,
      []
    );

    expect(isInside).toBe(true);
  });
});
