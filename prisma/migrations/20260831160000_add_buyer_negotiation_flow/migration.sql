ALTER TABLE "BuyerOrder"
ADD COLUMN "buyerProposedPrice" DECIMAL(10,2),
ADD COLUMN "buyerNegotiationNote" TEXT,
ADD COLUMN "physicalCheckApprovedAt" TIMESTAMP(3);
