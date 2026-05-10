-- AlterTable
ALTER TABLE "users" ADD COLUMN "stripeCustomerId" TEXT UNIQUE;
ALTER TABLE "users" ADD COLUMN "stripeSubscriptionId" TEXT UNIQUE;
ALTER TABLE "users" ADD COLUMN "subscriptionStatus" TEXT;
ALTER TABLE "users" ADD COLUMN "currentPeriodEnd" TIMESTAMP;
ALTER TABLE "users" ADD COLUMN "billingInterval" TEXT;
ALTER TABLE "users" ADD COLUMN "autoSyncEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN "autoSyncIntervalHours" INTEGER NOT NULL DEFAULT 6;
