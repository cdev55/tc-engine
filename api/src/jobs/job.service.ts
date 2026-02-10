import { prisma } from "../config/db";
import { redis } from "../config/redis";

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