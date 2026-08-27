-- Seller profile verification requests and in-app messages
CREATE TYPE "public"."VerificationRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "public"."VerificationRequest" (
  "id" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "status" "public"."VerificationRequestStatus" NOT NULL DEFAULT 'PENDING',
  "note" TEXT,
  "adminNote" TEXT,
  "reviewedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  CONSTRAINT "VerificationRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."Notification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VerificationRequest_sellerId_status_idx" ON "public"."VerificationRequest"("sellerId", "status");
CREATE INDEX "VerificationRequest_status_createdAt_idx" ON "public"."VerificationRequest"("status", "createdAt");
CREATE INDEX "Notification_userId_createdAt_idx" ON "public"."Notification"("userId", "createdAt");

ALTER TABLE "public"."VerificationRequest" ADD CONSTRAINT "VerificationRequest_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "public"."Seller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."VerificationRequest" ADD CONSTRAINT "VerificationRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
