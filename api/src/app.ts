import express from "express";
import { createJobHandler, getJobHandler } from "./jobs/job.controller";

export const app = express();
app.use(express.json());

app.post("/jobs", createJobHandler);
app.get("/jobs/:id", getJobHandler);
