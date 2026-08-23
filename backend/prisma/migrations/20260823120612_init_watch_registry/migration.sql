-- CreateEnum
CREATE TYPE "ScraperStatus" AS ENUM ('PENDING', 'CREATING', 'READY', 'RUNNING', 'FAILED', 'UNAVAILABLE');

-- CreateTable
CREATE TABLE "Watch" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "assumption" TEXT NOT NULL,
    "scenarioHash" TEXT NOT NULL,
    "scraperId" TEXT,
    "scraperStatus" "ScraperStatus" NOT NULL DEFAULT 'PENDING',
    "lastRunAt" TIMESTAMP(3),
    "lastVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Watch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Watch_scenarioHash_key" ON "Watch"("scenarioHash");
