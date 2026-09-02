ALTER TABLE "Seller"
ADD COLUMN "division" TEXT NOT NULL,
ADD COLUMN "pinCode" CHAR(6) NOT NULL;

ALTER TABLE "Buyer"
DROP COLUMN "city",
ADD COLUMN "division" TEXT NOT NULL,
ADD COLUMN "district" TEXT NOT NULL,
ADD COLUMN "village" TEXT NOT NULL;

ALTER TABLE "Center"
ADD COLUMN "division" TEXT NOT NULL,
ALTER COLUMN "village" SET NOT NULL;

CREATE INDEX "Seller_state_division_district_idx" ON "Seller"("state", "division", "district");
CREATE INDEX "Buyer_state_division_district_idx" ON "Buyer"("state", "division", "district");
CREATE INDEX "Center_state_division_district_idx" ON "Center"("state", "division", "district");
