/*
  Warnings:

  - You are about to drop the column `loginAttempts` on the `Users` table. All the data in the column will be lost.
  - You are about to drop the column `loginAttemptsTimestamp` on the `Users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Users" DROP COLUMN "loginAttempts",
DROP COLUMN "loginAttemptsTimestamp",
ADD COLUMN     "login_attempts" INTEGER DEFAULT 1,
ADD COLUMN     "login_attempts_timestamp" TIMESTAMP(3);
