-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('SELLER', 'BUYER', 'CENTER', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."SellerType" AS ENUM ('FARMER', 'FPO', 'TRADER', 'COOPERATIVE');

-- CreateEnum
CREATE TYPE "public"."VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "aadhaarNumber" TEXT,
    "role" "public"."Role" NOT NULL,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "aadhaarVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Seller" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sellerType" "public"."SellerType" NOT NULL,
    "village" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "bankAccount" TEXT NOT NULL,
    "ifscCode" TEXT NOT NULL,
    "verificationStatus" "public"."VerificationStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "Seller_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FarmerProfile" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "landArea" DOUBLE PRECISION NOT NULL,
    "landUnit" TEXT NOT NULL,
    "khasraNumber" TEXT,
    "pmKisanId" TEXT,
    "kccNumber" TEXT,

    CONSTRAINT "FarmerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FPOProfile" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "organizationName" TEXT NOT NULL,
    "registrationNo" TEXT NOT NULL,
    "memberCount" INTEGER NOT NULL,

    CONSTRAINT "FPOProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "public"."User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_aadhaarNumber_key" ON "public"."User"("aadhaarNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Seller_userId_key" ON "public"."Seller"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FarmerProfile_sellerId_key" ON "public"."FarmerProfile"("sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "FPOProfile_sellerId_key" ON "public"."FPOProfile"("sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "FPOProfile_registrationNo_key" ON "public"."FPOProfile"("registrationNo");

-- AddForeignKey
ALTER TABLE "public"."Seller" ADD CONSTRAINT "Seller_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FarmerProfile" ADD CONSTRAINT "FarmerProfile_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "public"."Seller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FPOProfile" ADD CONSTRAINT "FPOProfile_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "public"."Seller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
