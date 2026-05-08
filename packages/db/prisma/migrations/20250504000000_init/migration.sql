-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('active', 'suspended', 'revoked');

-- CreateEnum
CREATE TYPE "PolicyStatus" AS ENUM ('active', 'frozen', 'expired', 'revoked');

-- CreateEnum
CREATE TYPE "SigningRequestStatus" AS ENUM ('requested', 'queued', 'worker_processing', 'policy_rejected', 'guard_approved', 'ika_pending', 'signed', 'failed');

-- CreateEnum
CREATE TYPE "MessageApprovalStatus" AS ENUM ('pending', 'signed');

-- CreateEnum
CREATE TYPE "AuditEventType" AS ENUM ('organization_created', 'organization_updated', 'agent_created', 'agent_updated', 'agent_frozen', 'agent_revoked', 'policy_created', 'policy_updated', 'policy_frozen', 'policy_expired', 'signing_requested', 'signing_approved', 'signing_rejected', 'signing_signed', 'signing_failed', 'api_key_created', 'api_key_revoked', 'webhook_created', 'webhook_updated', 'webhook_deleted', 'webhook_delivered', 'webhook_failed', 'webhook_delivery_scheduled', 'webhook_delivery_succeeded', 'webhook_delivery_failed', 'audit_export_created', 'devnet_artifact_imported', 'ika_dwallet_imported', 'guarded_policy_imported', 'signing_request_imported', 'message_approval_imported', 'guarded_policy_created', 'signing_request_previewed', 'signing_request_created', 'signing_request_policy_rejected', 'signing_request_queued', 'signing_request_processing', 'signing_request_dry_run_completed', 'signing_request_execution_failed', 'signing_request_worker_skipped', 'signing_request_status_updated', 'guard_message_approved', 'ika_message_approval_created', 'ika_signature_committed', 'agent_api_key_used', 'system');

-- CreateEnum
CREATE TYPE "WebhookStatus" AS ENUM ('active', 'paused');

-- CreateEnum
CREATE TYPE "WebhookDeliveryStatus" AS ENUM ('pending', 'retrying', 'delivered', 'failed');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'free',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agents" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "AgentStatus" NOT NULL DEFAULT 'active',
    "onChainAgentPda" TEXT,
    "onChainProfilePda" TEXT,
    "onChainCapabilityPda" TEXT,
    "frozenAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_api_keys" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "scopes" TEXT[],
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ika_dwallets" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT,
    "onChainPda" TEXT NOT NULL,
    "curve" TEXT NOT NULL,
    "publicKey" TEXT,
    "state" TEXT NOT NULL DEFAULT 'dkg_in_progress',
    "authority" TEXT,
    "authorityTransferredAt" TIMESTAMP(3),
    "createdVia" TEXT NOT NULL DEFAULT 'grpc_dkg',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ika_dwallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guarded_policies" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "ikaDwalletId" TEXT NOT NULL,
    "name" TEXT,
    "onChainPda" TEXT,
    "allowedChainId" INTEGER NOT NULL,
    "allowedAsset" TEXT,
    "allowedRecipient" TEXT,
    "allowedAssetHash" TEXT NOT NULL,
    "allowedRecipientHash" TEXT NOT NULL,
    "perTxLimit" DECIMAL(78,0) NOT NULL,
    "dailyLimit" DECIMAL(78,0) NOT NULL,
    "totalLimit" DECIMAL(78,0) NOT NULL,
    "dailySpent" DECIMAL(78,0) NOT NULL DEFAULT 0,
    "totalSpent" DECIMAL(78,0) NOT NULL DEFAULT 0,
    "lastSpendDay" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "status" "PolicyStatus" NOT NULL DEFAULT 'active',
    "frozenAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guarded_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signing_requests" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "ikaDwalletId" TEXT,
    "requestId" TEXT NOT NULL,
    "messageDigest" TEXT NOT NULL,
    "messageMetadataDigest" TEXT NOT NULL,
    "destinationChainId" INTEGER NOT NULL,
    "asset" TEXT,
    "recipient" TEXT,
    "assetHash" TEXT NOT NULL,
    "recipientHash" TEXT NOT NULL,
    "amount" DECIMAL(78,0) NOT NULL,
    "message" TEXT,
    "signatureScheme" TEXT NOT NULL,
    "status" "SigningRequestStatus" NOT NULL DEFAULT 'requested',
    "rejectionCode" INTEGER,
    "rejectionReason" TEXT,
    "onChainRequestPda" TEXT,
    "onChainMessageApprovalPda" TEXT,
    "approveTxSignature" TEXT,
    "submittedAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "signatureHex" TEXT,
    "signatureBase64" TEXT,
    "executionJobId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "signing_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_approvals" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "signingRequestId" TEXT NOT NULL,
    "onChainPda" TEXT NOT NULL,
    "dwalletPda" TEXT NOT NULL,
    "messageDigest" TEXT NOT NULL,
    "metadataDigest" TEXT NOT NULL,
    "approver" TEXT NOT NULL,
    "userPubkey" TEXT NOT NULL,
    "signatureScheme" TEXT NOT NULL,
    "epoch" DECIMAL(78,0) NOT NULL,
    "status" "MessageApprovalStatus" NOT NULL DEFAULT 'pending',
    "signatureLength" INTEGER,
    "signatureHex" TEXT,
    "signatureBase64" TEXT,
    "metadata" JSONB,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "eventType" "AuditEventType" NOT NULL,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "summary" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhooks" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "iv" TEXT,
    "tag" TEXT,
    "events" TEXT[],
    "status" "WebhookStatus" NOT NULL DEFAULT 'active',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_deliveries" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "webhookId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "WebhookDeliveryStatus" NOT NULL DEFAULT 'pending',
    "responseStatus" INTEGER,
    "responseBody" TEXT,
    "error" TEXT,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "nextRetryAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_secrets" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_secrets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "organizations_slug_idx" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "organizations_tier_idx" ON "organizations"("tier");

