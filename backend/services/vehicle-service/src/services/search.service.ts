/**
 * @file services/search.service.ts
 * @description Elasticsearch-powered vehicle search with geo-filtering,
 * faceted search, sorting, and pagination.
 */

import { esClient } from '../utils/elasticsearch.util';
import { getCachedSearch, cacheSearch } from '../utils/redis.util';
import { config } from '../config';
import { logger } from '../utils/logger';
import crypto from 'crypto';

// ─── Search Params ──────────────────────────────────────────

export interface SearchParams {
  /** Free-text query (searches title, description, brand, model) */
  query?: string;

  /** Geo-filter: latitude */
  lat?: number;
  /** Geo-filter: longitude */
  lng?: number;
  /** Geo-filter: radius in km (default 25) */
  radius?: number;

  /** Filter by vehicle type */
  type?: string;
  /** Filter by fuel type */
  fuelType?: string;
  /** Filter by transmission */
  transmission?: string;
  /** Filter by city */
  city?: string;

  /** Minimum daily rate */
  minPrice?: number;
  /** Maximum daily rate */
  maxPrice?: number;

  /** Minimum average rating */
  minRating?: number;
  /** Only show available vehicles */
  availableOnly?: boolean;
  /** Only show EV vehicles */
  evOnly?: boolean;

  /** Sort field: 'price' | 'rating' | 'distance' | 'newest' */
  sortBy?: string;
  /** Sort direction: 'asc' | 'desc' */
  sortOrder?: string;

  /** Pagination */
  page?: number;
  limit?: number;
}

// ─── Search Response ────────────────────────────────────────

export interface SearchResult {
  vehicles: Record<string, unknown>[];
  total: number;
  page: number;
  totalPages: number;
  took: number;
}

// ─── Query Builder ──────────────────────────────────────────

/**
 * Builds an Elasticsearch query from the search parameters.
 */
function buildQuery(params: SearchParams): Record<string, unknown> {
  const must: Record<string, unknown>[] = [];
  const filter: Record<string, unknown>[] = [];

  // Only show approved, non-deleted vehicles
  filter.push({ term: { status: 'APPROVED' } });

  // Free-text search
  if (params.query) {
    must.push({
      multi_match: {
        query: params.query,
        fields: ['title^3', 'description', 'brand^2', 'model^2', 'city'],
        fuzziness: 'AUTO',
      },
    });
  }

  // Vehicle type filter
  if (params.type) {
    filter.push({ term: { type: params.type.toUpperCase() } });
  }

  // Fuel type filter
  if (params.fuelType) {
    filter.push({ term: { fuelType: params.fuelType.toUpperCase() } });
  }

  // Transmission filter
  if (params.transmission) {
    filter.push({ term: { transmission: params.transmission.toUpperCase() } });
  }

  // City filter
  if (params.city) {
    filter.push({ term: { city: params.city } });
  }

  // Price range filter
  if (params.minPrice !== undefined || params.maxPrice !== undefined) {
    const range: Record<string, number> = {};
    if (params.minPrice !== undefined) range.gte = params.minPrice;
    if (params.maxPrice !== undefined) range.lte = params.maxPrice;
    filter.push({ range: { dailyRate: range } });
  }

  // Rating filter
  if (params.minRating !== undefined) {
    filter.push({ range: { averageRating: { gte: params.minRating } } });
  }

  // Availability filter
  if (params.availableOnly) {
    filter.push({ term: { isAvailable: true } });
  }

  // EV-only filter
  if (params.evOnly) {
    filter.push({ term: { isEv: true } });
  }

  // Geo-distance filter
  if (params.lat !== undefined && params.lng !== undefined) {
    filter.push({
      geo_distance: {
        distance: `${params.radius || 25}km`,
        location: { lat: params.lat, lon: params.lng },
      },
    });
  }

  return {
    bool: {
      must: must.length > 0 ? must : [{ match_all: {} }],
      filter,
    },
  };
}

/**
 * Builds sort clauses from params.
 */
