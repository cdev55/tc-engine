import { DeleteObjectsCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { s3Client } from "../config/s3";
import { env } from "../config/env";

async function listKeysWithPrefix(prefix: string): Promise<string[]> {
  const keys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const response = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: env.s3Bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    );

    for (const object of response.Contents ?? []) {
      if (object.Key) keys.push(object.Key);
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return keys;
}

async function deleteObjectKeys(keys: string[]): Promise<void> {
  const uniqueKeys = [...new Set(keys)];
  if (uniqueKeys.length === 0) return;

  for (let i = 0; i < uniqueKeys.length; i += 1000) {
    const batch = uniqueKeys.slice(i, i + 1000);
    await s3Client.send(
      new DeleteObjectsCommand({
        Bucket: env.s3Bucket,
        Delete: {
          Objects: batch.map((Key) => ({ Key })),
          Quiet: true,
        },
      })
    );
  }
}

// Removes all S3 objects for a job: {jobId}/raw, {jobId}/hls, and legacy upload paths.
export async function deleteJobStorage(jobId: string, inputUrl: string): Promise<void> {
  const keys: string[] = [];

  for (const prefix of [`${jobId}/`, `uploads/videos/${jobId}`]) {
    keys.push(...(await listKeysWithPrefix(prefix)));
  }

  const bucketPrefix = `s3://${env.s3Bucket}/`;
  if (inputUrl.startsWith(bucketPrefix)) {
    keys.push(inputUrl.slice(bucketPrefix.length));
  }

  await deleteObjectKeys(keys);
}
