CREATE TYPE "DocumentSourceType" AS ENUM ('FILE', 'WEBSITE');

ALTER TABLE "Document"
  ADD COLUMN "sourceType" "DocumentSourceType" NOT NULL DEFAULT 'FILE',
  ADD COLUMN "websiteUrl" TEXT,
  ALTER COLUMN "cloudinaryUrl" DROP NOT NULL,
  ALTER COLUMN "cloudinaryPublicId" DROP NOT NULL;
