-- AlterTable
ALTER TABLE "Users" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "logged_in" BOOLEAN NOT NULL DEFAULT false;
