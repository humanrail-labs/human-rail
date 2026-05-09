import { prisma } from "@mandara/db";
import { getMandaraPlanLimits, type MandaraPlanCode } from "@mandara/core";
import { recordAuditEvent } from "../lib/audit.js";

export async function ensureMandaraSubscription(organizationId: string) {
  const existing = await prisma.mandaraSubscription.findUnique({ where: { organizationId } });
  if (existing) return existing;

  const limits = getMandaraPlanLimits("dev_free");
  const subscription = await prisma.mandaraSubscription.create({
    data: {
      organizationId,
      planCode: "dev_free",
      status: "trial",
      monthlyChatLimit: limits.monthlyChatLimit,
      monthlyRequestLimit: limits.monthlyRequestLimit,
      monthlyWebhookLimit: limits.monthlyWebhookLimit,
      metadata: { p13Todo: "Solana subscription activation and payment verification" },
    },
  });

  await recordAuditEvent({
    organizationId,
    actorType: "system",
    eventType: "subscription_created",
    resourceType: "subscription",
    resourceId: subscription.id,
    summary: "Created default Mandara dev_free subscription",
  });

  return subscription;
}

export async function getSubscriptionSummary(organizationId: string) {
  const subscription = await ensureMandaraSubscription(organizationId);
  const usage = await getMonthlyUsageCounts(organizationId);
  return {
    plan: subscription.planCode,
    status: subscription.status,
    limits: {
      monthlyChatLimit: subscription.monthlyChatLimit,
      monthlyRequestLimit: subscription.monthlyRequestLimit,
      monthlyWebhookLimit: subscription.monthlyWebhookLimit,
    },
    usage,
    note: "Devnet beta. Solana-native subscription payment activation is planned for P13.",
  };
}

export async function devUpgradeSubscription(organizationId: string, planCode: MandaraPlanCode) {
  const limits = getMandaraPlanLimits(planCode);
  return prisma.mandaraSubscription.upsert({
    where: { organizationId },
    create: {
      organizationId,
      planCode,
      status: "active",
      monthlyChatLimit: limits.monthlyChatLimit,
      monthlyRequestLimit: limits.monthlyRequestLimit,
      monthlyWebhookLimit: limits.monthlyWebhookLimit,
      metadata: { devUpgrade: true },
    },
    update: {
      planCode,
      status: "active",
      monthlyChatLimit: limits.monthlyChatLimit,
      monthlyRequestLimit: limits.monthlyRequestLimit,
      monthlyWebhookLimit: limits.monthlyWebhookLimit,
      metadata: { devUpgrade: true },
    },
  });
}

async function getMonthlyUsageCounts(organizationId: string) {
  const start = currentMonthStart();
  const grouped = await prisma.mandaraUsageEvent.groupBy({
    by: ["type"],
    where: { organizationId, createdAt: { gte: start } },
    _sum: { quantity: true },
  });

  return {
    agentChatMessages: grouped.find((row) => row.type === "agent_chat_message")?._sum.quantity ?? 0,
    signatureRequestsCreated: grouped.find((row) => row.type === "signature_request_created")?._sum.quantity ?? 0,
    webhookDeliveries: grouped.find((row) => row.type === "webhook_delivery")?._sum.quantity ?? 0,
  };
}

export function currentMonthStart() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}
