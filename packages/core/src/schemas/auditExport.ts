import { z } from "zod";

export const AuditExportQuerySchema = z.object({
  organizationId: z.string().cuid2().optional(),
  eventType: z.string().optional(),
  resourceType: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  format: z.enum(["json", "csv"]).optional().default("json"),
  limit: z.string().default("1000").transform(Number).pipe(z.number().min(1).max(10000)),
});

export type AuditExportQueryInput = z.infer<typeof AuditExportQuerySchema>;
