-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "transaction_analyses" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "merchant" TEXT NOT NULL,
    "deviceIp" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "status" "AnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "fraudScore" INTEGER,
    "iaReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transaction_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transaction_analyses_transactionId_key" ON "transaction_analyses"("transactionId");

-- CreateIndex
CREATE INDEX "transaction_analyses_status_idx" ON "transaction_analyses"("status");
