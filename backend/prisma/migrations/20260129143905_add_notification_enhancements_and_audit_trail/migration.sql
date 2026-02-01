/*
  Warnings:

  - The `type` column on the `notifications` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('INTERVIEWER_ASSIGNED', 'STUDENT_ADDED', 'DRIVE_UPDATE', 'DRIVE_REMINDER', 'LEAVE_STATUS', 'DOCUMENT_RELEASED', 'RESIGNATION_STATUS', 'TICKET_ASSIGNED', 'PASSWORD_RESET', 'WELCOME', 'PROMOTION', 'REWARD', 'BIRTHDAY');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'IN_APP', 'BOTH');

-- AlterTable
ALTER TABLE "employees" ALTER COLUMN "sickLeaveBalance" SET DEFAULT 12,
ALTER COLUMN "casualLeaveBalance" SET DEFAULT 12,
ALTER COLUMN "earnedLeaveBalance" SET DEFAULT 15;

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "channel" "NotificationChannel" NOT NULL DEFAULT 'BOTH',
ADD COLUMN     "metadata" JSONB,
DROP COLUMN "type",
ADD COLUMN     "type" "NotificationType" NOT NULL DEFAULT 'WELCOME';

-- CreateTable
CREATE TABLE "round_evaluation_history" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "previousStatus" "InterviewRoundStatus",
    "newStatus" "InterviewRoundStatus" NOT NULL,
    "previousComments" TEXT,
    "newComments" TEXT,
    "editedBy" TEXT NOT NULL,
    "editedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changeReason" TEXT,

    CONSTRAINT "round_evaluation_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "round_evaluation_history_evaluationId_idx" ON "round_evaluation_history"("evaluationId");

-- CreateIndex
CREATE INDEX "notifications_recipientId_isRead_idx" ON "notifications"("recipientId", "isRead");

-- AddForeignKey
ALTER TABLE "round_evaluation_history" ADD CONSTRAINT "round_evaluation_history_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "round_evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "round_evaluation_history" ADD CONSTRAINT "round_evaluation_history_editedBy_fkey" FOREIGN KEY ("editedBy") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
