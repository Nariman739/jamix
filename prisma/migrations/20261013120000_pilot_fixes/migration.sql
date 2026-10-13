-- DropIndex
DROP INDEX "Message_whatsappId_idx";

-- AlterTable
ALTER TABLE "Chat" ADD COLUMN     "aiPausedUntil" TIMESTAMP(3),
ADD COLUMN     "lastManualAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'text',
ADD COLUMN     "manual" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Message_instanceId_whatsappId_key" ON "Message"("instanceId", "whatsappId");

