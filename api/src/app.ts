import express from "express";
import { addToQueueHandler, cancelTranscodeJobHandler, createJobHandler, getJobHandler, retryTranscodeJobHandler } from "./jobs/job.controller";
import { uploadVideoHandler } from "./upload/upload.controller";

export const app = express();
app.use(express.json());

app.post("/jobs", createJobHandler);
app.get("/jobs/:id", getJobHandler);
app.put("/jobs/:id", retryTranscodeJobHandler);
app.post("/jobs/:id/cancel", cancelTranscodeJobHandler);
app.post("/upload/video", uploadVideoHandler);
app.post("/jobs/addToQueue", addToQueueHandler);