import { PlatformConfig, IPlatformConfig } from '../models/PlatformConfig';
import { Types } from 'mongoose';

export class ConfigService {
  /**
   * Retrieves current platform configuration
   */
  static async getConfig() {
    let config = await PlatformConfig.findOne().sort({ createdAt: -1 });
    if (!config) {
        // Need a default config if none exists, usually bootstrapped in seeding
        throw new Error("Platform configuration not found.");
    }
    return config;
  }

  /**
   * Updates platform configuration
   */
  static async updateConfig(updates: Partial<IPlatformConfig>, adminId: string) {
    let config = await PlatformConfig.findOne().sort({ createdAt: -1 });
    
    if (!config) {
      config = new PlatformConfig({ ...updates, updatedBy: new Types.ObjectId(adminId) });
    } else {
        if (updates.features) config.features = { ...config.features, ...updates.features };
        if (updates.policies) config.policies = { ...config.policies, ...updates.policies };
        if (updates.cityPricingRules) config.cityPricingRules = updates.cityPricingRules;
        config.updatedBy = new Types.ObjectId(adminId);
    }

    return config.save();
  }
}
