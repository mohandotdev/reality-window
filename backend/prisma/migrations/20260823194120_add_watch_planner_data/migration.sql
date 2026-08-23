-- AlterTable
ALTER TABLE "Watch" ADD COLUMN     "evidenceRequirements" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "searchQueries" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "sources" JSONB NOT NULL DEFAULT '[]';
