import { Request, Response } from "express";
import { createJobSchema } from "./job.validation";
import { cancelTranscodeJob, createJob, getJob, retryTranscodeJob } from "./job.service";

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