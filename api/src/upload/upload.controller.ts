import { randomUUID } from "crypto";
import { Request, Response } from "express";
import {
  completeUploadSchema,
  createJobUploadSchema,
  formatValidationError,
  presignPartsSchema,
  uploadVideoSchema,
} from "./upload.validation";
import { completeMultipartUpload, generateVideoUploadUrl, initiateMultipartUpload, presignParts } from "./upload.service";
import { createUploadJob, queueJobAfterUpload } from "../jobs/job.service";
import { prisma } from "../config/db";
import { env } from "../config/env";

// Legacy single-presigned-URL handler (kept for backward compatibility)
export async function uploadVideoHandler(req: Request, res: Response) {
  const parsed = uploadVideoSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(formatValidationError(parsed.error));
  }

  try {
    const job = await prisma.job.create({
      data: {
        status: "UPLOADING",
        inputUrl: "",
        outputSpec: {},
      },
    });

    const { uploadUrl, key, inputUrl } = await generateVideoUploadUrl(
      job.id,
      parsed.data.fileName,
      parsed.data.contentType
    );

    await prisma.job.update({
      where: { id: job.id },
      data: { inputUrl },
    });

    res.json({ jobId: job.id, uploadUrl });
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
}

// Creates a job in UPLOADING status and initiates a multipart upload in one request.
// Key layout: {jobId}/raw/original.{ext}
// outputUrl is predetermined to: s3://{bucket}/{jobId}/hls/master.m3u8
export async function createJobUploadHandler(req: Request, res: Response) {
  const parsed = createJobUploadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(formatValidationError(parsed.error));
  }

  const { fileName, fileType, fileSize, outputFormat } = parsed.data;
  const jobId = randomUUID();
  const outputUrl = `s3://${env.s3Bucket}/${jobId}/hls/master.m3u8`;

  try {
    await createUploadJob(jobId, outputUrl, { format: outputFormat });
  } catch (error) {
    console.error("Error creating upload job:", error);
    return res.status(500).json({ error: "Failed to create upload job" });
  }

  try {
    const result = await initiateMultipartUpload(jobId, fileName, fileType, fileSize);
    res.status(201).json({ jobId, ...result });
  } catch (error) {
    // S3 initiate failed — remove the job we just created to avoid orphan records
    await prisma.job.delete({ where: { id: jobId } }).catch(() => {});
    console.error("Error initiating multipart upload:", error);
    res.status(500).json({ error: "Failed to initiate multipart upload" });
  }
}

export async function presignPartsHandler(req: Request, res: Response) {
  const parsed = presignPartsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(formatValidationError(parsed.error));
  }

  const { uploadId, key, partNumbers } = parsed.data;

  try {
    const result = await presignParts(uploadId, key, partNumbers);
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Cannot presign more than")) {
      return res.status(400).json({ error: error.message });
    }
    console.error("Error presigning part URLs:", error);
    res.status(500).json({ error: "Failed to presign part URLs" });
  }
}

// Completes the S3 multipart upload, sets inputUrl on the job, and queues it for transcoding.
export async function completeUploadHandler(req: Request, res: Response) {
  const parsed = completeUploadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(formatValidationError(parsed.error));
  }

  const { jobId, uploadId, key, parts } = parsed.data;

  try {
    await completeMultipartUpload(uploadId, key, parts);
  } catch (error) {
    if (error instanceof Error) {
      const s3ClientErrors = ["NoSuchUpload", "InvalidPart", "InvalidPartOrder", "EntityTooSmall"];
      if (s3ClientErrors.some((code) => error.name === code || error.message.includes(code))) {
        return res.status(400).json({ error: error.message });
      }
    }
    console.error("Error completing multipart upload:", error);
    return res.status(500).json({ error: "Failed to complete multipart upload" });
  }

  try {
    const inputUrl = `s3://${env.s3Bucket}/${key}`;
    const job = await queueJobAfterUpload(jobId, inputUrl);
    res.status(200).json(job);
  } catch (error) {
    // S3 upload succeeded but DB/queue failed — log clearly for manual recovery
    console.error(`Upload complete for job ${jobId} but failed to queue:`, error);
    res.status(500).json({ error: "Upload succeeded but failed to start transcoding" });
  }
}
