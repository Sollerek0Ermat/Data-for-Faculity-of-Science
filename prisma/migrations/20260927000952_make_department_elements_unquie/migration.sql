/*
  Warnings:

  - A unique constraint covering the columns `[depName]` on the table `Department` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[departmentDescription]` on the table `Department` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Department_depName_key" ON "Department"("depName");

-- CreateIndex
CREATE UNIQUE INDEX "Department_departmentDescription_key" ON "Department"("departmentDescription");
