-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "inputUrl" TEXT NOT NULL,
    "outputSpec" JSONB NOT NULL,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "retries" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "workerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);
