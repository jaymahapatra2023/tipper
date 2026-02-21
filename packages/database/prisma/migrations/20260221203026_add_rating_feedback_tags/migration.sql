-- AlterTable
ALTER TABLE "hotels" ADD COLUMN     "feedback_tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "tips" ADD COLUMN     "feedback_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "rating" INTEGER;
