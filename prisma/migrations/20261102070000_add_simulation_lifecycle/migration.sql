ALTER TABLE "NewsSimulationScreen" ADD COLUMN "sourceDocumentId" TEXT;
CREATE TABLE "NewsSimulationState" (
  "id" TEXT PRIMARY KEY DEFAULT 'global',
  "active" BOOLEAN NOT NULL DEFAULT false,
  "targetScreenIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "NewsSimulationState" ("id") VALUES ('global');
