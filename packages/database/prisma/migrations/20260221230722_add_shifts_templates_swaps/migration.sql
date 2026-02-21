-- CreateEnum
CREATE TYPE "ShiftStatus" AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "SwapRequestStatus" AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');

-- AlterTable
ALTER TABLE "hotels" ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'America/New_York';

-- CreateTable
CREATE TABLE "shifts" (
    "id" TEXT NOT NULL,
    "staff_member_id" TEXT NOT NULL,
    "hotel_id" TEXT NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "status" "ShiftStatus" NOT NULL DEFAULT 'scheduled',
    "notes" TEXT,
    "template_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_rooms" (
    "id" TEXT NOT NULL,
    "shift_id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,

    CONSTRAINT "shift_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_templates" (
    "id" TEXT NOT NULL,
    "hotel_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shift_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_template_entries" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "staff_member_id" TEXT NOT NULL,
    "day_of_week" "DayOfWeek" NOT NULL,
    "start_hour" INTEGER NOT NULL,
    "start_minute" INTEGER NOT NULL DEFAULT 0,
    "end_hour" INTEGER NOT NULL,
    "end_minute" INTEGER NOT NULL DEFAULT 0,
    "room_ids" TEXT[],

    CONSTRAINT "shift_template_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_swap_requests" (
    "id" TEXT NOT NULL,
    "original_shift_id" TEXT NOT NULL,
    "requester_id" TEXT NOT NULL,
    "target_staff_id" TEXT,
    "swap_shift_id" TEXT,
    "status" "SwapRequestStatus" NOT NULL DEFAULT 'pending',
    "reason" TEXT,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shift_swap_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shifts_hotel_id_start_time_idx" ON "shifts"("hotel_id", "start_time");

-- CreateIndex
CREATE INDEX "shifts_staff_member_id_start_time_idx" ON "shifts"("staff_member_id", "start_time");

-- CreateIndex
CREATE INDEX "shifts_hotel_id_status_idx" ON "shifts"("hotel_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "shift_rooms_shift_id_room_id_key" ON "shift_rooms"("shift_id", "room_id");

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_staff_member_id_fkey" FOREIGN KEY ("staff_member_id") REFERENCES "staff_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "shift_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_rooms" ADD CONSTRAINT "shift_rooms_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_rooms" ADD CONSTRAINT "shift_rooms_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_templates" ADD CONSTRAINT "shift_templates_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_template_entries" ADD CONSTRAINT "shift_template_entries_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "shift_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_swap_requests" ADD CONSTRAINT "shift_swap_requests_original_shift_id_fkey" FOREIGN KEY ("original_shift_id") REFERENCES "shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_swap_requests" ADD CONSTRAINT "shift_swap_requests_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "staff_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_swap_requests" ADD CONSTRAINT "shift_swap_requests_target_staff_id_fkey" FOREIGN KEY ("target_staff_id") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_swap_requests" ADD CONSTRAINT "shift_swap_requests_swap_shift_id_fkey" FOREIGN KEY ("swap_shift_id") REFERENCES "shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
