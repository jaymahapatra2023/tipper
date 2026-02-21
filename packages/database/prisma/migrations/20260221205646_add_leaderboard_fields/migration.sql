-- AlterTable
ALTER TABLE "hotels" ADD COLUMN     "leaderboard_anonymized" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "leaderboard_enabled" BOOLEAN NOT NULL DEFAULT false;
