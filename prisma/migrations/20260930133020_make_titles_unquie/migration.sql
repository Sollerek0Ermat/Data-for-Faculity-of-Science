/*
  Warnings:

  - A unique constraint covering the columns `[resourceTitle]` on the table `Resources` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[sectionTitle]` on the table `Sections` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[summaryTitle]` on the table `Summaries` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[videoTitle]` on the table `videos` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Resources_resourceTitle_key" ON "Resources"("resourceTitle");

-- CreateIndex
CREATE UNIQUE INDEX "Sections_sectionTitle_key" ON "Sections"("sectionTitle");

-- CreateIndex
CREATE UNIQUE INDEX "Summaries_summaryTitle_key" ON "Summaries"("summaryTitle");

-- CreateIndex
CREATE UNIQUE INDEX "videos_videoTitle_key" ON "videos"("videoTitle");
