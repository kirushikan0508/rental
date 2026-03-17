/**
 * @file scripts/seed.ts
 * @description Seeds all MongoDB collections with sample data for development.
 * Usage: npx ts-node scripts/seed.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://admin:admin123@localhost:27017/rental_dev?authSource=admin';

async function seed(): Promise<void> {
  console.log('🌱 Starting database seed...');

  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // TODO: Import models and insert sample documents
  // await User.insertMany(sampleUsers);
  // await Vehicle.insertMany(sampleVehicles);
  // await Booking.insertMany(sampleBookings);
  // ... etc.

  console.log('🌱 Seed completed successfully');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
