
package jobs

import (
	"context"
	"time"
)

func Execute(ctx context.Context, jobID string) error {
	// Simulate real work
	time.Sleep(10 * time.Second)
	return nil
}
