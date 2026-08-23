-- AlterTable
ALTER TABLE "Watch" ADD COLUMN     "aiJobId" TEXT,
ADD COLUMN     "collectionId" TEXT,
ADD COLUMN     "latestResult" JSONB,
ADD COLUMN     "scraperId" TEXT,
ADD COLUMN     "scraperSchema" JSONB,
ADD COLUMN     "scraperStatus" "ScraperStatus" NOT NULL DEFAULT 'PENDING';
