-- Replace warehouse inventory with center-level soybean prices and seller bookings.
DROP TABLE IF EXISTS "public"."InventoryLot";
DROP TABLE IF EXISTS "public"."Warehouse";

CREATE TABLE "public"."CropPrice" (
  "id" TEXT NOT NULL,
  "centerId" TEXT NOT NULL,
  "crop" "public"."CropType" NOT NULL DEFAULT 'SOYBEAN',
  "price" DECIMAL(10,2) NOT NULL,
  "unit" TEXT NOT NULL DEFAULT 'quintal',
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CropPrice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CropPrice_centerId_crop_key" ON "public"."CropPrice"("centerId", "crop");
CREATE INDEX "CropPrice_crop_updatedAt_idx" ON "public"."CropPrice"("crop", "updatedAt");
ALTER TABLE "public"."CropPrice" ADD CONSTRAINT "CropPrice_centerId_fkey"
  FOREIGN KEY ("centerId") REFERENCES "public"."Center"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."Booking" ADD COLUMN "sellerId" TEXT;
UPDATE "public"."Booking" AS booking
SET "sellerId" = farmer."sellerId"
FROM "public"."FarmerProfile" AS farmer
WHERE booking."farmerId" = farmer."id";
ALTER TABLE "public"."Booking" ALTER COLUMN "sellerId" SET NOT NULL;
ALTER TABLE "public"."Booking" DROP CONSTRAINT IF EXISTS "Booking_farmerId_fkey";
ALTER TABLE "public"."Booking" DROP COLUMN "farmerId";
ALTER TABLE "public"."Booking" ADD CONSTRAINT "Booking_sellerId_fkey"
  FOREIGN KEY ("sellerId") REFERENCES "public"."Seller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Booking_centerId_slotStart_slotEnd_idx" ON "public"."Booking"("centerId", "slotStart", "slotEnd");
CREATE INDEX "Booking_sellerId_createdAt_idx" ON "public"."Booking"("sellerId", "createdAt");
