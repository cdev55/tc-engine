import { Request, Response } from "express";
import {
  completeUploadSchema,
  formatValidationError,
  initiateUploadSchema,
  presignPartsSchema,
  uploadVideoSchema,
} from "./upload.validation";
import { completeMultipartUpload, generateVideoUploadUrl, initiateMultipartUpload, presignParts } from "./upload.service";
import { prisma } from "../config/db";

export async function uploadVideoHandler(req: Request, res: Response) {
  const parsed = uploadVideoSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(formatValidationError(parsed.error));
  }

  try {
    // Create job with UPLOADING status
    const job = await prisma.job.create({
      data: {
        status: "UPLOADING",
        inputUrl: "", // Will be set after generating presigned URL
        outputSpec: {}, // Empty for now, will be set when adding to queue
      },
    });

    // Generate presigned URL using job ID
    const { uploadUrl, key, inputUrl } = await generateVideoUploadUrl(
      job.id,
      parsed.data.fileName,
      parsed.data.contentType
    );

    // Update job with the inputUrl
    await prisma.job.update({
      where: { id: job.id },
      data: { inputUrl },
    });

    res.json({
      jobId: job.id,
      uploadUrl,
    });
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
}

export async function initiateUploadHandler(req: Request, res: Response) {
  const parsed = initiateUploadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(formatValidationError(parsed.error));
  }

  const { fileName, fileType, fileSize } = parsed.data;

  try {
    const result = await initiateMultipartUpload(fileName, fileType, fileSize);
    res.status(200).json(result);
  } catch (error) {
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

export async function completeUploadHandler(req: Request, res: Response) {
  const parsed = completeUploadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(formatValidationError(parsed.error));
  }

  const { uploadId, key, parts } = parsed.data;

  try {
    const result = await completeMultipartUpload(uploadId, key, parts);
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof Error) {
      const s3ClientErrors = ["NoSuchUpload", "InvalidPart", "InvalidPartOrder", "EntityTooSmall"];
      if (s3ClientErrors.some((code) => error.name === code || error.message.includes(code))) {
        return res.status(400).json({ error: error.message });
      }
    }
    console.error("Error completing multipart upload:", error);
    res.status(500).json({ error: "Failed to complete multipart upload" });
  }
}

