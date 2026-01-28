package queue

import (
	"context"
	"log"
	"sync"
)

func StartCancelListener(
	ctx context.Context,
	q *RedisQueue,
	runningJobs *sync.Map,
) {
	pubsub := q.Client.Subscribe(ctx, "transcode:cancel")

	go func() {
		ch := pubsub.Channel()
		for msg := range ch {
			jobID := msg.Payload

			if cancel, ok := runningJobs.Load(jobID); ok {
				log.Println("Cancelling job:", jobID)
				cancel.(context.CancelFunc)()
			}
		}
	}()
}
