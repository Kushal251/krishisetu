CREATE TABLE "SeasonWeatherProfile" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "rainfallMm" DOUBLE PRECISION NOT NULL,
    "temperatureC" DOUBLE PRECISION NOT NULL,
    "yieldFactor" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "qualityFactor" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "transportFactor" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeasonWeatherProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SeasonWeatherProfile_seasonId_district_key"
ON "SeasonWeatherProfile"("seasonId", "district");

CREATE INDEX "SeasonWeatherProfile_district_seasonId_idx"
ON "SeasonWeatherProfile"("district", "seasonId");

ALTER TABLE "SeasonWeatherProfile"
ADD CONSTRAINT "SeasonWeatherProfile_seasonId_fkey"
FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;
