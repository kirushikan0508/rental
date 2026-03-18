import { AnalyticsService } from '../src/services/analytics.service';
import { redisClient } from '../src/utils/redis';

jest.mock('../src/utils/redis', () => {
    return {
        redisClient: {
            get: jest.fn(),
            setex: jest.fn(),
            on: jest.fn(),
        }
    }
});

describe('AnalyticsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return cached stats if available in redis', async () => {
    const mockCachedData = { totalUsers: 1000 };
    (redisClient.get as jest.Mock).mockResolvedValue(JSON.stringify(mockCachedData));

    const result = await AnalyticsService.getDashboardStats();

    expect(redisClient.get).toHaveBeenCalledWith('admin:dashboard:stats');
    expect(result).toEqual(mockCachedData);
    expect(redisClient.setex).not.toHaveBeenCalled();
  });

  it('should fetch fresh stats and cache them if not in redis', async () => {
    (redisClient.get as jest.Mock).mockResolvedValue(null);

    const result = await AnalyticsService.getDashboardStats();

    expect(redisClient.get).toHaveBeenCalledWith('admin:dashboard:stats');
    // It should return the mocked default structure from the service logic
    expect(result).toHaveProperty('totalUsers');
    expect(result).toHaveProperty('revenueToday');
    
    // It should cache the result for 10 mins (600s)
    expect(redisClient.setex).toHaveBeenCalledWith(
      'admin:dashboard:stats',
      600,
      JSON.stringify(result)
    );
  });
});
