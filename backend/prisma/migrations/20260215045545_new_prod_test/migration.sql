-- CreateEnum
CREATE TYPE "InternType" AS ENUM ('SUMMER', 'WINTER', 'CUSTOM');

-- AlterEnum
ALTER TYPE "AttendanceStatus" ADD VALUE 'UNPAID_LEAVE';

-- AlterEnum
ALTER TYPE "LeaveType" ADD VALUE 'UNPAID';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'DOCUMENT_VERIFICATION_PENDING';
ALTER TYPE "NotificationType" ADD VALUE 'DOCUMENT_VERIFIED';
ALTER TYPE "NotificationType" ADD VALUE 'RESIGNATION_SUBMITTED';
ALTER TYPE "NotificationType" ADD VALUE 'POLICY_UPDATE';
ALTER TYPE "NotificationType" ADD VALUE 'NEW_EMPLOYEE_ONBOARDING';
ALTER TYPE "NotificationType" ADD VALUE 'DAILY_REPORT_OVERDUE';
ALTER TYPE "NotificationType" ADD VALUE 'DAILY_REPORT_SUBMITTED';
ALTER TYPE "NotificationType" ADD VALUE 'HIRING_REQUEST_CREATED';
ALTER TYPE "NotificationType" ADD VALUE 'HIRING_REQUEST_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'TICKET_STATUS_UPDATED';
ALTER TYPE "NotificationType" ADD VALUE 'PAYSLIP_GENERATED';
ALTER TYPE "NotificationType" ADD VALUE 'DAILY_TARGET_UPDATED';

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'INTERN';

-- DropForeignKey
ALTER TABLE "employees" DROP CONSTRAINT "employees_roleId_fkey";

-- AlterTable
ALTER TABLE "company_settings" ADD COLUMN     "companyLogo" TEXT,
ADD COLUMN     "payslipTemplate" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "daily_reports" ADD COLUMN     "attachments" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "generalNotes" TEXT;

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "consecutiveWorkingDays" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "contractEndDate" TIMESTAMP(3),
ADD COLUMN     "internType" "InternType",
ADD COLUMN     "internshipDuration" TEXT,
ALTER COLUMN "roleId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "placement_drives" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'OPEN';

-- AlterTable
ALTER TABLE "rewards" ADD COLUMN     "badgeId" TEXT;

-- CreateTable
CREATE TABLE "document_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "description" TEXT,
    "htmlContent" TEXT NOT NULL,
    "placeholders" JSONB NOT NULL DEFAULT '[]',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "badges" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_working_days" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "workingDays" INTEGER NOT NULL,
    "overrides" JSONB NOT NULL DEFAULT '[]',
    "setBy" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_working_days_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "badges_name_key" ON "badges"("name");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_working_days_month_key" ON "monthly_working_days"("month");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_templates" ADD CONSTRAINT "document_templates_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "badges"("id") ON DELETE SET NULL ON UPDATE CASCADE;
