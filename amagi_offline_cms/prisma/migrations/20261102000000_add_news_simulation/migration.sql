CREATE TABLE "NewsSimulationScreen" (
    "screenNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 3000,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NewsSimulationScreen_pkey" PRIMARY KEY ("screenNumber"),
    CONSTRAINT "NewsSimulationScreen_screenNumber_check" CHECK ("screenNumber" BETWEEN 1 AND 12),
    CONSTRAINT "NewsSimulationScreen_port_check" CHECK ("port" BETWEEN 3000 AND 3011)
);

INSERT INTO "NewsSimulationScreen" ("screenNumber", "name", "port", "url", "updatedAt")
SELECT n, 'Screen ' || n, 3000, 'http://localhost:3000/view/screen/' || n, CURRENT_TIMESTAMP
FROM generate_series(1, 12) AS n;
