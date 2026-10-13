-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('moderator', 'owner', 'user', 'doctor');

-- CreateTable
CREATE TABLE "Users" (
    "userId" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "colleageEmail" TEXT NOT NULL,
    "password" TEXT,
    "beforeCurrentPassword" TEXT,
    "passwordChangedAt" TIMESTAMP(3),
    "changePasswordAttempts" INTEGER DEFAULT 1,
    "changePasswordAttemptsTimestamp" TIMESTAMP(3),
    "failedChangePasswordTimes" INTEGER DEFAULT 0,
    "photo" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'user',
    "level" TEXT NOT NULL,
    "loginAttempts" INTEGER DEFAULT 1,
    "loginAttemptsTimestamp" TIMESTAMP(3),
    "failedLoginTimes" INTEGER DEFAULT 0,
    "jwtExpires" TIMESTAMP(3),
    "isLocked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Users_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Department" (
    "depId" BIGSERIAL NOT NULL,
    "depName" TEXT NOT NULL,
    "departmentDescription" TEXT NOT NULL,
    "departmentExpectedJobs" TEXT NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("depId")
);

-- CreateTable
CREATE TABLE "Level" (
    "levelId" BIGSERIAL NOT NULL,
    "levelNumber" BIGINT NOT NULL,
    "depId" BIGINT NOT NULL,

    CONSTRAINT "Level_pkey" PRIMARY KEY ("levelId")
);

-- CreateTable
CREATE TABLE "Semester" (
    "semsterId" BIGSERIAL NOT NULL,
    "semesterNumber" BIGINT NOT NULL,
    "levelId" BIGINT NOT NULL,

    CONSTRAINT "Semester_pkey" PRIMARY KEY ("semsterId")
);

-- CreateTable
CREATE TABLE "Subject" (
    "subjectId" BIGSERIAL NOT NULL,
    "subjectName" TEXT NOT NULL,
    "semsterId" BIGINT NOT NULL,
    "subjectDescription" TEXT NOT NULL,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("subjectId")
);

-- CreateTable
CREATE TABLE "Sections" (
    "sectionId" BIGSERIAL NOT NULL,
    "doctorId" BIGINT NOT NULL,
    "section" TEXT NOT NULL,
    "sectionPublishedBy" TEXT NOT NULL,
    "sectionPublishDate" TEXT NOT NULL,
    "sectionLastEditDate" TEXT NOT NULL,
    "sectionTitle" TEXT NOT NULL,

    CONSTRAINT "Sections_pkey" PRIMARY KEY ("sectionId")
);

-- CreateTable
CREATE TABLE "Doctors" (
    "doctorId" BIGSERIAL NOT NULL,
    "doctorName" TEXT NOT NULL,
    "subjectId" BIGINT NOT NULL,
    "subjectName" TEXT NOT NULL,
    "doctorPhoto" TEXT NOT NULL,
    "doctorAcademicDegree" TEXT NOT NULL,
    "doctorDescription" TEXT NOT NULL,
    "doctorCertifications" TEXT,

    CONSTRAINT "Doctors_pkey" PRIMARY KEY ("doctorId")
);

-- CreateTable
CREATE TABLE "Subject_Doctor" (
    "subjectId" BIGINT NOT NULL,
    "doctorId" BIGINT NOT NULL,

    CONSTRAINT "Subject_Doctor_pkey" PRIMARY KEY ("subjectId","doctorId")
);

-- CreateTable
CREATE TABLE "Resources" (
    "resourcesId" BIGSERIAL NOT NULL,
    "doctorId" BIGINT NOT NULL,
    "resource" TEXT NOT NULL,
    "publishedBy" TEXT NOT NULL,
    "resourcePublishedBy" TEXT NOT NULL,
    "resourcePublishDate" TEXT NOT NULL,
    "resourceLastEditDate" TEXT NOT NULL,
    "resourceTitle" TEXT NOT NULL,

    CONSTRAINT "Resources_pkey" PRIMARY KEY ("resourcesId")
);

-- CreateTable
CREATE TABLE "videos" (
    "videosId" BIGSERIAL NOT NULL,
    "doctorId" BIGINT NOT NULL,
    "video" TEXT NOT NULL,
    "videoPublishedBy" TEXT NOT NULL,
    "videoPublishDate" TEXT NOT NULL,
    "videoLastEditDate" TEXT NOT NULL,
    "videoTitle" TEXT NOT NULL,

    CONSTRAINT "videos_pkey" PRIMARY KEY ("videosId")
);

-- CreateTable
CREATE TABLE "Summaries" (
    "summariesId" BIGSERIAL NOT NULL,
    "doctorId" BIGINT NOT NULL,
    "summary" TEXT NOT NULL,
    "symmaryPublishedBy" TEXT NOT NULL,
    "summaryPublishDate" TEXT NOT NULL,
    "summaryLastEditDate" TEXT NOT NULL,
    "summaryTitle" TEXT NOT NULL,

    CONSTRAINT "Summaries_pkey" PRIMARY KEY ("summariesId")
);

-- CreateTable
CREATE TABLE "Semester_Level" (
    "levelId" BIGINT NOT NULL,
    "semesterId" BIGINT NOT NULL,

    CONSTRAINT "Semester_Level_pkey" PRIMARY KEY ("levelId","semesterId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Users_colleageEmail_key" ON "Users"("colleageEmail");

-- CreateIndex
CREATE INDEX "BTree_userId_idx" ON "Users"("userId");

-- CreateIndex
CREATE INDEX "hash_userId_idx" ON "Users" USING HASH ("userId");

-- CreateIndex
CREATE INDEX "BTree_colleageEmail_idx" ON "Users"("colleageEmail");

-- CreateIndex
CREATE INDEX "hash_colleageEmail_idx" ON "Users" USING HASH ("colleageEmail");

-- CreateIndex
CREATE INDEX "BTree_Users_role_idx" ON "Users"("role");

-- CreateIndex
CREATE INDEX "hash_Users_role_idx" ON "Users" USING HASH ("role");

-- CreateIndex
CREATE INDEX "BTree_depId_idx" ON "Department"("depId");

-- CreateIndex
CREATE INDEX "hash_depId_idx" ON "Department" USING HASH ("depId");

-- CreateIndex
CREATE INDEX "BTree_depName_idx" ON "Department"("depName");

-- CreateIndex
CREATE INDEX "hash_depName_idx" ON "Department" USING HASH ("depName");

-- CreateIndex
CREATE INDEX "BTree_levelId_idx" ON "Level"("levelId");

-- CreateIndex
CREATE INDEX "hash_levelId_idx" ON "Level" USING HASH ("levelId");

-- CreateIndex
CREATE INDEX "BTree_levelNumber_idx" ON "Level"("levelNumber");

-- CreateIndex
CREATE INDEX "hash_levelNumber_idx" ON "Level" USING HASH ("levelNumber");

-- CreateIndex
CREATE INDEX "BTree_semsterId_idx" ON "Semester"("semsterId");

-- CreateIndex
CREATE INDEX "hash_semsterId_idx" ON "Semester" USING HASH ("semsterId");

-- CreateIndex
CREATE INDEX "BTree_semesterNumber_idx" ON "Semester"("semesterNumber");

-- CreateIndex
CREATE INDEX "hash_semesterNumber_idx" ON "Semester" USING HASH ("semesterNumber");

-- CreateIndex
CREATE INDEX "BTree_subjectId_idx" ON "Subject"("subjectId");

-- CreateIndex
CREATE INDEX "hash_subjectId_idx" ON "Subject" USING HASH ("subjectId");

-- CreateIndex
CREATE INDEX "BTree_subjectName_idx" ON "Subject"("subjectName");

-- CreateIndex
CREATE INDEX "hash_subjectName_idx" ON "Subject" USING HASH ("subjectName");

-- CreateIndex
CREATE INDEX "BTree_sectionId_idx" ON "Sections"("sectionId");

-- CreateIndex
CREATE INDEX "hash_sectionId_idx" ON "Sections" USING HASH ("sectionId");

-- CreateIndex
CREATE INDEX "BTree_doctorId_idx" ON "Doctors"("doctorId");

-- CreateIndex
CREATE INDEX "hash_doctorId_idx" ON "Doctors" USING HASH ("doctorId");

-- CreateIndex
CREATE INDEX "BTree_doctorName_idx" ON "Doctors"("doctorName");

-- CreateIndex
CREATE INDEX "hash_doctorName_idx" ON "Doctors" USING HASH ("doctorName");

-- CreateIndex
CREATE INDEX "BTree_resourcesId_idx" ON "Resources"("resourcesId");

-- CreateIndex
CREATE INDEX "hash_resourcesId_idx" ON "Resources" USING HASH ("resourcesId");

-- CreateIndex
CREATE INDEX "BTree_videosId_idx" ON "videos"("videosId");

-- CreateIndex
CREATE INDEX "hash_videosId_idx" ON "videos" USING HASH ("videosId");

-- CreateIndex
CREATE INDEX "BTree_summariesId_idx" ON "Summaries"("summariesId");

-- CreateIndex
CREATE INDEX "hash_summariesId_idx" ON "Summaries" USING HASH ("summariesId");

-- AddForeignKey
ALTER TABLE "Level" ADD CONSTRAINT "Level_depId_fkey" FOREIGN KEY ("depId") REFERENCES "Department"("depId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_semsterId_fkey" FOREIGN KEY ("semsterId") REFERENCES "Semester"("semsterId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sections" ADD CONSTRAINT "Sections_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctors"("doctorId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subject_Doctor" ADD CONSTRAINT "Subject_Doctor_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("subjectId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subject_Doctor" ADD CONSTRAINT "Subject_Doctor_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctors"("doctorId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resources" ADD CONSTRAINT "Resources_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctors"("doctorId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "videos" ADD CONSTRAINT "videos_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctors"("doctorId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Summaries" ADD CONSTRAINT "Summaries_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctors"("doctorId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Semester_Level" ADD CONSTRAINT "Semester_Level_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("levelId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Semester_Level" ADD CONSTRAINT "Semester_Level_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semester"("semsterId") ON DELETE RESTRICT ON UPDATE CASCADE;
