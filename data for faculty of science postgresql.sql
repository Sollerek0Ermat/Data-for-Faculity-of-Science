CREATE TABLE "Users"(
    "user_id" BIGINT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "ColleageEmail" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NULL,
    "before_current_password" VARCHAR(255) NULL,
    "password_changed_at" DATE NULL,
    "changePasswordAttempts" INTEGER NULL DEFAULT 1,
    "changePasswordAttemptsTimestamp" DATE NULL,
    "failedchangePasswordTimes" INTEGER NULL DEFAULT 0,
    "photo" VARCHAR(255) NULL,
    "role" VARCHAR(255) CHECK
        (
            "role" IN('moderator', 'owner', 'user', 'doctor')
        ) NOT NULL DEFAULT 'user',
        "level" VARCHAR(255) NOT NULL,
        "login_attempts" INTEGER NULL DEFAULT 1,
        "login_attempts_timestamp" DATE NULL,
        "failedLoginTimes" INTEGER NULL DEFAULT 0,
        "jwt_expires" DATE NULL,
        "isLocked" BOOLEAN NOT NULL DEFAULT FALSE
);
ALTER TABLE
    "Users" ADD PRIMARY KEY("user_id");
ALTER TABLE
    "Users" ADD CONSTRAINT "users_colleageemail_unique" UNIQUE("ColleageEmail");
CREATE TABLE "Department"(
    "dep_id" BIGINT NOT NULL,
    "depName" VARCHAR(255) NOT NULL,
    "departmentDescription" VARCHAR(255) NOT NULL,
    "departmentExpectedJobs" VARCHAR(255) NOT NULL
);
ALTER TABLE
    "Department" ADD PRIMARY KEY("dep_id");
CREATE TABLE "Level"(
    "level_id" BIGINT NOT NULL,
    "levelNumber" BIGINT NOT NULL,
    "dep_id" BIGINT NOT NULL
);
ALTER TABLE
    "Level" ADD PRIMARY KEY("level_id");
CREATE TABLE "Semester"(
    "semster_id" BIGINT NOT NULL,
    "semester_number" BIGINT NOT NULL,
    "level_id" BIGINT NOT NULL
);
ALTER TABLE
    "Semester" ADD PRIMARY KEY("semster_id");
CREATE TABLE "Subject"(
    "subject_id" BIGINT NOT NULL,
    "subjectName" BIGINT NOT NULL,
    "semster_id" BIGINT NOT NULL,
    "subjectDescription" VARCHAR(255) NOT NULL
);
ALTER TABLE
    "Subject" ADD PRIMARY KEY("subject_id");
CREATE TABLE "Sections"(
    "section_id" BIGINT NOT NULL,
    "doctor_id" BIGINT NOT NULL,
    "section" VARCHAR(255) NOT NULL,
    "sectionPublishedBy" VARCHAR(255) NOT NULL,
    "sectionPublishDate" VARCHAR(255) NOT NULL,
    "sectionLastEditDate" VARCHAR(255) NOT NULL,
    "sectionTitle" VARCHAR(255) NOT NULL
);
ALTER TABLE
    "Sections" ADD PRIMARY KEY("section_id");
CREATE TABLE "Doctors"(
    "doctor_id" BIGINT NOT NULL,
    "doctorName" VARCHAR(255) NOT NULL,
    "subject_id" BIGINT NOT NULL,
    "subjectName" VARCHAR(255) NOT NULL,
    "doctorPhoto" VARCHAR(255) NOT NULL,
    "doctorAcademicDegree" VARCHAR(255) NOT NULL,
    "doctorDescription" VARCHAR(255) NOT NULL,
    "doctorCertifications" VARCHAR(255) NULL
);
ALTER TABLE
    "Doctors" ADD PRIMARY KEY("doctor_id");
CREATE INDEX "doctors_doctorname_index" ON
    "Doctors"("doctorName");
CREATE INDEX "doctors_subjectname_index" ON
    "Doctors"("subjectName");
CREATE TABLE "Subject_Doctor"(
    "subDoc_id" BIGINT NOT NULL,
    "subject_id" BIGINT NOT NULL,
    "doctor_id" BIGINT NOT NULL
);
ALTER TABLE
    "Subject_Doctor" ADD PRIMARY KEY("subDoc_id");
