-- AlterTable
ALTER TABLE "tips" ADD COLUMN     "receipt_token_expires_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "hotels_status_idx" ON "hotels"("status");

-- CreateIndex
CREATE INDEX "qr_codes_room_id_status_idx" ON "qr_codes"("room_id", "status");

-- CreateIndex
CREATE INDEX "tips_guest_id_idx" ON "tips"("guest_id");

-- CreateIndex
CREATE INDEX "tips_created_at_idx" ON "tips"("created_at");

-- AddForeignKey
ALTER TABLE "shift_template_entries" ADD CONSTRAINT "shift_template_entries_staff_member_id_fkey" FOREIGN KEY ("staff_member_id") REFERENCES "staff_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
