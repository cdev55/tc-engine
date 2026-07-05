package jobs

import (
	"context"
	"fmt"
	"os"

	"transcoding-worker/internal/output"
)

func uploadHLS(ctx context.Context, env *ExecEnv) error {
	uploader, err := newUploader(ctx)
	if err != nil {
		return err
	}

	// Output layout: {jobId}/hls/ — matches the predetermined outputUrl set at job creation
	prefix := fmt.Sprintf("%s/hls", env.JobID)
	return uploader.UploadDir(ctx, env.HLSDir, prefix)
}

func newUploader(ctx context.Context) (*output.S3Uploader, error) {
	bucket := os.Getenv("S3_BUCKET")
	if bucket == "" {
		return nil, fmt.Errorf("S3_BUCKET not set")
	}
	return output.NewS3Uploader(ctx, bucket)
}
