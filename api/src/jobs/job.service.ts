import { prisma } from "../config/db";
import { redis } from "../config/redis";
import { env } from "../config/env";

export async function createJob(inputUrl: string, outputSpec: any) {
  const job = await prisma.job.create({
    data: {
      status: "CREATED",
      inputUrl,
      outputSpec,
    },
  });

  await prisma.job.update({
    where: { id: job.id },
    data: { status: "QUEUED" },
  });

  await redis.lpush("transcode:queue", job.id);

  return job;
}

export async function getJob(jobId: string) {
  return prisma.job.findUnique({ where: { id: jobId } });
}

export async function retryTranscodeJob(jobId: string) {
  const updatedJob = await prisma.job.update({
    where: { id: jobId },
    data: { status: "QUEUED", retries: { increment: 1 } },
  });

  await redis.lpush("transcode:queue", updatedJob.id);
  return updatedJob;
}

export async function cancelTranscodeJob(jobId: string) {
  const updatedJob = await prisma.job.update({
    where: { id: jobId },
    data: { status: "CANCELLED_REQUESTED" },
  });

  await redis.publish("transcode:cancel", jobId);
  return updatedJob;
}

// Creates a job in UPLOADING status with a pre-determined output URL before upload starts
export async function createUploadJob(
  jobId: string,
  outputUrl: string,
  outputSpec: { format: string }
) {
  return prisma.job.create({
    data: {
      id: jobId,
      status: "UPLOADING",
      inputUrl: "",
      outputUrl,
      outputSpec,
    },
  });
}

// After multipart upload completes: sets inputUrl, transitions to QUEUED, pushes to Redis
export async function queueJobAfterUpload(jobId: string, inputUrl: string) {
  const job = await prisma.job.update({
    where: { id: jobId },
    data: { inputUrl, status: "QUEUED" },
  });
  await redis.lpush("transcode:queue", jobId);
  return job;
}

// Returns the CloudFront stream URL for a completed job.
// outputUrl stored in DB is s3://{bucket}/{jobId}/hls/master.m3u8 —
// we map it to https://{cloudfront}/{jobId}/hls/master.m3u8
export async function getStreamUrl(jobId: string): Promise<string> {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { status: true, outputUrl: true },
  });

  if (!job) throw Object.assign(new Error("Job not found"), { code: "NOT_FOUND" });
  if (job.status !== "COMPLETED") {
    throw Object.assign(
      new Error("Stream is not available until transcoding completes"),
      { code: "NOT_READY", status: job.status }
    );
  }
  if (!job.outputUrl) throw Object.assign(new Error("Job has no output URL"), { code: "NOT_FOUND" });

  // Strip s3://{bucket}/ prefix and attach CloudFront domain
  const s3Path = job.outputUrl.replace(/^s3:\/\/[^/]+\//, "");
  return `https://${env.cloudfrontDomain}/${s3Path}`;
}

export async function addJobToQueue(jobId: string, outputSpec: any) {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) {
    return null;
  }

  // Check if job is in UPLOADING status
  if (job.status !== "UPLOADING") {
    throw new Error(`Job ${jobId} is not in UPLOADING status. Current status: ${job.status}`);
  }

  // Update job with outputSpec and change status to QUEUED
  const updatedJob = await prisma.job.update({
    where: { id: jobId },
    data: {
      status: "QUEUED",
      outputSpec,
    },
  });

  // Add to transcode queue
  await redis.lpush("transcode:queue", jobId);

  return updatedJob;
}