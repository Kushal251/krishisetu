CREATE TABLE "CropPriceHistory" (
    "id" TEXT NOT NULL,
    "centerId" TEXT NOT NULL,
    "crop" "CropType" NOT NULL DEFAULT 'SOYBEAN',
    "price" DECIMAL(10,2) NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'quintal',
    "source" TEXT NOT NULL DEFAULT 'ADMIN_UPDATE',
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CropPriceHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CropPriceHistory_centerId_crop_recordedAt_idx"
ON "CropPriceHistory"("centerId", "crop", "recordedAt");

CREATE INDEX "CropPriceHistory_crop_recordedAt_idx"
ON "CropPriceHistory"("crop", "recordedAt");

ALTER TABLE "CropPriceHistory"
ADD CONSTRAINT "CropPriceHistory_centerId_fkey"
FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE CASCADE ON UPDATE CASCADE;
