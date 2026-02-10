import { Request, Response } from "express";
import { uploadVideoSchema } from "./upload.validation";
import { generateVideoUploadUrl } from "./upload.service";
import { prisma } from "../config/db";

export async function uploadVideoHandler(req: Request, res: Response) {
  const parsed = uploadVideoSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(parsed.error);
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

