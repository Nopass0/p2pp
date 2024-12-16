-- CreateTable
CREATE TABLE "GateCookie" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "cookie" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastChecked" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GateCookie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GateTransaction" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "transactionId" TEXT NOT NULL,
    "paymentMethodId" INTEGER NOT NULL,
    "wallet" TEXT NOT NULL,
    "amountRub" DOUBLE PRECISION NOT NULL,
    "amountUsdt" DOUBLE PRECISION NOT NULL,
    "totalRub" DOUBLE PRECISION NOT NULL,
    "totalUsdt" DOUBLE PRECISION NOT NULL,
    "status" INTEGER NOT NULL,
    "bankName" TEXT,
    "bankLabel" TEXT,
    "paymentMethod" TEXT,
    "course" DOUBLE PRECISION,
    "successCount" INTEGER,
    "successRate" DOUBLE PRECISION,
    "usdtBalance" TEXT,
    "rubBalance" TEXT,
    "approvedAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GateTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GateCookie_userId_idx" ON "GateCookie"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GateTransaction_transactionId_key" ON "GateTransaction"("transactionId");

-- CreateIndex
CREATE INDEX "GateTransaction_userId_createdAt_idx" ON "GateTransaction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "GateTransaction_transactionId_idx" ON "GateTransaction"("transactionId");

-- AddForeignKey
ALTER TABLE "GateCookie" ADD CONSTRAINT "GateCookie_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GateTransaction" ADD CONSTRAINT "GateTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;