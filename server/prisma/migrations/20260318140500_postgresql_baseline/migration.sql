-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."MessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "public"."ConversationNamespace" AS ENUM ('GENERAL', 'THEOLOGY');

-- CreateEnum
CREATE TYPE "public"."CouncilSessionStatus" AS ENUM ('QUEUED', 'DELIBERATING', 'SYNTHESIZING', 'COMPLETED', 'FAILED', 'PARTIAL_FAILURE');

-- CreateEnum
CREATE TYPE "public"."CouncilAgentName" AS ENUM ('VISIONARY', 'USER_ADVOCATE', 'RISK_ANALYST', 'TECHNICAL_ARCHITECT', 'MODERATOR');

-- CreateEnum
CREATE TYPE "public"."CouncilAgentStatus" AS ENUM ('IDLE', 'THINKING', 'ANALYZING', 'DEBATING', 'SYNTHESIZING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."CouncilAuditPhase" AS ENUM ('SESSION', 'OPENING', 'CRITIQUE', 'SYNTHESIS', 'FINALIZATION', 'EXPORT', 'ERROR');

-- CreateEnum
CREATE TYPE "public"."CouncilRouteRole" AS ENUM ('PRIMARY', 'FALLBACK', 'SHADOW');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "googleId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Conversation" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "namespace" "public"."ConversationNamespace" NOT NULL DEFAULT 'GENERAL',
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "public"."MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "attachmentCount" INTEGER NOT NULL DEFAULT 0,
    "attachmentsJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AiCouncilSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,
    "title" TEXT,
    "question" TEXT NOT NULL,
    "context" TEXT,
    "notes" TEXT,
    "modelLabel" TEXT NOT NULL DEFAULT 'Xynoos AI',
    "routingMode" TEXT NOT NULL DEFAULT 'dual-orchestration',
    "modelStack" JSONB,
    "status" "public"."CouncilSessionStatus" NOT NULL DEFAULT 'QUEUED',
    "finalRecommendation" TEXT,
    "confidenceScore" INTEGER,
    "finalOutputJson" JSONB,
    "providerUsageSummaryJson" JSONB,
    "totalTokensUsed" INTEGER,
    "estimatedCostUsd" DOUBLE PRECISION,
    "maxProviderLatencyMs" INTEGER,
    "lastError" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiCouncilSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AiCouncilAgentOutput" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "agentName" "public"."CouncilAgentName" NOT NULL,
    "status" "public"."CouncilAgentStatus" NOT NULL DEFAULT 'IDLE',
    "content" TEXT NOT NULL DEFAULT '',
    "modelUsed" TEXT,
    "confidenceScore" INTEGER,
    "supportingDataJson" JSONB,
    "tokensUsed" INTEGER,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiCouncilAgentOutput_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AiCouncilAuditLog" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "phase" "public"."CouncilAuditPhase" NOT NULL,
    "event" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiCouncilAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AiCouncilAttachment" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "storageFileId" TEXT,
    "name" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER,
    "viewUrl" TEXT,
    "extractedText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiCouncilAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AiCouncilProviderInvocation" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "agentName" "public"."CouncilAgentName",
    "phase" "public"."CouncilAuditPhase" NOT NULL,
    "providerId" TEXT NOT NULL,
    "providerLabel" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "routeRole" "public"."CouncilRouteRole" NOT NULL,
    "success" BOOLEAN NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "totalTokens" INTEGER,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "rawOutputJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiCouncilProviderInvocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "public"."User"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "Conversation_userId_updatedAt_idx" ON "public"."Conversation"("userId", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "Conversation_userId_namespace_updatedAt_idx" ON "public"."Conversation"("userId", "namespace", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "public"."Message"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "AiCouncilSession_userId_updatedAt_idx" ON "public"."AiCouncilSession"("userId", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "AiCouncilSession_status_createdAt_idx" ON "public"."AiCouncilSession"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AiCouncilAgentOutput_sessionId_status_idx" ON "public"."AiCouncilAgentOutput"("sessionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AiCouncilAgentOutput_sessionId_agentName_key" ON "public"."AiCouncilAgentOutput"("sessionId", "agentName");

-- CreateIndex
CREATE INDEX "AiCouncilAuditLog_sessionId_createdAt_idx" ON "public"."AiCouncilAuditLog"("sessionId", "createdAt" ASC);

-- CreateIndex
CREATE INDEX "AiCouncilAttachment_sessionId_createdAt_idx" ON "public"."AiCouncilAttachment"("sessionId", "createdAt" ASC);

-- CreateIndex
CREATE INDEX "AiCouncilProviderInvocation_sessionId_createdAt_idx" ON "public"."AiCouncilProviderInvocation"("sessionId", "createdAt" ASC);

-- CreateIndex
CREATE INDEX "AiCouncilProviderInvocation_providerId_createdAt_idx" ON "public"."AiCouncilProviderInvocation"("providerId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AiCouncilProviderInvocation_agentName_createdAt_idx" ON "public"."AiCouncilProviderInvocation"("agentName", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "public"."Conversation" ADD CONSTRAINT "Conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AiCouncilSession" ADD CONSTRAINT "AiCouncilSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AiCouncilAgentOutput" ADD CONSTRAINT "AiCouncilAgentOutput_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."AiCouncilSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AiCouncilAuditLog" ADD CONSTRAINT "AiCouncilAuditLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."AiCouncilSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AiCouncilAttachment" ADD CONSTRAINT "AiCouncilAttachment_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."AiCouncilSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AiCouncilProviderInvocation" ADD CONSTRAINT "AiCouncilProviderInvocation_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."AiCouncilSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

