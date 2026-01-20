package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	RedisURL           string
	DatabaseURL        string
	WorkerID           string
	AwsAccessKeysId    string
	AwsSecretAccessKey string
	AwsRegion          string
}

func Load() Config {
	_ = godotenv.Load()

	if err := godotenv.Load(); err != nil && !os.IsNotExist(err) {
		println("Warning: error loading .env file:", err.Error())
	}

	return Config{
		RedisURL:           os.Getenv("REDIS_URL"),
		DatabaseURL:        os.Getenv("DATABASE_URL"),
		WorkerID:           os.Getenv("WORKER_ID"),
		AwsAccessKeysId:    os.Getenv("AWS_ACCESS_KEYS_ID"),
		AwsSecretAccessKey: os.Getenv("AWS_SECRET_ACCESS_KEY"),
		AwsRegion:          os.Getenv("AWS_REGION"),
	}
}
