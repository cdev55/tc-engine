package jobs

import (
	"context"
	"fmt"
	"os"

	"transcoding-worker/internal/output"
)

func uploadMP4(ctx context.Context, env *ExecEnv) error {
	uploader, err := newUploader(ctx)
	if err != nil {
		return err
	}

	key := fmt.Sprintf("outputs/%s/mp4/output.mp4", env.JobID)
	return uploader.UploadFile(ctx, env.MP4Path, key)
}

func uploadHLS(ctx context.Context, env *ExecEnv) error {
	uploader, err := newUploader(ctx)
	if err != nil {
		return err
	}

	prefix := fmt.Sprintf("outputs/%s/hls", env.JobID)
	return uploader.UploadDir(ctx, env.HLSDir, prefix)
}

func newUploader(ctx context.Context) (*output.S3Uploader, error) {
	bucket := os.Getenv("OUTPUT_S3_BUCKET")
	if bucket == "" {
		return nil, fmt.Errorf("OUTPUT_S3_BUCKET not set")
	}
	return output.NewS3Uploader(ctx, bucket)
}
