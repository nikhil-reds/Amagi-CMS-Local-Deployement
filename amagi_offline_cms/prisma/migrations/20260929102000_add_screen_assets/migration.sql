CREATE TABLE "ScreenAsset" (
  "id" TEXT NOT NULL,
  "screenId" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ScreenAsset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ScreenAsset_screenId_documentId_key" ON "ScreenAsset"("screenId", "documentId");
CREATE INDEX "ScreenAsset_screenId_idx" ON "ScreenAsset"("screenId");
CREATE INDEX "ScreenAsset_documentId_idx" ON "ScreenAsset"("documentId");

ALTER TABLE "ScreenAsset"
  ADD CONSTRAINT "ScreenAsset_screenId_fkey"
  FOREIGN KEY ("screenId") REFERENCES "Screen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ScreenAsset"
  ADD CONSTRAINT "ScreenAsset_documentId_fkey"
  FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
