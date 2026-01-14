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
