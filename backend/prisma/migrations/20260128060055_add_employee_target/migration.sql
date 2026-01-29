-- CreateEnum
CREATE TYPE "HiringRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'IN_PROGRESS', 'FILLED');

-- AlterTable
ALTER TABLE "attendance" ADD COLUMN     "checkInTime" TIMESTAMP(3),
ADD COLUMN     "checkOutTime" TIMESTAMP(3),
ADD COLUMN     "workingHours" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "hiring_requests" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "status" "HiringRequestStatus" NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "company_settings" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL DEFAULT 'Acme Corporation',
    "workingHoursStart" TEXT NOT NULL DEFAULT '09:00',
    "workingHoursEnd" TEXT NOT NULL DEFAULT '18:00',
    "workingDays" JSONB NOT NULL DEFAULT '[1,2,3,4,5]',
    "leavePolicies" JSONB NOT NULL DEFAULT '{}',
    "notificationPreferences" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "company_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_targets" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "targetMonth" TEXT NOT NULL,
    "targetData" JSONB NOT NULL,
    "setBy" TEXT NOT NULL,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_targets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employee_targets_employeeId_targetMonth_key" ON "employee_targets"("employeeId", "targetMonth");

-- AddForeignKey
ALTER TABLE "hiring_requests" ADD CONSTRAINT "hiring_requests_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hiring_requests" ADD CONSTRAINT "hiring_requests_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
