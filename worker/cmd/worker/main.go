package main

import (
	"context"
	"log"
	"sync"
	"transcoding-worker/internal/config"
	"transcoding-worker/internal/db"
	"transcoding-worker/internal/jobs"
	"transcoding-worker/internal/queue"
)

func main() {
	ctx := context.Background()
	cfg := config.Load()

	q := queue.NewRedisQueue(cfg.RedisURL)

	var runningJobs sync.Map
	queue.StartCancelListener(ctx, q, &runningJobs)

	database, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatal(err)
	}

	log.Println("Worker started:", cfg.WorkerID)

	for {
		jobID, err := q.FetchJob(ctx)
		if err != nil {
			log.Println("Queue error:", err)
			continue
		}
		
		jobCtx, cancel := context.WithCancel(context.Background())
		runningJobs.Store(jobID, cancel)

		go func() {
			jobs.ProcessJob(
				jobCtx,
				jobID,
				cfg.WorkerID,
				q,
				database,
			)
			runningJobs.Delete(jobID)
		}()
	}
}

//curl -X POST http://localhost:3000/jobs/17b5ef5e-bf86-4d64-a329-b4e76eba5c2b/cancel
