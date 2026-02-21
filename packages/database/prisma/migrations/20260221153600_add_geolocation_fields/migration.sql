-- AlterTable
ALTER TABLE "hotels" ADD COLUMN     "geofence_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "geofence_latitude" DOUBLE PRECISION,
ADD COLUMN     "geofence_longitude" DOUBLE PRECISION,
ADD COLUMN     "geofence_radius" INTEGER NOT NULL DEFAULT 500;

-- AlterTable
ALTER TABLE "tips" ADD COLUMN     "guest_latitude" DOUBLE PRECISION,
ADD COLUMN     "guest_location_accuracy" DOUBLE PRECISION,
ADD COLUMN     "guest_longitude" DOUBLE PRECISION,
ADD COLUMN     "location_distance" DOUBLE PRECISION,
ADD COLUMN     "location_verified" BOOLEAN NOT NULL DEFAULT true;
