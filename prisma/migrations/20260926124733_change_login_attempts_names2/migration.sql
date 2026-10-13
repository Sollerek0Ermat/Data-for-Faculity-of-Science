/*
  Warnings:

  - You are about to drop the column `beforeCurrentPassword` on the `Users` table. All the data in the column will be lost.
  - You are about to drop the column `passwordChangedAt` on the `Users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Users" DROP COLUMN "beforeCurrentPassword",
DROP COLUMN "passwordChangedAt",
ADD COLUMN     "before_current_password" TEXT,
ADD COLUMN     "password_changed_at" TIMESTAMP(3);
