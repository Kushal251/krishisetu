-- Seasonal crop declaration workflow
CREATE TYPE "public"."SeasonName" AS ENUM ('KHARIF', 'RABI', 'ZAID');
CREATE TYPE "public"."SeasonStatus" AS ENUM ('UPCOMING', 'ACTIVE', 'CLOSED');
CREATE TYPE "public"."SeasonRegistrationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'VERIFIED', 'REJECTED');
CREATE TYPE "public"."LandUnit" AS ENUM ('ACRE', 'HECTARE');

CREATE TABLE "public"."Season" (
  "id" TEXT NOT NULL,
  "name" "public"."SeasonName" NOT NULL,
  "year" TEXT NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "status" "public"."SeasonStatus" NOT NULL DEFAULT 'UPCOMING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."SeasonRegistration" (
  "id" TEXT NOT NULL,
  "farmerId" TEXT NOT NULL,
  "seasonId" TEXT NOT NULL,
  "status" "public"."SeasonRegistrationStatus" NOT NULL DEFAULT 'DRAFT',
  "submittedAt" TIMESTAMP(3),
  "verifiedAt" TIMESTAMP(3),
  "remarks" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SeasonRegistration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."CropDeclaration" (
  "id" TEXT NOT NULL,
  "registrationId" TEXT NOT NULL,
  "cropName" TEXT NOT NULL,
  "variety" TEXT,
  "area" DOUBLE PRECISION NOT NULL,
  "unit" "public"."LandUnit" NOT NULL,
  "sowingDate" TIMESTAMP(3) NOT NULL,
  "irrigation" TEXT NOT NULL,
  "seedSource" TEXT,
  "expectedHarvestDate" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CropDeclaration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Season_name_year_key" ON "public"."Season"("name", "year");
CREATE INDEX "Season_status_startDate_idx" ON "public"."Season"("status", "startDate");
CREATE UNIQUE INDEX "SeasonRegistration_farmerId_seasonId_key" ON "public"."SeasonRegistration"("farmerId", "seasonId");
CREATE INDEX "SeasonRegistration_seasonId_status_idx" ON "public"."SeasonRegistration"("seasonId", "status");
CREATE INDEX "CropDeclaration_registrationId_idx" ON "public"."CropDeclaration"("registrationId");
CREATE INDEX "CropDeclaration_cropName_idx" ON "public"."CropDeclaration"("cropName");

ALTER TABLE "public"."SeasonRegistration" ADD CONSTRAINT "SeasonRegistration_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "public"."FarmerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."SeasonRegistration" ADD CONSTRAINT "SeasonRegistration_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "public"."Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."CropDeclaration" ADD CONSTRAINT "CropDeclaration_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "public"."SeasonRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
