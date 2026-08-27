-- Center Feature 1: Center registration, Warehouse, Booking, QualityInspection, InventoryLot

-- Enums
CREATE TYPE "public"."CropType" AS ENUM ('WHEAT', 'RICE', 'MAIZE', 'SOYBEAN', 'COTTON', 'PULSES', 'OTHER');
CREATE TYPE "public"."CenterStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "public"."BookingStatus" AS ENUM ('BOOKED', 'ARRIVED', 'INSPECTION', 'GRADED', 'COMPLETED', 'NO_SHOW', 'CANCELLED');
CREATE TYPE "public"."Grade" AS ENUM ('A', 'B', 'C');
CREATE TYPE "public"."LotStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'SOLD');

-- Center table
CREATE TABLE "public"."Center" (
  "id"            TEXT NOT NULL,
  "code"          TEXT NOT NULL,
  "name"          TEXT NOT NULL,
  "state"         TEXT NOT NULL,
  "district"      TEXT NOT NULL,
  "village"       TEXT,
  "pinCode"       CHAR(6) NOT NULL,
  "address"       TEXT NOT NULL,
  "latitude"      DOUBLE PRECISION,
  "longitude"     DOUBLE PRECISION,
  "phone"         TEXT NOT NULL,
  "email"         TEXT,
  "totalCapacity" DECIMAL(10,2) NOT NULL,
  "usedCapacity"  DECIMAL(10,2) NOT NULL DEFAULT 0,
  "status"        "public"."CenterStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Center_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Center_code_key" ON "public"."Center"("code");

-- Add centerId to User for operator assignment
ALTER TABLE "public"."User" ADD COLUMN "centerId" TEXT;

-- Warehouse table
CREATE TABLE "public"."Warehouse" (
  "id"            TEXT NOT NULL,
  "centerId"      TEXT NOT NULL,
  "name"          TEXT NOT NULL,
  "totalCapacity" DECIMAL(10,2) NOT NULL,
  "usedCapacity"  DECIMAL(10,2) NOT NULL DEFAULT 0,
  CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- Booking table
CREATE TABLE "public"."Booking" (
  "id"        TEXT NOT NULL,
  "farmerId"  TEXT NOT NULL,
  "centerId"  TEXT NOT NULL,
  "crop"      "public"."CropType" NOT NULL,
  "quantity"  DECIMAL(10,2) NOT NULL,
  "slotStart" TIMESTAMP(3) NOT NULL,
  "slotEnd"   TIMESTAMP(3) NOT NULL,
  "status"    "public"."BookingStatus" NOT NULL DEFAULT 'BOOKED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- QualityInspection table
CREATE TABLE "public"."QualityInspection" (
  "id"            TEXT NOT NULL,
  "bookingId"     TEXT NOT NULL,
  "moisture"      DOUBLE PRECISION NOT NULL,
  "brokenGrain"   DOUBLE PRECISION NOT NULL,
  "foreignMatter" DOUBLE PRECISION NOT NULL,
  "aiScore"       DOUBLE PRECISION,
  "grade"         "public"."Grade" NOT NULL,
  "inspectorId"   TEXT NOT NULL,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QualityInspection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "QualityInspection_bookingId_key" ON "public"."QualityInspection"("bookingId");

-- InventoryLot table
CREATE TABLE "public"."InventoryLot" (
  "id"            TEXT NOT NULL,
  "lotNumber"     TEXT NOT NULL,
  "warehouseId"   TEXT NOT NULL,
  "farmerId"      TEXT NOT NULL,
  "crop"          "public"."CropType" NOT NULL,
  "grade"         "public"."Grade" NOT NULL,
  "quantity"      DECIMAL(10,2) NOT NULL,
  "availableQty"  DECIMAL(10,2) NOT NULL,
  "purchasePrice" DECIMAL(10,2) NOT NULL,
  "status"        "public"."LotStatus" NOT NULL DEFAULT 'AVAILABLE',
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryLot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InventoryLot_lotNumber_key" ON "public"."InventoryLot"("lotNumber");

-- Foreign keys
ALTER TABLE "public"."User"
  ADD CONSTRAINT "User_centerId_fkey"
  FOREIGN KEY ("centerId") REFERENCES "public"."Center"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."Warehouse"
  ADD CONSTRAINT "Warehouse_centerId_fkey"
  FOREIGN KEY ("centerId") REFERENCES "public"."Center"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."Booking"
  ADD CONSTRAINT "Booking_farmerId_fkey"
  FOREIGN KEY ("farmerId") REFERENCES "public"."FarmerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."Booking"
  ADD CONSTRAINT "Booking_centerId_fkey"
  FOREIGN KEY ("centerId") REFERENCES "public"."Center"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."QualityInspection"
  ADD CONSTRAINT "QualityInspection_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "public"."Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."QualityInspection"
  ADD CONSTRAINT "QualityInspection_inspectorId_fkey"
  FOREIGN KEY ("inspectorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."InventoryLot"
  ADD CONSTRAINT "InventoryLot_warehouseId_fkey"
  FOREIGN KEY ("warehouseId") REFERENCES "public"."Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."InventoryLot"
  ADD CONSTRAINT "InventoryLot_farmerId_fkey"
  FOREIGN KEY ("farmerId") REFERENCES "public"."FarmerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
