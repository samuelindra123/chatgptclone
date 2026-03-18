-- CreateEnum
CREATE TYPE "ConversationNamespace" AS ENUM ('GENERAL', 'THEOLOGY');

-- AlterTable
ALTER TABLE "Conversation"
ADD COLUMN "namespace" "ConversationNamespace" NOT NULL DEFAULT 'GENERAL';

-- CreateIndex
CREATE INDEX "Conversation_userId_namespace_updatedAt_idx"
ON "Conversation"("userId", "namespace", "updatedAt" DESC);
