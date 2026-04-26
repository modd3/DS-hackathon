-- CreateEnum
CREATE TYPE "JourneyStatus" AS ENUM ('ACTIVE', 'STALLED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StageType" AS ENUM ('INQUIRY', 'DESIGN', 'QUOTATION', 'DELIVERY');

-- CreateEnum
CREATE TYPE "EventSource" AS ENUM ('CRM', 'ENGINEERING', 'ERP', 'SYSTEM');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('REQUEST_CREATED', 'STAGE_ENTERED', 'STAGE_COMPLETED', 'STATUS_UPDATED', 'HANDOFF', 'COMMENT_ADDED', 'DOCUMENT_UPLOADED', 'SLA_WARNING', 'SLA_BREACH', 'DELIVERY_CONFIRMED');

-- CreateEnum
CREATE TYPE "RuleScope" AS ENUM ('GLOBAL', 'REGION', 'TEAM');

-- CreateEnum
CREATE TYPE "AlertChannel" AS ENUM ('IN_APP', 'EMAIL', 'SMS');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'ACKNOWLEDGED');

-- CreateEnum
CREATE TYPE "RoleName" AS ENUM ('SALES_ENGINEER', 'BACKEND_DESIGNER', 'REGIONAL_MANAGER', 'ADMIN');

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "customerCode" TEXT,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "region" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Journey" (
    "id" TEXT NOT NULL,
    "externalRef" TEXT,
    "customerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "currentStage" "StageType" NOT NULL DEFAULT 'INQUIRY',
    "status" "JourneyStatus" NOT NULL DEFAULT 'ACTIVE',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Journey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JourneyStage" (
    "id" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "stage" "StageType" NOT NULL,
    "sequenceNo" INTEGER NOT NULL,
    "enteredAt" TIMESTAMP(3) NOT NULL,
    "exitedAt" TIMESTAMP(3),
    "ownerTeam" TEXT,
    "ownerUserId" TEXT,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "JourneyStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JourneyEvent" (
    "id" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "stage" "StageType",
    "eventType" "EventType" NOT NULL,
    "source" "EventSource" NOT NULL,
    "sourceEventId" TEXT NOT NULL,
    "sourceSystem" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorUserId" TEXT,
    "actorName" TEXT,
    "payload" JSONB NOT NULL,

    CONSTRAINT "JourneyEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlaRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "stage" "StageType" NOT NULL,
    "maxDurationMins" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "scope" "RuleScope" NOT NULL DEFAULT 'GLOBAL',
    "scopeRef" TEXT,
    "alertChannels" "AlertChannel"[],
    "alertRecipients" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlaRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlaBreach" (
    "id" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "stage" "StageType" NOT NULL,
    "breachedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "durationMins" INTEGER NOT NULL,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SlaBreach_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "breachId" TEXT NOT NULL,
    "channel" "AlertChannel" NOT NULL,
    "recipient" TEXT NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InAppNotification" (
    "id" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "alertId" TEXT,
    "journeyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InAppNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "region" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" "RoleName" NOT NULL,
    "description" TEXT,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_customerCode_key" ON "Customer"("customerCode");

-- CreateIndex
CREATE INDEX "Customer_region_idx" ON "Customer"("region");

-- CreateIndex
CREATE UNIQUE INDEX "Journey_externalRef_key" ON "Journey"("externalRef");

-- CreateIndex
CREATE INDEX "Journey_customerId_idx" ON "Journey"("customerId");

-- CreateIndex
CREATE INDEX "Journey_status_currentStage_idx" ON "Journey"("status", "currentStage");

-- CreateIndex
CREATE INDEX "Journey_openedAt_idx" ON "Journey"("openedAt");

-- CreateIndex
CREATE INDEX "JourneyStage_journeyId_stage_idx" ON "JourneyStage"("journeyId", "stage");

-- CreateIndex
CREATE INDEX "JourneyStage_enteredAt_exitedAt_idx" ON "JourneyStage"("enteredAt", "exitedAt");

-- CreateIndex
CREATE UNIQUE INDEX "JourneyStage_journeyId_sequenceNo_key" ON "JourneyStage"("journeyId", "sequenceNo");

-- CreateIndex
CREATE INDEX "JourneyEvent_journeyId_occurredAt_idx" ON "JourneyEvent"("journeyId", "occurredAt");

-- CreateIndex
CREATE INDEX "JourneyEvent_eventType_occurredAt_idx" ON "JourneyEvent"("eventType", "occurredAt");

-- CreateIndex
CREATE INDEX "JourneyEvent_source_occurredAt_idx" ON "JourneyEvent"("source", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "JourneyEvent_source_sourceEventId_key" ON "JourneyEvent"("source", "sourceEventId");

-- CreateIndex
CREATE UNIQUE INDEX "SlaRule_name_key" ON "SlaRule"("name");

-- CreateIndex
CREATE INDEX "SlaRule_stage_isActive_idx" ON "SlaRule"("stage", "isActive");

-- CreateIndex
CREATE INDEX "SlaRule_scope_scopeRef_idx" ON "SlaRule"("scope", "scopeRef");

-- CreateIndex
CREATE INDEX "SlaBreach_journeyId_isResolved_idx" ON "SlaBreach"("journeyId", "isResolved");

-- CreateIndex
CREATE INDEX "SlaBreach_ruleId_breachedAt_idx" ON "SlaBreach"("ruleId", "breachedAt");

-- CreateIndex
CREATE INDEX "Alert_breachId_status_idx" ON "Alert"("breachId", "status");

-- CreateIndex
CREATE INDEX "InAppNotification_recipient_isRead_idx" ON "InAppNotification"("recipient", "isRead");

-- CreateIndex
CREATE INDEX "InAppNotification_createdAt_idx" ON "InAppNotification"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_region_isActive_idx" ON "User"("region", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_code_key" ON "Permission"("code");

-- AddForeignKey
ALTER TABLE "Journey" ADD CONSTRAINT "Journey_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JourneyStage" ADD CONSTRAINT "JourneyStage_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "Journey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JourneyEvent" ADD CONSTRAINT "JourneyEvent_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "Journey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlaBreach" ADD CONSTRAINT "SlaBreach_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "Journey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlaBreach" ADD CONSTRAINT "SlaBreach_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "SlaRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_breachId_fkey" FOREIGN KEY ("breachId") REFERENCES "SlaBreach"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
