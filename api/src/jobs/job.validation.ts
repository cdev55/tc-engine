import { z } from "zod";

export const createJobSchema = z.object({
  inputUrl: z.url(),
  outputSpec: z.object({
    format: z.enum(["mp4", "mkv"]),
  }),
});
