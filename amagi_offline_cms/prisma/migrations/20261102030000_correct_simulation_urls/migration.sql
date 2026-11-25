UPDATE "NewsSimulationScreen"
SET "url" = 'http://localhost:' || "port" || '/view/screen' || "screenNumber",
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "screenNumber" BETWEEN 1 AND 17;
