-- The app now writes Cloudinary fields. Keep legacy S3 columns for old data,
-- but allow new rows to omit them.
ALTER TABLE "Document"
ALTER COLUMN "s3Bucket" DROP NOT NULL,
ALTER COLUMN "s3Key" DROP NOT NULL,
ALTER COLUMN "s3Url" DROP NOT NULL;

ALTER TABLE "Playlist"
ALTER COLUMN "s3Bucket" DROP NOT NULL,
ALTER COLUMN "s3Key" DROP NOT NULL,
ALTER COLUMN "s3Url" DROP NOT NULL;
