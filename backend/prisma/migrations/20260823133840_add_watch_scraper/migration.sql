/*
  Warnings:

  - You are about to drop the column `scraperId` on the `Watch` table. All the data in the column will be lost.
  - You are about to drop the column `scraperStatus` on the `Watch` table. All the data in the column will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ScraperStatus" ADD VALUE 'AI_FLOW_RUNNING';
ALTER TYPE "ScraperStatus" ADD VALUE 'REVIEW_REQUIRED';
ALTER TYPE "ScraperStatus" ADD VALUE 'APPROVED';
ALTER TYPE "ScraperStatus" ADD VALUE 'COMPLETED';

-- AlterTable
ALTER TABLE "Watch" DROP COLUMN "scraperId",
DROP COLUMN "scraperStatus";

-- CreateTable
CREATE TABLE "WatchScraper" (
    "id" TEXT NOT NULL,
    "watchId" TEXT NOT NULL,
    "collectorId" TEXT,
    "aiJobId" TEXT,
    "status" "ScraperStatus" NOT NULL DEFAULT 'PENDING',
    "target" JSONB,
    "schema" JSONB,
    "sampleData" JSONB,
    "latestData" JSONB,
    "approvedAt" TIMESTAMP(3),
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WatchScraper_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WatchScraper_watchId_key" ON "WatchScraper"("watchId");

-- AddForeignKey
ALTER TABLE "WatchScraper" ADD CONSTRAINT "WatchScraper_watchId_fkey" FOREIGN KEY ("watchId") REFERENCES "Watch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
