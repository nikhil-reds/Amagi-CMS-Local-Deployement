UPDATE "NewsSimulationScreen"
SET "name" = 'News Simulation Screen ' || lpad("screenNumber"::text, 2, '0')
WHERE "screenNumber" BETWEEN 1 AND 18;
