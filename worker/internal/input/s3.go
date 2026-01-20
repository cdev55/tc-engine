package input

import (
	"context"
	"fmt"
	"io"
	"os"
	"strings"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type S3Resolver struct {
	client *s3.Client
}

func NewS3Resolver(ctx context.Context) (*S3Resolver, error) {
	cfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		return nil, err
	}

	return &S3Resolver{
		client: s3.NewFromConfig(cfg),
	}, nil
}

func (r *S3Resolver) CanHandle(url string) bool {
	return strings.HasPrefix(url, "s3://")
}

func (r *S3Resolver) Download(ctx context.Context, url, dest string) error {
	trimmed := strings.TrimPrefix(url, "s3://")
	parts := strings.SplitN(trimmed, "/", 2)

	if len(parts) != 2 {
		return fmt.Errorf("invalid s3 url")
	}

	bucket := parts[0]
	key := parts[1]

	out, err := os.Create(dest)
	if err != nil {
		return err
	}
	defer out.Close()

	resp, err := r.client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: &bucket,
		Key:    &key,
	})
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	// _, err = out.ReadFrom(resp.Body)
	_, err = io.Copy(out, resp.Body)
	return err
}
