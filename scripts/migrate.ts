/**
 * @file scripts/migrate.ts
 * @description Data migration scripts for schema changes and data transformations.
 * Usage: npx ts-node scripts/migrate.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://admin:admin123@localhost:27017/rental_dev?authSource=admin';

interface Migration {
  name: string;
  up: () => Promise<void>;
  down: () => Promise<void>;
}

const migrations: Migration[] = [
  // Example migration:
  // {
  //   name: '001_add_greenScore_to_vehicles',
  //   up: async () => {
  //     const db = mongoose.connection.db;
  //     await db.collection('vehicles').updateMany(
  //       { greenScore: { $exists: false } },
  //       { $set: { greenScore: 0 } }
  //     );
  //   },
  //   down: async () => {
  //     const db = mongoose.connection.db;
  //     await db.collection('vehicles').updateMany({}, { $unset: { greenScore: '' } });
  //   },
  // },
];

async function migrate(): Promise<void> {
  console.log('🔄 Starting migrations...');

  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  for (const migration of migrations) {
    console.log(`  ➜ Running: ${migration.name}`);
    await migration.up();
    console.log(`  ✅ Completed: ${migration.name}`);
  }

  console.log('🔄 All migrations completed');
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
