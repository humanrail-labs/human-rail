#!/usr/bin/env tsx
/**
 * Backfill legacy local webhook secrets into AES-256-GCM storage.
 *
 * This script never logs secret values. It encrypts legacy rows that have a
 * secret value but are missing iv/tag. Rows without a usable secret are paused
 * and marked for rotation.
 */

import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPrismaClient } from "@mandara/db";
import { encrypt } from "@mandara/core";
import type { Prisma } from "@prisma/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env.product") });

function getEncryptionPassword(): string {
  const password = process.env.MANDARA_ENCRYPTION_PASSWORD;
  if (!password || password.length < 16) {
    throw new Error("MANDARA_ENCRYPTION_PASSWORD must be set and at least 16 characters long.");
  }
  return password;
}

function getMetadata(metadata: unknown): Record<string, unknown> {
  return metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? { ...(metadata as Record<string, unknown>) }
    : {};
}

async function main() {
  const prisma = createPrismaClient();
  const password = getEncryptionPassword();
  let encryptedCount = 0;
  let rotationRequiredCount = 0;

  try {
    const webhooks = await prisma.webhook.findMany({
      where: {
        OR: [
          { iv: null },
          { tag: null },
        ],
      },
      orderBy: { createdAt: "asc" },
    });

    for (const webhook of webhooks) {
      const metadata = getMetadata(webhook.metadata);

      if (webhook.secret) {
        const encrypted = encrypt(webhook.secret, password);
        await prisma.webhook.update({
          where: { id: webhook.id },
          data: {
            secret: encrypted.value,
            iv: encrypted.iv,
            tag: encrypted.tag,
            metadata: {
              ...metadata,
              needsSecretRotation: false,
              legacySecretBackfilled: true,
              backfilledAt: new Date().toISOString(),
              encryptionVersion: "aes-256-gcm-v1",
            } satisfies Prisma.InputJsonValue,
          },
        });
        encryptedCount += 1;
      } else {
        await prisma.webhook.update({
          where: { id: webhook.id },
          data: {
            status: "paused",
            metadata: {
              ...metadata,
              needsSecretRotation: true,
              rotationReason: "missing_legacy_secret",
              markedAt: new Date().toISOString(),
            } satisfies Prisma.InputJsonValue,
          },
        });
        rotationRequiredCount += 1;
      }

      await prisma.auditEvent.create({
        data: {
          organizationId: webhook.organizationId,
          actorType: "system",
          eventType: "webhook_updated",
          resourceType: "webhook",
          resourceId: webhook.id,
          summary: webhook.secret
            ? "Backfilled legacy webhook secret encryption"
            : "Marked legacy webhook for secret rotation",
          metadata: {
            legacyBackfill: true,
            encrypted: Boolean(webhook.secret),
          },
        },
      });
    }

    console.log("Webhook secret backfill complete.");
    console.log(`  Legacy rows encrypted: ${encryptedCount}`);
    console.log(`  Rows marked for rotation: ${rotationRequiredCount}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Webhook secret backfill failed:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
