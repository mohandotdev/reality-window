-- CreateEnum
CREATE TYPE "CollectionOutcome" AS ENUM ('SUCCESS', 'SOURCE_UNAVAILABLE', 'SOURCE_BLOCKED', 'NO_USABLE_DATA', 'FAILED');

-- AlterTable
ALTER TABLE "WatchScraper" ADD COLUMN     "collectionOutcome" "CollectionOutcome";
