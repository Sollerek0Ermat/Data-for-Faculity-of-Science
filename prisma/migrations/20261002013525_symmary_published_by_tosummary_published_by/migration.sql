/*
  Warnings:

  - You are about to drop the column `symmaryPublishedBy` on the `Summaries` table. All the data in the column will be lost.
  - Added the required column `summaryPublishedBy` to the `Summaries` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Summaries" DROP COLUMN "symmaryPublishedBy",
ADD COLUMN     "summaryPublishedBy" TEXT NOT NULL;
