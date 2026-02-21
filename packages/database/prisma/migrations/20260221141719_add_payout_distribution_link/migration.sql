-- AlterTable
ALTER TABLE "payouts" ADD COLUMN     "failure_reason" TEXT;

-- AlterTable
ALTER TABLE "tip_distributions" ADD COLUMN     "payout_id" TEXT;

-- CreateIndex
CREATE INDEX "payouts_status_idx" ON "payouts"("status");

-- CreateIndex
CREATE INDEX "tip_distributions_payout_id_idx" ON "tip_distributions"("payout_id");

-- CreateIndex
CREATE INDEX "tip_distributions_staff_member_id_payout_id_idx" ON "tip_distributions"("staff_member_id", "payout_id");

-- AddForeignKey
ALTER TABLE "tip_distributions" ADD CONSTRAINT "tip_distributions_payout_id_fkey" FOREIGN KEY ("payout_id") REFERENCES "payouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