-- CreateIndex
CREATE UNIQUE INDEX "users_externalId_key" ON "users"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_externalId_idx" ON "users"("externalId");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "memberships_organizationId_idx" ON "memberships"("organizationId");

-- CreateIndex
CREATE INDEX "memberships_userId_idx" ON "memberships"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_organizationId_userId_key" ON "memberships"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "agents_organizationId_status_idx" ON "agents"("organizationId", "status");

-- CreateIndex
CREATE INDEX "agents_onChainAgentPda_idx" ON "agents"("onChainAgentPda");

-- CreateIndex
CREATE UNIQUE INDEX "agent_api_keys_prefix_key" ON "agent_api_keys"("prefix");

-- CreateIndex
CREATE INDEX "agent_api_keys_agentId_idx" ON "agent_api_keys"("agentId");

-- CreateIndex
CREATE UNIQUE INDEX "ika_dwallets_onChainPda_key" ON "ika_dwallets"("onChainPda");

-- CreateIndex
CREATE INDEX "ika_dwallets_organizationId_state_idx" ON "ika_dwallets"("organizationId", "state");

-- CreateIndex
CREATE INDEX "ika_dwallets_onChainPda_idx" ON "ika_dwallets"("onChainPda");

-- CreateIndex
CREATE UNIQUE INDEX "guarded_policies_onChainPda_key" ON "guarded_policies"("onChainPda");

-- CreateIndex
CREATE INDEX "guarded_policies_agentId_status_idx" ON "guarded_policies"("agentId", "status");

-- CreateIndex
CREATE INDEX "guarded_policies_organizationId_idx" ON "guarded_policies"("organizationId");

-- CreateIndex
CREATE INDEX "guarded_policies_onChainPda_idx" ON "guarded_policies"("onChainPda");

-- CreateIndex
CREATE UNIQUE INDEX "signing_requests_requestId_key" ON "signing_requests"("requestId");

-- CreateIndex
CREATE INDEX "signing_requests_executionJobId_idx" ON "signing_requests"("executionJobId");

-- CreateIndex
CREATE INDEX "signing_requests_organizationId_createdAt_idx" ON "signing_requests"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "signing_requests_agentId_status_idx" ON "signing_requests"("agentId", "status");

-- CreateIndex
CREATE INDEX "signing_requests_requestId_idx" ON "signing_requests"("requestId");

-- CreateIndex
CREATE INDEX "signing_requests_onChainRequestPda_idx" ON "signing_requests"("onChainRequestPda");

-- CreateIndex
CREATE UNIQUE INDEX "message_approvals_signingRequestId_key" ON "message_approvals"("signingRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "message_approvals_onChainPda_key" ON "message_approvals"("onChainPda");

-- CreateIndex
CREATE INDEX "message_approvals_onChainPda_idx" ON "message_approvals"("onChainPda");

-- CreateIndex
CREATE INDEX "message_approvals_dwalletPda_idx" ON "message_approvals"("dwalletPda");

-- CreateIndex
CREATE INDEX "message_approvals_organizationId_idx" ON "message_approvals"("organizationId");

-- CreateIndex
CREATE INDEX "audit_events_organizationId_createdAt_idx" ON "audit_events"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_events_actorType_actorId_idx" ON "audit_events"("actorType", "actorId");

-- CreateIndex
CREATE INDEX "audit_events_eventType_idx" ON "audit_events"("eventType");

-- CreateIndex
CREATE INDEX "audit_events_resourceType_resourceId_idx" ON "audit_events"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "webhooks_organizationId_status_idx" ON "webhooks"("organizationId", "status");

-- CreateIndex
CREATE INDEX "webhook_deliveries_webhookId_attemptedAt_idx" ON "webhook_deliveries"("webhookId", "attemptedAt");

-- CreateIndex
CREATE INDEX "webhook_deliveries_nextRetryAt_idx" ON "webhook_deliveries"("nextRetryAt");

-- CreateIndex
CREATE INDEX "webhook_deliveries_organizationId_status_idx" ON "webhook_deliveries"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "integration_secrets_organizationId_key_key" ON "integration_secrets"("organizationId", "key");

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_api_keys" ADD CONSTRAINT "agent_api_keys_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ika_dwallets" ADD CONSTRAINT "ika_dwallets_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guarded_policies" ADD CONSTRAINT "guarded_policies_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guarded_policies" ADD CONSTRAINT "guarded_policies_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guarded_policies" ADD CONSTRAINT "guarded_policies_ikaDwalletId_fkey" FOREIGN KEY ("ikaDwalletId") REFERENCES "ika_dwallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signing_requests" ADD CONSTRAINT "signing_requests_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signing_requests" ADD CONSTRAINT "signing_requests_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signing_requests" ADD CONSTRAINT "signing_requests_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "guarded_policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signing_requests" ADD CONSTRAINT "signing_requests_ikaDwalletId_fkey" FOREIGN KEY ("ikaDwalletId") REFERENCES "ika_dwallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_approvals" ADD CONSTRAINT "message_approvals_signingRequestId_fkey" FOREIGN KEY ("signingRequestId") REFERENCES "signing_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "webhooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_secrets" ADD CONSTRAINT "integration_secrets_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
