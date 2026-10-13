/*
  Warnings:

  - Changed the type of `resourcePublishDate` on the `Resources` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `resourceLastEditDate` on the `Resources` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `sectionPublishDate` on the `Sections` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `sectionLastEditDate` on the `Sections` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `summaryPublishDate` on the `Summaries` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `summaryLastEditDate` on the `Summaries` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `videoPublishDate` on the `videos` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `videoLastEditDate` on the `videos` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Resources" ADD COLUMN     "fileType" TEXT NOT NULL DEFAULT ' ',
DROP COLUMN "resourcePublishDate",
ADD COLUMN     "resourcePublishDate" TIMESTAMP(3) NOT NULL,
DROP COLUMN "resourceLastEditDate",
ADD COLUMN     "resourceLastEditDate" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Sections" ADD COLUMN     "fileType" TEXT NOT NULL DEFAULT ' ',
DROP COLUMN "sectionPublishDate",
ADD COLUMN     "sectionPublishDate" TIMESTAMP(3) NOT NULL,
DROP COLUMN "sectionLastEditDate",
ADD COLUMN     "sectionLastEditDate" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Summaries" ADD COLUMN     "fileType" TEXT NOT NULL DEFAULT ' ',
DROP COLUMN "summaryPublishDate",
ADD COLUMN     "summaryPublishDate" TIMESTAMP(3) NOT NULL,
DROP COLUMN "summaryLastEditDate",
ADD COLUMN     "summaryLastEditDate" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "videos" ADD COLUMN     "fileType" TEXT NOT NULL DEFAULT ' ',
DROP COLUMN "videoPublishDate",
ADD COLUMN     "videoPublishDate" TIMESTAMP(3) NOT NULL,
DROP COLUMN "videoLastEditDate",
ADD COLUMN     "videoLastEditDate" TIMESTAMP(3) NOT NULL;
