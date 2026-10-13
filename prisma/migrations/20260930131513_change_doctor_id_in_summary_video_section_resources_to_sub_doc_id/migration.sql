/*
  Warnings:

  - You are about to drop the column `doctorId` on the `Resources` table. All the data in the column will be lost.
  - You are about to drop the column `doctorId` on the `Sections` table. All the data in the column will be lost.
  - You are about to drop the column `doctorId` on the `Summaries` table. All the data in the column will be lost.
  - You are about to drop the column `doctorId` on the `videos` table. All the data in the column will be lost.
  - Added the required column `subDocId` to the `Resources` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subDocId` to the `Sections` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subDocId` to the `Summaries` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subDocId` to the `videos` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Resources" DROP CONSTRAINT "Resources_doctorId_fkey";

-- DropForeignKey
ALTER TABLE "Sections" DROP CONSTRAINT "Sections_doctorId_fkey";

-- DropForeignKey
ALTER TABLE "Summaries" DROP CONSTRAINT "Summaries_doctorId_fkey";

-- DropForeignKey
ALTER TABLE "videos" DROP CONSTRAINT "videos_doctorId_fkey";

-- AlterTable
ALTER TABLE "Resources" DROP COLUMN "doctorId",
ADD COLUMN     "subDocId" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "Sections" DROP COLUMN "doctorId",
ADD COLUMN     "subDocId" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "Summaries" DROP COLUMN "doctorId",
ADD COLUMN     "subDocId" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "videos" DROP COLUMN "doctorId",
ADD COLUMN     "subDocId" BIGINT NOT NULL;

-- AddForeignKey
ALTER TABLE "Sections" ADD CONSTRAINT "Sections_subDocId_fkey" FOREIGN KEY ("subDocId") REFERENCES "Subject_Doctor"("subDocId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resources" ADD CONSTRAINT "Resources_subDocId_fkey" FOREIGN KEY ("subDocId") REFERENCES "Subject_Doctor"("subDocId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "videos" ADD CONSTRAINT "videos_subDocId_fkey" FOREIGN KEY ("subDocId") REFERENCES "Subject_Doctor"("subDocId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Summaries" ADD CONSTRAINT "Summaries_subDocId_fkey" FOREIGN KEY ("subDocId") REFERENCES "Subject_Doctor"("subDocId") ON DELETE RESTRICT ON UPDATE CASCADE;
