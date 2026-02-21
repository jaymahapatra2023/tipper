-- AlterTable
ALTER TABLE "hotels" ADD COLUMN     "default_guest_locale" TEXT NOT NULL DEFAULT 'en';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "preferred_locale" TEXT;
