import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
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

