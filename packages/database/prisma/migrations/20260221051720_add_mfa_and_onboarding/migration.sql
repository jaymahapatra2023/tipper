-- AlterTable
ALTER TABLE "hotels" ADD COLUMN     "mfa_required" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mfa_recovery_codes" TEXT[],
ADD COLUMN     "mfa_secret" TEXT,
ADD COLUMN     "mfa_setup_at" TIMESTAMP(3);
