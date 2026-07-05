import { useRef, useState } from "react";
import type { Job, OutputFormat } from "../types/job";
import {
  createJobUpload,
  presignParts,
  uploadPartToS3,
  completeUpload,
} from "../api/client";
interface UploadFormProps {
  onJobCreated: (job: Job) => void;
}

type Step = "idle" | "initiate" | "upload" | "complete" | "done";

const STEP_LABELS: Record<Step, string> = {
  idle: "",
  initiate: "Preparing upload…",
  upload: "Uploading to storage…",
  complete: "Queuing for transcode…",
  done: "Done",
};

export function UploadForm({ onJobCreated }: UploadFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<OutputFormat>("mp4");
  const [step, setStep] = useState<Step>("idle");
  const [uploadPct, setUploadPct] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loading = step !== "idle" && step !== "done";

  const BATCH_SIZE = 50;

const submit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!file) return;
  setError(null);
  setUploadPct(0);

  try {
    // 1. Create job in DB + initiate multipart upload — returns jobId tied to S3 folder
    setStep("initiate");
    const { jobId, uploadId, key, chunkSize, totalParts } = await createJobUpload(
      file.name,
      file.type || "video/mp4",
      file.size,
      format
    );

    // 2. Presign and upload in batches of 50 parts
    setStep("upload");
    const allParts: { partNumber: number; etag: string }[] = [];
    let completedParts = 0;

    for (let batchStart = 1; batchStart <= totalParts; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE - 1, totalParts);
      const partNumbers = Array.from(
        { length: batchEnd - batchStart + 1 },
        (_, i) => batchStart + i
      );

      const { parts: presignedBatch } = await presignParts(uploadId, key, partNumbers);

      for (const { partNumber, url } of presignedBatch) {
        const start = (partNumber - 1) * chunkSize;
        const chunk = file.slice(start, start + chunkSize);

        const etag = await uploadPartToS3(url, chunk);
        allParts.push({ partNumber, etag });

        completedParts++;
        setUploadPct(Math.round((completedParts / totalParts) * 100));
      }
    }

    // 3. Complete upload — server sets inputUrl + queues job for transcoding
    setStep("complete");
    const job = await completeUpload(jobId, uploadId, key, totalParts, allParts);

    setStep("done");
    onJobCreated(job);
  } catch (err) {
    setError(err instanceof Error ? err.message : "Upload failed");
    setStep("idle");
  }
};

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  };

  return (
    <form className="submit-form" onSubmit={submit}>
      <div
        className={`dropzone${file ? " has-file" : ""}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          style={{ display: "none" }}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          disabled={loading}
        />
        {file ? (
          <div className="file-info">
            <span className="file-name">{file.name}</span>
            <span className="file-size">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
            <button
              type="button"
              className="remove-btn"
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="dropzone-hint">
            <span className="dropzone-icon">▶ or 📄</span>
            <p>Drag &amp; drop a video here or click to browse</p>
            <p className="dropzone-types">MP4, MOV, MKV, WebM</p>
          </div>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="upload-format">Output format</label>
        <select
          id="upload-format"
          value={format}
          onChange={(e) => setFormat(e.target.value as OutputFormat)}
          disabled={loading}
        >
          <option value="mp4">MP4</option>
          <option value="mkv">MKV</option>
        </select>
      </div>

      {loading && (
        <div className="upload-steps">
          <div className="upload-step-label">{STEP_LABELS[step]}</div>
          {step === "upload" && (
            <div className="progress-bar-track" style={{ marginTop: "6px" }}>
              <div className="progress-bar-fill" style={{ width: `${uploadPct}%` }} />
            </div>
          )}
          {step !== "upload" && (
            <div className="progress-bar-track" style={{ marginTop: "6px" }}>
              <div className="progress-bar-fill indeterminate" />
            </div>
          )}
        </div>
      )}

      {error && <div className="inline-error">{error}</div>}

      <button
        className="btn btn-primary"
        type="submit"
        disabled={loading || !file}
      >
        {loading ? <span className="spinner" /> : "Start transcode"}
      </button>
    </form>
  );
}
