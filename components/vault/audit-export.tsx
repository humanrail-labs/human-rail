"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, FileJson, FileSpreadsheet } from "lucide-react";

interface AuditExportProps {
  exportAuditEvents: (params: {
    eventType?: string;
    resourceType?: string;
    from?: string;
    to?: string;
    format?: "json" | "csv";
    limit?: number;
  }) => Promise<unknown>;
}

export default function AuditExport({ exportAuditEvents }: AuditExportProps) {
  const [eventType, setEventType] = useState("");
  const [resourceType, setResourceType] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [limit, setLimit] = useState("1000");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = useCallback(
    async (format: "json" | "csv") => {
      setLoading(true);
      setError(null);
      try {
        const result = await exportAuditEvents({
          eventType: eventType || undefined,
          resourceType: resourceType || undefined,
          from: fromDate || undefined,
          to: toDate || undefined,
          format,
          limit: Number(limit) || 1000,
        });

        if (format === "csv" && typeof result === "string") {
          const blob = new Blob([result], { type: "text/csv" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `mandara-audit-${Date.now()}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        } else if (format === "json" && typeof result === "object" && result !== null) {
          const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `mandara-audit-${Date.now()}.json`;
          a.click();
          URL.revokeObjectURL(url);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Export failed");
      } finally {
        setLoading(false);
      }
    },
    [eventType, resourceType, fromDate, toDate, limit, exportAuditEvents]
  );

  return (
    <Card className="border-white/[0.06] bg-neutral-900/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-white">
          <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
          Audit Export
        </CardTitle>
        <CardDescription className="text-neutral-500">
          Download audit events as JSON or CSV
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-neutral-400">Event Type</Label>
            <Input
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              placeholder="e.g. signing_request_created"
              className="border-white/[0.06] bg-black/20 text-sm text-neutral-300"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-neutral-400">Resource Type</Label>
            <Input
              value={resourceType}
              onChange={(e) => setResourceType(e.target.value)}
              placeholder="e.g. signing_request"
              className="border-white/[0.06] bg-black/20 text-sm text-neutral-300"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-neutral-400">From</Label>
            <Input
              type="datetime-local"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="border-white/[0.06] bg-black/20 text-sm text-neutral-300"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-neutral-400">To</Label>
            <Input
              type="datetime-local"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="border-white/[0.06] bg-black/20 text-sm text-neutral-300"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-neutral-400">Limit</Label>
            <Input
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              className="border-white/[0.06] bg-black/20 text-sm text-neutral-300"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("json")}
            disabled={loading}
            className="text-xs"
          >
            <FileJson className="mr-1.5 h-3.5 w-3.5" />
            Export JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("csv")}
            disabled={loading}
            className="text-xs"
          >
            <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
            <p className="text-xs text-red-200/80">{error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
