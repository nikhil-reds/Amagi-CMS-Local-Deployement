DELETE FROM "ScreenAsset" existing
USING "ScreenAsset" newer
WHERE existing."screenId" = newer."screenId"
  AND (
    existing."createdAt" < newer."createdAt"
    OR (existing."createdAt" = newer."createdAt" AND existing."id" < newer."id")
  );

DROP INDEX IF EXISTS "ScreenAsset_screenId_documentId_key";
DROP INDEX IF EXISTS "ScreenAsset_screenId_idx";

CREATE UNIQUE INDEX "ScreenAsset_screenId_key" ON "ScreenAsset"("screenId");
