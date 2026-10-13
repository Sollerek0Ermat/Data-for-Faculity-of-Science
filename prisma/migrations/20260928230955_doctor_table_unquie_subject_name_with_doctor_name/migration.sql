/*
  Warnings:

  - A unique constraint covering the columns `[subjectName,doctorName]` on the table `Doctors` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Doctors_subjectName_doctorName_key" ON "Doctors"("subjectName", "doctorName");
