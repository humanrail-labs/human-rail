"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMandaraProduct } from "@/lib/hooks/use-mandara-product";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  RefreshCw,
  Bot,
  AlertTriangle,
  MoreHorizontal,
  Pause,
  Play,
  Ban,
  Trash2,
  Pencil,
  X,
  Check,
} from "lucide-react";

export default function AgentsPage() {
  const router = useRouter();
  const {
    agents,
    loading,
    error,
    apiAvailable,
    refresh,
    updateAgent,
    updateAgentStatus,
    deleteAgent,
  } = useMandaraProduct();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const startEdit = (agent: typeof agents[0]) => {
    setEditingId(agent.id);
    setEditName(agent.name);
    setEditDesc(agent.description ?? "");
    setMenuOpen(null);
  };

  const saveEdit = async (id: string) => {
    if (!editName.trim()) return;
    setBusy(`edit-${id}`);
    try {
      await updateAgent(id, { name: editName.trim(), description: editDesc.trim() || undefined });
      setEditingId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(null);
    }
  };

  const changeStatus = async (id: string, status: "active" | "suspended" | "revoked") => {
    setBusy(`status-${id}`);
    setMenuOpen(null);
    try {
      await updateAgentStatus(id, status);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Status change failed");
    } finally {
      setBusy(null);
    }
  };

  const confirmDelete = async (id: string) => {
    setBusy(`delete-${id}`);
    setDeleteConfirm(null);
    setMenuOpen(null);
    try {
      await deleteAgent(id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(null);
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "active":
        return { label: "Active", color: "border-emerald-500/30 text-emerald-300" };
      case "suspended":
        return { label: "Suspended", color: "border-amber-500/30 text-amber-300" };
      case "revoked":
        return { label: "Revoked", color: "border-red-500/30 text-red-300" };
      default:
        return { label: status, color: "border-neutral-500/30 text-neutral-300" };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-neutral-400">
        <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
        Loading agents…
      </div>
    );
  }

  if (error && !apiAvailable) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-amber-200">Mandara API unavailable</p>
            <p className="text-xs text-amber-200/70">{error}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} className="text-xs">
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Agents</h2>
          <p className="text-xs text-neutral-500">Manage your AI agent identities.</p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => router.push("/mandara/app/onboarding")}
            className="bg-[#3E877E] text-xs hover:bg-[#326d66]"
          >
            <Bot className="mr-1.5 h-3.5 w-3.5" />
            Create Agent
          </Button>
          <Button variant="outline" size="sm" onClick={refresh} className="text-xs">
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {agents.length === 0 ? (
        <Card className="border-white/[0.06] bg-white/[0.03]">
          <CardContent className="py-8 text-center text-sm text-neutral-500">
            No agents yet. Create one in the{" "}
            <a href="/mandara/app/onboarding" className="text-sky-400 hover:underline">
              onboarding wizard
            </a>
            .
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {agents.map((agent) => {
            const status = statusLabel(agent.status);
            const isEditing = editingId === agent.id;
            const isBusy = busy?.includes(agent.id) ?? false;
            const isMenuOpen = menuOpen === agent.id;
            const isDeleteConfirm = deleteConfirm === agent.id;

            return (
              <Card
              key={agent.id}
              className={`border-white/[0.06] bg-white/[0.03] relative transition-none ${
                isMenuOpen || isEditing || isDeleteConfirm ? "z-20" : "z-10"
              }`}
            >
                <CardContent className="py-4">
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-neutral-400">Agent name</Label>
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="border-white/[0.06] bg-white/[0.02] text-sm text-neutral-300"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-neutral-400">Description</Label>
                        <Input
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          className="border-white/[0.06] bg-white/[0.02] text-sm text-neutral-300"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => void saveEdit(agent.id)}
                          disabled={!editName.trim() || !!busy}
                          className="bg-[#3E877E] text-xs hover:bg-[#326d66]"
                        >
                          <Check className="mr-1.5 h-3.5 w-3.5" />
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)} className="text-xs">
                          <X className="mr-1.5 h-3.5 w-3.5" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <Bot className="h-5 w-5 shrink-0 text-sky-400" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{agent.name}</p>
                          {agent.description && (
                            <p className="text-xs text-neutral-500 truncate">{agent.description}</p>
                          )}
                          <p className="mt-0.5 text-[10px] text-neutral-600">ID: {agent.id.slice(0, 8)}…</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className={status.color}>
                          {status.label}
                        </Badge>

                        <div className="relative">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setMenuOpen(isMenuOpen ? null : agent.id)}
                            disabled={isBusy}
                            className="h-8 w-8 p-0 text-neutral-400 hover:text-white"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>

                          {isMenuOpen && (
                            <>
                              <div
                                className="fixed inset-0 z-40"
                                onClick={() => setMenuOpen(null)}
                              />
                              <div className="absolute right-0 top-full z-50 mt-1 w-52 rounded-lg border border-white/[0.08] bg-neutral-900 py-1 shadow-lg">
                                <button
                                  onClick={() => startEdit(agent)}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-neutral-300 hover:bg-white/[0.05]"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  Edit
                                </button>

                                {agent.status === "active" && (
                                  <button
                                    onClick={() => changeStatus(agent.id, "suspended")}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-amber-300 hover:bg-white/[0.05]"
                                  >
                                    <Pause className="h-3.5 w-3.5" />
                                    Suspend
                                  </button>
                                )}

                                {(agent.status === "suspended" || agent.status === "revoked") && (
                                  <button
                                    onClick={() => changeStatus(agent.id, "active")}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-emerald-300 hover:bg-white/[0.05]"
                                  >
                                    <Play className="h-3.5 w-3.5" />
                                    Reactivate
                                  </button>
                                )}

                                {agent.status !== "revoked" && (
                                  <button
                                    onClick={() => changeStatus(agent.id, "revoked")}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-300 hover:bg-white/[0.05]"
                                  >
                                    <Ban className="h-3.5 w-3.5" />
                                    Revoke
                                  </button>
                                )}

                                <div className="my-1 border-t border-white/[0.06]" />

                                <button
                                  onClick={() => {
                                    setMenuOpen(null);
                                    setDeleteConfirm(agent.id);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-400 hover:bg-white/[0.05]"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Delete
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {isDeleteConfirm && (
                    <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3">
                      <p className="text-xs font-medium text-red-200">Delete this agent?</p>
                      <p className="mt-1 text-[11px] text-red-200/70">
                        This permanently removes the agent and cannot be undone. Associated mandates and requests remain in the database.
                      </p>
                      <div className="mt-2 flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => void confirmDelete(agent.id)}
                          disabled={!!busy}
                          className="bg-red-600 text-xs hover:bg-red-700"
                        >
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                          Delete
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDeleteConfirm(null)}
                          className="text-xs"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
