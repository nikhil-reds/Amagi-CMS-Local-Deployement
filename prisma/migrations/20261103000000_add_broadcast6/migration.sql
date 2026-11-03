ALTER TABLE "NewsSimulationScreen"
DROP CONSTRAINT "NewsSimulationScreen_screenNumber_check",
ADD CONSTRAINT "NewsSimulationScreen_screenNumber_check" CHECK ("screenNumber" BETWEEN 1 AND 18);

INSERT INTO "NewsSimulationScreen" ("screenNumber", "name", "port", "url", "updatedAt")
SELECT 18, 'broadcast06', p.port,
       'http://localhost:' || p.port || '/broadcast6', CURRENT_TIMESTAMP
FROM (
    SELECT COALESCE((SELECT "port" FROM "NewsSimulationScreen" ORDER BY "screenNumber" LIMIT 1), 3000) AS port
) AS p;
