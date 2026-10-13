/*
  Warnings:

  - A unique constraint covering the columns `[subjectName]` on the table `Subject` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Subject_subjectName_key" ON "Subject"("subjectName");
