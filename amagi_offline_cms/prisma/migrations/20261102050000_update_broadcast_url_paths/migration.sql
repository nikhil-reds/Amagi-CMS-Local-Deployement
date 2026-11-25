UPDATE "NewsSimulationScreen"
SET "url" = 'http://localhost:' || "port" || '/broadcast' || ("screenNumber" - 12),
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "screenNumber" BETWEEN 13 AND 17;
