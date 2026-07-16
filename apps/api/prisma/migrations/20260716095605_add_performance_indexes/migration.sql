-- CreateIndex
CREATE INDEX "Transaction_accountId_occurredAt_idx" ON "Transaction"("accountId", "occurredAt");

-- CreateIndex
CREATE INDEX "Transaction_accountId_stockSymbol_idx" ON "Transaction"("accountId", "stockSymbol");

-- CreateIndex
CREATE INDEX "User_familyId_deactivatedAt_idx" ON "User"("familyId", "deactivatedAt");
