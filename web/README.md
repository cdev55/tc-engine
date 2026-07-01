# TC Engine — Web Frontend

Minimal React + Vite frontend for the **tc-engine** video transcoding service.

## Quick start

```bash
cd web
npm install
npm run dev        # starts at http://localhost:5173
```

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:3000` | Base URL of the tc-engine API |

Copy `.env.example` to `.env.local` and adjust if needed:

```bash
cp .env.example .env.local
```

> **Note:** In development the Vite dev server proxies `/api → http://localhost:3000` automatically, so you do **not** need to set `VITE_API_BASE_URL` for local dev. For production builds you should either configure CORS on the API or deploy the frontend behind the same origin.

## Features

- **URL mode** — paste a public video URL, pick output format, submit.
- **Upload mode** — drag & drop or browse a local video file; three-step flow (presigned URL → S3 upload with progress → queue job).
- **Job status panel** — live-polls the API every 2 s; shows status badge, progress bar, timestamps, error messages.
- **Cancel / Retry** — cancel running or queued jobs; retry failed jobs.

## Project structure

```
web/
  src/
    api/client.ts        # typed fetch wrappers for all API endpoints
    types/job.ts         # Job type + status helpers
    hooks/
      useJobPolling.ts   # polls GET /jobs/:id every 2 s until terminal state
    components/
      UrlSubmitForm.tsx
      UploadForm.tsx
      JobStatus.tsx
      ProgressBar.tsx
    App.tsx
    index.css
```

## Building for production

```bash
npm run build   # output in web/dist/
```

Serve `dist/` with any static host. Ensure the API allows CORS from your frontend origin, or proxy `/api` at the reverse-proxy level.
