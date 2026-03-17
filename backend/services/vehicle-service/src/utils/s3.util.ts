/**
 * @file utils/s3.util.ts
 * @description AWS S3 utility for uploading vehicle images and documents,
 * generating signed URLs, and deleting objects.
 * Uses AWS SDK v3.
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { config } from '../config';
import { logger } from './logger';

// ─── S3 Client ──────────────────────────────────────────────

const s3Client = new S3Client({
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
});

// ─── Types ──────────────────────────────────────────────────

export interface UploadResult {
  /** Public URL (non-signed) */
  url: string;
  /** S3 object key (used for deletion and signed URLs) */
  key: string;
}

// ─── Upload ─────────────────────────────────────────────────

/**
 * Uploads a file buffer to S3.
 *
 * @param buffer - File contents
 * @param originalName - Original filename (used for extension)
 * @param folder - S3 "folder" prefix (e.g. "vehicles/images", "vehicles/documents")
 * @param contentType - MIME type
 * @returns Upload result with URL and key
 */
export async function uploadToS3(
  buffer: Buffer,
  originalName: string,
  folder: string,
  contentType: string,
): Promise<UploadResult> {
  const ext = path.extname(originalName);
  const key = `${folder}/${uuidv4()}${ext}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: config.aws.s3Bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );

  const url = `https://${config.aws.s3Bucket}.s3.${config.aws.region}.amazonaws.com/${key}`;

  logger.info(`📤 S3 upload: ${key} (${(buffer.length / 1024).toFixed(1)} KB)`);
  return { url, key };
}

// ─── Signed URL ─────────────────────────────────────────────

/**
 * Generates a time-limited signed URL for secure read access.
 *
 * @param key - S3 object key
 * @param expiresIn - URL validity in seconds (default from config)
 * @returns Presigned URL string
 */
export async function getSignedDownloadUrl(
  key: string,
  expiresIn: number = config.aws.signedUrlExpiry,
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: config.aws.s3Bucket,
    Key: key,
  });
  return getSignedUrl(s3Client, command, { expiresIn });
}

// ─── Delete ─────────────────────────────────────────────────

/**
 * Deletes an object from S3.
 *
 * @param key - S3 object key to delete
 */
export async function deleteFromS3(key: string): Promise<void> {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: config.aws.s3Bucket,
      Key: key,
    }),
  );
  logger.info(`🗑️  S3 delete: ${key}`);
}

/**
 * Deletes multiple objects from S3.
 *
 * @param keys - Array of S3 object keys to delete
 */
export async function deleteMultipleFromS3(keys: string[]): Promise<void> {
  await Promise.all(keys.map((key) => deleteFromS3(key)));
}
