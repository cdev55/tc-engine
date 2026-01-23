package queue

import (
	"context"
	"fmt"
)

func (q *RedisQueue) PublishProgress(
	ctx context.Context,
	jobID string,
	progress float64,
) error {
	channel := fmt.Sprintf("transcode:progress:%s", jobID)
	return q.Client.Publish(ctx, channel, progress).Err()
}
