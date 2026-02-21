/*
  Warnings:

  - A unique constraint covering the columns `[receipt_token]` on the table `tips` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "tips" ADD COLUMN     "receipt_sent_at" TIMESTAMP(3),
ADD COLUMN     "receipt_token" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "tips_receipt_token_key" ON "tips"("receipt_token");
