import express from "express";
import cors from "cors";
import { addToQueueHandler, cancelTranscodeJobHandler, createJobHandler, getJobHandler, getStreamUrlHandler, listJobsHandler, retryTranscodeJobHandler } from "./jobs/job.controller";
import { completeUploadHandler, createJobUploadHandler, presignPartsHandler, uploadVideoHandler } from "./upload/upload.controller";

export const app = express();
app.use(cors());
app.use(express.json());

// Job routes
app.post("/jobs", createJobHandler);
app.get("/jobs", listJobsHandler);
app.get("/jobs/:id", getJobHandler);
app.get("/jobs/:id/stream-url", getStreamUrlHandler);
app.put("/jobs/:id", retryTranscodeJobHandler);
app.post("/jobs/:id/cancel", cancelTranscodeJobHandler);
app.post("/jobs/addToQueue", addToQueueHandler);

// Upload routes
app.post("/upload/video", uploadVideoHandler);          // legacy single-presign flow
app.post("/uploads/create-job", createJobUploadHandler); // create job + initiate multipart
app.post("/uploads/parts/presign", presignPartsHandler);
app.post("/uploads/complete", completeUploadHandler);
