/*
  Warnings:

  - The `doctorCertifications` column on the `Doctors` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `certificationsType` column on the `Doctors` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Doctors" DROP COLUMN "doctorCertifications",
ADD COLUMN     "doctorCertifications" TEXT[],
DROP COLUMN "certificationsType",
ADD COLUMN     "certificationsType" TEXT[];
