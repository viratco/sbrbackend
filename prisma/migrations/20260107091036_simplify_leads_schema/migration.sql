/*
  Warnings:

  - You are about to drop the column `email` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `interestedIn` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `occupation` on the `Lead` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Lead" DROP COLUMN "email",
DROP COLUMN "interestedIn",
DROP COLUMN "occupation";
