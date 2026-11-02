UPDATE "NewsSimulationScreen"
SET "name" = 'broadcast' || lpad(("screenNumber" - 12)::text, 2, '0'),
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "screenNumber" BETWEEN 13 AND 17;
