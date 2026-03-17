/**
 * @file db.ts
 * @description MongoDB connection utility with connection pooling,
 * retry logic, graceful shutdown, and index creation on startup.
 *
 * Usage:
 *   import { connectDB, disconnectDB } from './db';
 *   await connectDB();
 */

import mongoose from 'mongoose';

// ─── Configuration ──────────────────────────────────────────

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/rental_dev';

/** Maximum number of connection retry attempts */
const MAX_RETRIES = 5;

/** Delay between retries in milliseconds (doubles each attempt) */
const INITIAL_RETRY_DELAY_MS = 2000;

/** Mongoose connection options */
const CONNECTION_OPTIONS: mongoose.ConnectOptions = {
  // Connection pooling
  maxPoolSize: 10,
  minPoolSize: 2,
  maxIdleTimeMS: 30000,

  // Timeouts
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,

  // Buffering
  bufferCommands: false,
};

// ─── Connection State ───────────────────────────────────────

let isConnected = false;

// ─── Connect ────────────────────────────────────────────────

/**
 * Establishes a connection to MongoDB with exponential backoff retry logic.
 * Sets up graceful shutdown handlers and ensures indexes are created.
 *
 * @throws If all retry attempts are exhausted
 */
export async function connectDB(): Promise<void> {
  if (isConnected) {
    console.log('ℹ️  MongoDB already connected');
    return;
  }

  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      console.log(`🔌 Connecting to MongoDB... (attempt ${retries + 1}/${MAX_RETRIES})`);

      await mongoose.connect(MONGO_URI, CONNECTION_OPTIONS);
      isConnected = true;

      console.log('✅ MongoDB connected successfully');
      console.log(`   Database: ${mongoose.connection.db?.databaseName}`);
      console.log(`   Host: ${mongoose.connection.host}`);

      // ─── Event Listeners ────────────────────────────────
      mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB connection error:', err);
        isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('⚠️  MongoDB disconnected');
        isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        console.log('🔄 MongoDB reconnected');
        isConnected = true;
      });

      // ─── Graceful Shutdown ──────────────────────────────
      setupGracefulShutdown();

      // ─── Ensure Indexes ─────────────────────────────────
      await ensureIndexes();

      return;
    } catch (error) {
      retries++;
      const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, retries - 1);

      console.error(
        `❌ MongoDB connection failed (attempt ${retries}/${MAX_RETRIES}):`,
        error instanceof Error ? error.message : error,
      );

      if (retries >= MAX_RETRIES) {
        console.error('💀 All MongoDB connection attempts exhausted. Exiting.');
        throw error;
      }

      console.log(`⏳ Retrying in ${delay / 1000}s...`);
      await sleep(delay);
    }
  }
}

// ─── Disconnect ─────────────────────────────────────────────

/**
 * Gracefully disconnects from MongoDB.
 */
export async function disconnectDB(): Promise<void> {
  if (!isConnected) return;

  try {
    await mongoose.disconnect();
    isConnected = false;
    console.log('🔌 MongoDB disconnected gracefully');
  } catch (error) {
    console.error('❌ Error disconnecting from MongoDB:', error);
    throw error;
  }
}

// ─── Index Creation ─────────────────────────────────────────

/**
 * Syncs all Mongoose model indexes with MongoDB.
 * Called automatically on connection.
 */
async function ensureIndexes(): Promise<void> {
  try {
    console.log('📇 Syncing database indexes...');

    const models = mongoose.modelNames();
    for (const modelName of models) {
      const model = mongoose.model(modelName);
      await model.syncIndexes();
    }

    console.log(`✅ Indexes synced for ${models.length} models`);
  } catch (error) {
    console.error('⚠️  Index sync warning:', error instanceof Error ? error.message : error);
    // Non-fatal: indexes may already exist or will be created on next write
  }
}

// ─── Graceful Shutdown ──────────────────────────────────────

/**
 * Registers process-level shutdown handlers to close the
 * MongoDB connection cleanly on SIGINT / SIGTERM.
 */
function setupGracefulShutdown(): void {
  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n📡 Received ${signal}. Closing MongoDB connection...`);
    await disconnectDB();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Windows-specific: handle Ctrl+C on Windows
  if (process.platform === 'win32') {
    process.on('SIGHUP', () => shutdown('SIGHUP'));
  }
}

// ─── Helpers ────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
