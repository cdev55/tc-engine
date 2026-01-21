package output

import (
	"context"
	"path/filepath"

	// "fmt"
	"os"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type S3Uploader struct {
	client *s3.Client
	bucket string
}

func NewS3Uploader(ctx context.Context, bucket string) (*S3Uploader, error) {
	cfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		return nil, err
	}

	return &S3Uploader{
		client: s3.NewFromConfig(cfg),
		bucket: bucket,
	}, nil
}

func (u *S3Uploader) UploadFile(
	ctx context.Context,
	localPath string,
	s3Key string,
) error {
	file, err := os.Open(localPath)
	if err != nil {
		return err
	}
	defer file.Close()

	_, err = u.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      &u.bucket,
		Key:         &s3Key,
		Body:        file,
		ContentType: awsString("video/mp4"),
	})

	return err
}

func (u *S3Uploader) UploadDir(
	ctx context.Context,
	localDir string,
	s3Prefix string,
) error {
	return filepath.Walk(localDir, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return err
		}

		rel, _ := filepath.Rel(localDir, path)
		key := filepath.Join(s3Prefix, rel)

		return u.UploadFile(ctx, path, key)
	})
}

func awsString(s string) *string {
	return &s
}