CREATE TABLE "Resources"(
    "resources_id" BIGINT NOT NULL,
    "doctor_id" BIGINT NOT NULL,
    "resource" VARCHAR(255) NOT NULL,
    "PublishedBy" VARCHAR(255) NOT NULL,
    "resourcePublishedBy" VARCHAR(255) NOT NULL,
    "resourcePublishDate" VARCHAR(255) NOT NULL,
    "resourceLastEditDate" VARCHAR(255) NOT NULL,
    "resourceTitle" VARCHAR(255) NOT NULL
);
ALTER TABLE
    "Resources" ADD PRIMARY KEY("resources_id");
CREATE TABLE "videos"(
    "videos_id" BIGINT NOT NULL,
    "doctor_id" BIGINT NOT NULL,
    "video" VARCHAR(255) NOT NULL,
    "videoPublishedBy" VARCHAR(255) NOT NULL,
    "videoPublishDate" VARCHAR(255) NOT NULL,
    "videoLastEditDate" VARCHAR(255) NOT NULL,
    "videoTitle" VARCHAR(255) NOT NULL
);
ALTER TABLE
    "videos" ADD PRIMARY KEY("videos_id");
CREATE TABLE "Summaries"(
    "summaries_id" BIGINT NOT NULL,
    "doctor_id" BIGINT NOT NULL,
    "summary" VARCHAR(255) NOT NULL,
    "symmaryPublishedBy" VARCHAR(255) NOT NULL,
    "summaryPublishDate" VARCHAR(255) NOT NULL,
    "summaryLastEditDate" VARCHAR(255) NOT NULL,
    "summaryTitle" VARCHAR(255) NOT NULL
);
ALTER TABLE
    "Summaries" ADD PRIMARY KEY("summaries_id");
CREATE TABLE "Semester_Level"(
    "SemLvl_id" BIGINT NOT NULL,
    "level_id" BIGINT NOT NULL,
    "semester_id" BIGINT NOT NULL
);
ALTER TABLE
    "Semester_Level" ADD PRIMARY KEY("SemLvl_id");
ALTER TABLE
    "Level" ADD CONSTRAINT "level_dep_id_foreign" FOREIGN KEY("dep_id") REFERENCES "Department"("dep_id");
ALTER TABLE
    "Summaries" ADD CONSTRAINT "summaries_doctor_id_foreign" FOREIGN KEY("doctor_id") REFERENCES "Doctors"("doctor_id");
ALTER TABLE
    "Subject_Doctor" ADD CONSTRAINT "subject_doctor_subject_id_foreign" FOREIGN KEY("subject_id") REFERENCES "Subject"("subject_id");
ALTER TABLE
    "Subject" ADD CONSTRAINT "subject_semster_id_foreign" FOREIGN KEY("semster_id") REFERENCES "Semester"("semster_id");
ALTER TABLE
    "videos" ADD CONSTRAINT "videos_doctor_id_foreign" FOREIGN KEY("doctor_id") REFERENCES "Doctors"("doctor_id");
ALTER TABLE
    "Semester_Level" ADD CONSTRAINT "semester_level_level_id_foreign" FOREIGN KEY("level_id") REFERENCES "Level"("level_id");
ALTER TABLE
    "Resources" ADD CONSTRAINT "resources_doctor_id_foreign" FOREIGN KEY("doctor_id") REFERENCES "Doctors"("doctor_id");
ALTER TABLE
    "Subject_Doctor" ADD CONSTRAINT "subject_doctor_doctor_id_foreign" FOREIGN KEY("doctor_id") REFERENCES "Doctors"("doctor_id");
ALTER TABLE
    "Sections" ADD CONSTRAINT "sections_doctor_id_foreign" FOREIGN KEY("doctor_id") REFERENCES "Doctors"("doctor_id");
ALTER TABLE
    "Semester_Level" ADD CONSTRAINT "semester_level_semester_id_foreign" FOREIGN KEY("semester_id") REFERENCES "Semester"("semster_id");