[dotenv@17.3.1] injecting env (6) from .env.local -- tip: 🔐 encrypt with Dotenvx: https://dotenvx.com
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'LEAD_CAPTURED', 'CONTACTED', 'CONVERTED', 'LOST');

-- CreateEnum
CREATE TYPE "BlockedReason" AS ENUM ('USER_REQUESTED', 'ADMIN_BLOCKED');

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'TRIAL', 'STARTER', 'PRO', 'BUSINESS', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('MANUAL', 'KASPI', 'TIPTOPPAY', 'CARD');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TenantRole" AS ENUM ('OWNER', 'MANAGER');

-- CreateEnum
CREATE TYPE "NodeStatus" AS ENUM ('ONLINE', 'OFFLINE', 'DRAINING');

-- CreateEnum
CREATE TYPE "WAStatus" AS ENUM ('PENDING', 'QR_READY', 'CONNECTING', 'CONNECTED', 'DISCONNECTED', 'LOGGED_OUT', 'BANNED');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO', 'DOCUMENT', 'AUDIO', 'STICKER');

-- CreateEnum
CREATE TYPE "MsgStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'DONE', 'FAILED');

-- CreateTable
CREATE TABLE "ChatSession" (
    "id" TEXT NOT NULL,
    "messages" JSONB NOT NULL DEFAULT '[]',
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "visitorId" TEXT NOT NULL,
    "userAgent" TEXT,
    "referrer" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "ipCity" TEXT,
    "leadData" JSONB,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "contactTelegram" TEXT,
    "businessType" TEXT,
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "qualificationScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminSession" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plan" "Plan" NOT NULL DEFAULT 'TRIAL',
    "apiKeyHash" TEXT NOT NULL,
    "apiKeyHint" TEXT NOT NULL,
    "telegramChatId" TEXT,
    "currentPeriodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "tenantId" TEXT NOT NULL,
    "role" "TenantRole" NOT NULL DEFAULT 'OWNER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantSession" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerNode" (
    "id" TEXT NOT NULL,
    "nodeKey" TEXT NOT NULL,
    "status" "NodeStatus" NOT NULL DEFAULT 'ONLINE',
    "capacity" INTEGER NOT NULL DEFAULT 50,
    "instanceCount" INTEGER NOT NULL DEFAULT 0,
    "lastHeartbeat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkerNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WAInstance" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "label" TEXT,
    "phoneNumber" TEXT,
    "status" "WAStatus" NOT NULL DEFAULT 'PENDING',
    "workerNodeId" TEXT,
    "webhookUrl" TEXT,
    "webhookSecret" TEXT,
    "sessionBlob" BYTEA,
    "qrCode" TEXT,
    "qrExpiresAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),
    "bannedAt" TIMESTAMP(3),
    "aiEnabled" BOOLEAN NOT NULL DEFAULT false,
    "aiModel" TEXT NOT NULL DEFAULT 'anthropic/claude-sonnet-4',
    "aiSystemPrompt" TEXT,
    "aiBusinessName" TEXT,
    "aiGreeting" TEXT,
    "aiMaxTurns" INTEGER NOT NULL DEFAULT 20,
    "aiOnlyDuringHrs" BOOLEAN NOT NULL DEFAULT false,
    "aiWorkStartHr" INTEGER,
    "aiWorkEndHr" INTEGER,
    "aiTimezone" TEXT NOT NULL DEFAULT 'Asia/Almaty',
    "aiWorkDays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5, 6, 7]::INTEGER[],
    "aiOffDaysActive" BOOLEAN NOT NULL DEFAULT false,
    "aiPausedChats" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aiEscalateOnHotLead" BOOLEAN NOT NULL DEFAULT true,
    "aiEscalateOnHandoff" BOOLEAN NOT NULL DEFAULT true,
    "aiHandoffMessage" TEXT,
    "aiKnowledgeBase" TEXT,
    "aiLeadFields" TEXT,
    "aiReportGroupJid" TEXT,
    "aiReportGroupName" TEXT,
    "groupsCache" JSONB,
    "aiDailyDigest" BOOLEAN NOT NULL DEFAULT true,
    "aiDigestHour" INTEGER NOT NULL DEFAULT 9,
    "lastDigestDate" TEXT,
    "connectedAt" TIMESTAMP(3),
    "onlyReplies" BOOLEAN NOT NULL DEFAULT false,
    "bulkPausedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WAInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockedContact" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "remoteJid" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "reason" "BlockedReason" NOT NULL DEFAULT 'USER_REQUESTED',
    "trigger" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlockedContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chat" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "remoteJid" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "name" TEXT,
    "lastMsgAt" TIMESTAMP(3),
    "unread" INTEGER NOT NULL DEFAULT 0,
    "leadData" JSONB,
    "leadStatus" TEXT,
    "leadReportedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "fromMe" BOOLEAN NOT NULL,
    "text" TEXT,
    "mediaUrl" TEXT,
    "mediaType" "MediaType",
    "mediaMime" TEXT,
    "status" "MsgStatus" NOT NULL DEFAULT 'PENDING',
    "whatsappId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboundJob" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "errorMsg" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutboundJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KZT',
    "plan" "Plan" NOT NULL,
    "durationDays" INTEGER NOT NULL DEFAULT 30,
    "method" "PaymentMethod" NOT NULL DEFAULT 'MANUAL',
    "status" "PaymentStatus" NOT NULL DEFAULT 'CONFIRMED',
    "reference" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatSession_status_createdAt_idx" ON "ChatSession"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ChatSession_visitorId_idx" ON "ChatSession"("visitorId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_username_key" ON "AdminUser"("username");

-- CreateIndex
CREATE UNIQUE INDEX "AdminSession_token_key" ON "AdminSession"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_apiKeyHash_key" ON "Tenant"("apiKeyHash");

-- CreateIndex
CREATE INDEX "Tenant_createdAt_idx" ON "Tenant"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TenantUser_email_key" ON "TenantUser"("email");

-- CreateIndex
CREATE INDEX "TenantUser_tenantId_idx" ON "TenantUser"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantSession_token_key" ON "TenantSession"("token");

-- CreateIndex
CREATE INDEX "TenantSession_userId_idx" ON "TenantSession"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkerNode_nodeKey_key" ON "WorkerNode"("nodeKey");

-- CreateIndex
CREATE INDEX "WAInstance_tenantId_idx" ON "WAInstance"("tenantId");

-- CreateIndex
CREATE INDEX "WAInstance_workerNodeId_status_idx" ON "WAInstance"("workerNodeId", "status");

-- CreateIndex
CREATE INDEX "BlockedContact_instanceId_idx" ON "BlockedContact"("instanceId");

-- CreateIndex
CREATE UNIQUE INDEX "BlockedContact_instanceId_remoteJid_key" ON "BlockedContact"("instanceId", "remoteJid");

-- CreateIndex
CREATE INDEX "Chat_instanceId_lastMsgAt_idx" ON "Chat"("instanceId", "lastMsgAt");

-- CreateIndex
CREATE UNIQUE INDEX "Chat_instanceId_remoteJid_key" ON "Chat"("instanceId", "remoteJid");

-- CreateIndex
CREATE INDEX "Message_chatId_createdAt_idx" ON "Message"("chatId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_whatsappId_idx" ON "Message"("whatsappId");

-- CreateIndex
CREATE INDEX "OutboundJob_instanceId_status_idx" ON "OutboundJob"("instanceId", "status");

-- CreateIndex
CREATE INDEX "OutboundJob_status_scheduledAt_idx" ON "OutboundJob"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "Payment_tenantId_createdAt_idx" ON "Payment"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_status_createdAt_idx" ON "Payment"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "AdminSession" ADD CONSTRAINT "AdminSession_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantUser" ADD CONSTRAINT "TenantUser_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantSession" ADD CONSTRAINT "TenantSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "TenantUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WAInstance" ADD CONSTRAINT "WAInstance_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WAInstance" ADD CONSTRAINT "WAInstance_workerNodeId_fkey" FOREIGN KEY ("workerNodeId") REFERENCES "WorkerNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockedContact" ADD CONSTRAINT "BlockedContact_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "WAInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "WAInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "WAInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboundJob" ADD CONSTRAINT "OutboundJob_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "WAInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

