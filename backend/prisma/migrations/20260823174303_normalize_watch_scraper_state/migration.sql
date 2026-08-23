/*
  Warnings:

  - You are about to drop the column `aiJobId` on the `Watch` table. All the data in the column will be lost.
  - You are about to drop the column `collectionId` on the `Watch` table. All the data in the column will be lost.
  - You are about to drop the column `lastRunAt` on the `Watch` table. All the data in the column will be lost.
  - You are about to drop the column `lastVerifiedAt` on the `Watch` table. All the data in the column will be lost.
  - You are about to drop the column `latestResult` on the `Watch` table. All the data in the column will be lost.
  - You are about to drop the column `scraperId` on the `Watch` table. All the data in the column will be lost.
  - You are about to drop the column `scraperSchema` on the `Watch` table. All the data in the column will be lost.
  - You are about to drop the column `scraperStatus` on the `Watch` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[collectorId]` on the table `WatchScraper` will be added. If there are existing duplicate values, this will fail.
  - Made the column `target` on table `WatchScraper` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Watch" DROP COLUMN "aiJobId",
DROP COLUMN "collectionId",
DROP COLUMN "lastRunAt",
DROP COLUMN "lastVerifiedAt",
DROP COLUMN "latestResult",
DROP COLUMN "scraperId",
DROP COLUMN "scraperSchema",
DROP COLUMN "scraperStatus";

-- AlterTable
ALTER TABLE "WatchScraper" ADD COLUMN     "collectionId" TEXT,
ALTER COLUMN "target" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "WatchScraper_collectorId_key" ON "WatchScraper"("collectorId");
