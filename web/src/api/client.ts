import type { Job, OutputFormat } from "../types/job";

const BASE = "/api";

interface ApiError {
  message?: string;
  error?: string;
  errors?: unknown;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    let body: ApiError = {};
    try {
      body = await res.json();
    } catch {
      // ignore parse error
    }
    const msg =
      body.message ?? body.error ?? `HTTP ${res.status} ${res.statusText}`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return res.json() as Promise<T>;
}

export function createJobFromUrl(
  inputUrl: string,
  format: OutputFormat
): Promise<Job> {
  return request<Job>("/jobs", {
    method: "POST",
    body: JSON.stringify({ inputUrl, outputSpec: { format } }),
  });
}

export function getPresignedUploadUrl(
  fileName: string,
  contentType: string
): Promise<{ jobId: string; uploadUrl: string }> {
  return request("/upload/video", {
    method: "POST",
    body: JSON.stringify({ fileName, contentType }),
  });
}

export function uploadFileToS3(
  uploadUrl: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`S3 upload failed: HTTP ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error("S3 upload network error"));
    xhr.send(file);
  });
}

export function addJobToQueue(
  jobId: string,
  format: OutputFormat
): Promise<Job> {
  return request<Job>("/jobs/addToQueue", {
    method: "POST",
    body: JSON.stringify({ jobId, outputSpec: { format } }),
  });
}

export function getJob(id: string): Promise<Job> {
  return request<Job>(`/jobs/${id}`);
}

export function cancelJob(id: string): Promise<Job> {
  return request<Job>(`/jobs/${id}/cancel`, { method: "POST" });
}

export function retryJob(id: string): Promise<Job> {
  return request<Job>(`/jobs/${id}`, { method: "PUT" });
}
