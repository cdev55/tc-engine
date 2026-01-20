package input

import "context"

type Resolver interface {
	CanHandle(url string) bool
	Download(ctx context.Context, url, dest string) error
}
