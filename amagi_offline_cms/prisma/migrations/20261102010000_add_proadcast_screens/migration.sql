ALTER TABLE "NewsSimulationScreen"
DROP CONSTRAINT "NewsSimulationScreen_screenNumber_check",
ADD CONSTRAINT "NewsSimulationScreen_screenNumber_check" CHECK ("screenNumber" BETWEEN 1 AND 17);

INSERT INTO "NewsSimulationScreen" ("screenNumber", "name", "port", "url", "updatedAt")
SELECT n, 'proadcast' || lpad((n - 12)::text, 2, '0'), p.port,
       'http://localhost:' || p.port || '/view/screen/' || n, CURRENT_TIMESTAMP
FROM generate_series(13, 17) AS n
CROSS JOIN (
    SELECT COALESCE((SELECT "port" FROM "NewsSimulationScreen" ORDER BY "screenNumber" LIMIT 1), 3000) AS port
) AS p;
