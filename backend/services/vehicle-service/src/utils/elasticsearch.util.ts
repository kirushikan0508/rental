/**
 * @file utils/elasticsearch.util.ts
 * @description Elasticsearch client and index management.
 *
 * Creates the `vehicles` index with mapping on startup.
 * Provides indexing, deletion, and bulk operations for vehicle search.
 */

import { Client } from '@elastic/elasticsearch';
import { config } from '../config';
import { logger } from './logger';

// ─── Elasticsearch Client ───────────────────────────────────

export const esClient = new Client({
  node: config.elasticsearch.url,
});

const INDEX_NAME = config.elasticsearch.index;

// ─── Index Mapping ──────────────────────────────────────────

/**
 * Elasticsearch mapping for the vehicles index.
 * Supports geo_point for location search and keyword/text for filtering.
 */
const vehicleMapping = {
  properties: {
    id:              { type: 'keyword' },
    ownerId:         { type: 'keyword' },
    title:           { type: 'text', analyzer: 'standard', fields: { keyword: { type: 'keyword' } } },
    description:     { type: 'text', analyzer: 'standard' },
    slug:            { type: 'keyword' },
    type:            { type: 'keyword' },
    brand:           { type: 'keyword' },
    model:           { type: 'keyword' },
    year:            { type: 'integer' },
    color:           { type: 'keyword' },
    fuelType:        { type: 'keyword' },
    transmission:    { type: 'keyword' },
    seats:           { type: 'integer' },

    // Pricing
    hourlyRate:      { type: 'float' },
    dailyRate:       { type: 'float' },
    weeklyRate:      { type: 'float' },
    monthlyRate:     { type: 'float' },
    currency:        { type: 'keyword' },

    // Geo-point for location-based search
    location:        { type: 'geo_point' },
    address:         { type: 'text' },
    city:            { type: 'keyword' },

    // Features
    features:        { type: 'keyword' },
    isEv:            { type: 'boolean' },
    greenScore:      { type: 'integer' },

    // Status
    status:          { type: 'keyword' },
    isAvailable:     { type: 'boolean' },
    averageRating:   { type: 'float' },
    totalReviews:    { type: 'integer' },
    totalBookings:   { type: 'integer' },

    // Images
    primaryImageUrl: { type: 'keyword', index: false },

    // Timestamps
    createdAt:       { type: 'date' },
    updatedAt:       { type: 'date' },
  },
};

// ─── Index Management ───────────────────────────────────────

/**
 * Creates the vehicles index if it doesn't exist.
 * Called on service startup.
 */
export async function ensureIndex(): Promise<void> {
  try {
    const exists = await esClient.indices.exists({ index: INDEX_NAME });
    if (!exists) {
      await esClient.indices.create({
        index: INDEX_NAME,
        body: {
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0,
          },
          mappings: vehicleMapping,
        },
      });
      logger.info(`🔍 Elasticsearch index "${INDEX_NAME}" created`);
    } else {
      logger.info(`🔍 Elasticsearch index "${INDEX_NAME}" already exists`);
    }
  } catch (error) {
    logger.error('Failed to ensure Elasticsearch index:', error);
  }
}

// ─── Document Operations ────────────────────────────────────

/** Shape of a vehicle document in Elasticsearch */
export interface EsVehicleDoc {
  id: string;
  ownerId: string;
  title: string;
  description: string | null;
  slug: string;
  type: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  fuelType: string;
  transmission: string;
  seats: number;
  hourlyRate: number;
  dailyRate: number;
  weeklyRate: number | null;
  monthlyRate: number | null;
  currency: string;
  location: { lat: number; lon: number };
  address: string;
  city: string;
  features: string[];
  isEv: boolean;
  greenScore: number;
  status: string;
  isAvailable: boolean;
  averageRating: number;
  totalReviews: number;
  totalBookings: number;
  primaryImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Indexes (upserts) a vehicle document in Elasticsearch.
 */
export async function indexVehicle(doc: EsVehicleDoc): Promise<void> {
  try {
    await esClient.index({
      index: INDEX_NAME,
      id: doc.id,
      document: doc,
    });
    logger.debug(`🔍 ES indexed vehicle: ${doc.id}`);
  } catch (error) {
    logger.error(`ES indexing failed for ${doc.id}:`, error);
  }
}

/**
 * Removes a vehicle from the Elasticsearch index.
 */
export async function removeVehicleFromIndex(vehicleId: string): Promise<void> {
  try {
    await esClient.delete({ index: INDEX_NAME, id: vehicleId });
    logger.debug(`🔍 ES removed vehicle: ${vehicleId}`);
  } catch (error) {
    logger.error(`ES removal failed for ${vehicleId}:`, error);
  }
}
