"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Copy, RefreshCw, Trash2, Webhook } from "lucide-react";

interface WebhookManagementProps {
  listWebhooks: () => Promise<Array<{
    id: string;
    url: string;
    events: string[];
    status: string;
    createdAt: string;
    updatedAt: string;
  }>>;
  createWebhook: (input: { url: string; events: string[]; secret?: string }) => Promise<{ id: string; url: string; secret: string }>;
  deleteWebhook: (id: string) => Promise<{ id: string; deleted: boolean }>;
}

export default function WebhookManagement({ listWebhooks, createWebhook, deleteWebhook }: WebhookManagementProps) {
  const [webhooks, setWebhooks] = useState<Awaited<ReturnType<typeof listWebhooks>>>([]);
  const [newUrl, setNewUrl] = useState("");
  const [newEvents, setNewEvents] = useState("signature.requested,signature.signed");
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listWebhooks();
      setWebhooks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load webhooks");
    } finally {
      setLoading(false);
    }
  }, [listWebhooks]);

  const handleCreate = useCallback(async () => {
    if (!newUrl || !newEvents) return;
    setLoading(true);
    setError(null);
    setCreatedSecret(null);
    try {
      const events = newEvents.split(",").map((e) => e.trim()).filter(Boolean);
      const wh = await createWebhook({ url: newUrl, events });
      setCreatedSecret(wh.secret);
      setNewUrl("");
      setNewEvents("signature.requested,signature.signed");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create webhook");
    } finally {
      setLoading(false);
    }
  }, [newUrl, newEvents, createWebhook, load]);

  const handleDelete = useCallback(async (id: string) => {
    setLoading(true);
    try {
      await deleteWebhook(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete webhook");
    } finally {
      setLoading(false);
    }
  }, [deleteWebhook, load]);

  return (
    <Card className="border-white/[0.06] bg-white/[0.03]">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-white">
          <Webhook className="h-4 w-4 text-purple-400" />
          Webhooks
        </CardTitle>
        <CardDescription className="text-neutral-500">
          Receive callbacks when signing requests change status
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs text-neutral-400">Webhook URL</Label>
            <Input
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://example.com/webhooks/mandara"
              className="border-white/[0.06] bg-white/[0.02] text-sm text-neutral-300"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-neutral-400">Events (comma-separated)</Label>
            <Input
              value={newEvents}
              onChange={(e) => setNewEvents(e.target.value)}
              className="border-white/[0.06] bg-white/[0.02] text-sm text-neutral-300"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={handleCreate}
            disabled={loading || !newUrl}
            className="bg-purple-600 text-xs hover:bg-purple-700"
          >
            <Webhook className="mr-1.5 h-3.5 w-3.5" />
            Create Webhook
          </Button>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="text-xs">
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Load
          </Button>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
            <p className="text-xs text-red-200/80">{error}</p>
          </div>
        )}

        {createdSecret && (
          <div className="space-y-2 rounded-lg border border-purple-500/20 bg-purple-500/10 p-3">
            <p className="text-xs font-medium text-purple-200">Webhook Secret</p>
            <p className="text-xs text-purple-200/70">Copy now — it will not be shown again.</p>
            <div className="flex items-center gap-2">
              <code className="block flex-1 truncate rounded bg-black/30 px-2 py-1 text-xs text-purple-200/90">
                {createdSecret}
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(createdSecret)}
                className="text-purple-200/70 hover:text-purple-200"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {webhooks.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-neutral-400">Existing Webhooks</p>
            <div className="space-y-1.5">
              {webhooks.map((wh) => (
                <div
                  key={wh.id}
                  className="flex items-center justify-between rounded bg-white/[0.02] px-2 py-1.5 text-xs"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-neutral-300">{wh.url}</span>
                      <Badge
                        variant="outline"
                        className={
                          wh.status === "active"
                            ? "border-emerald-500/30 text-emerald-300 text-xs"
                            : "border-amber-500/30 text-amber-300 text-xs"
                        }
                      >
                        {wh.status}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {wh.events.map((ev) => (
                        <span key={ev} className="text-xs text-neutral-500">
                          {ev}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(wh.id)}
                    disabled={loading}
                    className="ml-2 h-6 text-xs border-red-500/20 text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
