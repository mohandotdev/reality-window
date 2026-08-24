-- CreateEnum
CREATE TYPE "EvaluationVerdict" AS ENUM ('STILL_TRUE', 'CHANGED', 'UNCERTAIN');

-- CreateTable
CREATE TABLE "ScraperEvaluation" (
    "id" TEXT NOT NULL,
    "scraperId" TEXT NOT NULL,
    "collectionId" TEXT,
    "verdict" "EvaluationVerdict" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "reasoning" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "changedFields" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScraperEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScraperEvaluation_scraperId_createdAt_idx" ON "ScraperEvaluation"("scraperId", "createdAt");

-- AddForeignKey
ALTER TABLE "ScraperEvaluation" ADD CONSTRAINT "ScraperEvaluation_scraperId_fkey" FOREIGN KEY ("scraperId") REFERENCES "WatchScraper"("id") ON DELETE CASCADE ON UPDATE CASCADE;
