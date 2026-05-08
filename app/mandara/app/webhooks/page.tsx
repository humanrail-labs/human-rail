"use client";

import WebhookManagement from "@/components/vault/webhook-management";
import { useMandaraProduct } from "@/lib/hooks/use-mandara-product";

export default function MandaraWebhooksPage() {
  const { listWebhooks, createWebhook, deleteWebhook } = useMandaraProduct();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Webhooks</h1>
        <p className="text-sm text-neutral-500">
          Send Mandara signature request events to your application. This product page does not require a browser wallet.
        </p>
      </div>
      <WebhookManagement
        listWebhooks={listWebhooks}
        createWebhook={createWebhook}
        deleteWebhook={deleteWebhook}
      />
    </div>
  );
}
