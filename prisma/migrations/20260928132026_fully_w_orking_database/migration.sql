/*
  Warnings:

  - You are about to drop the column `publishedBy` on the `Resources` table. All the data in the column will be lost.
  - The primary key for the `Subject_Doctor` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the `Semester_Level` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[subjectId,doctorId]` on the table `Subject_Doctor` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Resources" DROP CONSTRAINT "Resources_doctorId_fkey";

-- DropForeignKey
ALTER TABLE "Sections" DROP CONSTRAINT "Sections_doctorId_fkey";

-- DropForeignKey
ALTER TABLE "Semester_Level" DROP CONSTRAINT "Semester_Level_levelId_fkey";

-- DropForeignKey
ALTER TABLE "Semester_Level" DROP CONSTRAINT "Semester_Level_semesterId_fkey";

-- DropForeignKey
ALTER TABLE "Summaries" DROP CONSTRAINT "Summaries_doctorId_fkey";

-- DropForeignKey
ALTER TABLE "videos" DROP CONSTRAINT "videos_doctorId_fkey";

-- AlterTable
ALTER TABLE "Resources" DROP COLUMN "publishedBy";

-- AlterTable
ALTER TABLE "Subject_Doctor" DROP CONSTRAINT "Subject_Doctor_pkey",
ADD COLUMN     "subDocId" BIGSERIAL NOT NULL,
ADD CONSTRAINT "Subject_Doctor_pkey" PRIMARY KEY ("subDocId");

-- DropTable
DROP TABLE "Semester_Level";

-- CreateIndex
CREATE UNIQUE INDEX "Subject_Doctor_subjectId_doctorId_key" ON "Subject_Doctor"("subjectId", "doctorId");

-- AddForeignKey
ALTER TABLE "Semester" ADD CONSTRAINT "Semester_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("levelId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sections" ADD CONSTRAINT "Sections_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Subject_Doctor"("subDocId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resources" ADD CONSTRAINT "Resources_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Subject_Doctor"("subDocId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "videos" ADD CONSTRAINT "videos_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Subject_Doctor"("subDocId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Summaries" ADD CONSTRAINT "Summaries_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Subject_Doctor"("subDocId") ON DELETE RESTRICT ON UPDATE CASCADE;
