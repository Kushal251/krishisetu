CREATE TABLE "CenterTradeOrder" (
    "id" TEXT NOT NULL,
    "buyerCenterId" TEXT NOT NULL,
    "sellerCenterId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "requestedQty" DECIMAL(10,2) NOT NULL,
    "finalQty" DECIMAL(10,2),
    "proposedPrice" DECIMAL(10,2),
    "negotiationNote" TEXT,
    "status" "BuyerOrderStatus" NOT NULL DEFAULT 'ORDERED',
    "cancelReason" TEXT,
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CenterTradeOrder_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CenterTradeOrder_buyerCenterId_createdAt_idx" ON "CenterTradeOrder"("buyerCenterId", "createdAt");
CREATE INDEX "CenterTradeOrder_sellerCenterId_createdAt_idx" ON "CenterTradeOrder"("sellerCenterId", "createdAt");
CREATE INDEX "CenterTradeOrder_listingId_status_idx" ON "CenterTradeOrder"("listingId", "status");

ALTER TABLE "CenterTradeOrder" ADD CONSTRAINT "CenterTradeOrder_buyerCenterId_fkey" FOREIGN KEY ("buyerCenterId") REFERENCES "Center"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CenterTradeOrder" ADD CONSTRAINT "CenterTradeOrder_sellerCenterId_fkey" FOREIGN KEY ("sellerCenterId") REFERENCES "Center"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CenterTradeOrder" ADD CONSTRAINT "CenterTradeOrder_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "CenterListing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
