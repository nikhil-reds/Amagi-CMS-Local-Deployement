UPDATE "NewsSimulationScreen"
SET "url" = 'http://localhost:' || "port" || '/scren' || "screenNumber",
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "screenNumber" BETWEEN 1 AND 17;
