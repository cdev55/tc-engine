import dotenv from "dotenv";
dotenv.config();

export const env = {
  port: Number(process.env.PORT || 3000),
  redisUrl: process.env.REDIS_URL!,
  s3Bucket: process.env.S3_BUCKET!,
  s3Region: process.env.AWS_REGION || "us-east-1",
};
