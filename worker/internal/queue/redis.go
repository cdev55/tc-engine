
package queue

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"
)

type RedisQueue struct {
	Client *redis.Client
}

func NewRedisQueue(redisURL string) *RedisQueue {
	opt, _ := redis.ParseURL(redisURL)
	return &RedisQueue{
		Client: redis.NewClient(opt),
	}
}

func (q *RedisQueue) FetchJob(ctx context.Context) (string, error) {
	return q.Client.BRPopLPush(
		ctx,
		"transcode:queue",
		"transcode:processing",
		0,
	).Result()
}

func (q *RedisQueue) AcquireLock(ctx context.Context, jobID, workerID string) (bool, error) {
	return q.Client.SetNX(
		ctx,
		"transcode:lock:"+jobID,
		workerID,
		time.Hour,
	).Result()
}

func (q *RedisQueue) ReleaseJob(ctx context.Context, jobID string) error {
	_, err := q.Client.LRem(ctx, "transcode:processing", 1, jobID).Result()
	q.Client.Del(ctx, "transcode:lock:"+jobID)
	return err
}

func (q *RedisQueue) IncrementRetry(ctx context.Context, jobID string) (int64, error) {
	return q.Client.Incr(ctx, "transcode:retry:"+jobID).Result()
}

func (q *RedisQueue) RequeueJob(ctx context.Context, jobID string) error {
	return q.Client.LPush(ctx, "transcode:queue", jobID).Err()
}

