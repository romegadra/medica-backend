-- AlterTable
ALTER TABLE "Doctor" ADD COLUMN     "email" TEXT;

-- AlterTable
ALTER TABLE "Receptionist" ADD COLUMN     "email" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT true;
