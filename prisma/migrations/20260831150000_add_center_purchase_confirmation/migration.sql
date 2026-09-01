CREATE TYPE "CenterPurchaseDecision" AS ENUM ('PENDING', 'ACCEPTED');

ALTER TABLE "QualityInspection"
ADD COLUMN "centerDecision" "CenterPurchaseDecision" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "centerDecisionAt" TIMESTAMP(3);
