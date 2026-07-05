import type { Job, OutputFormat } from "../types/job";

const BASE = "http://localhost:3000";

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

// Creates a job (UPLOADING) and initiates a multipart upload in one request.
// outputUrl is predetermined on the server to s3://{bucket}/{jobId}/hls/master.m3u8
export function createJobUpload(
  fileName: string,
  fileType: string,
  fileSize: number,
  outputFormat: string
): Promise<{ jobId: string; uploadId: string; key: string; chunkSize: number; totalParts: number }> {
  return request("/uploads/create-job", {
    method: "POST",
    body: JSON.stringify({ fileName, fileType, fileSize, outputFormat }),
  });
}

export function presignParts(
  uploadId: string,
  key: string,
  partNumbers: number[]
): Promise<{ parts: { partNumber: number; url: string }[] }> {
  return request("/uploads/parts/presign", {
    method: "POST",
    body: JSON.stringify({ uploadId, key, partNumbers }),
  });
}

// Completes the multipart upload; server sets inputUrl + queues the job for transcoding.
export function completeUpload(
  jobId: string,
  uploadId: string,
  key: string,
  totalParts: number,
  parts: { partNumber: number; etag: string }[]
): Promise<Job> {
  return request<Job>("/uploads/complete", {
    method: "POST",
    body: JSON.stringify({ jobId, uploadId, key, totalParts, parts }),
  });
}

export async function uploadPartToS3(url: string, chunk: Blob): Promise<string> {
  const res = await fetch(url, { method: "PUT", body: chunk });
  if (!res.ok) throw new Error(`Part upload failed: HTTP ${res.status}`);
  const etag = res.headers.get("ETag");
  if (!etag) throw new Error("S3 did not return an ETag for this part");
  return etag;
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

// Only succeeds when job status is COMPLETED; returns 403 otherwise
export function getStreamUrl(id: string): Promise<{ streamUrl: string }> {
  return request<{ streamUrl: string }>(`/jobs/${id}/stream-url`);
}

export function cancelJob(id: string): Promise<Job> {
  return request<Job>(`/jobs/${id}/cancel`, { method: "POST" });
}

export function retryJob(id: string): Promise<Job> {
  return request<Job>(`/jobs/${id}`, { method: "PUT" });
}
