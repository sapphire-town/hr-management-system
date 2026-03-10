-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AssetStatus" ADD VALUE 'RETURN_REQUESTED';
ALTER TYPE "AssetStatus" ADD VALUE 'MANAGER_RETURN_APPROVED';
ALTER TYPE "AssetStatus" ADD VALUE 'RETURNED';

-- AlterTable
ALTER TABLE "asset_requests" ADD COLUMN     "managerReturnApproved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "returnCondition" TEXT,
ADD COLUMN     "returnReason" TEXT,
ADD COLUMN     "returnedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "isInterviewer" BOOLEAN NOT NULL DEFAULT false;
