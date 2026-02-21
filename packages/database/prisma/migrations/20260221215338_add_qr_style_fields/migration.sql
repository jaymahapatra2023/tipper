-- AlterTable
ALTER TABLE "hotels" ADD COLUMN     "qr_background_color" TEXT,
ADD COLUMN     "qr_foreground_color" TEXT,
ADD COLUMN     "qr_logo_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "qr_style" TEXT NOT NULL DEFAULT 'square';
