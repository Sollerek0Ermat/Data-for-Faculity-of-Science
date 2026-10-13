/*
  Warnings:

  - You are about to drop the column `subjectName` on the `Doctors` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[doctorName]` on the table `Doctors` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Doctors_subjectName_doctorName_key";

-- AlterTable
ALTER TABLE "Doctors" DROP COLUMN "subjectName";

-- CreateIndex
CREATE UNIQUE INDEX "Doctors_doctorName_key" ON "Doctors"("doctorName");
