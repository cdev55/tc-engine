package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	RedisURL    string
	DatabaseURL string
	WorkerID    string
}

func Load() Config {
	_ = godotenv.Load()

	if err := godotenv.Load(); err != nil && !os.IsNotExist(err) {
		println("Warning: error loading .env file:", err.Error())
	}

	return Config{
		RedisURL:    os.Getenv("REDIS_URL"),
		DatabaseURL: os.Getenv("DATABASE_URL"),
		WorkerID:    os.Getenv("WORKER_ID"),
	}
}
