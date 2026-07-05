import { z } from "zod";

const positiveInt = (field: string) =>
  z.coerce.number().int().positive(`${field} must be a positive integer`);

export function formatValidationError(error: z.ZodError): { error: string } {
  return { error: error.issues.map((issue) => issue.message).join("; ") };
}

export const uploadVideoSchema = z.object({
  fileName: z.string().min(1, "FileName is required"),
  contentType: z.string().optional().default("video/mp4"),
});

export const initiateUploadSchema = z.object({
  fileName: z.string().min(1, "fileName is required"),
  fileType: z.string().min(1, "fileType is required"),
  fileSize: positiveInt("fileSize"),
});

export const presignPartsSchema = z.object({
  uploadId: z.string().min(1, "uploadId is required"),
  key: z.string().min(1, "key is required"),
  partNumbers: z
    .array(z.coerce.number().int().min(1, "partNumber must be >= 1"))
    .min(1, "partNumbers must not be empty"),
});

const uploadedPartSchema = z.object({
  partNumber: z.coerce.number().int().min(1),
  etag: z.string().min(1, "etag is required"),
});

export const completeUploadSchema = z
  .object({
    uploadId: z.string().min(1, "uploadId is required"),
    key: z.string().min(1, "key is required"),
    totalParts: positiveInt("totalParts"),
    parts: z.array(uploadedPartSchema).min(1, "parts must not be empty"),
  })
  .superRefine((data, ctx) => {
    if (data.parts.length !== data.totalParts) {
      ctx.addIssue({
        code: "custom",
        message: `parts length (${data.parts.length}) must equal totalParts (${data.totalParts})`,
      });
      return;
    }

    const seen = new Set<number>();
    for (const part of data.parts) {
      if (part.partNumber > data.totalParts) {
        ctx.addIssue({
          code: "custom",
          message: `partNumber ${part.partNumber} exceeds totalParts ${data.totalParts}`,
        });
      }
      if (seen.has(part.partNumber)) {
        ctx.addIssue({ code: "custom", message: `duplicate partNumber: ${part.partNumber}` });
      }
      seen.add(part.partNumber);
    }

    for (let i = 1; i <= data.totalParts; i++) {
      if (!seen.has(i)) {
        ctx.addIssue({ code: "custom", message: `missing partNumber: ${i}` });
      }
    }
  });

