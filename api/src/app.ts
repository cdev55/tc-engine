import express from "express";
import { createJobHandler, getJobHandler, retryTranscodeJobHandler } from "./jobs/job.controller";

export const app = express();
app.use(express.json());

app.post("/jobs", createJobHandler);
app.get("/jobs/:id", getJobHandler);
app.put("/jobs/:id", retryTranscodeJobHandler);
app.post("/jobs/:id/cancel", cancelTranscodeJobHandler);