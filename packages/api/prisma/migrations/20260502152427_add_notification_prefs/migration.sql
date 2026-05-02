-- AlterTable
ALTER TABLE "users" ADD COLUMN     "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "streakAlertsEnabled" BOOLEAN NOT NULL DEFAULT true;
