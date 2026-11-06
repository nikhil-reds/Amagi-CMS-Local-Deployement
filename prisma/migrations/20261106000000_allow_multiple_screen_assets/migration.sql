-- A screen may contain an ordered playlist of assets. Keep duplicate documents
-- off the same screen, but remove the legacy one-asset-per-screen constraint.
DROP INDEX IF EXISTS "ScreenAsset_screenId_key";

CREATE UNIQUE INDEX IF NOT EXISTS "ScreenAsset_screenId_documentId_key"
  ON "ScreenAsset"("screenId", "documentId");

CREATE INDEX IF NOT EXISTS "ScreenAsset_screenId_idx"
  ON "ScreenAsset"("screenId");
