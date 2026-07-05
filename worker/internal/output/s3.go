package output

import (
	"context"
	"path/filepath"
	"time"

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

	ct := contentTypeForKey(s3Key)

	_, err = u.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      &u.bucket,
		Key:         &s3Key,
		Body:        file,
		ContentType: &ct,
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

// GeneratePresignedURL generates a presigned GET URL for a given S3 key.
func (u *S3Uploader) GeneratePresignedURL(ctx context.Context, key string, expiration time.Duration) (string, error) {
	presignClient := s3.NewPresignClient(u.client)

	request, err := presignClient.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: &u.bucket,
		Key:    &key,
	}, func(opts *s3.PresignOptions) {
		opts.Expires = expiration
	})

	if err != nil {
		return "", err
	}

	return request.URL, nil
}

func contentTypeForKey(key string) string {
	switch filepath.Ext(key) {
	case ".m3u8":
		return "application/vnd.apple.mpegurl"
	case ".ts":
		return "video/mp2t"
	case ".mp4":
		return "video/mp4"
	default:
		return "application/octet-stream"
	}
}
