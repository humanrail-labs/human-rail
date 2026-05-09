export interface MandaraScopeResult {
  allowed: boolean;
  reason: string;
  category: string;
}

const secretPatterns = [
  /seed phrase/i,
  /private key/i,
  /raw keypair/i,
  /service wallet/i,
  /\.local-ika/i,
  /\.local-keys/i,
  /\.env\.product/i,
  /api secret/i,
  /bypass (policy|mandate)/i,
  /ignore .*mandate/i,
  /unrestricted chatgpt/i,
];

const mandaraPatterns = [
  /\bmandara\b/i,
  /\bhumanrail\b/i,
  /\bika\b/i,
  /\bagent\b/i,
  /\bsigning wallet\b/i,
  /\bmandate\b/i,
  /\bpolicy\b/i,
  /\bsignature request\b/i,
  /\brequest\b/i,
  /\bpreview\b/i,
  /\bapprove\b/i,
  /\breject\b/i,
  /\bexecution status\b/i,
  /\bwebhook\b/i,
  /\baudit\b/i,
  /\bsdk\b/i,
  /\bapi key\b/i,
  /\bonboarding\b/i,
  /\busdc\b/i,
  /\bbase sepolia\b/i,
  /\bdevnet\b/i,
];

const rejectedPatterns = [
  { pattern: /\bessay\b|\bhomework\b|\bbook report\b/i, category: "unrelated_school_work" },
  { pattern: /\bwrite code\b|\bdebug\b|\breact app\b|\bpython\b/i, category: "unrelated_coding" },
  { pattern: /\bprice prediction\b|\btrading advice\b|\bbuy bitcoin\b|\bsell crypto\b/i, category: "trading_advice" },
  { pattern: /\blegal advice\b|\bmedical advice\b|\bfinancial advice\b/i, category: "professional_advice" },
  { pattern: /\bact as\b.*\bunrestricted\b|\bjailbreak\b|\bignore previous instructions\b/i, category: "jailbreak" },
];

export function classifyMandaraScope(message: string): MandaraScopeResult {
  const trimmed = message.trim();
  if (!trimmed) {
    return { allowed: false, reason: "Empty message.", category: "empty" };
  }

  if (secretPatterns.some((pattern) => pattern.test(trimmed))) {
    return {
      allowed: false,
      reason: "Requests involving secrets, private keys, service wallets, or bypassing mandates are not allowed.",
      category: "secret_or_bypass_request",
    };
  }

  const rejected = rejectedPatterns.find(({ pattern }) => pattern.test(trimmed));
  if (rejected && !mandaraPatterns.some((pattern) => pattern.test(trimmed))) {
    return {
      allowed: false,
      reason: "This is outside Mandara Agent Chat scope.",
      category: rejected.category,
    };
  }

  if (mandaraPatterns.some((pattern) => pattern.test(trimmed))) {
    return {
      allowed: true,
      reason: "Message is about Mandara agents, mandates, signature requests, or setup.",
      category: "mandara_product",
    };
  }

  return {
    allowed: false,
    reason: "I can only help with Mandara agents, mandates, signature requests, SDK/API setup, webhooks, and audit logs.",
    category: "out_of_scope",
  };
}
