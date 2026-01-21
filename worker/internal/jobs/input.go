package jobs

import (
	"context"
	"fmt"
	"transcoding-worker/internal/input"
)

func downloadInput(ctx context.Context, env *ExecEnv) error {
	// jobInputURL := getInputURLFromDBLater() // placeholder
	jobInputURL := "https://cdn-dqs.mogiio.com/dev/mogiDocs/20a01a2026a12a31a43fileexampleMP448015MG.mp4"

	resolvers := []input.Resolver{
		&input.HTTPResolver{},
	}

	s3r, err := input.NewS3Resolver(ctx)
	if err == nil {
		resolvers = append(resolvers, s3r)
	}

	for _, r := range resolvers {
		if r.CanHandle(jobInputURL) {
			return r.Download(ctx, jobInputURL, env.InputPath)
		}
	}

	return fmt.Errorf("no resolver for input: %s", jobInputURL)
}
