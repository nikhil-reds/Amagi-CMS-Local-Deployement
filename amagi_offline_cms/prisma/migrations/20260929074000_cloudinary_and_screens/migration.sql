-- Add Cloudinary columns while preserving the previous S3 columns/data.
ALTER TABLE "Document"
ADD COLUMN IF NOT EXISTS "cloudinaryUrl" TEXT,
ADD COLUMN IF NOT EXISTS "cloudinaryPublicId" TEXT;

UPDATE "Document"
SET
  "cloudinaryUrl" = COALESCE("cloudinaryUrl", "s3Url"),
  "cloudinaryPublicId" = COALESCE("cloudinaryPublicId", "s3Key", "id")
WHERE "cloudinaryUrl" IS NULL
   OR "cloudinaryPublicId" IS NULL;

ALTER TABLE "Document"
ALTER COLUMN "cloudinaryUrl" SET NOT NULL,
ALTER COLUMN "cloudinaryPublicId" SET NOT NULL;

ALTER TABLE "Playlist"
ADD COLUMN IF NOT EXISTS "cloudinaryUrl" TEXT,
ADD COLUMN IF NOT EXISTS "cloudinaryPublicId" TEXT;

UPDATE "Playlist"
SET
  "cloudinaryUrl" = COALESCE("cloudinaryUrl", "s3Url"),
  "cloudinaryPublicId" = COALESCE("cloudinaryPublicId", "s3Key", "id")
WHERE "cloudinaryUrl" IS NULL
   OR "cloudinaryPublicId" IS NULL;

ALTER TABLE "Playlist"
ALTER COLUMN "cloudinaryUrl" SET NOT NULL,
ALTER COLUMN "cloudinaryPublicId" SET NOT NULL;

CREATE TABLE IF NOT EXISTS "Screen" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "playlistId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Screen_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Screen_playlistId_fkey'
  ) THEN
    ALTER TABLE "Screen"
    ADD CONSTRAINT "Screen_playlistId_fkey"
    FOREIGN KEY ("playlistId") REFERENCES "Playlist"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
