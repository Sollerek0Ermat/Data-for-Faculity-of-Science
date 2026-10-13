-- AlterTable
ALTER TABLE "Users" ADD COLUMN     "password_reset_token" TEXT,
ADD COLUMN     "password_reset_token_expires" TIMESTAMP(3),
ADD COLUMN     "password_reset_token_sent_at" TIMESTAMP(3);
