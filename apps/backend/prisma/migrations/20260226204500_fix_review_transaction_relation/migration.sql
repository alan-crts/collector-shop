-- AlterTable
ALTER TABLE "review" ADD COLUMN     "transactionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "review_reviewerId_transactionId_key" ON "review"("reviewerId", "transactionId");

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
