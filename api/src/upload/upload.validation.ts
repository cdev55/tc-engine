import { z } from "zod";

export const uploadVideoSchema = z.object({
  fileName: z.string().min(1, "FileName is required"),
  contentType: z.string().optional().default("video/mp4"),
});

