import {
  S3Client,
  PutObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { env } from "../config/env";

const s3Client = new S3Client({
  region: env.s3Region,
});

export async function generateVideoUploadUrl(
  jobId: string,
  fileName: string,
  contentType: string = "video/mp4"
): Promise<{ uploadUrl: string; key: string; inputUrl: string }> {
  // Use jobId in the S3 key
  const fileExtension = fileName.split(".").pop() || "mp4";
  const key = `uploads/videos/${jobId}.${fileExtension}`;

  // Create PutObject command
  const command = new PutObjectCommand({
    Bucket: env.s3Bucket,
    Key: key,
    ContentType: contentType,
  });

  // Generate presigned URL (valid for 1 hour)
  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: 3600, // 1 hour
  });

  // Generate S3 URL in s3:// format (used by worker)
  const inputUrl = `s3://${env.s3Bucket}/${key}`;

  return {
    uploadUrl,
    key,
    inputUrl,
  };
}

const GB = 1024 * 1024 * 1024;

// Tiered chunk sizes keep part count in the ~200 range for all file sizes:
//   ≤ 5 GB  → 25 MB  (max ~205 parts)
//   ≤ 10 GB → 50 MB  (max ~205 parts)
//   > 10 GB → 100 MB (e.g. 25 GB → 250 parts)
function getChunkSize(fileSize: number): number {
  if (fileSize <= 5 * GB) return 25 * 1024 * 1024;
  if (fileSize <= 10 * GB) return 50 * 1024 * 1024;
  return 100 * 1024 * 1024;
}

export interface PresignedPart {
  partNumber: number;
  url: string;
}

export interface InitiateUploadResult {
  uploadId: string;
  key: string;
  chunkSize: number;
  totalParts: number;
}

export interface PresignPartsResult {
  parts: PresignedPart[];
}

function buildObjectKey(fileName: string): string {
  const ext = fileName.split(".").pop() || "mp4";
  return `videos/${randomUUID()}/original.${ext}`;
}

async function createMultipartUpload(key: string, contentType: string): Promise<string> {
  const { UploadId } = await s3Client.send(
    new CreateMultipartUploadCommand({
      Bucket: env.s3Bucket,
      Key: key,
      ContentType: contentType,
    })
  );

  if (!UploadId) throw new Error("S3 did not return an UploadId");
  return UploadId;
}

async function abortMultipartUpload(key: string, uploadId: string): Promise<void> {
  await s3Client.send(
    new AbortMultipartUploadCommand({
      Bucket: env.s3Bucket,
      Key: key,
      UploadId: uploadId,
    })
  );
}

async function presignPartUrl(key: string, uploadId: string, partNumber: number): Promise<string> {
  return getSignedUrl(
    s3Client,
    new UploadPartCommand({
      Bucket: env.s3Bucket,
      Key: key,
      UploadId: uploadId,
      PartNumber: partNumber,
    }),
    { expiresIn: 900 } // 15 minutes
  );
}

export async function initiateMultipartUpload(
  fileName: string,
  fileType: string,
  fileSize: number
): Promise<InitiateUploadResult> {
  const key = buildObjectKey(fileName);
  const chunkSize = getChunkSize(fileSize);
  const totalParts = Math.ceil(fileSize / chunkSize);

  const uploadId = await createMultipartUpload(key, fileType);

  return { uploadId, key, chunkSize, totalParts };
}

export interface CompleteUploadResult {
  key: string;
  inputUrl: string;
  location?: string;
}

export interface UploadedPart {
  partNumber: number;
  etag: string;
}

export async function completeMultipartUpload(
  uploadId: string,
  key: string,
  parts: UploadedPart[]
): Promise<CompleteUploadResult> {
  // S3 requires parts to be sorted by partNumber
  const sortedParts = [...parts].sort((a, b) => a.partNumber - b.partNumber);

  const result = await s3Client.send(
    new CompleteMultipartUploadCommand({
      Bucket: env.s3Bucket,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: sortedParts.map((p) => ({ PartNumber: p.partNumber, ETag: p.etag })),
      },
    })
  );

  return {
    key,
    inputUrl: `s3://${env.s3Bucket}/${key}`,
    location: result.Location,
  };
}

export async function presignParts(
  uploadId: string,
  key: string,
  partNumbers: number[]
): Promise<PresignPartsResult> {
  if (partNumbers.length > env.presignBatchSize) {
    throw new Error(`Cannot presign more than ${env.presignBatchSize} parts per request`);
  }

  let parts: PresignedPart[];
  try {
    parts = await Promise.all(
      partNumbers.map(async (partNumber) => ({
        partNumber,
        url: await presignPartUrl(key, uploadId, partNumber),
      }))
    );
  } catch (err) {
    // Abort the multipart upload if URL generation fails to avoid dangling uploads
    await abortMultipartUpload(key, uploadId).catch(() => {});
    throw err;
  }

  return { parts };
}

