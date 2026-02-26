-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'OFFER');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- AlterTable
ALTER TABLE "message" ADD COLUMN     "offerPrice" DOUBLE PRECISION,
ADD COLUMN     "offerStatus" "OfferStatus",
ADD COLUMN     "type" "MessageType" NOT NULL DEFAULT 'TEXT';
