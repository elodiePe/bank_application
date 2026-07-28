-- CreateEnum
CREATE TYPE "ChildInterfaceLevel" AS ENUM ('YOUNG', 'MIDDLE', 'TEEN');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "interfaceLevel" "ChildInterfaceLevel" NOT NULL DEFAULT 'MIDDLE';