function buildSort(params: SearchParams): Record<string, unknown>[] {
  const order = params.sortOrder === 'asc' ? 'asc' : 'desc';

  switch (params.sortBy) {
    case 'price':
      return [{ dailyRate: { order } }];
    case 'rating':
      return [{ averageRating: { order: 'desc' } }];
    case 'newest':
      return [{ createdAt: { order: 'desc' } }];
    case 'distance':
      if (params.lat !== undefined && params.lng !== undefined) {
        return [{
          _geo_distance: {
            location: { lat: params.lat, lon: params.lng },
            order: 'asc',
            unit: 'km',
          },
        }];
      }
      return [{ createdAt: { order: 'desc' } }];
    default:
      // Default: relevance score, then newest
      return [{ _score: { order: 'desc' } }, { createdAt: { order: 'desc' } }];
  }
}

// ═══════════════════════════════════════════════════════════
// SEARCH
// ═══════════════════════════════════════════════════════════

/**
 * Searches vehicles using Elasticsearch with geo-filtering,
 * faceted search, and Redis result caching.
 *
 * @param params - Search and filter parameters
 * @returns Paginated search results
 */
export async function searchVehicles(params: SearchParams): Promise<SearchResult> {
  const page = params.page || 1;
  const limit = Math.min(params.limit || 20, 100);
  const from = (page - 1) * limit;

  // Check cache
  const queryHash = crypto.createHash('md5').update(JSON.stringify(params)).digest('hex');
  const cached = await getCachedSearch<SearchResult>(queryHash);
  if (cached) {
    logger.debug(`🔍 Search cache hit: ${queryHash}`);
    return cached;
  }

  // Execute Elasticsearch query
  const query = buildQuery(params);
  const sort = buildSort(params);

  const response = await esClient.search({
    index: config.elasticsearch.index,
    body: {
      query,
      sort,
      from,
      size: limit,
      _source: true,
      // Include distance in response if geo-sorting
      ...(params.lat !== undefined && params.lng !== undefined
        ? {
            script_fields: {
              distance: {
                script: {
                  source: "doc['location'].arcDistance(params.lat, params.lon) / 1000",
                  params: { lat: params.lat, lon: params.lng },
                },
              },
            },
          }
        : {}),
    },
  });

  const hits = response.hits.hits;
  const total = typeof response.hits.total === 'number'
    ? response.hits.total
    : response.hits.total?.value ?? 0;

  const vehicles = hits.map((hit) => ({
    ...(hit._source as Record<string, unknown>),
    _score: hit._score,
    ...(hit.fields?.distance ? { distance: Math.round(hit.fields.distance[0] as number * 10) / 10 } : {}),
  }));

  const result: SearchResult = {
    vehicles,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    took: response.took ?? 0,
  };

  // Cache result
  await cacheSearch(queryHash, result);

  logger.info(`🔍 Search: ${total} results in ${result.took}ms (page ${page})`);
  return result;
}

// ═══════════════════════════════════════════════════════════
// AI RECOMMENDATIONS
// ═══════════════════════════════════════════════════════════

/**
 * Returns AI-style vehicle recommendations based on user context.
 * Uses Elasticsearch's more_like_this query + green score boosting.
 *
 * @param vehicleId - Reference vehicle to base recommendations on
 * @param limit - Number of recommendations
 */
export async function getRecommendations(
  vehicleId: string,
  lat?: number,
  lng?: number,
  limit: number = 6,
): Promise<Record<string, unknown>[]> {
  const body: Record<string, unknown> = {
    query: {
      bool: {
        must: [
          {
            more_like_this: {
              fields: ['title', 'brand', 'model', 'type', 'features'],
              like: [{ _index: config.elasticsearch.index, _id: vehicleId }],
              min_term_freq: 1,
              min_doc_freq: 1,
              max_query_terms: 12,
            },
          },
        ],
        filter: [
          { term: { status: 'APPROVED' } },
          { term: { isAvailable: true } },
        ],
        should: [
          { range: { greenScore: { gte: 70, boost: 2 } } },
          { term: { isEv: { value: true, boost: 3 } } },
        ],
      },
    },
    size: limit,
  };

  // Add geo-distance sort if location provided
  if (lat !== undefined && lng !== undefined) {
    body.sort = [{
      _geo_distance: {
        location: { lat, lon: lng },
        order: 'asc',
        unit: 'km',
      },
    }];
  }

  const response = await esClient.search({
    index: config.elasticsearch.index,
    body,
  });

  return response.hits.hits.map((hit) => ({
    ...(hit._source as Record<string, unknown>),
    _score: hit._score,
  }));
}
