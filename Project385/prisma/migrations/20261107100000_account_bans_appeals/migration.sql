CREATE TYPE "BanAppealStatus" AS ENUM ('OPEN', 'APPROVED', 'REJECTED');

ALTER TABLE "User"
ADD COLUMN "isBanned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "bannedAt" TIMESTAMP(3),
ADD COLUMN "banReason" VARCHAR(500),
ADD COLUMN "bannedByDiscordId" TEXT;

CREATE TABLE "BanAppeal" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "message" VARCHAR(2000) NOT NULL,
  "status" "BanAppealStatus" NOT NULL DEFAULT 'OPEN',
  "adminNote" VARCHAR(1000),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  "reviewedByDiscordId" TEXT,
  CONSTRAINT "BanAppeal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BanAppeal_userId_status_idx" ON "BanAppeal"("userId", "status");
CREATE INDEX "BanAppeal_status_createdAt_idx" ON "BanAppeal"("status", "createdAt");

ALTER TABLE "BanAppeal"
ADD CONSTRAINT "BanAppeal_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
