import express from "express";
import { addToQueueHandler, cancelTranscodeJobHandler, createJobHandler, getJobHandler, retryTranscodeJobHandler } from "./jobs/job.controller";
import { completeUploadHandler, initiateUploadHandler, presignPartsHandler, uploadVideoHandler } from "./upload/upload.controller";
import cors from "cors";
export const app = express();
app.use(cors());
app.use(express.json());

app.post("/jobs", createJobHandler);
app.get("/jobs/:id", getJobHandler);
app.put("/jobs/:id", retryTranscodeJobHandler);
app.post("/jobs/:id/cancel", cancelTranscodeJobHandler);
app.post("/upload/video", uploadVideoHandler);
app.post("/uploads/initiate", initiateUploadHandler);
app.post("/uploads/parts/presign", presignPartsHandler);
app.post("/uploads/complete", completeUploadHandler);
app.post("/jobs/addToQueue", addToQueueHandler);