package config

import "os"

type Config struct {
	RedisURL   string
	DatabaseURL string
	WorkerID   string
}

func Load() Config {
	return Config{
		RedisURL:    os.Getenv("REDIS_URL"),
		DatabaseURL: os.Getenv("DATABASE_URL"),
		WorkerID:    os.Getenv("WORKER_ID"),
	}
}
