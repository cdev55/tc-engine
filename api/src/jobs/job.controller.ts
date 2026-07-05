import { Request, Response } from "express";
import { addToQueueSchema, createJobSchema } from "./job.validation";
import { addJobToQueue, cancelTranscodeJob, createJob, getJob, getStreamUrl, retryTranscodeJob } from "./job.service";

export async function createJobHandler(req: Request, res: Response) {
    const parsed = createJobSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json(parsed.error);
    }

    const job = await createJob(
        parsed.data.inputUrl,
        parsed.data.outputSpec
    );

    res.status(201).json(job);
}

export async function getJobHandler(req: Request, res: Response) {
    const jobId = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
    const job = await getJob(jobId);
    if (!job) {
        return res.status(404).json({ error: "Job not found" });
    }

    res.json(job);
}


export async function retryTranscodeJobHandler(req: Request, res: Response) {
    const jobId = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
    const job = await retryTranscodeJob(jobId);
    if (!job) {
        return res.status(404).json({ error: "Job not found" });
    }

    res.json(job);
}

export async function cancelTranscodeJobHandler(req: Request, res: Response) {
    const jobId = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
    const job = await cancelTranscodeJob(jobId);
    if (!job) {
        return res.status(404).json({ error: "Job not found" });
    }
    res.json(job);
}

export async function getStreamUrlHandler(req: Request, res: Response) {
  const jobId = typeof req.params.id === "string" ? req.params.id : req.params.id[0];

  try {
    const streamUrl = await getStreamUrl(jobId);
    res.json({ streamUrl });
  } catch (error) {
    if (error instanceof Error) {
      const code = (error as any).code;
      if (code === "NOT_FOUND") return res.status(404).json({ error: error.message });
      if (code === "NOT_READY") {
        return res.status(403).json({ error: error.message, status: (error as any).status });
      }
    }
    console.error("Error resolving stream URL:", error);
    res.status(500).json({ error: "Failed to resolve stream URL" });
  }
}

export async function addToQueueHandler(req: Request, res: Response) {
    const parsed = addToQueueSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json(parsed.error);
    }

    try {
        const job = await addJobToQueue(parsed.data.jobId, parsed.data.outputSpec);
        if (!job) {
            return res.status(404).json({ error: "Job not found" });
        }
        res.json(job);
    } catch (error) {
        if (error instanceof Error) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: "Failed to add job to queue" });
    }
}