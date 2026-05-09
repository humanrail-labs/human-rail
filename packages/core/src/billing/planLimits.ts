import type { MandaraPlanCode } from "../schemas/subscription.js";

export interface MandaraPlanLimits {
  monthlyChatLimit: number;
  monthlyRequestLimit: number;
  monthlyWebhookLimit: number;
  maxAgents: number;
  maxPolicies: number;
}

export const MANDARA_PLAN_LIMITS: Record<MandaraPlanCode, MandaraPlanLimits> = {
  dev_free: {
    monthlyChatLimit: 100,
    monthlyRequestLimit: 50,
    monthlyWebhookLimit: 100,
    maxAgents: 3,
    maxPolicies: 5,
  },
  builder: {
    monthlyChatLimit: 2_000,
    monthlyRequestLimit: 1_000,
    monthlyWebhookLimit: 5_000,
    maxAgents: 10,
    maxPolicies: 25,
  },
  team: {
    monthlyChatLimit: 10_000,
    monthlyRequestLimit: 5_000,
    monthlyWebhookLimit: 25_000,
    maxAgents: 50,
    maxPolicies: 200,
  },
  enterprise: {
    monthlyChatLimit: 1_000_000,
    monthlyRequestLimit: 500_000,
    monthlyWebhookLimit: 2_500_000,
    maxAgents: 10_000,
    maxPolicies: 100_000,
  },
};

export function getMandaraPlanLimits(planCode: MandaraPlanCode): MandaraPlanLimits {
  return MANDARA_PLAN_LIMITS[planCode] ?? MANDARA_PLAN_LIMITS.dev_free;
}
